import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeBatch } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  const batchMock = {
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined)
  };
  return {
    collection: vi.fn(),
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    increment: vi.fn(val => val),
    writeBatch: vi.fn(() => batchMock)
  };
});

vi.mock('@/core/firebase/config', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

async function buildStore() {
  const { useSalesStore } = await import('./useSalesStore');
  return useSalesStore;
}

describe('useSalesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct initial state', async () => {
    const store = await buildStore();
    const state = store.getState();
    expect(state.cart).toEqual([]);
    expect(state.customerId).toBeNull();
    expect(state.discountType).toBe('amount');
    expect(state.discountValue).toBe(0);
    expect(state.paymentMethod).toBe('Cash');
    expect(state.heldSales).toEqual([]);
  });

  it('addToCart adds a new item or increments quantity of existing item', async () => {
    const store = await buildStore();
    store.setState({ cart: [] });

    const item = { inventoryId: 'p1', name: 'Item 1', price: 10, quantity: 2 };
    store.getState().addToCart(item);
    expect(store.getState().cart).toEqual([item]);

    // Add again to increment quantity
    store
      .getState()
      .addToCart({ inventoryId: 'p1', name: 'Item 1', price: 10, quantity: 3 });
    expect(store.getState().cart[0].quantity).toBe(5);
  });

  it('removeFromCart removes item by id', async () => {
    const store = await buildStore();
    store.setState({
      cart: [
        { inventoryId: 'p1', name: 'Item 1', price: 10, quantity: 2 },
        { inventoryId: 'p2', name: 'Item 2', price: 5, quantity: 1 }
      ]
    });

    store.getState().removeFromCart('p1');
    expect(store.getState().cart.length).toBe(1);
    expect(store.getState().cart[0].inventoryId).toBe('p2');
  });

  it('updateQuantity modifies target item quantity', async () => {
    const store = await buildStore();
    store.setState({
      cart: [{ inventoryId: 'p1', name: 'Item 1', price: 10, quantity: 2 }]
    });

    store.getState().updateQuantity('p1', 5);
    expect(store.getState().cart[0].quantity).toBe(5);
  });

  it('holdSale saves cart to heldSales and clears active cart', async () => {
    const store = await buildStore();
    store.setState({
      cart: [{ inventoryId: 'p1', name: 'Item 1', price: 10, quantity: 2 }],
      customerId: 'c1',
      heldSales: []
    });

    store.getState().holdSale();
    expect(store.getState().heldSales.length).toBe(1);
    expect(store.getState().heldSales[0].cart[0].name).toBe('Item 1');
    expect(store.getState().cart).toEqual([]);
    expect(store.getState().customerId).toBeNull();
  });

  it('restoreSale loads held sale to active cart and removes it from heldSales', async () => {
    const store = await buildStore();
    store.setState({
      cart: [],
      heldSales: [
        {
          id: 'h1',
          cart: [{ inventoryId: 'p1', name: 'Item 1', price: 10, quantity: 2 }],
          customerId: 'c1',
          discountType: 'amount',
          discountValue: 0,
          paymentMethod: 'Cash',
          timestamp: ''
        }
      ]
    });

    store.getState().restoreSale('h1');
    expect(store.getState().cart.length).toBe(1);
    expect(store.getState().cart[0].name).toBe('Item 1');
    expect(store.getState().customerId).toBe('c1');
    expect(store.getState().heldSales).toEqual([]);
  });

  it('checkout submits firestore batch and clears cart', async () => {
    const store = await buildStore();
    store.setState({
      cart: [{ inventoryId: 'p1', name: 'Item 1', price: 10, quantity: 2 }],
      customerId: 'c1',
      paymentMethod: 'Cash'
    });

    const success = await store.getState().checkout();
    expect(success).toBe(true);
    expect(writeBatch).toHaveBeenCalled();
    expect(store.getState().cart).toEqual([]);
  });
});
