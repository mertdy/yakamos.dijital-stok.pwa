import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { getAuthErrorMessage } from './useAuthStore';

// ─── Firebase mocks ───────────────────────────────────────────────────────────

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn()
}));

vi.mock('@/core/firebase/config', () => ({
  auth: {},
  googleProvider: {}
}));

vi.mock('@/features/inventory', () => ({
  useInventoryStore: {
    getState: vi.fn(() => ({ clearItems: vi.fn() }))
  }
}));

vi.mock('@/features/customers', () => ({
  useCustomerStore: {
    getState: vi.fn(() => ({ clearCustomers: vi.fn() }))
  }
}));

vi.mock('@/features/sales', () => ({
  useSalesStore: {
    getState: vi.fn(() => ({ clearCart: vi.fn(), clearHeldSales: vi.fn() }))
  },
  usePreferencesStore: {
    getState: vi.fn(() => ({ clearPreferences: vi.fn() }))
  }
}));

vi.mock('@/features/sales-history', () => ({
  useSalesHistoryStore: {
    getState: vi.fn(() => ({ clearSales: vi.fn() }))
  }
}));

// ─── Store factory (fresh instance per test) ─────────────────────────────────

async function buildStore() {
  // Dynamically import to get a fresh module after vi.mock setup
  const { useAuthStore } = await import('./useAuthStore');
  return useAuthStore;
}

// ─── getAuthErrorMessage ──────────────────────────────────────────────────────

describe('getAuthErrorMessage', () => {
  it('returns Turkish message for invalid-credential', () => {
    expect(getAuthErrorMessage('auth/invalid-credential')).toBe(
      'E-posta veya şifre hatalı.'
    );
  });

  it('returns Turkish message for email-already-in-use', () => {
    expect(getAuthErrorMessage('auth/email-already-in-use')).toBe(
      'Bu e-posta adresi zaten kullanılıyor.'
    );
  });

  it('returns Turkish message for weak-password', () => {
    expect(getAuthErrorMessage('auth/weak-password')).toBe(
      'Şifre en az 6 karakter olmalıdır.'
    );
  });

  it('returns Turkish message for invalid-email', () => {
    expect(getAuthErrorMessage('auth/invalid-email')).toBe(
      'Geçersiz e-posta adresi.'
    );
  });

  it('returns Turkish message for too-many-requests', () => {
    expect(getAuthErrorMessage('auth/too-many-requests')).toBe(
      'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.'
    );
  });

  it('returns Turkish message for network-request-failed', () => {
    expect(getAuthErrorMessage('auth/network-request-failed')).toBe(
      'Ağ hatası. İnternet bağlantınızı kontrol edin.'
    );
  });

  it('returns Turkish message for user-disabled', () => {
    expect(getAuthErrorMessage('auth/user-disabled')).toBe(
      'Bu hesap devre dışı bırakılmıştır.'
    );
  });

  it('returns a generic fallback for unknown codes', () => {
    expect(getAuthErrorMessage('auth/some-unknown-error')).toBe(
      'Bir hata oluştu. Lütfen tekrar deneyin.'
    );
  });

  it('returns a generic fallback for empty string', () => {
    expect(getAuthErrorMessage('')).toBe(
      'Bir hata oluştu. Lütfen tekrar deneyin.'
    );
  });
});

