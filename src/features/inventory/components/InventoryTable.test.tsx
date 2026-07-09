import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InventoryTable } from './InventoryTable';
import { useInventoryStore } from '../store/useInventoryStore';
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import { useNavigate } from 'react-router-dom';

vi.mock('lucide-react', () => ({
  Edit: () => <div data-testid="icon-edit" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Package: () => <div data-testid="icon-package" />,
  ArrowUp: () => <div data-testid="icon-arrow-up" />,
  ArrowDown: () => <div data-testid="icon-arrow-down" />,
  Search: () => <div data-testid="icon-search" />
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}));

vi.mock('../store/useInventoryStore');
vi.mock('@/shared/contexts/ConfirmDialogContext');
vi.mock('@/shared/hooks/useGlobalBarcodeScanner', () => ({
  useGlobalBarcodeScanner: vi.fn()
}));

const mockUseInventoryStore = useInventoryStore as unknown as ReturnType<
  typeof vi.fn
>;
const mockUseConfirm = useConfirm as unknown as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as unknown as ReturnType<typeof vi.fn>;

describe('InventoryTable', () => {
  const navigateMock = vi.fn();
  const confirmMock = vi.fn();
  const deleteItemMock = vi.fn();

  const mockItems = [
    { id: '1', name: 'Apple', barcode: '111', stock: 5, price: 1.2 },
    { id: '2', name: 'Banana', barcode: '222', stock: 15, price: 0.8 },
    { id: '3', name: 'Cherry', barcode: '333', stock: 20, price: 3.5 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNavigate.mockReturnValue(navigateMock);
    mockUseConfirm.mockReturnValue({ confirm: confirmMock });

    mockUseInventoryStore.mockReturnValue({
      items: mockItems,
      deleteItem: deleteItemMock
    });
  });

  it('renders empty state when no items are present', () => {
    mockUseInventoryStore.mockReturnValue({
      items: [],
      deleteItem: deleteItemMock
    });

    render(<InventoryTable />);
    expect(screen.getByText('Envanterde hiç ürün yok.')).toBeInTheDocument();
  });

  it('renders table headers and rows correctly', () => {
    render(<InventoryTable />);

    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();

    // Check barcode
    expect(screen.getByText('111')).toBeInTheDocument();

    // Check price formatting
    expect(screen.getByText('₺1.20')).toBeInTheDocument();
    expect(screen.getByText('₺0.80')).toBeInTheDocument();
    expect(screen.getByText('₺3.50')).toBeInTheDocument();
  });

  it('filters items when search input is typed in', async () => {
    render(<InventoryTable />);

    const searchInput = screen.getByPlaceholderText(
      'Ürün adı veya barkod ile ara...'
    );
    fireEvent.change(searchInput, { target: { value: 'ch' } }); // cherry

    await waitFor(() => {
      expect(screen.getByText('Cherry')).toBeInTheDocument();
      expect(screen.queryByText('Apple')).not.toBeInTheDocument();
      expect(screen.queryByText('Banana')).not.toBeInTheDocument();
    });
  });

  it('navigates to edit product view on edit button press', () => {
    render(<InventoryTable />);

    const editBtns = screen.getAllByRole('button', { name: 'Düzenle' });
    fireEvent.click(editBtns[0]); // Apple edit

    expect(navigateMock).toHaveBeenCalledWith('/inventory/edit/1');
  });

  it('asks for confirmation and deletes item when confirm resolves true', async () => {
    confirmMock.mockResolvedValue(true);
    render(<InventoryTable />);

    const deleteBtns = screen.getAllByRole('button', { name: 'Sil' });
    fireEvent.click(deleteBtns[0]); // Apple delete

    expect(confirmMock).toHaveBeenCalledWith({
      title: 'Ürünü Sil',
      description: 'Bu ürünü silmek istediğinize emin misiniz?',
      confirmText: 'Sil',
      variant: 'danger'
    });

    await waitFor(() => {
      expect(deleteItemMock).toHaveBeenCalledWith('1');
    });
  });

  it('does not delete item when confirm resolves false', async () => {
    confirmMock.mockResolvedValue(false);
    render(<InventoryTable />);

    const deleteBtns = screen.getAllByRole('button', { name: 'Sil' });
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      expect(deleteItemMock).not.toHaveBeenCalled();
    });
  });
});
