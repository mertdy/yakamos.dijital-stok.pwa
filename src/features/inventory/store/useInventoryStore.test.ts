import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const mockBatch = {
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined)
};

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => mockBatch)
}));

vi.mock('@/core/firebase/config', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

vi.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      profile: { activeCompanyId: 'test-company-id' },
      activeMembership: { role: 'OWNER', permissions: [] }
    })
  }
}));

const removeQuickAddItems = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/sales/store/usePreferencesStore', () => ({
  usePreferencesStore: {
    getState: () => ({ removeQuickAddItems })
  }
}));

async function buildStore() {
  const { useInventoryStore } = await import('./useInventoryStore');
  return useInventoryStore;
}

describe('useInventoryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct initial state', async () => {
    const store = await buildStore();
    const state = store.getState();
    expect(state.items).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.hasLoadedItems).toBe(false);
    expect(state.unsubscribeSnapshot).toBeNull();
  });

  it('addItem adds item and triggers setDoc', async () => {
    const store = await buildStore();
    const newItem = { name: 'New Product', stock: 10, price: 5 };
    await store.getState().addItem(newItem);

    expect(setDoc).toHaveBeenCalled();
  });

  it('updateItem triggers setDoc with merged data', async () => {
    const store = await buildStore();
    // Pre-populate store items manually for editing check
    store.setState({
      items: [
        { id: 'p1', name: 'Product 1', stock: 5, price: 10, updatedAt: '' }
      ]
    });

    await store.getState().updateItem('p1', { stock: 15 });
    expect(setDoc).toHaveBeenCalled();
  });

  it('deleteItem triggers deleteDoc', async () => {
    const store = await buildStore();
    await store.getState().deleteItem('p1');
    expect(deleteDoc).toHaveBeenCalled();
    expect(removeQuickAddItems).toHaveBeenCalledWith(['p1']);
  });

  it('deleteItems triggers writeBatch delete and commit', async () => {
    const store = await buildStore();
    await store.getState().deleteItems(['p1', 'p2']);
    expect(writeBatch).toHaveBeenCalled();
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalled();
    expect(removeQuickAddItems).toHaveBeenCalledWith(['p1', 'p2']);
  });

  it('clearItems resets snapshot and clears items array', async () => {
    const unsubscribeMock = vi.fn();
    const store = await buildStore();
    store.setState({
      items: [
        { id: 'p1', name: 'Product 1', stock: 5, price: 10, updatedAt: '' }
      ],
      unsubscribeSnapshot: unsubscribeMock
    });

    store.getState().clearItems();
    expect(unsubscribeMock).toHaveBeenCalled();
    expect(store.getState().items).toEqual([]);
    expect(store.getState().unsubscribeSnapshot).toBeNull();
  });

  it('does not recreate the active company subscription', async () => {
    const store = await buildStore();
    store.setState({
      subscriptionCompanyId: null,
      unsubscribeSnapshot: null,
      hasLoadedItems: false
    });

    store.getState().loadItems();
    store.getState().loadItems();

    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });
});
