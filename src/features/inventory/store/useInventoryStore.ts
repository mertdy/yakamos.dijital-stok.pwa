import { create } from 'zustand';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import posthog from 'posthog-js';

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
}

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  unsubscribeSnapshot: (() => void) | null;
  loadItems: () => void;
  addItem: (
    item: Omit<InventoryItem, 'id' | 'updatedAt' | 'userId'>
  ) => Promise<void>;
  updateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearItems: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  isLoading: false,
  unsubscribeSnapshot: null,

  loadItems: () => {
    const user = auth.currentUser;
    if (!user) return;

    const { unsubscribeSnapshot } = get();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    set({ isLoading: true });

    const q = query(
      collection(db, 'inventory'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const items: InventoryItem[] = [];
        snapshot.forEach(doc => {
          items.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        set({ items, isLoading: false });
      },
      error => {
        console.error('Firestore snapshot error:', error);
        set({ isLoading: false });
      }
    );

    set({ unsubscribeSnapshot: unsubscribe });
  },

  addItem: async newItemData => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const id = crypto.randomUUID();
    const updatedAt = new Date().toISOString();
    const newItem: InventoryItem = {
      id,
      ...newItemData,
      updatedAt,
      userId: user.uid
    };

    // Firestore will automatically cache this write and sync when online
    setDoc(doc(db, 'inventory', id), newItem).catch(err => {
      console.error('Firestore background sync failed', err);
      posthog.captureException(err, {
        context: 'inventory_add_item',
        inventory_id: id
      });
    });

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

    // Firestore automatically caches and syncs offline writes
    setDoc(doc(db, 'inventory', id), mergedItem, { merge: true }).catch(err => {
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

    // Firestore handles offline deletion syncing
    deleteDoc(doc(db, 'inventory', id)).catch(err => {
      console.error('Firestore background sync failed', err);
      posthog.captureException(err, {
        context: 'inventory_delete_item',
        inventory_id: id
      });
    });

    posthog.capture('inventory_item_deleted', {
      inventory_id: id
    });
  },

  clearItems: () => {
    const { unsubscribeSnapshot } = get();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
    set({ items: [], unsubscribeSnapshot: null });
  }
}));
