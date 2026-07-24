import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocs, writeBatch } from 'firebase/firestore';

const { batchMock, authState } = vi.hoisted(() => ({
  batchMock: {
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined)
  },
  authState: {
    value: {
      profile: { activeCompanyId: 'test-company-id', name: 'Test Sahibi' },
      activeMembership: {
        companyId: 'test-company-id',
        role: 'OWNER',
        permissions: ['VIEW_SALES_HISTORY']
      }
    }
  }
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    query: vi.fn(),
    where: vi.fn(),
    documentId: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn(),
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
    getState: () => authState.value
  }
}));

async function buildStore() {
  const { useSalesHistoryStore } = await import('./useSalesHistoryStore');
  return useSalesHistoryStore;
}

describe('useSalesHistoryStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    batchMock.commit.mockResolvedValue(undefined);
    authState.value = {
      profile: { activeCompanyId: 'test-company-id', name: 'Test Sahibi' },
      activeMembership: {
        companyId: 'test-company-id',
        role: 'OWNER',
        permissions: ['VIEW_SALES_HISTORY']
      }
    };
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
    getDocsMock.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            userId: 'test-user-id',
            employeeName: 'Test Sahibi'
          })
        }
      ]
    } as any);

    const store = await buildStore();
    await store.getState().fetchSales();

    expect(store.getState().sales.length).toBe(2);
    expect(store.getState().sales[0].sellerName).toBe('Test Sahibi');
    expect(getDocs).toHaveBeenCalled();
  });

  it('uses an employee membership name for legacy sales without a seller name', async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'legacy-sale',
            data: () => ({
              id: 'legacy-sale',
              userId: 'employee-id',
              companyId: 'test-company-id',
              invoiceNumber: 'INV-LEGACY',
              customerId: null,
              subtotal: 100,
              discount: 0,
              totalAmount: 100,
              paymentMethod: 'Cash',
              createdAt: '2026-07-10T01:00:00Z',
              cart: []
            })
          }
        ]
      } as any)
      .mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              userId: 'employee-id',
              employeeName: 'Ayşe Yılmaz'
            })
          }
        ]
      } as any);

    const store = await buildStore();
    await store.getState().fetchSales();

    expect(store.getState().sales).toEqual([
      expect.objectContaining({ sellerName: 'Ayşe Yılmaz' })
    ]);
  });

  it('prefers the user profile name over a membership email for legacy sales', async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'legacy-sale',
            data: () => ({
              userId: 'employee-id',
              companyId: 'test-company-id',
              invoiceNumber: 'INV-LEGACY',
              customerId: null,
              subtotal: 100,
              discount: 0,
              totalAmount: 100,
              paymentMethod: 'Cash',
              createdAt: '2026-07-10T01:00:00Z',
              cart: []
            })
          }
        ]
      } as any)
      .mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              userId: 'employee-id',
              email: 'ayse@example.com'
            })
          }
        ]
      } as any)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'employee-id',
            data: () => ({ name: 'Ayşe Yılmaz' })
          }
        ]
      } as any);

    const store = await buildStore();
    await store.getState().fetchSales();

    expect(store.getState().sales).toEqual([
      expect.objectContaining({ sellerName: 'Ayşe Yılmaz' })
    ]);
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

  it('skips the sales query for employees without the view permission', async () => {
    authState.value = {
      profile: { activeCompanyId: 'test-company-id', name: 'Test Sahibi' },
      activeMembership: {
        companyId: 'test-company-id',
        role: 'EMPLOYEE',
        permissions: []
      }
    };

    const store = await buildStore();
    store.setState({
      sales: [{ id: 'stale-sale' } as never],
      rawSales: [{ id: 'stale-sale' } as never],
      loadedCompanyId: 'test-company-id'
    });

    await store.getState().fetchSales();

    expect(getDocs).not.toHaveBeenCalled();
    expect(store.getState().sales).toEqual([]);
    expect(store.getState().rawSales).toEqual([]);
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

  it('shows a newly completed sale immediately without fetching again', async () => {
    const store = await buildStore();
    store.setState({
      loadedCompanyId: 'test-company-id',
      filters: { paymentMethod: 'Cash' }
    });

    store.getState().recordSale({
      id: 'new-sale',
      userId: 'test-user-id',
      companyId: 'test-company-id',
      invoiceNumber: 'INV-NEW',
      customerId: null,
      subtotal: 100,
      discount: 0,
      totalAmount: 100,
      paymentMethod: 'Cash',
      status: 'completed',
      createdAt: '2026-07-10T01:00:00Z',
      cart: []
    });

    expect(store.getState().rawSales).toHaveLength(1);
    expect(store.getState().sales).toEqual([
      expect.objectContaining({ id: 'new-sale', invoiceNumber: 'INV-NEW' })
    ]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('updates a pending sale when its backup is confirmed', async () => {
    const store = await buildStore();
    const sale = {
      id: 'pending-sale',
      userId: 'test-user-id',
      companyId: 'test-company-id',
      invoiceNumber: 'INV-PENDING',
      customerId: null,
      subtotal: 100,
      discount: 0,
      totalAmount: 100,
      paymentMethod: 'Cash',
      status: 'completed' as const,
      syncStatus: 'pending' as const,
      createdAt: '2026-07-10T01:00:00Z',
      cart: []
    };
    store.setState({ rawSales: [sale], sales: [sale] });

    store.getState().updateSaleSyncStatus('pending-sale', 'synced');

    expect(store.getState().sales[0].syncStatus).toBe('synced');
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

  it('cancels a sale locally before its offline backup is confirmed', async () => {
    let resolveBackup: () => void;
    batchMock.commit.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveBackup = resolve;
        })
    );
    const sale = {
      id: 'pending-sale',
      userId: 'test-user-id',
      companyId: 'test-company-id',
      invoiceNumber: 'INV-PENDING',
      customerId: null,
      subtotal: 100,
      discount: 0,
      totalAmount: 100,
      paymentMethod: 'Cash',
      status: 'completed' as const,
      syncStatus: 'synced' as const,
      createdAt: '2026-07-10T01:00:00Z',
      cart: [{ inventoryId: 'p1', name: 'Product 1', price: 100, quantity: 1 }]
    };
    const store = await buildStore();
    store.setState({ rawSales: [sale], sales: [sale] });

    await expect(store.getState().cancelSale('pending-sale')).resolves.toBe(
      true
    );

    expect(store.getState().sales[0]).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        syncStatus: 'pending'
      })
    );

    resolveBackup!();
    await vi.waitFor(() => {
      expect(store.getState().sales[0].syncStatus).toBe('synced');
    });
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
