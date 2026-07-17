import { beforeEach, describe, expect, it, vi } from 'vitest';
import { arrayRemove, getDoc, setDoc } from 'firebase/firestore';

const authState = vi.hoisted(() => ({ activeCompanyId: 'company-a' }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...path: string[]) => ({ path: path.join('/') })),
  arrayRemove: vi.fn((...items: string[]) => ({ items })),
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

  it('removes deleted products from the active company shortcuts', async () => {
    const store = await buildStore();
    store.setState({
      quickAddItems: ['product-a', 'product-b'],
      quickAddCompanyId: 'company-a'
    });

    await store.getState().removeQuickAddItems(['product-a']);

    expect(store.getState().quickAddItems).toEqual(['product-b']);
    expect(arrayRemove).toHaveBeenCalledWith('product-a');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        quickAddItemsByCompany: {
          'company-a': { items: ['product-a'] }
        }
      },
      { merge: true }
    );
  });

  it('ignores a legacy-preference migration that finishes after a company switch', async () => {
    let completeMigration: (() => void) | undefined;
    vi.mocked(setDoc).mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          completeMigration = resolve;
        })
    );
    vi.mocked(getDoc)
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ quickAddItems: ['product-a'] })
      } as never)
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          quickAddItemsByCompany: { 'company-b': ['product-b'] }
        })
      } as never);
    const store = await buildStore();

    const firstCompanyLoad = store.getState().loadPreferences();
    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));

    authState.activeCompanyId = 'company-b';
    await store.getState().loadPreferences();
    expect(store.getState().quickAddItems).toEqual(['product-b']);

    completeMigration?.();
    await firstCompanyLoad;

    expect(store.getState().quickAddItems).toEqual(['product-b']);
    expect(store.getState().quickAddCompanyId).toBe('company-b');
  });
});
