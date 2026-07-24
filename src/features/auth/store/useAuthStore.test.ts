import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import {
  clearFirestorePersistence,
  clearUserLocalStorage,
  notifyOtherTabsOfLogout
} from '@/shared/utils/sessionCleanup';
import {
  getAuthErrorMessage,
  getAvailableActiveCompanyId
} from './useAuthStore';

// ─── Firebase mocks ───────────────────────────────────────────────────────────

const { firestoreState } = vi.hoisted(() => ({
  firestoreState: {
    activeCompanyId: 'company-a',
    companies: {
      'company-a': { id: 'company-a', name: 'Test Company' },
      'company-b': { id: 'company-b', name: 'İkinci İşletme' }
    } as Record<string, any>,
    userListener: null as any
  }
}));

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  updateProfile: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, collectionName, id) => ({
    id: id || 'mock-doc-id',
    path: collectionName
      ? `${collectionName}/${id || 'mock-doc-id'}`
      : id || 'mock-doc-id'
  })),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn((ref: any, callback: any) => {
    if (typeof callback === 'function') {
      const isUser =
        ref && (ref.path?.startsWith('users/') || ref.id === 'mock-doc-id');
      const isCompany = ref && ref.path?.startsWith('companies/');
      if (isUser) {
        firestoreState.userListener = callback;
        callback({
          exists: () => true,
          data: () => ({
            activeCompanyId: firestoreState.activeCompanyId,
            id: ref?.id || 'mock-doc-id',
            name: 'Test User'
          })
        });
      } else if (isCompany) {
        const companyId = ref.id;
        const companyData = firestoreState.companies[companyId] || {
          id: companyId,
          name: 'Test Company'
        };
        callback({
          exists: () => true,
          data: () => companyData
        });
      } else {
        // Fallback for memberships or queries
        callback({
          forEach: (cb: any) => {
            cb({
              data: () => ({
                id: 'membership-a',
                companyId: 'company-a',
                companyName: 'Test Company',
                role: 'OWNER',
                permissions: []
              })
            });
            cb({
              data: () => ({
                id: 'membership-b',
                companyId: 'company-b',
                companyName: 'İkinci İşletme',
                role: 'OWNER',
                permissions: []
              })
            });
          }
        });
      }
    }
    return vi.fn();
  }),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  updateDoc: vi.fn().mockImplementation(async (ref: any, data: any) => {
    if (data && 'activeCompanyId' in data) {
      firestoreState.activeCompanyId = data.activeCompanyId;
      if (firestoreState.userListener) {
        firestoreState.userListener({
          exists: () => true,
          data: () => ({
            activeCompanyId: data.activeCompanyId,
            id: ref?.id || 'mock-doc-id',
            name: 'Test User'
          })
        });
      }
    }
    return Promise.resolve();
  }),
  getDocs: vi.fn().mockResolvedValue({
    empty: true,
    docs: [],
    forEach: () => {}
  }),
  writeBatch: vi.fn()
}));

vi.mock('@/core/firebase/config', () => ({
  db: {},
  auth: {},
  googleProvider: {}
}));

