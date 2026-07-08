import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useInventoryStore } from '../store/useInventoryStore';
import ScannerModal from '../../sales/components/ScannerModal';
import { Button } from '@heroui/react';
import { ArrowLeft, Save, ScanBarcode, Search, Image, Loader2 } from 'lucide-react';
import { toast } from '@heroui/react';

const productSchema = z.object({
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır'),
  barcode: z.string().optional(),
  stock: z.number().min(0, 'Stok 0 veya daha büyük olmalıdır'),
  price: z.number().min(0, 'Fiyat 0 veya daha büyük olmalıdır'),
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
  const [apiProductData, setApiProductData] = useState<ApiProductData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, getValues, formState: { errors, isValid } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      barcode: '',
      stock: 0,
      price: 0,
    }
  });

  useEffect(() => {
    if (items.length === 0) {
      loadItems();
    }
  }, [items.length, loadItems]);

  useEffect(() => {
    if (isEditMode && items.length > 0) {
      const editingItem = items.find(item => item.id === id);
      if (editingItem) {
        reset({
          name: editingItem.name,
          barcode: editingItem.barcode || '',
          stock: editingItem.stock,
          price: editingItem.price,
        });
        setApiProductData(null);
      }
    } else if (!isEditMode) {
      reset({ name: '', barcode: initialBarcode || '', stock: 0, price: 0 });
      setApiProductData(null);
      if (initialBarcode) {
        searchProductByBarcode(initialBarcode);
      }
    }
  }, [isEditMode, id, items, initialBarcode, reset]);

  const searchProductByBarcode = async (barcodeToSearch: string) => {
    if (!barcodeToSearch) return;
    setIsSearching(true);
    setApiProductData(null);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcodeToSearch}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        if (data.product.product_name) {
          setValue('name', data.product.product_name, { shouldValidate: true });
        }
        setApiProductData({
          imageUrl: data.product.image_front_url || data.product.image_url,
          brand: data.product.brands,
          ingredients: data.product.ingredients_text,
        });
      }
    } catch (error) {
      console.error("API Search error", error);
    } finally {
      setIsSearching(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSaving(true);
    try {
      if (isEditMode && id) {
        await updateItem(id, data);
        toast.success('Ürün güncellendi');
      } else {
        if (data.barcode) {
          const existingItem = items.find(item => item.barcode === data.barcode);
          if (existingItem) {
            toast.danger(`Bu barkoda (${data.barcode}) sahip bir ürün zaten mevcut!`, {
              timeout: 6000,
              actionProps: {
                children: 'Mevcut ürünü düzenle',
                className: 'bg-primary text-white font-medium',
                size: 'sm',
                onPress: () => {
                  navigate(`/inventory/edit/${existingItem.id}`);
                }
              }
            });
            setIsSaving(false);
            return;
          }
        }
        await addItem(data);
        toast.success('Yeni ürün eklendi');
      }
      navigate(-1);
    } catch (error) {
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
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" isIconOnly onPress={() => navigate(-1)} className="rounded-full bg-white shadow-sm border border-gray-100">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h1>
          <p className="text-gray-500 text-sm mt-1">Stok takibi ve satış için envantere ürün ekleyin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6">

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Ürün Adı <span className="text-danger">*</span></label>
            <input
              id="name"
              {...register('name')}
              className={`w-full bg-gray-50 border rounded-2xl px-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.name ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
              placeholder="Örn: Coca Cola 330ml"
            />
            {errors.name && <span className="text-danger text-xs mt-1 block ml-1">{errors.name.message}</span>}
          </div>

          <div>
            <label htmlFor="barcode" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Barkod (Opsiyonel)</label>
            <div className="flex gap-2">
              <input
                id="barcode"
                {...register('barcode')}
                className={`w-full bg-gray-50 border rounded-2xl px-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.barcode ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
                placeholder="Barkod okutun veya girin"
              />
              <Button
                type="button"
                variant="secondary"
                onPress={() => setIsScannerOpen(true)}
                aria-label="Kamera ile barkod okut"
              >
                <ScanBarcode className="text-xl" />
              </Button>
              <Button
                type="button"
                variant="tertiary"
                onPress={() => searchProductByBarcode(getValues('barcode') || '')}
                isDisabled={isSearching}
                aria-label="Barkod ile otomatik doldur"
              >
                {isSearching ? (
                  <Loader2 className="text-xl animate-spin" />
                ) : (
                  <Search className="text-xl" />
                )}
              </Button>
            </div>
            {errors.barcode && <span className="text-danger text-xs mt-1 block ml-1">{errors.barcode.message}</span>}
          </div>

          {apiProductData && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4 items-start animate-appearance-in">
              {apiProductData.imageUrl ? (
                <img src={apiProductData.imageUrl} alt="Ürün" className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-blue-100 shadow-sm" />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-blue-300">
                  <Image className="text-2xl" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">API Bilgileri Bulundu</h4>
                {apiProductData.brand && (
                  <p className="text-xs text-blue-700"><span className="font-medium">Marka:</span> {apiProductData.brand}</p>
                )}
                {apiProductData.ingredients && (
                  <p className="text-xs text-blue-700 line-clamp-2" title={apiProductData.ingredients}><span className="font-medium">İçindekiler:</span> {apiProductData.ingredients}</p>
                )}
                <p className="text-xs text-blue-600 mt-1 italic">API fiyat bilgisi sağlamamaktadır. Lütfen fiyatı kendiniz girin.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="stock" className="block text-sm font-semibold text-gray-700 ml-1">Stok Miktarı</label>
              <input
                id="stock"
                type="number"
                {...register('stock', { valueAsNumber: true })}
                className={`w-full bg-gray-50 border rounded-2xl px-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.stock ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
              />
              {errors.stock && <span className="text-danger text-xs mt-1 block ml-1">{errors.stock.message}</span>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="price" className="block text-sm font-semibold text-gray-700 ml-1">Birim Fiyatı (₺) <span className="text-danger">*</span></label>
              <input
                id="price"
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                className={`w-full bg-gray-50 border rounded-2xl px-4 py-3.5 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all ${errors.price ? 'border-danger focus:ring-danger' : 'border-gray-200'}`}
              />
              {errors.price && <span className="text-danger text-xs mt-1 block ml-1">{errors.price.message}</span>}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Button variant="ghost" type="button" onPress={() => navigate(-1)}>
              İptal
            </Button>
            <Button variant="primary" type="submit" isDisabled={isSaving || !isValid} className="px-8 disabled:opacity-50 isDisabled:cursor-not-allowed">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
              {isEditMode ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet'}
            </Button>
          </div>

        </form>
      </div>
      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
    </div>
  );
};
