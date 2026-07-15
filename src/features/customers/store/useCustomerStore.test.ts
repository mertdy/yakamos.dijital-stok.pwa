import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  const batchMock = {
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined)
  };
  return {
    collection: vi.fn(),
    doc: vi.fn(() => ({ id: 'mock-id' })),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    onSnapshot: vi.fn(() => vi.fn()),
    query: vi.fn(),
    where: vi.fn(),
    increment: vi.fn(val => val),
    writeBatch: vi.fn(() => batchMock),
    getDocs: vi.fn().mockResolvedValue({ docs: [] })
  };
});

vi.mock('@/core/firebase/config', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-id',
      displayName: 'Test Kullanıcısı',
      email: 'test@example.com'
    }
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

async function buildStore() {
  const { useCustomerStore } = await import('./useCustomerStore');
  return useCustomerStore;
}

describe('useCustomerStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct initial state', async () => {
    const store = await buildStore();
    const state = store.getState();
    expect(state.customers).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.unsubscribeSnapshot).toBeNull();
  });

  it('addCustomer triggers setDoc with UUID and name', async () => {
    const store = await buildStore();
    const newCustomer = {
      name: 'Ahmet',
      surname: 'Yılmaz',
      phone: '05551234567',
      email: 'ahmet@test.com',
      creditLimit: 500
    };
    const id = await store.getState().addCustomer(newCustomer);

    expect(id).toBeDefined();
    expect(setDoc).toHaveBeenCalled();
  });

  it('updateCustomer calls updateDoc', async () => {
    const store = await buildStore();
    store.setState({
      customers: [
        {
          id: 'c1',
          name: 'Ahmet',
          surname: 'Yılmaz',
          creditLimit: 500,
          createdAt: ''
        }
      ]
    });

    await store.getState().updateCustomer('c1', { name: 'Mehmet' });
    expect(updateDoc).toHaveBeenCalled();
  });

  it('addPayment executes transaction batch write', async () => {
    const store = await buildStore();
    const paymentId = await store.getState().addPayment('c1', 100);

    expect(paymentId).toBeDefined();
    const batch = vi.mocked(writeBatch).mock.results[0]?.value;
    expect(batch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'test-user-id',
        collectedBy: {
          userId: 'test-user-id',
          displayName: 'Test Kullanıcısı',
          email: 'test@example.com'
        }
      })
    );
  });

  it('getCustomerTransactions fetches sales and payments and merges them', async () => {
    const store = await buildStore();

    // Mock getDocs to return mock documents for sales and payments
    const salesMockDocs = [
      {
        id: 's1',
        data: () => ({
          totalAmount: 150,
          createdAt: new Date().toISOString(),
          invoiceNumber: 'INV-123',
          paymentMethod: 'Credit'
        })
      },
      {
        id: 's-cancelled',
        data: () => ({
          totalAmount: 999,
          createdAt: new Date().toISOString(),
          paymentMethod: 'Credit',
          status: 'cancelled'
        })
      }
    ];

    const paymentsMockDocs = [
      {
        id: 'p1',
        data: () => ({
          amount: 50,
          createdAt: new Date().toISOString(),
          collectedBy: {
            userId: 'collector-1',
            displayName: 'Ayşe Demir',
            email: 'ayse@example.com'
          }
        })
      }
    ];

    // Mock two successive calls of getDocs
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ docs: salesMockDocs } as any)
      .mockResolvedValueOnce({ docs: paymentsMockDocs } as any);

    const txs = await store.getState().getCustomerTransactions('c1');

    expect(txs.length).toBe(2);
    expect(txs[0].type).toBeDefined();
    expect(txs.find(tx => tx.type === 'PAYMENT')?.collectedBy).toEqual({
      userId: 'collector-1',
      displayName: 'Ayşe Demir',
      email: 'ayse@example.com'
    });
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  it('records a tenant-scoped WhatsApp statement audit entry', async () => {
    const store = await buildStore();

    const id = await store.getState().recordStatementShare({
      customerId: 'c1',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      openingBalanceMinor: 10_000,
      closingBalanceMinor: 15_000,
      transactionCount: 2,
      includedTransactions: true,
      messageCharacterCount: 300
    });

    expect(id).toBeDefined();
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: 'test-company-id',
        createdBy: 'test-user-id',
        channel: 'WHATSAPP',
        mode: 'CLICK_TO_CHAT',
        status: 'OPENED'
      })
    );
  });
});
