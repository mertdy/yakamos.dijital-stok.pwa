import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { HeldSalesDrawer } from './HeldSalesDrawer';
import { useSalesStore } from '../store/useSalesStore';
import { useCustomerStore } from '../../customers/store/useCustomerStore';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Clock: () => <div data-testid="icon-clock" />,
  Trash2: () => <div data-testid="icon-trash" />,
  ListRestart: () => <div data-testid="icon-list-restart" />,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, onClick, ...props }: any) => (
      <div onClick={onClick} data-testid="motion-div" {...props}>{children}</div>
    )
  }
}));

vi.mock('../store/useSalesStore');
vi.mock('../../customers/store/useCustomerStore');

const mockUseSalesStore = useSalesStore as unknown as ReturnType<typeof vi.fn>;
const mockUseCustomerStore = useCustomerStore as unknown as ReturnType<typeof vi.fn>;

describe('HeldSalesDrawer', () => {
  const restoreSaleMock = vi.fn();
  const removeHeldSaleMock = vi.fn();
  const clearHeldSalesMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    mockUseSalesStore.mockReturnValue({
      heldSales: [
        {
          id: 'held1',
          cart: [{ inventoryId: '1', name: 'Item A', price: 100, quantity: 1 }], // subtotal = 100
          customerId: 'c1',
          discountType: 'percentage',
          discountValue: 10, // 10% of 100 = 10
          paymentMethod: 'Cash',
          timestamp: new Date().toISOString()
        }
      ],
      cart: [],
      restoreSale: restoreSaleMock,
      removeHeldSale: removeHeldSaleMock,
      clearHeldSales: clearHeldSalesMock
    });

    mockUseCustomerStore.mockReturnValue({
      customers: [
        { id: 'c1', name: 'John', surname: 'Doe' }
      ]
    });
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders held sales correctly with calculated total', () => {
    render(<HeldSalesDrawer isOpen={true} onClose={onCloseMock} />);
    
    // 100 subtotal - 10 discount = 90
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('₺90.00')).toBeInTheDocument(); // 90.00 total
    expect(screen.getByText('1x Item A')).toBeInTheDocument();
  });

  it('shows alert when restoring if cart is not empty', () => {
    mockUseSalesStore.mockReturnValue({
      ...mockUseSalesStore(),
      cart: [{ inventoryId: '2', name: 'Item B', price: 50, quantity: 1 }] // Cart not empty
    });

    render(<HeldSalesDrawer isOpen={true} onClose={onCloseMock} />);
    
    const restoreBtn = screen.getByText('Sepete Aktar');
    fireEvent.click(restoreBtn);

    expect(screen.getByText('Sepet Üzerine Yazılacak')).toBeInTheDocument();
    expect(restoreSaleMock).not.toHaveBeenCalled(); // Not called immediately
  });

  it('restores immediately if cart is empty', () => {
    render(<HeldSalesDrawer isOpen={true} onClose={onCloseMock} />);
    
    const restoreBtn = screen.getByText('Sepete Aktar');
    fireEvent.click(restoreBtn);

    expect(screen.queryByText('Sepet Üzerine Yazılacak')).not.toBeInTheDocument();
    expect(restoreSaleMock).toHaveBeenCalledWith('held1');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('calls clearHeldSales when clear button is clicked and confirmed', () => {
    render(<HeldSalesDrawer isOpen={true} onClose={onCloseMock} />);
    
    const clearBtn = screen.getByText('Tümünü Temizle');
    fireEvent.click(clearBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(clearHeldSalesMock).toHaveBeenCalled();
  });
});
