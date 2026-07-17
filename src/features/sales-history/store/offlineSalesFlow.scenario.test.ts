import { beforeEach, describe, expect, it, vi } from 'vitest';

const { batchMock } = vi.hoisted(() => ({
  batchMock: {
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn()
  }
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn((...args: unknown[]) => ({
    id: typeof args.at(-1) === 'string' ? args.at(-1) : 'offline-sale-id'
  })),
  increment: vi.fn(value => value),
  writeBatch: vi.fn(() => batchMock)
}));

vi.mock('@/core/firebase/config', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } }
}));

vi.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({
      profile: { activeCompanyId: 'test-company-id' },
      activeMembership: { role: 'OWNER', permissions: [] }
    })
  }
}));

async function buildStores() {
  const [{ useSalesStore }, { useSalesHistoryStore }] = await Promise.all([
    import('@/features/sales/store/useSalesStore'),
    import('./useSalesHistoryStore')
  ]);
  return { useSalesStore, useSalesHistoryStore };
}

describe('Offline sales scenarios', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useSalesStore, useSalesHistoryStore } = await buildStores();
    useSalesStore.setState({
      cart: [],
      isProcessing: false,
      customerId: null,
      discountType: 'amount',
      discountValue: 0,
      paymentMethod: 'Cash'
    });
    useSalesHistoryStore.setState({
      sales: [],
      rawSales: [],
      filters: {},
      loadedCompanyId: 'test-company-id',
      loadingCompanyId: null,
      isLoading: false
    });
  });

  it('completes an offline sale, then keeps its cancellation pending until both backups finish', async () => {
    let resolveSaleBackup: () => void;
    let resolveCancellationBackup: () => void;
    batchMock.commit
      .mockImplementationOnce(
        () =>
          new Promise<void>(resolve => {
            resolveSaleBackup = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>(resolve => {
            resolveCancellationBackup = resolve;
          })
      );

    const { useSalesStore, useSalesHistoryStore } = await buildStores();
    useSalesStore.setState({
      cart: [
        {
          inventoryId: 'product-1',
          name: 'Çevrimdışı Ürün',
          price: 25,
          quantity: 2
        }
      ]
    });

    await expect(useSalesStore.getState().checkout()).resolves.toBe(true);
    expect(useSalesHistoryStore.getState().sales[0]).toEqual(
      expect.objectContaining({
        status: 'completed',
        syncStatus: 'pending',
        pendingBackupCount: 1
      })
    );

    await expect(
      useSalesHistoryStore.getState().cancelSale('offline-sale-id')
    ).resolves.toBe(true);
    expect(useSalesHistoryStore.getState().sales[0]).toEqual(
      expect.objectContaining({
        status: 'cancelled',
        syncStatus: 'pending',
        pendingBackupCount: 2
      })
    );

    resolveSaleBackup!();
    await vi.waitFor(() => {
      expect(useSalesHistoryStore.getState().sales[0]).toEqual(
        expect.objectContaining({
          status: 'cancelled',
          syncStatus: 'pending',
          pendingBackupCount: 1
        })
      );
    });

    resolveCancellationBackup!();
    await vi.waitFor(() => {
      expect(useSalesHistoryStore.getState().sales[0]).toEqual(
        expect.objectContaining({
          status: 'cancelled',
          syncStatus: 'synced',
          pendingBackupCount: 0
        })
      );
    });
  });
});
