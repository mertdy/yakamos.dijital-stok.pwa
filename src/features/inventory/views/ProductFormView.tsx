import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useInventoryStore } from '../store/useInventoryStore';
import { ScannerModal } from '@/features/sales';
import { Button } from '@heroui/react';
import { FormInput } from '@/shared/components/FormInput';
import {
  ArrowLeft,
  Save,
  ScanBarcode,
  Search,
  Image,
  Loader2
} from 'lucide-react';
import { toast } from '@heroui/react';
import posthog from 'posthog-js';

const productSchema = z.object({
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır'),
  barcode: z.string().optional(),
  stock: z.number().min(0, 'Stok 0 veya daha büyük olmalıdır'),
  price: z.number().min(0, 'Fiyat 0 veya daha büyük olmalıdır')
});

type ProductFormData = z.infer<typeof productSchema>;

interface ApiProductData {
  imageUrl?: string;
  brand?: string;
  ingredients?: string;
}

export const ProductFormView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const [searchParams] = useSearchParams();
  const initialBarcode = searchParams.get('barcode');

  const { items, loadItems, addItem, updateItem } = useInventoryStore();
  const navigate = useNavigate();

  const [isSearching, setIsSearching] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [apiProductData, setApiProductData] = useState<ApiProductData | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isValid }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      barcode: '',
      stock: 0,
      price: 0
    }
  });

  useEffect(() => {
    if (items.length === 0) {
      loadItems();
    }
  }, [items.length, loadItems]);

  const searchProductByBarcode = useCallback(
    async (barcodeToSearch: string) => {
      if (!barcodeToSearch) return;
      setIsSearching(true);

      setApiProductData(null);
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${barcodeToSearch}.json`
        );
        const data = await res.json();
        if (data.status === 1 && data.product) {
          if (data.product.product_name) {
            setValue('name', data.product.product_name, {
              shouldValidate: true
            });
          }
          setApiProductData({
            imageUrl: data.product.image_front_url || data.product.image_url,
            brand: data.product.brands,
            ingredients: data.product.ingredients_text
          });
          posthog.capture('barcode_product_lookup_completed', {
            barcode_length: barcodeToSearch.length,
            has_brand: Boolean(data.product.brands),
            has_image: Boolean(
              data.product.image_front_url || data.product.image_url
            ),
            has_ingredients: Boolean(data.product.ingredients_text)
          });
        }
      } catch (error) {
        console.error('API Search error', error);
        posthog.captureException(error, {
          context: 'barcode_product_lookup'
        });
      } finally {
        setIsSearching(false);
      }
    },
    [setValue]
  );

  useEffect(() => {
    if (isEditMode && items.length > 0) {
      const editingItem = items.find(item => item.id === id);
      if (editingItem) {
        reset({
          name: editingItem.name,
          barcode: editingItem.barcode || '',
          stock: editingItem.stock,
          price: editingItem.price
        });

        setApiProductData(null);
      }
    }
  }, [isEditMode, id, items, reset]);

  useEffect(() => {
    if (!isEditMode) {
      reset({ name: '', barcode: initialBarcode || '', stock: 0, price: 0 });

      setApiProductData(null);
      if (initialBarcode) {
        searchProductByBarcode(initialBarcode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, initialBarcode]);

  const onSubmit = async (data: ProductFormData) => {
    setIsSaving(true);
    try {
      posthog.capture('inventory_form_submitted', {
        form_mode: isEditMode ? 'edit' : 'create',
        inventory_id: id,
        has_barcode: Boolean(data.barcode?.trim()),
        stock: data.stock,
        price: data.price
      });

      if (isEditMode && id) {
        await updateItem(id, data);
        toast.success('Ürün güncellendi');
      } else {
        if (data.barcode) {
          const existingItem = items.find(
            item => item.barcode === data.barcode
          );
          if (existingItem) {
            toast.danger(
              `Bu barkoda (${data.barcode}) sahip bir ürün zaten mevcut!`,
              {
                timeout: 6000,
                actionProps: {
                  children: 'Mevcut ürünü düzenle',
                  className: 'bg-primary text-white font-medium',
                  size: 'sm',
                  onPress: () => {
                    navigate(`/inventory/edit/${existingItem.id}`);
                  }
                }
              }
            );
            setIsSaving(false);
            return;
          }
        }
        await addItem(data);
        toast.success('Yeni ürün eklendi');
      }
      navigate(-1);
    } catch {
      toast.danger('İşlem başarısız oldu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScan = (barcode: string) => {
    setValue('barcode', barcode, { shouldValidate: true });
    searchProductByBarcode(barcode);
  };

  return (
    <div className="max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          isIconOnly
          onPress={() => navigate(-1)}
          className="rounded-full border border-gray-100 bg-white shadow-sm">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Stok takibi ve satış için envantere ürün ekleyin
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 p-6 md:p-8">
          <FormInput
            control={control}
            name="name"
            label="Ürün Adı"
            isRequired
            placeholder="Örn: Coca Cola 330ml"
          />

          <FormInput
            control={control}
            name="barcode"
            label="Barkod (Opsiyonel)"
            placeholder="Barkod okutun veya girin"
            endContent={
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onPress={() => setIsScannerOpen(true)}
                  aria-label="Kamera ile barkod okut">
                  <ScanBarcode className="text-xl" />
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  onPress={() =>
                    searchProductByBarcode(getValues('barcode') || '')
                  }
                  isDisabled={isSearching}
                  aria-label="Barkod ile otomatik doldur">
                  {isSearching ? (
                    <Loader2 className="animate-spin text-xl" />
                  ) : (
                    <Search className="text-xl" />
                  )}
                </Button>
              </>
            }
          />

          {apiProductData && (
            <div className="animate-appearance-in flex items-start gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              {apiProductData.imageUrl ? (
                <img
                  src={apiProductData.imageUrl}
                  alt="Ürün"
                  className="h-16 w-16 rounded-lg border border-blue-100 bg-white object-contain p-1 shadow-sm"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-blue-300">
                  <Image className="text-2xl" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="mb-1 text-sm font-semibold text-blue-900">
                  API Bilgileri Bulundu
                </h4>
                {apiProductData.brand && (
                  <p className="text-xs text-blue-700">
                    <span className="font-medium">Marka:</span>{' '}
                    {apiProductData.brand}
                  </p>
                )}
                {apiProductData.ingredients && (
                  <p
                    className="line-clamp-2 text-xs text-blue-700"
                    title={apiProductData.ingredients}>
                    <span className="font-medium">İçindekiler:</span>{' '}
                    {apiProductData.ingredients}
                  </p>
                )}
                <p className="mt-1 text-xs text-blue-600 italic">
                  API fiyat bilgisi sağlamamaktadır. Lütfen fiyatı kendiniz
                  girin.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormInput
              control={control}
              name="stock"
              label="Stok Miktarı"
              type="number"
              valueAsNumber
            />
            <FormInput
              control={control}
              name="price"
              label="Birim Fiyatı (₺)"
              isRequired
              type="number"
              step="0.01"
              valueAsNumber
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button variant="ghost" type="button" onPress={() => navigate(-1)}>
              İptal
            </Button>
            <Button
              variant="primary"
              type="submit"
              isDisabled={isSaving || !isValid}
              className="isDisabled:cursor-not-allowed px-8 disabled:opacity-50">
              {isSaving ? (
                <Loader2 className="mr-2 animate-spin" size={20} />
              ) : (
                <Save className="mr-2" size={20} />
              )}
              {isEditMode ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet'}
            </Button>
          </div>
        </form>
      </div>
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />
    </div>
  );
};
