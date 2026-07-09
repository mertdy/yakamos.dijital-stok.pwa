import { create } from 'zustand';
import {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User
} from 'firebase/auth';
import { auth, googleProvider } from '@/core/firebase/config';
import { useInventoryStore } from '@/features/inventory';

/**
 * Converts Firebase auth error codes to user-friendly Turkish messages.
 */
export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-posta veya şifre hatalı.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanılıyor.';
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalıdır.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
    case 'auth/network-request-failed':
      return 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmıştır.';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  authError: string | null;
  setUser: (user: User | null) => void;
  clearError: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isLoading: false,
  isInitialized: false, // Prevents layout flashing before onAuthStateChanged fires
  authError: null,

  setUser: user => set({ user, isInitialized: true }),

  clearError: () => set({ authError: null }),

  loginWithGoogle: async () => {
    set({ isLoading: true, authError: null });
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      console.error('Google login failed:', error);
      const code = (error as { code?: string }).code ?? '';
      set({ authError: getAuthErrorMessage(code) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, authError: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code ?? '';
      set({ authError: getAuthErrorMessage(code) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  registerWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, authError: null });
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await sendEmailVerification(credential.user);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code ?? '';
      set({ authError: getAuthErrorMessage(code) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, authError: null });
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code ?? '';
      set({ authError: getAuthErrorMessage(code) });
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
