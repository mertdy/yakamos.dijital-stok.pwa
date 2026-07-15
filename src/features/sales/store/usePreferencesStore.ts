import { create } from 'zustand';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

interface PreferencesState {
  quickAddItems: string[]; // Array of inventory IDs
  quickAddCompanyId: string | null;
  isLoading: boolean;
  loadPreferences: () => Promise<void>;
  saveQuickAddItems: (items: string[]) => Promise<void>;
  clearPreferences: () => void;
}

export const usePreferencesStore = getSingletonStore('preferences', () =>
  create<PreferencesState>((set, get) => ({
    quickAddItems: [],
    quickAddCompanyId: null,
    isLoading: false,

    loadPreferences: async () => {
      const user = auth.currentUser;
      const companyId = useAuthStore.getState().profile?.activeCompanyId;
      if (!user || !companyId) {
        set({ quickAddItems: [], quickAddCompanyId: null, isLoading: false });
        return;
      }

      set({
        isLoading: true,
        quickAddItems: [],
        quickAddCompanyId: companyId
      });
      try {
        const docRef = doc(db, 'userPreferences', user.uid);
        const docSnap = await getDoc(docRef);

        if (useAuthStore.getState().profile?.activeCompanyId !== companyId) {
          return;
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          const quickAddItemsByCompany = data.quickAddItemsByCompany;

          if (quickAddItemsByCompany) {
            set({
              quickAddItems: Array.isArray(quickAddItemsByCompany[companyId])
                ? quickAddItemsByCompany[companyId]
                : []
            });
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
          set({ quickAddItems: legacyQuickAddItems });
        } else {
          // Create default empty array if not exists
          await setDoc(
            docRef,
            { quickAddItemsByCompany: { [companyId]: [] } },
            { merge: true }
          );
          set({ quickAddItems: [] });
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      } finally {
        if (useAuthStore.getState().profile?.activeCompanyId === companyId) {
          set({ isLoading: false });
        }
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

    clearPreferences: () => {
      set({ quickAddItems: [], quickAddCompanyId: null });
    }
  }))
);
