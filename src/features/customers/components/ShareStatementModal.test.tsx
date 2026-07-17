import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@heroui/react';
import { ShareStatementModal } from './ShareStatementModal';
import { useCustomerStore } from '../store/useCustomerStore';

vi.mock('lucide-react', () => ({
  CalendarDays: () => <div data-testid="calendar-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  MessageCircle: () => <div data-testid="message-icon" />,
  ReceiptText: () => <div data-testid="receipt-icon" />
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: () => ({
    activeCompany: {
      id: 'company-1',
      name: 'Deneme Market',
      ownerId: 'owner-1',
      createdAt: '2026-01-01'
    }
  })
}));

vi.mock('../store/useCustomerStore');

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

const mockUseCustomerStore = useCustomerStore as unknown as ReturnType<
  typeof vi.fn
>;

describe('ShareStatementModal', () => {
  const recordStatementShare = vi.fn().mockResolvedValue('share-1');
  const onClose = vi.fn();
  const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCustomerStore.mockReturnValue({ recordStatementShare });
  });

  const renderModal = () =>
    render(
      <ShareStatementModal
        isOpen={true}
        onClose={onClose}
        customer={{
          id: 'customer-1',
          name: 'Ali',
          surname: 'Yılmaz',
          phone: '05551234567',
          createdAt: '2026-01-01'
        }}
        transactions={[
          {
            id: 'sale-1',
            type: 'SALE',
            amount: 250,
            date: '2026-07-03T10:00:00.000Z',
            description: 'Veresiye Satış'
          },
          {
            id: 'payment-1',
            type: 'PAYMENT',
            amount: 50,
            date: '2026-07-04T10:00:00.000Z',
            description: 'Tahsilat'
          }
        ]}
      />
    );

  it('shows calculated read-only statement preview', () => {
    renderModal();

    expect(screen.getByText('WhatsApp Ekstresi')).toBeInTheDocument();
    expect(screen.getByText(/\+905551234567/)).toBeInTheDocument();
    expect(screen.getByText(/\*Güncel borç: 200,00 ₺\*/)).toBeInTheDocument();
    expect(
      screen.getByText(/Tutarlar hesap hareketlerinden otomatik hesaplanır/)
    ).toBeInTheDocument();
  });

  it('opens click-to-chat and records an OPENED audit entry', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /WhatsApp'ta Aç/i }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/905551234567?text='),
        '_blank'
      );
      expect(recordStatementShare).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-1',
          closingBalanceMinor: 20_000,
          transactionCount: 2,
          includedTransactions: true
        })
      );
      expect(toast.success).toHaveBeenCalledWith('WhatsApp açıldı');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('removes deselected summary fields from the message preview', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Devir/i }));

    expect(screen.queryByText(/Devir bakiyesi:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Veresiye alışlar:/)).toBeInTheDocument();
  });
});
