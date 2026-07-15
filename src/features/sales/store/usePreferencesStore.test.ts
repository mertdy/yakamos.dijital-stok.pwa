import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc, setDoc } from 'firebase/firestore';

const authState = vi.hoisted(() => ({ activeCompanyId: 'company-a' }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/core/firebase/config', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1' } }
}));

vi.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      profile: { activeCompanyId: authState.activeCompanyId }
    })
  }
}));

async function buildStore() {
  const { usePreferencesStore } = await import('./usePreferencesStore');
  return usePreferencesStore;
}

describe('usePreferencesStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    authState.activeCompanyId = 'company-a';
    const store = await buildStore();
    store.setState({
      quickAddItems: [],
      quickAddCompanyId: null,
      isLoading: false
    });
  });

  it('loads only the shortcuts of the active company', async () => {
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({
        quickAddItemsByCompany: {
          'company-a': ['product-a'],
          'company-b': ['product-b']
        }
      })
    } as never);
    const store = await buildStore();

    await store.getState().loadPreferences();
    expect(store.getState().quickAddItems).toEqual(['product-a']);

    authState.activeCompanyId = 'company-b';
    await store.getState().loadPreferences();
    expect(store.getState().quickAddItems).toEqual(['product-b']);
    expect(store.getState().quickAddCompanyId).toBe('company-b');
  });

  it('saves shortcuts under the active company key', async () => {
    const store = await buildStore();
    store.setState({ quickAddCompanyId: 'company-a' });

    await store.getState().saveQuickAddItems(['product-a']);

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      { quickAddItemsByCompany: { 'company-a': ['product-a'] } },
      { merge: true }
    );
  });
});
