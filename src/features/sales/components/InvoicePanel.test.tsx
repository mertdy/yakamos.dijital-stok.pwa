import {
  act,
  render,
  screen,
  fireEvent,
  waitFor
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvoicePanel } from './InvoicePanel';
import { useCustomerStore } from '@/features/customers';
import { toast } from '@heroui/react';
import { useGlobalBarcodeScanner } from '@/shared/hooks/useGlobalBarcodeScanner';

vi.mock('lucide-react', () => ({
  UserPlus: () => <div data-testid="icon-user-plus" />,
  Tag: () => <div data-testid="icon-tag" />,
  Banknote: () => <div data-testid="icon-banknote" />,
  CreditCard: () => <div data-testid="icon-credit-card" />,
  QrCode: () => <div data-testid="icon-qrcode" />,
  Loader2: () => <div data-testid="icon-loader2" />,
  Pause: () => <div data-testid="icon-pause" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  Receipt: () => <div data-testid="icon-receipt" />,
  Printer: () => <div data-testid="icon-printer" />
}));

const mockCart = [
  { inventoryId: 'p1', name: 'Water', price: 5, quantity: 2 },
  { inventoryId: 'p2', name: 'Cola', price: 15, quantity: 1 }
];

const checkoutMock = vi.fn();
const holdSaleMock = vi.fn();
const clearCartMock = vi.fn();
const setDiscountMock = vi.fn();
const setPaymentMethodMock = vi.fn();

const storeState = {
  cart: mockCart,
  isProcessing: false,
  customerId: null as string | null,
  discountType: 'amount',
  discountValue: 0,
  paymentMethod: 'Cash',
  heldSales: [] as any[],
  checkout: checkoutMock,
  holdSale: holdSaleMock,
  clearCart: clearCartMock,
  setDiscount: setDiscountMock,
  setPaymentMethod: setPaymentMethodMock
};

vi.mock('../store/useSalesStore', () => {
  const mockStore = vi.fn(() => storeState);
  (mockStore as any).getState = vi.fn(() => storeState);
  return { useSalesStore: mockStore };
});

vi.mock('@/features/customers', () => ({
  useCustomerStore: vi.fn()
}));

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

const mockUseCustomerStore = useCustomerStore as unknown as ReturnType<
  typeof vi.fn
>;

const BarcodeScannerScenario = ({
  onScan
}: {
  onScan: (barcode: string) => void;
}) => {
  useGlobalBarcodeScanner({ onScan });
  return null;
};

