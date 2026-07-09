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
import { useCustomerStore } from '@/features/customers';
import { useSalesStore, usePreferencesStore } from '@/features/sales';
import { useSalesHistoryStore } from '@/features/sales-history';
import posthog from 'posthog-js';

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

  setUser: user => {
    if (user) {
      posthog.identify(user.uid, {
        email: user.email ?? undefined,
        name: user.displayName ?? undefined
      });
    } else {
      posthog.reset();
    }

    set({ user, isInitialized: true });
  },

  clearError: () => set({ authError: null }),

  loginWithGoogle: async () => {
    set({ isLoading: true, authError: null });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      posthog.identify(result.user.uid, {
        email: result.user.email ?? undefined,
        name: result.user.displayName ?? undefined
      });
      posthog.capture('user_logged_in', {
        login_method: 'google',
        is_email_verified: result.user.emailVerified
      });
    } catch (error: unknown) {
      console.error('Google login failed:', error);
      posthog.captureException(error, {
        context: 'login_with_google'
      });
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
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      posthog.identify(credential.user.uid, {
        email: credential.user.email ?? undefined,
        name: credential.user.displayName ?? undefined
      });
      posthog.capture('user_logged_in', {
        login_method: 'email',
        is_email_verified: credential.user.emailVerified
      });
    } catch (error: unknown) {
      posthog.captureException(error, {
        context: 'login_with_email'
      });
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
      posthog.identify(credential.user.uid, {
        email: credential.user.email ?? undefined,
        name: credential.user.displayName ?? undefined
      });
      posthog.capture('user_registered', {
        registration_method: 'email',
        verification_email_sent: true
      });
    } catch (error: unknown) {
      posthog.captureException(error, {
        context: 'register_with_email'
      });
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
      posthog.capture('password_reset_requested', {
        request_source: 'login_view'
      });
    } catch (error: unknown) {
      posthog.captureException(error, {
        context: 'reset_password'
      });
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
      const currentUser = auth.currentUser;
      if (currentUser) {
        posthog.capture('user_logged_out', {
          had_verified_email: currentUser.emailVerified
        });
      }
      await signOut(auth);
      posthog.reset();
      useInventoryStore.getState().clearItems();
      useCustomerStore.getState().clearCustomers();
      useSalesStore.getState().clearCart();
      useSalesStore.getState().clearHeldSales();
      useSalesHistoryStore.getState().clearSales();
      usePreferencesStore.getState().clearPreferences();
    } catch (error) {
      console.error('Logout failed:', error);
      posthog.captureException(error, {
        context: 'logout'
      });
    } finally {
      set({ isLoading: false });
    }
  }
}));
