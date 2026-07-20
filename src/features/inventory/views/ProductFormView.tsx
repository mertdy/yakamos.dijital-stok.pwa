import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/core/config/routes';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useInventoryStore,
  PRODUCT_UNITS,
  type InventoryItem,
  type ProductUnit
} from '../store/useInventoryStore';
import { useCategoryStore, getCategoryPath } from '../store/useCategoryStore';
import { useAuthStore } from '@/features/auth';
import { useSalesStore } from '@/features/sales';
import { getCompanyLowStockThreshold } from '../domain/stockRules';
const ScannerModal = lazy(
  () => import('@/features/sales/components/ScannerModal')
);
import {
  Button,
  Checkbox,
  Label,
  ListBox,
  Select,
  TextArea,
  Tooltip
} from '@heroui/react';
import { FormInput } from '@/shared/components/FormInput';
import {
  ArrowLeft,
  Save,
  ScanBarcode,
  Search,
  Image,
  Loader2,
  Printer,
  Copy
} from 'lucide-react';
import { toast } from '@heroui/react';
import posthog from 'posthog-js';
import { createInternalBarcode } from '../domain/labelPrinting';
import { copyToClipboard } from '@/shared/utils/clipboard';

const LabelPrintModal = lazy(() =>
  import('../components/LabelPrintModal').then(module => ({
    default: module.LabelPrintModal
  }))
);

