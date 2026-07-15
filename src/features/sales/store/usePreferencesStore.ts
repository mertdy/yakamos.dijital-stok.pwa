import { create } from 'zustand';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';

interface PreferencesState {
  quickAddItems: string[]; // Array of inventory IDs
  isLoading: boolean;
  loadPreferences: () => Promise<void>;
  saveQuickAddItems: (items: string[]) => Promise<void>;
  clearPreferences: () => void;
}

export const usePreferencesStore = getSingletonStore('preferences', () =>
  create<PreferencesState>(set => ({
    quickAddItems: [],
    isLoading: false,

    loadPreferences: async () => {
      const user = auth.currentUser;
      if (!user) return;

      set({ isLoading: true });
      try {
        const docRef = doc(db, 'userPreferences', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          set({ quickAddItems: data.quickAddItems || [] });
        } else {
          // Create default empty array if not exists
          await setDoc(docRef, { quickAddItems: [] }, { merge: true });
          set({ quickAddItems: [] });
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    saveQuickAddItems: async (items: string[]) => {
      const user = auth.currentUser;
      if (!user) return;

      set({ isLoading: true });
      try {
        const docRef = doc(db, 'userPreferences', user.uid);
        await setDoc(docRef, { quickAddItems: items }, { merge: true });
        set({ quickAddItems: items });
      } catch (error) {
        console.error('Error saving quick add items:', error);
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    clearPreferences: () => {
      set({ quickAddItems: [] });
    }
  }))
);
