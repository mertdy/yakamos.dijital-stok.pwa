import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProductFormView } from './ProductFormView';
import { useInventoryStore } from '../store/useInventoryStore';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
  Save: () => <div data-testid="icon-save" />,
  Loader2: () => <div data-testid="icon-loader2" />,
  ScanBarcode: () => <div data-testid="icon-scan-barcode" />,
  Search: () => <div data-testid="icon-search" />,
  Image: () => <div data-testid="icon-image" />,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('../store/useInventoryStore');
const mockUseInventoryStore = useInventoryStore as unknown as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as unknown as ReturnType<typeof vi.fn>;
const mockUseParams = useParams as unknown as ReturnType<typeof vi.fn>;
const mockUseSearchParams = useSearchParams as unknown as ReturnType<typeof vi.fn>;

describe('ProductFormView', () => {
  const navigateMock = vi.fn();
  const addItemMock = vi.fn();
  const updateItemMock = vi.fn();

  beforeEach(() => {
    mockUseNavigate.mockReturnValue(navigateMock);
    mockUseParams.mockReturnValue({ id: undefined });
    mockUseSearchParams.mockReturnValue([new URLSearchParams()]);

    mockUseInventoryStore.mockReturnValue({
      items: [
        { id: '1', name: 'Existing Product', barcode: '12345', stock: 10, price: 100 }
      ],
      loadItems: vi.fn(),
      addItem: addItemMock,
      updateItem: updateItemMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in add mode', () => {
    render(<ProductFormView />);
    expect(screen.getByText('Yeni Ürün Ekle')).toBeInTheDocument();
  });

  it('renders correctly in edit mode and populates data', async () => {
    mockUseParams.mockReturnValue({ id: '1' });
    render(<ProductFormView />);
    
    expect(screen.getByText('Ürün Düzenle')).toBeInTheDocument();
    
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Ürün Adı/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Existing Product');
      const barcodeInput = screen.getByLabelText(/Barkod/i) as HTMLInputElement;
      expect(barcodeInput.value).toBe('12345');
    });
  });

  it('auto-fills barcode if ?barcode= is present in URL', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('?barcode=98765')]);
    render(<ProductFormView />);
    
    await waitFor(() => {
      const barcodeInput = screen.getByLabelText(/Barkod/i) as HTMLInputElement;
      expect(barcodeInput.value).toBe('98765');
    });
  });

  it('shows validation errors when submitting empty form', async () => {
    render(<ProductFormView />);
    
    const nameInput = screen.getByLabelText(/Ürün Adı/i);
    fireEvent.change(nameInput, { target: { value: 'A' } });

    const submitBtn = screen.getByText('Ürünü Kaydet').closest('button');
    expect(submitBtn).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Ürün adı en az 2 karakter olmalıdır')).toBeInTheDocument();
    });
  });

  it('allows submission when valid data is entered', async () => {
    addItemMock.mockResolvedValue('new-id');
    render(<ProductFormView />);
    
    const nameInput = screen.getByLabelText(/Ürün Adı/i);
    fireEvent.change(nameInput, { target: { value: 'Test Product' } });
    
    const stockInput = screen.getByLabelText(/Stok Miktarı/i);
    fireEvent.change(stockInput, { target: { value: '50' } });

    const priceInput = screen.getByLabelText(/Birim Fiyatı/i);
    fireEvent.change(priceInput, { target: { value: '15' } });

    await waitFor(() => {
      const submitBtn = screen.getByText('Ürünü Kaydet').closest('button');
      expect(submitBtn).not.toBeDisabled();
    });

    const form = nameInput.closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(addItemMock).toHaveBeenCalledWith({
        name: 'Test Product',
        barcode: '',
        stock: 50,
        price: 15
      });
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });
  });
});
