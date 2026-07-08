import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CustomerDrawer } from './CustomerDrawer';
import { useCustomerStore } from '../store/useCustomerStore';
import { useSalesStore } from '../../sales/store/useSalesStore';
import { useNavigate } from 'react-router-dom';

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Search: () => <div data-testid="icon-search" />,
  UserPlus: () => <div data-testid="icon-user-plus" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, onClick, ...props }: any) => (
      <div onClick={onClick} data-testid="motion-div" {...props}>{children}</div>
    )
  }
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('../store/useCustomerStore');
vi.mock('../../sales/store/useSalesStore');

const mockUseCustomerStore = useCustomerStore as unknown as ReturnType<typeof vi.fn>;
const mockUseSalesStore = useSalesStore as unknown as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as unknown as ReturnType<typeof vi.fn>;

describe('CustomerDrawer', () => {
  const navigateMock = vi.fn();
  const setCustomerIdMock = vi.fn();
  const loadCustomersMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    mockUseNavigate.mockReturnValue(navigateMock);
    
    mockUseCustomerStore.mockReturnValue({
      customers: [
        { id: 'c1', name: 'John', surname: 'Doe', phone: '12345' },
        { id: 'c2', name: 'Jane', surname: 'Smith', phone: '98765' }
      ],
      loadCustomers: loadCustomersMock
    });

    mockUseSalesStore.mockReturnValue({
      customerId: null,
      setCustomerId: setCustomerIdMock
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and loads customers on open', () => {
    render(<CustomerDrawer isOpen={true} onClose={onCloseMock} />);
    
    expect(loadCustomersMock).toHaveBeenCalled();
    expect(screen.getByText('Müşteri Seçimi')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('filters customers based on search input', () => {
    render(<CustomerDrawer isOpen={true} onClose={onCloseMock} />);
    
    const searchInput = screen.getByPlaceholderText('Müşteri ara...');
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('calls setCustomerId and onClose when a customer is clicked', () => {
    render(<CustomerDrawer isOpen={true} onClose={onCloseMock} />);
    
    const johnBtn = screen.getByText('John Doe').closest('button');
    fireEvent.click(johnBtn!);

    expect(setCustomerIdMock).toHaveBeenCalledWith('c1');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('navigates to new customer page when "Yeni Müşteri Ekle" is clicked', () => {
    render(<CustomerDrawer isOpen={true} onClose={onCloseMock} />);
    
    const addBtn = screen.getByText('Yeni Müşteri Ekle');
    fireEvent.click(addBtn);

    expect(onCloseMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/customers/new');
  });
});
