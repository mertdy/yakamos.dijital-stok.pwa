import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PaymentModal } from './PaymentModal';
import { useCustomerStore } from '../store/useCustomerStore';
import { toast } from '@heroui/react';

vi.mock('lucide-react', () => ({
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  Banknote: () => <div data-testid="icon-banknote" />,
  Loader2: () => <div data-testid="icon-loader" />,
  Info: () => <div data-testid="icon-info" />,
  Printer: () => <div data-testid="icon-printer" />
}));

vi.mock('../store/useCustomerStore');

vi.mock('react-to-print', () => ({
  useReactToPrint: vi.fn(() => vi.fn())
}));

vi.mock('@heroui/react', async importOriginal => {
  const original = await importOriginal<typeof import('@heroui/react')>();
  return {
    ...original,
    toast: {
      success: vi.fn(),
      danger: vi.fn()
    }
  };
});

// Since the component prints a ReceiptTemplate which imports useSalesStore internally,
// we should mock useSalesStore as well.
vi.mock('@/features/sales', () => {
  const ReceiptTemplateMock = () => <div data-testid="receipt-template" />;
  return {
    ReceiptTemplate: ReceiptTemplateMock
  };
});

const mockUseCustomerStore = useCustomerStore as unknown as ReturnType<
  typeof vi.fn
>;

describe('PaymentModal', () => {
  const onClose = vi.fn();
  const onPaymentSuccess = vi.fn();
  const addPaymentMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCustomerStore.mockReturnValue({
      addPayment: addPaymentMock
    });
  });

  it('renders correctly when open', () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        customerId="c1"
        currentDebt={150}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    expect(screen.getByText('Tahsilat Al')).toBeInTheDocument();
    expect(screen.getByText('₺150,00')).toBeInTheDocument(); // Turkish locale format
  });

  it('sets payment amount to full debt when TÜMÜ button is clicked', () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        customerId="c1"
        currentDebt={150}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    const payAllBtn = screen.getByRole('button', { name: 'TÜMÜ' });
    fireEvent.click(payAllBtn);

    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(input.value).toBe('150');
  });

  it('shows overpayment warning when input amount is greater than debt', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        customerId="c1"
        currentDebt={150}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '200' } });

    await waitFor(() => {
      expect(
        screen.getByText(/Girdiğiniz tutar mevcut borçtan fazla/i)
      ).toBeInTheDocument();
    });
  });

  it('calls addPayment and triggers success flow on valid submit', async () => {
    addPaymentMock.mockResolvedValueOnce('pay-id-123');

    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        customerId="c1"
        currentDebt={150}
        onPaymentSuccess={onPaymentSuccess}
      />
    );

    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '50' } });

    const submitBtn = screen.getByRole('button', { name: /Kaydet/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addPaymentMock).toHaveBeenCalledWith('c1', 50);
      expect(toast.success).toHaveBeenCalledWith(
        'Tahsilat başarıyla kaydedildi'
      );
      expect(onPaymentSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
