import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { HeldSalesDrawer } from './HeldSalesDrawer';
import { useCustomerStore } from '@/features/customers';
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Clock: () => <div data-testid="icon-clock" />,
  Trash2: () => <div data-testid="icon-trash" />,
  ListRestart: () => <div data-testid="icon-list-restart" />
}));

const restoreSaleMock = vi.fn();
const removeHeldSaleMock = vi.fn();
const clearHeldSalesMock = vi.fn();

const storeState = {
  heldSales: [
    {
      id: 'h1',
      cart: [{ inventoryId: 'p1', name: 'Cola', price: 10, quantity: 2 }],
      customerId: 'c1',
      discountType: 'amount',
      discountValue: 0,
      paymentMethod: 'Cash',
      timestamp: new Date().toISOString()
    }
  ],
  cart: [],
  restoreSale: restoreSaleMock,
  removeHeldSale: removeHeldSaleMock,
  clearHeldSales: clearHeldSalesMock
};

vi.mock('../store/useSalesStore', () => {
  const mockStore = vi.fn(() => storeState);
  (mockStore as any).getState = vi.fn(() => storeState);
  return { useSalesStore: mockStore };
});

vi.mock('@/features/customers', () => ({
  useCustomerStore: vi.fn()
}));

vi.mock('@/shared/contexts/ConfirmDialogContext');

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
const mockUseConfirm = useConfirm as unknown as ReturnType<typeof vi.fn>;

describe('HeldSalesDrawer', () => {
  const onClose = vi.fn();
  const confirmMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfirm.mockReturnValue({ confirm: confirmMock });
    mockUseCustomerStore.mockReturnValue({
      customers: [{ id: 'c1', name: 'Bob', surname: 'Dylan' }]
    });

    // Reset default mock state
    storeState.heldSales = [
      {
        id: 'h1',
        cart: [{ inventoryId: 'p1', name: 'Cola', price: 10, quantity: 2 }],
        customerId: 'c1',
        discountType: 'amount',
        discountValue: 0,
        paymentMethod: 'Cash',
        timestamp: new Date().toISOString()
      }
    ];
    storeState.cart = [];
  });

  it('renders nothing when isOpen is false', () => {
    render(<HeldSalesDrawer isOpen={false} onClose={onClose} />);
    expect(screen.queryByText('Bekleyen Satışlar')).not.toBeInTheDocument();
  });

  it('renders held sales list when isOpen is true', () => {
    render(<HeldSalesDrawer isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Bekleyen Satışlar')).toBeInTheDocument();
    expect(screen.getByText('Bob Dylan')).toBeInTheDocument();
    expect(screen.getByText('₺20.00')).toBeInTheDocument(); // total = 10 * 2 = 20
    expect(screen.getByText('2x Cola')).toBeInTheDocument();
  });

  it('calls restoreSale and closes drawer when clicking on held sale item and cart is empty', () => {
    render(<HeldSalesDrawer isOpen={true} onClose={onClose} />);

    const itemBtn = screen.getByText('Bob Dylan').closest('div');
    fireEvent.click(itemBtn!);

    expect(restoreSaleMock).toHaveBeenCalledWith('h1');
    expect(onClose).toHaveBeenCalled();
  });

  it('uses the restore callback instead of reopening the previous drawer', () => {
    const onRestoreComplete = vi.fn();
    render(
      <HeldSalesDrawer
        isOpen={true}
        onClose={onClose}
        onRestoreComplete={onRestoreComplete}
      />
    );

    fireEvent.click(screen.getByText('Bob Dylan').closest('div')!);

    expect(onRestoreComplete).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls removeHeldSale when delete button is pressed on a sale', () => {
    render(<HeldSalesDrawer isOpen={true} onClose={onClose} />);

    // Click the delete button of the sale item
    const deleteBtn = screen.getByTitle('Bu satışı sil');
    fireEvent.click(deleteBtn);

    expect(removeHeldSaleMock).toHaveBeenCalledWith('h1');
  });

  it('calls clearHeldSales when click "Tümünü Temizle" and confirmed', async () => {
    confirmMock.mockResolvedValue(true);
    render(<HeldSalesDrawer isOpen={true} onClose={onClose} />);

    const clearBtn = screen.getByRole('button', { name: /Tümünü Temizle/i });
    fireEvent.click(clearBtn);

    expect(confirmMock).toHaveBeenCalledWith({
      title: 'Tümünü Temizle',
      description:
        'Tüm bekleme listesini temizlemek istediğinize emin misiniz?',
      confirmText: 'Temizle',
      variant: 'danger'
    });

    await waitFor(() => {
      expect(clearHeldSalesMock).toHaveBeenCalled();
    });
  });
});
