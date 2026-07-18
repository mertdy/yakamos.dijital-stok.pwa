import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeBatch } from 'firebase/firestore';

const { batchMock, recordSaleMock, updateSaleSyncStatusMock } = vi.hoisted(
  () => ({
    batchMock: {
      set: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined)
    },
    recordSaleMock: vi.fn(),
    updateSaleSyncStatusMock: vi.fn()
  })
);

vi.mock('firebase/firestore', () => {
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

vi.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      profile: { activeCompanyId: 'test-company-id', name: 'Test Sahibi' },
      activeMembership: { role: 'OWNER', permissions: [] }
    })
  }
}));

vi.mock('@/features/sales-history', () => ({
  useSalesHistoryStore: {
    getState: () => ({
      recordSale: recordSaleMock,
      updateSaleSyncStatus: updateSaleSyncStatusMock,
      confirmSaleBackup: updateSaleSyncStatusMock,
      failSaleBackup: updateSaleSyncStatusMock
    })
  }
}));

async function buildStore() {
  const { useSalesStore } = await import('./useSalesStore');
  return useSalesStore;
}

describe('useSalesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordSaleMock.mockClear();
    updateSaleSyncStatusMock.mockClear();
    batchMock.commit.mockResolvedValue(undefined);
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

  it('syncCartItemProduct refreshes product details while preserving quantity', async () => {
    const store = await buildStore();
    store.setState({
      cart: [
        {
          inventoryId: 'p1',
          name: 'Eski ad',
          price: 10,
          quantity: 3,
          barcode: 'old-barcode'
        }
      ]
    });

    store.getState().syncCartItemProduct({
      inventoryId: 'p1',
      name: 'Yeni ad',
      price: 15,
      barcode: 'new-barcode',
      imageUrl: 'https://example.com/product.jpg'
    });

    expect(store.getState().cart).toEqual([
      {
        inventoryId: 'p1',
        name: 'Yeni ad',
        price: 15,
        quantity: 3,
        barcode: 'new-barcode',
        imageUrl: 'https://example.com/product.jpg'
      }
    ]);
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

  it('makes a completed sale immediately available in sales history', async () => {
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
    expect(recordSaleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mock-doc-id',
        companyId: 'test-company-id',
        sellerName: 'Test Sahibi',
        paymentMethod: 'Cash',
        status: 'completed',
        totalAmount: 20
      })
    );
  });

  it('completes checkout before an offline backup is confirmed', async () => {
    let resolveBackup: () => void;
    batchMock.commit.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveBackup = resolve;
        })
    );

    const store = await buildStore();
    store.setState({
      cart: [{ inventoryId: 'p1', name: 'Item 1', price: 10, quantity: 2 }],
      paymentMethod: 'Cash'
    });

    await expect(store.getState().checkout()).resolves.toBe(true);

    expect(store.getState().isProcessing).toBe(false);
    expect(store.getState().cart).toEqual([]);
    expect(recordSaleMock).toHaveBeenCalledWith(
      expect.objectContaining({ syncStatus: 'pending' })
    );
    expect(updateSaleSyncStatusMock).not.toHaveBeenCalled();

    resolveBackup!();
    await vi.waitFor(() => {
      expect(updateSaleSyncStatusMock).toHaveBeenCalledWith('mock-doc-id');
    });
  });
});
