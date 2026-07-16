import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocs, writeBatch } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  const batchMock = {
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined)
  };
  return {
    collection: vi.fn(),
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(() => ({
      exists: () => true,
      data: () => ({ stock: 10, totalDebt: 100 })
    })),
    increment: vi.fn(value => value),
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
      profile: { activeCompanyId: 'test-company-id' },
      activeMembership: { role: 'OWNER', permissions: ['VIEW_SALES_HISTORY'] }
    })
  }
}));

async function buildStore() {
  const { useSalesHistoryStore } = await import('./useSalesHistoryStore');
  return useSalesHistoryStore;
}

describe('useSalesHistoryStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const store = await buildStore();
    store.setState({
      sales: [],
      rawSales: [],
      isLoading: false,
      loadedCompanyId: null,
      loadingCompanyId: null,
      filters: {}
    });
  });

  it('has correct initial state', async () => {
    const store = await buildStore();
    const state = store.getState();
    expect(state.sales).toEqual([]);
    expect(state.rawSales).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.filters).toEqual({});
  });

  it('fetchSales retrieves data and filters client-side', async () => {
    const mockSales = [
      {
        id: 'sale-1',
        userId: 'test-user-id',
        companyId: 'test-company-id',
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        subtotal: 100,
        discount: 0,
        totalAmount: 100,
        paymentMethod: 'Cash',
        createdAt: '2026-07-09T01:00:00Z',
        cart: []
      },
      {
        id: 'sale-2',
        userId: 'test-user-id',
        companyId: 'test-company-id',
        invoiceNumber: 'INV-002',
        customerId: 'cust-2',
        subtotal: 200,
        discount: 0,
        totalAmount: 200,
        paymentMethod: 'Credit',
        createdAt: '2026-07-09T02:00:00Z',
        cart: []
      }
    ];

    const getDocsMock = vi.mocked(getDocs);
    getDocsMock.mockResolvedValueOnce({
      docs: mockSales.map(sale => ({
        id: sale.id,
        data: () => sale
      }))
    } as any);

    const store = await buildStore();
    await store.getState().fetchSales();

    expect(store.getState().sales.length).toBe(2);
    expect(getDocs).toHaveBeenCalled();
  });

  it('shares an in-flight request for the active company', async () => {
    let resolveRequest: (value: unknown) => void;
    const request = new Promise(resolve => {
      resolveRequest = resolve;
    });
    vi.mocked(getDocs).mockReturnValueOnce(request as any);

    const store = await buildStore();
    const firstRequest = store.getState().fetchSales();
    const secondRequest = store.getState().fetchSales();

    expect(getDocs).toHaveBeenCalledTimes(1);

    resolveRequest!({ docs: [] });
    await Promise.all([firstRequest, secondRequest]);

    expect(store.getState().loadedCompanyId).toBe('test-company-id');
  });

  it('setFilters updates the visible sales without fetching again', async () => {
    const mockSales = [
      {
        id: 'sale-1',
        userId: 'test-user-id',
        companyId: 'test-company-id',
        invoiceNumber: 'INV-001',
        customerId: 'cust-1',
        subtotal: 100,
        discount: 0,
        totalAmount: 100,
        paymentMethod: 'Cash',
        createdAt: '2026-07-09T01:00:00Z',
        cart: []
      }
    ];

    const getDocsMock = vi.mocked(getDocs);
    getDocsMock.mockResolvedValue({
      docs: mockSales.map(sale => ({
        id: sale.id,
        data: () => sale
      }))
    } as any);

    const store = await buildStore();
    store.setState({ rawSales: mockSales as any, sales: mockSales as any });
    store.getState().setFilters({ searchQuery: 'INV-001' });

    expect(store.getState().filters.searchQuery).toBe('INV-001');
    expect(store.getState().sales).toHaveLength(1);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('clearFilters restores the unfiltered sales without fetching again', async () => {
    const store = await buildStore();
    const mockSales = [
      {
        id: 'sale-1',
        userId: 'test-user-id',
        companyId: 'test-company-id',
        invoiceNumber: 'INV-001',
        customerId: null,
        subtotal: 100,
        discount: 0,
        totalAmount: 100,
        paymentMethod: 'Cash',
        createdAt: '2026-07-09T01:00:00Z',
        cart: []
      }
    ];
    store.setState({
      rawSales: mockSales as any,
      sales: [],
      filters: { searchQuery: 'INV-001' }
    });
    store.getState().clearFilters();

    expect(store.getState().filters).toEqual({});
    expect(store.getState().sales).toEqual(mockSales);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('cancelSale performs batch updates and marks sale as cancelled', async () => {
    const mockSale = {
      id: 'sale-1',
      userId: 'test-user-id',
      companyId: 'test-company-id',
      invoiceNumber: 'INV-001',
      customerId: 'cust-1',
      subtotal: 100,
      discount: 0,
      totalAmount: 100,
      paymentMethod: 'Credit',
      createdAt: '2026-07-09T01:00:00Z',
      cart: [{ inventoryId: 'p1', name: 'Product 1', price: 50, quantity: 2 }]
    };

    const store = await buildStore();
    store.setState({ rawSales: [mockSale], sales: [mockSale] });

    const success = await store.getState().cancelSale('sale-1');

    expect(success).toBe(true);
    expect(writeBatch).toHaveBeenCalled();
    expect(store.getState().sales[0].status).toBe('cancelled');
  });

  it('clearSales resets sales array and filters', async () => {
    const store = await buildStore();
    store.setState({
      sales: [
        {
          id: 'sale-1',
          userId: 'test-user-id',
          companyId: 'test-company-id',
          invoiceNumber: 'INV-001',
          customerId: 'cust-1',
          subtotal: 100,
          discount: 0,
          totalAmount: 100,
          paymentMethod: 'Cash',
          createdAt: '2026-07-09T01:00:00Z',
          cart: []
        }
      ],
      filters: { searchQuery: 'INV-001' }
    });

    store.getState().clearSales();
    expect(store.getState().sales).toEqual([]);
    expect(store.getState().filters).toEqual({});
  });
});