describe('InvoicePanel', () => {
  const onOpenCustomerDrawer = vi.fn();
  const onOpenHeldSalesDrawer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default mock state
    storeState.cart = mockCart;
    storeState.isProcessing = false;
    storeState.customerId = null;
    storeState.discountType = 'amount';
    storeState.discountValue = 0;
    storeState.paymentMethod = 'Cash';
    storeState.heldSales = [];

    mockUseCustomerStore.mockReturnValue({
      customers: [
        {
          id: 'c1',
          name: 'Alice',
          surname: 'Smith',
          totalDebt: 100,
          creditLimit: 200
        }
      ]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders invoice details and summary correctly', () => {
    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    // subtotal = 5*2 + 15*1 = 25
    expect(screen.getAllByText('₺25.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Toplam Tutar')).toBeInTheDocument();
    expect(screen.getByText('25,00')).toBeInTheDocument();
    expect(screen.getByText('Müşteri Seçin')).toBeInTheDocument();
  });

  it('displays chosen customer details and scopes credit limits', () => {
    storeState.customerId = 'c1';
    storeState.discountValue = 5; // discount 5 tl

    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    const customerName = screen.getByText('Alice Smith');
    expect(customerName).toBeInTheDocument();
    expect(customerName).toHaveClass(
      'border-primary',
      'bg-primary/10',
      'text-foreground'
    );
    expect(screen.getByText('Mevcut Borç: ₺100.00')).toBeInTheDocument();
    expect(screen.getByText('Limit: ₺200.00')).toBeInTheDocument();

    // totalPayable = 25 - 5 = 20
    expect(screen.getByText('20,00')).toBeInTheDocument();
  });

  it('renders cash change calculator when Cash is selected', () => {
    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    // Cash method is active by default
    expect(screen.getByText('Para Üstü Hesaplayıcı')).toBeInTheDocument();

    // Click 100 TL button
    const hundredBtn = screen.getByRole('button', { name: '₺100' });
    fireEvent.click(hundredBtn);

    // subtotal is 25, change is 100 - 25 = 75
    expect(screen.getByText('Para Üstü')).toBeInTheDocument();
    expect(screen.getByText('₺75.00')).toBeInTheDocument();
  });

  it('disables checkout button if cart is empty', () => {
    storeState.cart = [];

    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    const checkoutBtn = screen.getByRole('button', { name: /Ödemeyi Al/i });
    expect(checkoutBtn).toBeDisabled();
  });

  it('activates reset when a sale setting exists without cart items', () => {
    storeState.cart = [];
    storeState.customerId = 'c1';

    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    const resetButton = screen.getByRole('button', { name: 'Sepeti Sıfırla' });
    expect(resetButton).not.toBeDisabled();
    fireEvent.click(resetButton);
    expect(clearCartMock).toHaveBeenCalled();
  });

  it('activates reset after entering a cash amount without cart items', () => {
    storeState.cart = [];

    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    const resetButton = screen.getByRole('button', { name: 'Sepeti Sıfırla' });
    expect(resetButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '₺100' }));
    expect(resetButton).not.toBeDisabled();
  });

  it('calls checkout on Ödemeyi Al click', async () => {
    checkoutMock.mockResolvedValueOnce(true);
    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    const checkoutBtn = screen.getByRole('button', { name: /Ödemeyi Al/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(checkoutMock).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Satış başarıyla tamamlandı!');
    });
  });

  it('calls checkout when the user presses an ordinary Enter', async () => {
    checkoutMock.mockResolvedValueOnce(true);
    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(checkoutMock).toHaveBeenCalledTimes(1));
  });

  it('ignores an Enter event already claimed by the barcode scanner', () => {
    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );
    const scannerEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true
    });
    scannerEnter.preventDefault();

    fireEvent(document, scannerEnter);

    expect(checkoutMock).not.toHaveBeenCalled();
  });

  it('keeps the cart open during consecutive keyboard barcode scans', () => {
    let currentTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
    const onScan = vi.fn();
    const scan = (barcode: string) => {
      for (const character of barcode) {
        currentTime += 10;
        act(() => {
          document.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: character,
              bubbles: true,
              cancelable: true
            })
          );
        });
      }
      currentTime += 10;
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      act(() => document.dispatchEvent(enterEvent));
      return enterEvent;
    };

    render(
      <>
        <BarcodeScannerScenario onScan={onScan} />
        <InvoicePanel
          onOpenCustomerDrawer={onOpenCustomerDrawer}
          onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
        />
      </>
    );

    const firstScanEnter = scan('8691234567890');
    const secondScanEnter = scan('8691234567890');

    expect(onScan).toHaveBeenCalledTimes(2);
    expect(onScan).toHaveBeenNthCalledWith(1, '8691234567890');
    expect(onScan).toHaveBeenNthCalledWith(2, '8691234567890');
    expect(firstScanEnter.defaultPrevented).toBe(true);
    expect(secondScanEnter.defaultPrevented).toBe(true);
    expect(checkoutMock).not.toHaveBeenCalled();
    expect(storeState.cart).toEqual(mockCart);
  });

  it('calls holdSale on Beklet click', () => {
    render(
      <InvoicePanel
        onOpenCustomerDrawer={onOpenCustomerDrawer}
        onOpenHeldSalesDrawer={onOpenHeldSalesDrawer}
      />
    );

    const holdBtn = screen.getByRole('button', { name: /Beklet/i });
    fireEvent.click(holdBtn);

    expect(holdSaleMock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Satış beklemeye alındı');
  });
});
