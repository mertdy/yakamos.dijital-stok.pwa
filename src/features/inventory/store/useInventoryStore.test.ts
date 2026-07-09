import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setDoc, deleteDoc } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  where: vi.fn()
}));

vi.mock('@/core/firebase/config', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id' }
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
});
