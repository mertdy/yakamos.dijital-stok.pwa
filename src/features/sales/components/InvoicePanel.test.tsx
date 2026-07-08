import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { InvoicePanel } from './InvoicePanel';
import { useSalesStore } from '../store/useSalesStore';
import { useCustomerStore } from '../../customers/store/useCustomerStore';

// Mock lucide-react to avoid SVG render issues
vi.mock('lucide-react', () => ({
  UserPlus: () => <div data-testid="icon-user-plus" />,
  Tag: () => <div data-testid="icon-tag" />,
  Banknote: () => <div data-testid="icon-banknote" />,
  CreditCard: () => <div data-testid="icon-credit-card" />,
  QrCode: () => <div data-testid="icon-qr-code" />,
  Loader2: () => <div data-testid="icon-loader2" />,
  Pause: () => <div data-testid="icon-pause" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  Receipt: () => <div data-testid="icon-receipt" />,
}));

// Mock Zustand stores
vi.mock('../store/useSalesStore');
vi.mock('../../customers/store/useCustomerStore');

const mockUseSalesStore = useSalesStore as unknown as ReturnType<typeof vi.fn>;
const mockUseCustomerStore = useCustomerStore as unknown as ReturnType<typeof vi.fn>;

describe('InvoicePanel', () => {
  beforeEach(() => {
    mockUseSalesStore.mockReturnValue({
      cart: [{ inventoryId: '1', name: 'Test Product', price: 100, quantity: 2 }], // subtotal = 200
      isProcessing: false,
      customerId: null,
      discountType: 'amount',
      discountValue: 0,
      paymentMethod: 'Cash',
      heldSales: [],
      checkout: vi.fn(),
      holdSale: vi.fn(),
      setDiscount: vi.fn(),
      setPaymentMethod: vi.fn(),
      clearCart: vi.fn(),
    });

    (useSalesStore as any).getState = vi.fn().mockReturnValue({ heldSales: [] });

    mockUseCustomerStore.mockReturnValue({
      customers: [
        { id: 'c1', name: 'John', surname: 'Doe', creditLimit: 100, totalDebt: 50 }, // Credit limit exceeded with 210
        { id: 'c2', name: 'Jane', surname: 'Doe', creditLimit: 500, totalDebt: 0 }
      ]
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and calculates subtotal', () => {
    render(<InvoicePanel onOpenCustomerDrawer={vi.fn()} onOpenHeldSalesDrawer={vi.fn()} />);
    
    // Subtotal: 200, Total: 200
    expect(screen.getAllByText('₺200.00').length).toBeGreaterThan(0);
  });

  it('disables Credit (Veresiye) button if credit limit is exceeded', () => {
    mockUseSalesStore.mockReturnValue({
      ...mockUseSalesStore(),
      customerId: 'c1',
    });

    render(<InvoicePanel onOpenCustomerDrawer={vi.fn()} onOpenHeldSalesDrawer={vi.fn()} />);

    // Total is 200. Debt is 50. Total new debt = 250. Limit is 100. Should exceed.
    const veresiyeBtn = screen.getByText('Veresiye').closest('button');
    expect(veresiyeBtn).toBeDisabled();
    expect(screen.getByText('Müşteri borç limitini aşmıştır')).toBeInTheDocument();
  });

  it('enables Credit button if within credit limit', () => {
    mockUseSalesStore.mockReturnValue({
      ...mockUseSalesStore(),
      customerId: 'c2',
    });

    render(<InvoicePanel onOpenCustomerDrawer={vi.fn()} onOpenHeldSalesDrawer={vi.fn()} />);

    const veresiyeBtn = screen.getByText('Veresiye').closest('button');
    expect(veresiyeBtn).not.toBeDisabled();
  });

  it('handles discount inputs correctly', () => {
    const setDiscountMock = vi.fn();
    mockUseSalesStore.mockReturnValue({
      ...mockUseSalesStore(),
      setDiscount: setDiscountMock
    });

    render(<InvoicePanel onOpenCustomerDrawer={vi.fn()} onOpenHeldSalesDrawer={vi.fn()} />);

    const input = screen.getByPlaceholderText('İndirim Miktarı');
    fireEvent.change(input, { target: { value: '20' } });

    expect(setDiscountMock).toHaveBeenCalledWith('amount', 20);
  });
});
