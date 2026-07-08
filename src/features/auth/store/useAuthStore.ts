import { create } from 'zustand';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../../../core/firebase/config';
import { useInventoryStore } from '../../inventory/store/useInventoryStore';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isLoading: false,
  isInitialized: false, // Prevents layout flashing before onAuthStateChanged fires

  setUser: user => set({ user, isInitialized: true }),

  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut(auth);
      useInventoryStore.getState().clearItems();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));