vi.mock('@/shared/utils/sessionCleanup', () => ({
  clearFirestorePersistence: vi.fn().mockResolvedValue(true),
  clearUserLocalStorage: vi.fn(),
  notifyOtherTabsOfLogout: vi.fn().mockResolvedValue(undefined),
  releaseFirestoreClient: vi.fn().mockResolvedValue(undefined)
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

vi.mock('@/features/onboarding/store', () => ({
  useOnboardingStore: {
    getState: vi.fn(() => ({ clearOnboarding: vi.fn() }))
  }
}));

vi.mock('@/features/onboarding/store/useOnboardingStore', () => ({
  useOnboardingStore: {
    getState: vi.fn(() => ({ clearOnboarding: vi.fn() }))
  }
}));

vi.mock('@/features/inventory/store/useInventoryStore', () => ({
  useInventoryStore: {
    getState: vi.fn(() => ({ clearItems: vi.fn() }))
  }
}));

vi.mock('@/features/customers/store/useCustomerStore', () => ({
  useCustomerStore: {
    getState: vi.fn(() => ({ clearCustomers: vi.fn() }))
  }
}));

vi.mock('@/features/sales/store/useSalesStore', () => ({
  useSalesStore: {
    getState: vi.fn(() => ({ clearCart: vi.fn(), clearHeldSales: vi.fn() }))
  }
}));

vi.mock('@/features/sales/store/usePreferencesStore', () => ({
  usePreferencesStore: {
    getState: vi.fn(() => ({ clearPreferences: vi.fn() }))
  }
}));

vi.mock('@/features/sales-history/store/useSalesHistoryStore', () => ({
  useSalesHistoryStore: {
    getState: vi.fn(() => ({ clearSales: vi.fn() }))
  }
}));

vi.mock('@/features/promotions/store/usePricingRuleStore', () => ({
  usePricingRuleStore: {
    getState: vi.fn(() => ({ clearRules: vi.fn() }))
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

describe('getAvailableActiveCompanyId', () => {
  const memberships = [
    { companyId: 'company-a' },
    { companyId: 'company-b' }
  ] as never;

  it('keeps the active company when the membership still exists', () => {
    expect(getAvailableActiveCompanyId('company-b', memberships)).toBe(
      'company-b'
    );
  });

  it('falls back to another membership when the active company was removed', () => {
    expect(getAvailableActiveCompanyId('removed-company', memberships)).toBe(
      'company-a'
    );
  });

  it('clears the active company when no memberships remain', () => {
    expect(getAvailableActiveCompanyId('removed-company', [])).toBeNull();
  });

  it('does not keep an expired support membership active', () => {
    const memberships = [
      {
        companyId: 'expired-company',
        supportExpiresAt: { toMillis: () => Date.now() - 1 }
      },
      { companyId: 'company-a' }
    ] as never;

    expect(getAvailableActiveCompanyId('expired-company', memberships)).toBe(
      'company-a'
    );
  });
});

// ─── useAuthStore ─────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreState.activeCompanyId = 'company-a';
    firestoreState.userListener = null;
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
    await store.getState().setUser(fakeUser);
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
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({
      user: {
        uid: 'mockuid',
        email: 'test@example.com',
        displayName: 'Mock User',
        emailVerified: true
      }
    } as never);
    const store = await buildStore();
    await store.getState().loginWithEmail('test@example.com', 'password123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'test@example.com',
      'password123'
    );
    expect(store.getState().isLoading).toBe(true);
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
    expect(store.getState().isLoading).toBe(true);
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

  // ── updateDisplayName ─────────────────────────────────────────────────────

  it('updates the Firebase Auth and Firestore profile names', async () => {
    const user = { uid: 'user-1', displayName: 'Eski İsim' } as never;
    const store = await buildStore();
    store.setState({ user });

    await store.getState().updateDisplayName('  Yeni İsim  ');

    expect(updateProfile).toHaveBeenCalledWith(user, {
      displayName: 'Yeni İsim'
    });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      name: 'Yeni İsim'
    });
  });

  it('synchronizes membership names when the company name changes', async () => {
    const batch = { update: vi.fn(), commit: vi.fn().mockResolvedValue(null) };
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [{ ref: { id: 'membership-1' } }, { ref: { id: 'membership-2' } }]
    } as never);
    vi.mocked(writeBatch).mockReturnValue(batch as never);

    const store = await buildStore();
    store.setState({
      activeCompany: {
        id: 'company-1',
        name: 'Eski İşletme',
        ownerId: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    });

    await store.getState().updateCompanyProfile({ name: 'Yeni İşletme' });

    expect(batch.update).toHaveBeenCalledTimes(3);
    expect(batch.update).toHaveBeenCalledWith(expect.anything(), {
      name: 'Yeni İşletme'
    });
    expect(batch.update).toHaveBeenCalledWith(
      { id: 'membership-1' },
      { companyName: 'Yeni İşletme' }
    );
    expect(batch.commit).toHaveBeenCalledOnce();
  });

  it('loads the selected company immediately after an online company switch', async () => {
    const store = await buildStore();
    const fakeUser = { uid: 'user-1', email: 'test@example.com' } as never;
    await store.getState().setUser(fakeUser);

    await store.getState().switchCompany('company-b');

    expect(store.getState().profile?.activeCompanyId).toBe('company-b');
    expect(store.getState().activeCompany).toEqual({
      id: 'company-b',
      name: 'İkinci İşletme'
    });
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
    vi.mocked(signInWithPopup).mockResolvedValueOnce({
      user: {
        uid: 'mockuid',
        email: 'test@example.com',
        displayName: 'Mock User',
        emailVerified: true
      }
    } as never);
    const store = await buildStore();
    await store.getState().loginWithGoogle();
    expect(signInWithPopup).toHaveBeenCalledWith({}, {});
    expect(store.getState().isLoading).toBe(true);
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

  it('loginWithGoogle silently handles a user-closed popup', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce({
      code: 'auth/popup-closed-by-user'
    });
    const store = await buildStore();

    await expect(store.getState().loginWithGoogle()).resolves.toBeUndefined();
    expect(store.getState().authError).toBeNull();
    expect(store.getState().isLoading).toBe(false);
  });

  // ── logout ───────────────────────────────────────────────────────────────

  it('logout calls signOut and clears all stores', async () => {
    vi.mocked(signOut).mockResolvedValueOnce(undefined);

    const clearItems = vi.fn();
    const clearCustomers = vi.fn();
    const clearCart = vi.fn();
    const clearHeldSales = vi.fn();
    const clearSales = vi.fn();
    const clearRules = vi.fn();
    const clearPreferences = vi.fn();
    const clearOnboarding = vi.fn();

    const { useInventoryStore } =
      await import('@/features/inventory/store/useInventoryStore');
    const { useCustomerStore } =
      await import('@/features/customers/store/useCustomerStore');
    const { useSalesStore } =
      await import('@/features/sales/store/useSalesStore');
    const { usePreferencesStore } =
      await import('@/features/sales/store/usePreferencesStore');
    const { useSalesHistoryStore } =
      await import('@/features/sales-history/store/useSalesHistoryStore');
    const { usePricingRuleStore } =
      await import('@/features/promotions/store/usePricingRuleStore');
    const { useOnboardingStore } =
      await import('@/features/onboarding/store/useOnboardingStore');

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
    vi.mocked(usePricingRuleStore.getState).mockReturnValue({
      clearRules
    } as any);
    vi.mocked(usePreferencesStore.getState).mockReturnValue({
      clearPreferences
    } as any);
    vi.mocked(useOnboardingStore.getState).mockReturnValue({
      clearOnboarding
    } as any);

    const store = await buildStore();
    await store.getState().logout();

    expect(signOut).toHaveBeenCalledWith({});
    expect(clearItems).toHaveBeenCalled();
    expect(clearCustomers).toHaveBeenCalled();
    expect(clearCart).toHaveBeenCalled();
    expect(clearHeldSales).toHaveBeenCalled();
    expect(clearSales).toHaveBeenCalled();
    expect(clearRules).toHaveBeenCalled();
    expect(clearPreferences).toHaveBeenCalled();
    expect(clearOnboarding).toHaveBeenCalled();
    expect(notifyOtherTabsOfLogout).toHaveBeenCalled();
    expect(clearUserLocalStorage).toHaveBeenCalled();
    expect(clearFirestorePersistence).toHaveBeenCalled();
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().isLoggingOut).toBe(true);
  });
});