// ─── useAuthStore ─────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── initial state ────────────────────────────────────────────────────────

  it('has correct initial state', async () => {
    const store = await buildStore();
    const state = store.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(false);
    expect(state.authError).toBeNull();
  });

  // ── setUser ──────────────────────────────────────────────────────────────

  it('setUser updates user and marks isInitialized', async () => {
    const store = await buildStore();
    const fakeUser = { uid: 'abc', email: 'test@test.com' } as never;
    store.getState().setUser(fakeUser);
    expect(store.getState().user).toEqual(fakeUser);
    expect(store.getState().isInitialized).toBe(true);
  });

  // ── clearError ───────────────────────────────────────────────────────────

  it('clearError resets authError to null', async () => {
    const store = await buildStore();
    // Manually inject an error to clear
    store.setState({ authError: 'Some error' });
    store.getState().clearError();
    expect(store.getState().authError).toBeNull();
  });

  // ── loginWithEmail ───────────────────────────────────────────────────────

  it('loginWithEmail calls signInWithEmailAndPassword and clears error', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({} as never);
    const store = await buildStore();
    await store.getState().loginWithEmail('test@example.com', 'password123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'test@example.com',
      'password123'
    );
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().authError).toBeNull();
  });

  it('loginWithEmail sets authError and throws on failure', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/invalid-credential'
    });
    const store = await buildStore();
    await expect(
      store.getState().loginWithEmail('bad@example.com', 'wrongpass')
    ).rejects.toBeDefined();
    expect(store.getState().authError).toBe('E-posta veya şifre hatalı.');
    expect(store.getState().isLoading).toBe(false);
  });

  // ── registerWithEmail ────────────────────────────────────────────────────

  it('registerWithEmail calls createUser and sendEmailVerification', async () => {
    const fakeUser = { uid: 'newuid' };
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({
      user: fakeUser
    } as never);
    vi.mocked(sendEmailVerification).mockResolvedValueOnce(undefined);
    const store = await buildStore();
    await store.getState().registerWithEmail('new@example.com', 'password123');
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'new@example.com',
      'password123'
    );
    expect(sendEmailVerification).toHaveBeenCalledWith(fakeUser);
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().authError).toBeNull();
  });

  it('registerWithEmail sets authError on failure', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/email-already-in-use'
    });
    const store = await buildStore();
    await expect(
      store.getState().registerWithEmail('taken@example.com', 'password123')
    ).rejects.toBeDefined();
    expect(store.getState().authError).toBe(
      'Bu e-posta adresi zaten kullanılıyor.'
    );
    expect(store.getState().isLoading).toBe(false);
  });

  // ── resetPassword ────────────────────────────────────────────────────────

  it('resetPassword calls sendPasswordResetEmail', async () => {
    vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce(undefined);
    const store = await buildStore();
    await store.getState().resetPassword('user@example.com');
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'user@example.com');
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().authError).toBeNull();
  });

  it('resetPassword sets authError on failure', async () => {
    vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce({
      code: 'auth/invalid-email'
    });
    const store = await buildStore();
    await expect(
      store.getState().resetPassword('invalid-email')
    ).rejects.toBeDefined();
    expect(store.getState().authError).toBe('Geçersiz e-posta adresi.');
    expect(store.getState().isLoading).toBe(false);
  });

  // ── loginWithGoogle ──────────────────────────────────────────────────────

  it('loginWithGoogle calls signInWithPopup', async () => {
    vi.mocked(signInWithPopup).mockResolvedValueOnce({} as never);
    const store = await buildStore();
    await store.getState().loginWithGoogle();
    expect(signInWithPopup).toHaveBeenCalledWith({}, {});
    expect(store.getState().isLoading).toBe(false);
  });

  it('loginWithGoogle sets authError and re-throws on failure', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce({
      code: 'auth/network-request-failed'
    });
    const store = await buildStore();
    await expect(store.getState().loginWithGoogle()).rejects.toBeDefined();
    expect(store.getState().authError).toBe(
      'Ağ hatası. İnternet bağlantınızı kontrol edin.'
    );
  });

  // ── logout ───────────────────────────────────────────────────────────────

  it('logout calls signOut and clears all stores', async () => {
    vi.mocked(signOut).mockResolvedValueOnce(undefined);

    const clearItems = vi.fn();
    const clearCustomers = vi.fn();
    const clearCart = vi.fn();
    const clearHeldSales = vi.fn();
    const clearSales = vi.fn();
    const clearPreferences = vi.fn();

    const { useInventoryStore } = await import('@/features/inventory');
    const { useCustomerStore } = await import('@/features/customers');
    const { useSalesStore, usePreferencesStore } =
      await import('@/features/sales');
    const { useSalesHistoryStore } = await import('@/features/sales-history');

    vi.mocked(useInventoryStore.getState).mockReturnValue({
      clearItems
    } as any);
    vi.mocked(useCustomerStore.getState).mockReturnValue({
      clearCustomers
    } as any);
    vi.mocked(useSalesStore.getState).mockReturnValue({
      clearCart,
      clearHeldSales
    } as any);
    vi.mocked(useSalesHistoryStore.getState).mockReturnValue({
      clearSales
    } as any);
    vi.mocked(usePreferencesStore.getState).mockReturnValue({
      clearPreferences
    } as any);

    const store = await buildStore();
    await store.getState().logout();

    expect(signOut).toHaveBeenCalledWith({});
    expect(clearItems).toHaveBeenCalled();
    expect(clearCustomers).toHaveBeenCalled();
    expect(clearCart).toHaveBeenCalled();
    expect(clearHeldSales).toHaveBeenCalled();
    expect(clearSales).toHaveBeenCalled();
    expect(clearPreferences).toHaveBeenCalled();
    expect(store.getState().isLoading).toBe(false);
  });
});
