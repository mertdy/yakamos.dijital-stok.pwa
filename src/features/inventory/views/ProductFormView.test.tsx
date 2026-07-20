import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProductFormView } from './ProductFormView';
import { useInventoryStore } from '../store/useInventoryStore';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from '@heroui/react';

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
  Save: () => <div data-testid="icon-save" />,
  ScanBarcode: () => <div data-testid="icon-scan" />,
  Search: () => <div data-testid="icon-search" />,
  Image: () => <div data-testid="icon-image" />,
  Loader2: () => <div data-testid="icon-loader2" />,
  Printer: () => <div data-testid="icon-printer" />,
  Copy: () => <div data-testid="icon-copy" />
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn()
}));

vi.mock('../store/useInventoryStore');

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

const mockUseInventoryStore = useInventoryStore as unknown as ReturnType<
  typeof vi.fn
>;
const mockUseNavigate = useNavigate as unknown as ReturnType<typeof vi.fn>;
const mockUseParams = useParams as unknown as ReturnType<typeof vi.fn>;
const mockUseSearchParams = useSearchParams as unknown as ReturnType<
  typeof vi.fn
>;

describe('ProductFormView', () => {
  const navigateMock = vi.fn();
  const addItemMock = vi.fn();
  const updateItemMock = vi.fn();
  const loadItemsMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNavigate.mockReturnValue(navigateMock);
    mockUseParams.mockReturnValue({ id: undefined });

    const searchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue([searchParams, vi.fn()]);

    mockUseInventoryStore.mockReturnValue({
      items: [
        {
          id: 'p1',
          name: 'Coca Cola',
          barcode: '123456',
          stock: 10,
          price: 15.5
        }
      ],
      hasLoadedItems: true,
      loadItems: loadItemsMock,
      addItem: addItemMock,
      updateItem: updateItemMock
    });

    // Mock global fetch
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly in add mode', () => {
    render(<ProductFormView />);
    expect(screen.getByText('Yeni Ürün Ekle')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Örn: Coca Cola 330ml')
    ).toBeInTheDocument();
  });

  it('renders correctly in edit mode and populates data', async () => {
    mockUseParams.mockReturnValue({ id: 'p1' });
    render(<ProductFormView />);

    expect(screen.getByText('Ürün Düzenle')).toBeInTheDocument();

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(
        'Örn: Coca Cola 330ml'
      ) as HTMLInputElement;
      expect(nameInput.value).toBe('Coca Cola');
      const stockInput = screen.getByLabelText(
        'Stok Miktarı'
      ) as HTMLInputElement;
      expect(stockInput.value).toBe('10');
      const priceInput = screen.getByLabelText(
        /Birim Fiyatı/i
      ) as HTMLInputElement;
      expect(priceInput.value).toBe('15.5');
    });
  });

  it('returns to the previous page and shows an error for an unknown product', async () => {
    mockUseParams.mockReturnValue({ id: 'unknown-product' });
    render(<ProductFormView />);

    await waitFor(() => {
      expect(toast.danger).toHaveBeenCalledWith(
        'Ürün bulunamadı veya bu ürünü düzenleme yetkiniz yok.'
      );
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });
  });

  it('shows validation errors when invalid values are entered', async () => {
    render(<ProductFormView />);

    const nameInput = screen.getByPlaceholderText('Örn: Coca Cola 330ml');
    fireEvent.change(nameInput, { target: { value: 'A' } }); // too short

    const stockInput = screen.getByLabelText('Stok Miktarı');
    fireEvent.change(stockInput, { target: { value: '-5' } }); // negative

    const priceInput = screen.getByLabelText(/Birim Fiyatı/i);
    fireEvent.change(priceInput, { target: { value: '-10.5' } }); // negative

    await waitFor(() => {
      expect(
        screen.getByText('Ürün adı en az 2 karakter olmalıdır')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Stok 0 veya daha büyük olmalıdır')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Fiyat 0 veya daha büyük olmalıdır')
      ).toBeInTheDocument();
    });
  });

  it('fetches OpenFoodFacts API and populates name and details', async () => {
    const mockProductResponse = {
      status: 1,
      product: {
        product_name: 'Fanta Exotic',
        image_front_url: 'http://example.com/fanta.jpg',
        brands: 'Coca Cola Company',
        ingredients_text: 'Water, sugar, orange juice'
      }
    };

    (globalThis.fetch as any).mockResolvedValueOnce({
      json: async () => mockProductResponse
    });

    render(<ProductFormView />);

    const barcodeInput = screen.getByPlaceholderText(
      'Barkod okutun veya girin'
    );
    fireEvent.change(barcodeInput, { target: { value: '987654' } });

    const searchBtn = screen.getByRole('button', {
      name: /Barkod ile otomatik doldur/i
    });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v0/product/987654.json'
      );
    });

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(
        'Örn: Coca Cola 330ml'
      ) as HTMLInputElement;
      expect(nameInput.value).toBe('Fanta Exotic');
      expect(screen.getByText('API Bilgileri Bulundu')).toBeInTheDocument();
      expect(screen.getByText(/Coca Cola Company/i)).toBeInTheDocument();
    });
  });

  it('copies the barcode currently in the form', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
    render(<ProductFormView />);

    const barcodeInput = screen.getByPlaceholderText(
      'Barkod okutun veya girin'
    );
    fireEvent.change(barcodeInput, { target: { value: '987654' } });
    fireEvent.click(screen.getByRole('button', { name: 'Barkodu kopyala' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('987654');
      expect(toast.success).toHaveBeenCalledWith('Barkod kopyalandı.');
    });
  });

  it('copies the product name currently in the form', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
    render(<ProductFormView />);

    const productNameInput = screen.getByPlaceholderText(
      'Örn: Coca Cola 330ml'
    );
    fireEvent.change(productNameInput, { target: { value: 'Coca Cola' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ürün adını kopyala' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Coca Cola');
      expect(toast.success).toHaveBeenCalledWith('Ürün adı kopyalandı.');
    });
  });

  it('calls addItem on form submission in add mode', async () => {
    addItemMock.mockResolvedValueOnce(undefined);
    render(<ProductFormView />);

    const nameInput = screen.getByPlaceholderText('Örn: Coca Cola 330ml');
    fireEvent.change(nameInput, { target: { value: 'Ice Tea Peach' } });

    const stockInput = screen.getByLabelText('Stok Miktarı');
    fireEvent.change(stockInput, { target: { value: '24' } });

    const priceInput = screen.getByLabelText(/Birim Fiyatı/i);
    fireEvent.change(priceInput, { target: { value: '18.75' } });

    await waitFor(() => {
      const submitBtn = screen.getByText('Ürünü Kaydet').closest('button');
      expect(submitBtn).not.toBeDisabled();
    });

    const submitBtn = screen.getByText('Ürünü Kaydet').closest('button')!;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addItemMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ice Tea Peach',
          barcode: '',
          stock: 24,
          price: 18.75,
          salePrice: 18.75,
          unit: 'adet'
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Yeni ürün eklendi');
      expect(navigateMock).toHaveBeenCalledWith(-1);
    });
  });
});