const productSchema = z.object({
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır'),
  barcode: z.string().optional(),
  stock: z.number().min(0, 'Stok 0 veya daha büyük olmalıdır'),
  salePrice: z.number().min(0, 'Fiyat 0 veya daha büyük olmalıdır'),
  costPrice: z.number().min(0).nullable().optional(),
  taxRate: z.union([z.literal(0), z.literal(1), z.literal(10), z.literal(20)]),
  priceIncludesTax: z.boolean().catch(true),
  unit: z.enum(PRODUCT_UNITS).catch('adet'),
  categoryId: z.string().nullable(),
  trackStock: z.boolean().catch(true),
  useCompanyLowStockThreshold: z.boolean().catch(true),
  lowStockThreshold: z.number().min(0).nullable(),
  isActive: z.boolean().catch(true),
  note: z.string().max(500).nullable(),
  description: z.string().max(2000).nullable()
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

  const { items, hasLoadedItems, addItem, updateItem } = useInventoryStore();
  const { syncCartItemProduct } = useSalesStore();
  const { categories, loadCategories } = useCategoryStore();
  const activeCompany = useAuthStore(state => state.activeCompany);
  const navigate = useNavigate();
  const hasRedirectedForMissingItem = useRef(false);

  const [isSearching, setIsSearching] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [apiProductData, setApiProductData] = useState<ApiProductData | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);
  const [labelItems, setLabelItems] = useState<InventoryItem[]>([]);

  const { control, handleSubmit, reset, setValue, getValues, watch } =
    useForm<ProductFormData>({
      resolver: zodResolver(productSchema),
      mode: 'onChange',
      defaultValues: {
        name: '',
        barcode: '',
        stock: 0,
        salePrice: 0,
        costPrice: null,
        taxRate: 20,
        priceIncludesTax: true,
        unit: 'adet',
        categoryId: null,
        trackStock: true,
        useCompanyLowStockThreshold: true,
        lowStockThreshold: null,
        isActive: true,
        note: null,
        description: null
      }
    });
  // eslint-disable-next-line react-hooks/incompatible-library
  const usesCompanyThreshold = watch('useCompanyLowStockThreshold');
  const productName = watch('name');
  const salePrice = watch('salePrice');
  const barcode = watch('barcode');
  const companyThreshold = getCompanyLowStockThreshold(activeCompany);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
    if (!isEditMode || !hasLoadedItems) return;

    const editingItem = items.find(item => item.id === id);
    if (!editingItem) {
      if (!hasRedirectedForMissingItem.current) {
        hasRedirectedForMissingItem.current = true;
        toast.danger('Ürün bulunamadı veya bu ürünü düzenleme yetkiniz yok.');
        navigate(-1);
      }
      return;
    }

    reset({
      name: editingItem.name,
      barcode: editingItem.barcode || '',
      stock: editingItem.stock,
      salePrice: editingItem.salePrice ?? editingItem.price ?? 0,
      costPrice: editingItem.costPrice ?? null,
      taxRate: editingItem.taxRate ?? 20,
      priceIncludesTax: editingItem.priceIncludesTax ?? true,
      unit: editingItem.unit ?? 'adet',
      categoryId: editingItem.categoryId ?? null,
      trackStock: editingItem.trackStock ?? true,
      useCompanyLowStockThreshold:
        editingItem.useCompanyLowStockThreshold ?? true,
      lowStockThreshold: editingItem.lowStockThreshold ?? null,
      isActive: editingItem.isActive ?? true,
      note: editingItem.note ?? null,
      description: editingItem.description ?? null
    });
    setApiProductData(null);
  }, [isEditMode, id, items, hasLoadedItems, navigate, reset]);

  useEffect(() => {
    if (!isEditMode) {
      reset({
        name: '',
        barcode: initialBarcode || '',
        stock: 0,
        salePrice: 0,
        costPrice: null,
        taxRate: 20,
        priceIncludesTax: true,
        unit: 'adet',
        categoryId: null,
        trackStock: true,
        useCompanyLowStockThreshold: true,
        lowStockThreshold: null,
        isActive: true,
        note: null,
        description: null
      });

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
        sale_price: data.salePrice
      });

      if (isEditMode && id) {
        const existingItem = items.find(item => item.id === id);
        const previousPrice = existingItem
          ? (existingItem.salePrice ?? existingItem.price ?? 0)
          : 0;
        await updateItem(id, { ...data, price: data.salePrice });
        syncCartItemProduct({
          inventoryId: id,
          name: data.name,
          price: data.salePrice,
          barcode: data.barcode || undefined,
          imageUrl: existingItem?.imageUrl
        });
        toast.success(
          previousPrice !== data.salePrice
            ? 'Fiyat güncellendi'
            : 'Ürün güncellendi',
          previousPrice !== data.salePrice
            ? {
                actionProps: {
                  children: 'Yeni Etiket Bastır',
                  className: 'bg-primary text-white font-medium',
                  size: 'sm',
                  onPress: () => navigate(ROUTES.INVENTORY.PRINT(id))
                }
              }
            : undefined
        );
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
                    navigate(ROUTES.INVENTORY.EDIT(existingItem.id));
                  }
                }
              }
            );
            setIsSaving(false);
            return;
          }
        }
        await addItem({
          ...data,
          price: data.salePrice,
          createdAt: new Date().toISOString()
        });
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

  const openLabelPrint = async () => {
    const item = items.find(candidate => candidate.id === id);
    if (!item) return;

    if (item.barcode) {
      setLabelItems([item]);
    } else {
      const barcode = createInternalBarcode(item);
      await updateItem(item.id, { barcode });
      setLabelItems([{ ...item, barcode }]);
    }
    setIsLabelPrintOpen(true);
  };

  if (isEditMode && hasLoadedItems === false) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

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
            endContent={
              <Button
                type="button"
                variant="tertiary"
                isIconOnly
                className="!size-10 !min-w-10 rounded-lg p-0"
                onPress={() =>
                  void copyToClipboard(
                    productName || '',
                    'Ürün adı kopyalandı.'
                  )
                }
                isDisabled={!productName?.trim()}
                aria-label="Ürün adını kopyala">
                <Copy size={18} />
              </Button>
            }
          />

          <FormInput
            control={control}
            name="barcode"
            label="Barkod (Opsiyonel)"
            placeholder="Barkod okutun veya girin"
            endContent={
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="tertiary"
                  isIconOnly
                  className="!size-10 !min-w-10 rounded-lg p-0"
                  onPress={() =>
                    void copyToClipboard(barcode || '', 'Barkod kopyalandı.')
                  }
                  isDisabled={!barcode?.trim()}
                  aria-label="Barkodu kopyala">
                  <Copy size={18} />
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  isIconOnly
                  className="!size-10 !min-w-10 rounded-lg p-0"
                  onPress={() => setIsScannerOpen(true)}
                  aria-label="Kamera ile barkod okut">
                  <ScanBarcode className="text-xl" />
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  isIconOnly
                  className="!size-10 !min-w-10 rounded-lg p-0"
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
              </div>
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
              name="salePrice"
              label="Satış Fiyatı (₺)"
              isRequired
              type="number"
              step="0.01"
              valueAsNumber
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormInput
              control={control}
              name="costPrice"
              label="Alış Fiyatı (Maliyet) (₺)"
              type="number"
              step="0.01"
              valueAsNumber
            />
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <Select
                  fullWidth
                  selectedKey={field.value}
                  onSelectionChange={value =>
                    field.onChange(value as ProductUnit)
                  }>
                  <Label>Birim</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {PRODUCT_UNITS.map(unit => (
                        <ListBox.Item key={unit} id={unit}>
                          {unit}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}
            />
            <Controller
              control={control}
              name="taxRate"
              render={({ field }) => (
                <Select
                  fullWidth
                  selectedKey={field.value}
                  onSelectionChange={value => field.onChange(Number(value))}>
                  <Label>KDV oranı</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {[0, 1, 10, 20].map(rate => (
                        <ListBox.Item key={rate} id={rate}>
                          %{rate}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}
            />
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  fullWidth
                  placeholder="Kategori seçin (opsiyonel)"
                  selectedKey={field.value}
                  onSelectionChange={value => field.onChange(value || null)}>
                  <Label>Kategori</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {categories
                        .filter(
                          category =>
                            category.isActive || category.id === field.value
                        )
                        .map(category => (
                          <ListBox.Item key={category.id} id={category.id}>
                            {getCategoryPath(category.id, categories)}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}
            />
          </div>

          <div className="space-y-4 rounded-xl bg-gray-50 p-4">
            <Controller
              control={control}
              name="priceIncludesTax"
              render={({ field }) => (
                <div>
                  <Tooltip delay={0} closeDelay={0}>
                    <Tooltip.Trigger
                      aria-label="Fiyat KDV dahil açıklaması"
                      className="flex w-fit cursor-help">
                      <Checkbox
                        isSelected={field.value}
                        onChange={isSelected => field.onChange(isSelected)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          Fiyat KDV dahil
                        </Checkbox.Content>
                      </Checkbox>
                    </Tooltip.Trigger>
                    <Tooltip.Content showArrow placement="right">
                      <Tooltip.Arrow />
                      Seçiliyse satış fiyatı KDV dahil kabul edilir. Seçili
                      değilse girdiğiniz fiyat KDV hariç kabul edilir.
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              )}
            />
            <Controller
              control={control}
              name="trackStock"
              render={({ field }) => (
                <div>
                  <Tooltip delay={0} closeDelay={0}>
                    <Tooltip.Trigger
                      aria-label="Stok takibi açıklaması"
                      className="flex w-fit cursor-help">
                      <Checkbox
                        isSelected={field.value}
                        onChange={isSelected => field.onChange(isSelected)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          Bu ürünün stokunu takip et
                        </Checkbox.Content>
                      </Checkbox>
                    </Tooltip.Trigger>
                    <Tooltip.Content showArrow placement="right">
                      <Tooltip.Arrow />
                      Seçiliyse satış ve stok hareketleri ürün miktarını
                      günceller. Seçili değilse ürünün stok miktarı değişmez.
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              )}
            />
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <div>
                  <Tooltip delay={0} closeDelay={0}>
                    <Tooltip.Trigger
                      aria-label="Ürün satış durumu açıklaması"
                      className="flex w-fit cursor-help">
                      <Checkbox
                        isSelected={field.value}
                        onChange={isSelected => field.onChange(isSelected)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          Ürün satışa açık
                        </Checkbox.Content>
                      </Checkbox>
                    </Tooltip.Trigger>
                    <Tooltip.Content showArrow placement="right">
                      <Tooltip.Arrow />
                      Seçiliyse ürün satış ekranında seçilebilir. Seçili değilse
                      ürün korunur ancak satışta kullanılamaz.
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              )}
            />
            <Controller
              control={control}
              name="useCompanyLowStockThreshold"
              render={({ field }) => (
                <div>
                  <Tooltip delay={0} closeDelay={0}>
                    <Tooltip.Trigger
                      aria-label="Varsayılan kritik stok seviyesi açıklaması"
                      className="flex w-fit cursor-help">
                      <Checkbox
                        isSelected={field.value}
                        onChange={isSelected => field.onChange(isSelected)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          Varsayılan kritik stok seviyesini kullan (
                          {companyThreshold})
                        </Checkbox.Content>
                      </Checkbox>
                    </Tooltip.Trigger>
                    <Tooltip.Content showArrow placement="right">
                      <Tooltip.Arrow />
                      Seçiliyse şirket ayarlarındaki {companyThreshold} eşiği
                      kullanılır. Seçili değilse bu ürün için aşağıdan özel bir
                      kritik stok seviyesi belirleyebilirsiniz.
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              )}
            />
            {!usesCompanyThreshold && (
              <FormInput
                control={control}
                name="lowStockThreshold"
                label="Bu ürün için kritik stok seviyesi"
                type="number"
                valueAsNumber
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-6">
            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <label className="text-sm font-medium text-gray-700">
                  Not
                  <TextArea
                    fullWidth
                    rows={3}
                    className="mt-2"
                    value={field.value ?? ''}
                    onChange={event =>
                      field.onChange(event.target.value || null)
                    }
                    placeholder="Örn: Arka rafta"
                  />
                </label>
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <label className="text-sm font-medium text-gray-700">
                  Açıklama
                  <TextArea
                    fullWidth
                    rows={4}
                    className="mt-2"
                    value={field.value ?? ''}
                    onChange={event =>
                      field.onChange(event.target.value || null)
                    }
                    placeholder="Ürünle ilgili ek bilgiler"
                  />
                </label>
              )}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            {isEditMode && (
              <Button
                variant="secondary"
                type="button"
                onPress={() => void openLabelPrint()}>
                <Printer className="mr-2" size={18} />
                Etiket Bas
              </Button>
            )}
            <Button variant="ghost" type="button" onPress={() => navigate(-1)}>
              İptal
            </Button>
            <Button
              variant="primary"
              type="submit"
              isDisabled={
                isSaving ||
                !productName?.trim() ||
                !Number.isFinite(salePrice) ||
                salePrice < 0
              }
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
      <Suspense fallback={null}>
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScan}
        />
      </Suspense>
      {isEditMode && isLabelPrintOpen && (
        <Suspense fallback={null}>
          <LabelPrintModal
            isOpen={isLabelPrintOpen}
            items={labelItems}
            onClose={() => setIsLabelPrintOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};
