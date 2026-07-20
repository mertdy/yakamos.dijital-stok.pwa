import { create } from 'zustand';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import { arrayRemove, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

interface PreferencesState {
  quickAddItems: string[]; // Array of inventory IDs
  quickAddCompanyId: string | null;
  companyQuickAddItems: string[];
  companyQuickAddCompanyId: string | null;
  isLoading: boolean;
  loadPreferences: (companyId?: string | null) => Promise<void>;
  loadCompanyQuickAddItems: (companyId?: string | null) => Promise<void>;
  saveQuickAddItems: (items: string[]) => Promise<void>;
  saveCompanyQuickAddItems: (items: string[]) => Promise<void>;
  removeQuickAddItems: (itemIds: string[]) => Promise<void>;
  clearPreferences: () => void;
}

export const usePreferencesStore = getSingletonStore('preferences', () => {
  let latestLoadRequest = 0;

  return create<PreferencesState>((set, get) => ({
    quickAddItems: [],
    quickAddCompanyId: null,
    companyQuickAddItems: [],
    companyQuickAddCompanyId: null,
    isLoading: false,

    loadPreferences: async requestedCompanyId => {
      const requestId = ++latestLoadRequest;
      const user = auth.currentUser;
      const companyId =
        requestedCompanyId ?? useAuthStore.getState().profile?.activeCompanyId;
      if (!user || !companyId) {
        if (requestId === latestLoadRequest) {
          set({ quickAddItems: [], quickAddCompanyId: null, isLoading: false });
        }
        return;
      }

      const isCurrentRequest = () =>
        requestId === latestLoadRequest &&
        useAuthStore.getState().profile?.activeCompanyId === companyId;

      // An effect scheduled just before a company switch must not restore the
      // former company's shortcuts after the switch has completed.
      if (!isCurrentRequest()) return;

      set({
        isLoading: true,
        quickAddItems: [],
        quickAddCompanyId: companyId
      });
      try {
        const docRef = doc(db, 'userPreferences', user.uid);
        const docSnap = await getDoc(docRef);

        if (!isCurrentRequest()) {
          return;
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          const quickAddItemsByCompany = data.quickAddItemsByCompany;

          if (quickAddItemsByCompany) {
            if (isCurrentRequest()) {
              set({
                quickAddItems: Array.isArray(quickAddItemsByCompany[companyId])
                  ? quickAddItemsByCompany[companyId]
                  : []
              });
            }
            return;
          }

          const legacyQuickAddItems = Array.isArray(data.quickAddItems)
            ? data.quickAddItems
            : [];
          await setDoc(
            docRef,
            {
              quickAddItemsByCompany: {
                [companyId]: legacyQuickAddItems
              }
            },
            { merge: true }
          );
          if (isCurrentRequest()) {
            set({ quickAddItems: legacyQuickAddItems });
          }
        } else {
          // Create default empty array if not exists
          await setDoc(
            docRef,
            { quickAddItemsByCompany: { [companyId]: [] } },
            { merge: true }
          );
          if (isCurrentRequest()) {
            set({ quickAddItems: [] });
          }
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      } finally {
        if (isCurrentRequest()) {
          set({ isLoading: false });
        }
      }
    },

    loadCompanyQuickAddItems: async requestedCompanyId => {
      const companyId =
        requestedCompanyId ?? useAuthStore.getState().profile?.activeCompanyId;
      if (!companyId) {
        set({ companyQuickAddItems: [], companyQuickAddCompanyId: null });
        return;
      }

      set({ companyQuickAddItems: [], companyQuickAddCompanyId: companyId });
      try {
        const snapshot = await getDoc(doc(db, 'companyPreferences', companyId));
        if (useAuthStore.getState().profile?.activeCompanyId !== companyId) {
          return;
        }
        const data = snapshot.exists() ? snapshot.data() : {};
        set({
          companyQuickAddItems: Array.isArray(data.quickAddItems)
            ? data.quickAddItems
            : []
        });
      } catch (error) {
        console.error('Error loading company quick add items:', error);
      }
    },

    saveQuickAddItems: async (items: string[]) => {
      const user = auth.currentUser;
      const companyId = useAuthStore.getState().profile?.activeCompanyId;
      if (!user || !companyId) return;
      if (get().quickAddCompanyId !== companyId) {
        throw new Error('Preferences are not loaded for the active company');
      }

      set({ isLoading: true });
      try {
        const docRef = doc(db, 'userPreferences', user.uid);
        await setDoc(
          docRef,
          { quickAddItemsByCompany: { [companyId]: items } },
          { merge: true }
        );
        set({ quickAddItems: items });
      } catch (error) {
        console.error('Error saving quick add items:', error);
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    saveCompanyQuickAddItems: async items => {
      const companyId = useAuthStore.getState().profile?.activeCompanyId;
      const membership = useAuthStore.getState().activeMembership;
      const canManage =
        membership?.role === 'OWNER' ||
        membership?.permissions.includes('MANAGE_COMPANY_QUICK_ADD');
      if (!companyId || !canManage) {
        throw new Error('Company quick add permission is required');
      }

      set({ isLoading: true });
      try {
        await setDoc(
          doc(db, 'companyPreferences', companyId),
          {
            companyId,
            quickAddItems: items,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
        set({
          companyQuickAddItems: items,
          companyQuickAddCompanyId: companyId
        });
      } finally {
        set({ isLoading: false });
      }
    },

    removeQuickAddItems: async itemIds => {
      const user = auth.currentUser;
      const companyId = useAuthStore.getState().profile?.activeCompanyId;
      if (!user || !companyId || itemIds.length === 0) return;

      if (get().quickAddCompanyId === companyId) {
        set(state => ({
          quickAddItems: state.quickAddItems.filter(
            itemId => !itemIds.includes(itemId)
          )
        }));
      }

      try {
        await setDoc(
          doc(db, 'userPreferences', user.uid),
          {
            quickAddItemsByCompany: {
              [companyId]: arrayRemove(...itemIds)
            }
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Error removing quick add items:', error);
      }
    },

    clearPreferences: () => {
      set({
        quickAddItems: [],
        quickAddCompanyId: null,
        companyQuickAddItems: [],
        companyQuickAddCompanyId: null
      });
    }
  }));
});
