import { create } from 'zustand';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { usePreferencesStore } from '@/features/sales/store/usePreferencesStore';
import posthog from 'posthog-js';
import { trackPendingSyncOperation } from '@/shared/utils/pendingSyncOperations';
import { getFieldChangeDetails } from '@/shared/utils/formatFieldChanges';

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  price: number;
  barcode?: string;
  sku?: string;
  imageUrl?: string;
  updatedAt: string;
  userId?: string;
  companyId?: string;
}

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  hasLoadedItems: boolean;
  subscriptionCompanyId: string | null;
  unsubscribeSnapshot: (() => void) | null;
  loadItems: (options?: { force?: boolean }) => void;
  addItem: (
    item: Omit<InventoryItem, 'id' | 'updatedAt' | 'userId' | 'companyId'>
  ) => Promise<void>;
  updateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  clearItems: () => void;
}

export const useInventoryStore = getSingletonStore('inventory', () =>
  create<InventoryState>((set, get) => ({
    items: [],
    isLoading: false,
    hasLoadedItems: false,
    subscriptionCompanyId: null,
    unsubscribeSnapshot: null,

    loadItems: ({ force = false } = {}) => {
      const profile = useAuthStore.getState().profile;
      const companyId = profile?.activeCompanyId;
      if (!companyId) return;

      const { unsubscribeSnapshot, subscriptionCompanyId } = get();
      if (
        !force &&
        subscriptionCompanyId === companyId &&
        unsubscribeSnapshot
      ) {
        return;
      }

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }

      set({
        items: subscriptionCompanyId === companyId ? get().items : [],
        isLoading: true,
        hasLoadedItems: false,
        subscriptionCompanyId: companyId
      });

      const q = query(
        collection(db, 'inventory'),
        where('companyId', '==', companyId)
      );

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const items: InventoryItem[] = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() } as InventoryItem);
          });
          if (get().subscriptionCompanyId !== companyId) return;
          set({ items, isLoading: false, hasLoadedItems: true });
        },
        error => {
          console.error('Firestore snapshot error:', error);
          if (get().subscriptionCompanyId !== companyId) return;
          set({ isLoading: false, hasLoadedItems: true });
        }
      );

      set({ unsubscribeSnapshot: unsubscribe });
    },

    addItem: async newItemData => {
      const profile = useAuthStore.getState().profile;
      if (!profile?.activeCompanyId)
        throw new Error('No active company selected');

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const id = crypto.randomUUID();
      const updatedAt = new Date().toISOString();
      const newItem: InventoryItem = {
        id,
        ...newItemData,
        updatedAt,
        userId: user.uid,
        companyId: profile.activeCompanyId
      };

      // The Firestore write is deliberately queued for offline support. Keep
      // the local list in sync immediately so a newly created product can be
      // selected in Sales without waiting for the snapshot round trip.
      set(state => ({
        items: [...state.items.filter(item => item.id !== id), newItem]
      }));

      const saveItem = setDoc(doc(db, 'inventory', id), newItem);
      trackPendingSyncOperation({
        kind: 'inventory',
        title: newItem.name,
        details: ['Ürün eklendi'],
        target: { type: 'inventory', id }
      });
      const reportSaveError = (err: unknown) => {
        console.error('Firestore background sync failed', err);
        posthog.captureException(err, {
          context: 'inventory_add_item',
          inventory_id: id
        });
      };

      // Online callers can safely wait for the write before presenting a
      // successful creation state. Offline writes remain queued in Firestore
      // and continue without blocking the sales flow.
      if (navigator.onLine) {
        try {
          await saveItem;
        } catch (error) {
          reportSaveError(error);
          throw error;
        }
      } else {
        saveItem.catch(reportSaveError);
      }

      posthog.capture('inventory_item_created', {
        inventory_id: id,
        has_barcode: Boolean(newItem.barcode),
        initial_stock: newItem.stock,
        price: newItem.price
      });
    },

    updateItem: async (id, updatedData) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const updatedAt = new Date().toISOString();
      const currentItem = get().items.find(i => i.id === id);
      if (!currentItem) return;

      const mergedItem = { ...currentItem, ...updatedData, updatedAt };

      set(state => ({
        items: state.items.map(item => (item.id === id ? mergedItem : item))
      }));

      const saveItem = setDoc(doc(db, 'inventory', id), mergedItem, {
        merge: true
      });
      const changedFields = getFieldChangeDetails(
        currentItem as Record<string, unknown>,
        updatedData as Record<string, unknown>,
        {
          name: 'Ürün adı',
          stock: 'Stok miktarı',
          price: 'Fiyat',
          barcode: 'Barkod',
          sku: 'Stok kodu',
          imageUrl: 'Ürün görseli'
        },
        {
          price: value =>
            typeof value === 'number'
              ? `${value.toLocaleString('tr-TR')} ₺`
              : value === undefined || value === null
                ? '—'
                : String(value),
          stock: value =>
            value === undefined || value === null ? '—' : String(value)
        }
      );
      trackPendingSyncOperation({
        kind: 'inventory',
        title: mergedItem.name,
        details:
          changedFields.length > 0 ? changedFields : ['Ürün güncellendi'],
        target: { type: 'inventory', id }
      });
      saveItem.catch(err => {
        console.error('Firestore background sync failed', err);
        posthog.captureException(err, {
          context: 'inventory_update_item',
          inventory_id: id
        });
      });

      posthog.capture('inventory_item_updated', {
        inventory_id: id,
        has_barcode: Boolean(mergedItem.barcode),
        stock: mergedItem.stock,
        price: mergedItem.price
      });
    },

    deleteItem: async id => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const itemName = get().items.find(item => item.id === id)?.name ?? id;
      const deleteItem = deleteDoc(doc(db, 'inventory', id));
      trackPendingSyncOperation({
        kind: 'inventory',
        title: itemName,
        details: ['Ürün silindi']
      });
      deleteItem.catch(err => {
        console.error('Firestore background sync failed', err);
        posthog.captureException(err, {
          context: 'inventory_delete_item',
          inventory_id: id
        });
      });

      usePreferencesStore.getState().removeQuickAddItems([id]);

      posthog.capture('inventory_item_deleted', {
        inventory_id: id
      });
    },

    deleteItems: async ids => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'inventory', id));
      });

      const deleteItems = batch.commit();
      trackPendingSyncOperation({
        kind: 'inventory',
        title: `${ids.length} stok kaydı silindi`,
        details: ['Toplu silme işlemi']
      });
      await deleteItems.catch(err => {
        console.error('Firestore background sync batch failed', err);
        posthog.captureException(err, {
          context: 'inventory_delete_items',
          inventory_ids: ids
        });
      });

      await usePreferencesStore.getState().removeQuickAddItems(ids);

      posthog.capture('inventory_items_deleted', {
        count: ids.length,
        inventory_ids: ids
      });
    },

    clearItems: () => {
      const { unsubscribeSnapshot } = get();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      set({
        items: [],
        isLoading: false,
        hasLoadedItems: false,
        subscriptionCompanyId: null,
        unsubscribeSnapshot: null
      });
    }
  }))
);
