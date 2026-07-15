import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CustomerDetailView } from './CustomerDetailView';
import { useCustomerStore } from '../store/useCustomerStore';

// Mock zustand store
vi.mock('../store/useCustomerStore', () => ({
  useCustomerStore: vi.fn()
}));

// Mock react-router-dom
vi.mock('@/features/auth', () => ({
  useAuthStore: Object.assign(
    () => ({
      activeMembership: { role: 'OWNER', permissions: [] }
    }),
    {
      getState: () => ({
        activeMembership: { role: 'OWNER', permissions: [] }
      })
    }
  )
}));
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as any),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' })
  };
});

describe('CustomerDetailView', () => {
  const mockCustomers = [
    {
      id: '1',
      name: 'Ali',
      surname: 'Yılmaz',
      phone: '5551234567',
      creditLimit: 1000,
      totalDebt: 500,
      createdAt: '2024-01-01'
    }
  ];

  const mockGetTransactions = vi.fn().mockResolvedValue([
    {
      id: 'tx1',
      type: 'SALE',
      amount: 500,
      date: '2024-01-02T10:00:00Z',
      description: 'Veresiye Satış'
    }
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    (useCustomerStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      customers: mockCustomers,
      isLoading: false,
      loadCustomers: vi.fn(),
      getCustomerTransactions: mockGetTransactions,
      addPayment: vi.fn()
    });
  });

  const renderComponent = () => {
    render(
      <BrowserRouter>
        <CustomerDetailView />
      </BrowserRouter>
    );
  };

  it('renders customer details correctly', async () => {
    renderComponent();

    expect(screen.getByText('Ali Yılmaz')).toBeInTheDocument();
    expect(screen.getByText('5551234567')).toBeInTheDocument();

    // Check debts
    expect(screen.getByText(/500,00/)).toBeInTheDocument();
    expect(screen.getByText(/1.000,00/)).toBeInTheDocument();
  });

  it('loads and displays transactions', async () => {
    renderComponent();

    expect(mockGetTransactions).toHaveBeenCalledWith('1');

    await waitFor(() => {
      expect(screen.getByText('Veresiye Satış')).toBeInTheDocument();
    });
  });

  it('shows the user who recorded a payment in the statement', async () => {
    mockGetTransactions.mockResolvedValueOnce([
      {
        id: 'payment-1',
        type: 'PAYMENT',
        amount: 200,
        date: '2024-01-02T10:00:00Z',
        description: 'Tahsilat',
        collectedBy: {
          userId: 'user-2',
          displayName: 'Ayşe Demir',
          email: 'ayse@example.com'
        }
      }
    ]);

    renderComponent();

    expect(await screen.findByText('Ayşe Demir')).toBeInTheDocument();
    expect(screen.getByText('ayse@example.com')).toBeInTheDocument();
  });

  it('opens payment modal when Tahsilat Al is clicked', async () => {
    renderComponent();

    const payButton = screen.getByText('Tahsilat Al');
    fireEvent.click(payButton);

    // Modal should appear
    expect(
      screen.getByText('Müşteri borcundan düşülecek tutar')
    ).toBeInTheDocument();
  });
});
