import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  Checkbox,
  Chip,
  Description,
  Drawer,
  Input,
  Label,
  ListBox,
  Select,
  Tabs,
  TextArea
} from '@heroui/react';
import { AlertTriangle, ArrowLeft, Check, Layers3 } from 'lucide-react';
import {
  PRODUCT_UNITS,
  getSalePrice,
  type InventoryItem,
  type ProductUnit
} from '../store/useInventoryStore';
import { getCategoryPath, useCategoryStore } from '../store/useCategoryStore';
import {
  getBulkInventoryValidation,
  hasBulkInventoryChanges,
  type BulkInventoryChanges,
  type BulkNumericOperationMode
} from '../domain/bulkInventoryEdit';

type SectionKey = 'general' | 'price' | 'stock';
type FieldKey =
  | 'categoryId'
  | 'unit'
  | 'isActive'
  | 'trackStock'
  | 'taxRate'
  | 'priceIncludesTax'
  | 'salePrice'
  | 'costPrice'
  | 'lowStock'
  | 'stock';

interface BulkInventoryEditDrawerProps {
  isOpen: boolean;
  items: InventoryItem[];
  onClose: () => void;
  onApply: (changes: BulkInventoryChanges, reason?: string) => Promise<void>;
}

const NONE_CATEGORY = '__none__';
const MIXED = Symbol('mixed');

const numericOperationOptions: Array<{
  id: BulkNumericOperationMode;
  label: string;
}> = [
  { id: 'set', label: 'Yeni değer olarak ayarla' },
  { id: 'increase_amount', label: 'Tutar kadar artır' },
  { id: 'decrease_amount', label: 'Tutar kadar azalt' },
  { id: 'increase_percent', label: 'Yüzde artır' },
  { id: 'decrease_percent', label: 'Yüzde azalt' }
];

const commonValue = <T,>(
  items: InventoryItem[],
  getValue: (item: InventoryItem) => T
) => {
  if (items.length === 0) return undefined;
  const first = getValue(items[0]);
  return items.every(item => Object.is(getValue(item), first)) ? first : MIXED;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value);

const displayCommonValue = (
  value: unknown,
  formatter?: (value: never) => string
) => {
  if (value === MIXED) return 'Karışık';
  if (value === undefined || value === null || value === '')
    return 'Belirtilmemiş';
  return formatter ? formatter(value as never) : String(value);
};

interface EditableFieldProps {
  title: string;
  currentValue: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
}

const EditableField = ({
  title,
  currentValue,
  enabled,
  onEnabledChange,
  children
}: EditableFieldProps) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
    <Checkbox isSelected={enabled} onChange={onEnabledChange}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span className="font-semibold text-gray-900">{title}</span>
      </Checkbox.Content>
    </Checkbox>
    <Description className="mt-1 text-xs text-gray-500">
      Mevcut değer: {currentValue}
    </Description>
    <div
      className={`mt-3 transition-opacity ${
        enabled ? '' : 'pointer-events-none opacity-45'
      }`}>
      {children}
    </div>
  </div>
);

export const BulkInventoryEditDrawer = ({
  isOpen,
  items,
  onClose,
  onApply
}: BulkInventoryEditDrawerProps) => {
  const { categories, loadCategories } = useCategoryStore();
  const [section, setSection] = useState<SectionKey>('general');
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [enabledFields, setEnabledFields] = useState<Set<FieldKey>>(new Set());
  const [categoryId, setCategoryId] = useState(NONE_CATEGORY);
  const [unit, setUnit] = useState<ProductUnit>('adet');
  const [isActive, setIsActive] = useState(true);
  const [trackStock, setTrackStock] = useState(true);
  const [taxRate, setTaxRate] = useState<0 | 1 | 10 | 20>(20);
  const [priceIncludesTax, setPriceIncludesTax] = useState(true);
  const [salePriceMode, setSalePriceMode] =
    useState<BulkNumericOperationMode>('set');
  const [salePriceValue, setSalePriceValue] = useState('');
  const [costPriceMode, setCostPriceMode] =
    useState<BulkNumericOperationMode>('set');
  const [costPriceValue, setCostPriceValue] = useState('');
  const [useCompanyLowStock, setUseCompanyLowStock] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [stockMode, setStockMode] = useState<'set' | 'increase' | 'decrease'>(
    'set'
  );
  const [stockValue, setStockValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const common = useMemo(
    () => ({
      categoryId: commonValue(items, item => item.categoryId ?? null),
      unit: commonValue(items, item => item.unit ?? 'adet'),
      isActive: commonValue(items, item => item.isActive !== false),
      trackStock: commonValue(items, item => item.trackStock !== false),
      taxRate: commonValue(items, item => item.taxRate ?? 20),
      priceIncludesTax: commonValue(
        items,
        item => item.priceIncludesTax !== false
      ),
      salePrice: commonValue(items, getSalePrice),
      costPrice: commonValue(items, item => item.costPrice ?? 0),
      useCompanyLowStock: commonValue(
        items,
        item => item.useCompanyLowStockThreshold !== false
      ),
      lowStockThreshold: commonValue(items, item => item.lowStockThreshold),
      stock: commonValue(items, item => item.stock)
    }),
    [items]
  );

  useEffect(() => {
    if (!isOpen) return;
    loadCategories();
    setSection('general');
    setStep('edit');
    setEnabledFields(new Set());
    setCategoryId(
      typeof common.categoryId !== 'symbol' && common.categoryId
        ? common.categoryId
        : NONE_CATEGORY
    );
    setUnit(
      typeof common.unit !== 'symbol' && common.unit ? common.unit : 'adet'
    );
    setIsActive(common.isActive !== MIXED ? Boolean(common.isActive) : true);
    setTrackStock(
      common.trackStock !== MIXED ? Boolean(common.trackStock) : true
    );
    setTaxRate(
      typeof common.taxRate !== 'symbol' && common.taxRate !== undefined
        ? common.taxRate
        : 20
    );
    setPriceIncludesTax(
      common.priceIncludesTax !== MIXED
        ? Boolean(common.priceIncludesTax)
        : true
    );
    setSalePriceValue(
      common.salePrice !== MIXED && common.salePrice !== undefined
        ? String(common.salePrice)
        : ''
    );
    setCostPriceValue(
      common.costPrice !== MIXED && common.costPrice !== undefined
        ? String(common.costPrice)
        : ''
    );
    setUseCompanyLowStock(
      common.useCompanyLowStock !== MIXED
        ? Boolean(common.useCompanyLowStock)
        : true
    );
    setLowStockThreshold(
      common.lowStockThreshold !== MIXED &&
        common.lowStockThreshold !== undefined &&
        common.lowStockThreshold !== null
        ? String(common.lowStockThreshold)
        : ''
    );
    setStockValue(
      common.stock !== MIXED && common.stock !== undefined
        ? String(common.stock)
        : ''
    );
    setReason('');
    setError(null);
  }, [common, isOpen, loadCategories]);

  const toggleField = (field: FieldKey, enabled: boolean) => {
    setEnabledFields(current => {
      const next = new Set(current);
      if (enabled) next.add(field);
      else next.delete(field);
      return next;
    });
    setError(null);
  };

  const changes = useMemo<BulkInventoryChanges>(() => {
    const next: BulkInventoryChanges = {};
    if (enabledFields.has('categoryId')) {
      next.categoryId = categoryId === NONE_CATEGORY ? null : categoryId;
    }
    if (enabledFields.has('unit')) next.unit = unit;
    if (enabledFields.has('isActive')) next.isActive = isActive;
    if (enabledFields.has('trackStock')) next.trackStock = trackStock;
    if (enabledFields.has('taxRate')) next.taxRate = taxRate;
    if (enabledFields.has('priceIncludesTax')) {
      next.priceIncludesTax = priceIncludesTax;
    }
    if (enabledFields.has('salePrice')) {
      next.salePrice = { mode: salePriceMode, value: Number(salePriceValue) };
    }
    if (enabledFields.has('costPrice')) {
      next.costPrice = { mode: costPriceMode, value: Number(costPriceValue) };
    }
    if (enabledFields.has('lowStock')) {
      next.lowStock = useCompanyLowStock
        ? { useCompanyDefault: true }
        : {
            useCompanyDefault: false,
            threshold: Number(lowStockThreshold)
          };
    }
    if (enabledFields.has('stock')) {
      next.stock = { mode: stockMode, value: Number(stockValue) };
    }
    return next;
  }, [
    categoryId,
    costPriceMode,
    costPriceValue,
    enabledFields,
    isActive,
    lowStockThreshold,
    priceIncludesTax,
    salePriceMode,
    salePriceValue,
    stockMode,
    stockValue,
    taxRate,
    trackStock,
    unit,
    useCompanyLowStock
  ]);

  const validation = useMemo(
    () => getBulkInventoryValidation(items, changes),
    [changes, items]
  );

  const validateForm = () => {
    if (!hasBulkInventoryChanges(changes)) {
      setError('Değiştirilecek en az bir alan seçin.');
      return false;
    }
    if (
      (enabledFields.has('salePrice') &&
        (!Number.isFinite(Number(salePriceValue)) ||
          Number(salePriceValue) < 0)) ||
      (enabledFields.has('costPrice') &&
        (!Number.isFinite(Number(costPriceValue)) ||
          Number(costPriceValue) < 0))
    ) {
      setError('Fiyat işlemi için sıfır veya daha büyük bir değer girin.');
      return false;
    }
    if (
      enabledFields.has('lowStock') &&
      !useCompanyLowStock &&
      (!Number.isFinite(Number(lowStockThreshold)) ||
        Number(lowStockThreshold) < 0)
    ) {
      setError('Düşük stok eşiği sıfır veya daha büyük olmalıdır.');
      return false;
    }
    if (
      enabledFields.has('stock') &&
      (!Number.isFinite(Number(stockValue)) || Number(stockValue) < 0)
    ) {
      setError('Stok işlemi için sıfır veya daha büyük bir değer girin.');
      return false;
    }
    if (enabledFields.has('stock') && !reason.trim()) {
      setError('Stok değişikliği için bir gerekçe yazın.');
      return false;
    }
    if (validation.negativePriceItems.length > 0) {
      setError('Bu işlem bazı ürünlerin fiyatını negatif yapıyor.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleReview = () => {
    if (validateForm()) setStep('review');
  };

  const handleApply = async () => {
    if (!validateForm()) {
      setStep('edit');
      return;
    }
    setIsSaving(true);
    try {
      await onApply(
        changes,
        enabledFields.has('stock') ? reason.trim() : undefined
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(() => {
    const rows: string[] = [];
    if (enabledFields.has('categoryId')) {
      rows.push(
        `Kategori: ${
          categoryId === NONE_CATEGORY
            ? 'Kategorisiz'
            : getCategoryPath(categoryId, categories)
        }`
      );
    }
    if (enabledFields.has('unit')) rows.push(`Birim: ${unit}`);
    if (enabledFields.has('isActive'))
      rows.push(`Durum: ${isActive ? 'Aktif' : 'Pasif'}`);
    if (enabledFields.has('trackStock'))
      rows.push(`Stok takibi: ${trackStock ? 'Açık' : 'Kapalı'}`);
    if (enabledFields.has('taxRate')) rows.push(`KDV: %${taxRate}`);
    if (enabledFields.has('priceIncludesTax'))
      rows.push(`Fiyat: ${priceIncludesTax ? 'KDV dahil' : 'KDV hariç'}`);
    if (enabledFields.has('salePrice'))
      rows.push(
        `Satış fiyatı: ${numericOperationOptions.find(item => item.id === salePriceMode)?.label} · ${salePriceValue}`
      );
    if (enabledFields.has('costPrice'))
      rows.push(
        `Alış fiyatı: ${numericOperationOptions.find(item => item.id === costPriceMode)?.label} · ${costPriceValue}`
      );
    if (enabledFields.has('lowStock'))
      rows.push(
        `Düşük stok: ${useCompanyLowStock ? 'Şirket varsayılanı' : lowStockThreshold}`
      );
    if (enabledFields.has('stock'))
      rows.push(
        `Stok: ${stockMode === 'set' ? 'Ayarlanacak' : stockMode === 'increase' ? 'Artırılacak' : 'Azaltılacak'} · ${stockValue}`
      );
    return rows;
  }, [
    categoryId,
    categories,
    costPriceMode,
    costPriceValue,
    enabledFields,
    isActive,
    lowStockThreshold,
    priceIncludesTax,
    salePriceMode,
    salePriceValue,
    stockMode,
    stockValue,
    taxRate,
    trackStock,
    unit,
    useCompanyLowStock
  ]);

  const booleanOptions = (
    value: boolean,
    onChange: (value: boolean) => void,
    yes: string,
    no: string
  ) => (
    <Select
      fullWidth
      aria-label={`${yes} veya ${no}`}
      selectedKey={value ? 'yes' : 'no'}
      onSelectionChange={key => onChange(key === 'yes')}>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="yes">
            {yes}
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="no">
            {no}
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );

  return (
    <Drawer isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl outline-none">
            <Drawer.Header className="flex items-start justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
              <div>
                <Drawer.Heading className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Layers3 size={20} /> Seçili ürünleri düzenle
                </Drawer.Heading>
                <p className="mt-1 text-sm text-gray-500">
                  {items.length} üründe yalnızca işaretlediğiniz alanlar
                  değişir.
                </p>
              </div>
              <Drawer.CloseTrigger />
            </Drawer.Header>

            <Drawer.Body className="flex-1 overflow-y-auto p-5">
              {step === 'edit' ? (
                <div className="space-y-5">
                  <Tabs
                    selectedKey={section}
                    onSelectionChange={key => setSection(key as SectionKey)}>
                    <Tabs.ListContainer>
                      <Tabs.List
                        aria-label="Toplu düzenleme bölümü"
                        className="w-full">
                        <Tabs.Tab
                          id="general"
                          className="flex-1 justify-center">
                          Genel
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="price" className="flex-1 justify-center">
                          Fiyat ve vergi
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="stock" className="flex-1 justify-center">
                          Stok
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>

                  {section === 'general' && (
                    <div className="space-y-3">
                      <EditableField
                        title="Kategori"
                        currentValue={displayCommonValue(
                          common.categoryId,
                          value =>
                            value
                              ? getCategoryPath(value, categories)
                              : 'Kategorisiz'
                        )}
                        enabled={enabledFields.has('categoryId')}
                        onEnabledChange={enabled =>
                          toggleField('categoryId', enabled)
                        }>
                        <Select
                          fullWidth
                          selectedKey={categoryId}
                          onSelectionChange={key => setCategoryId(String(key))}>
                          <Label>Yeni kategori</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id={NONE_CATEGORY}>
                                Kategorisiz
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              {categories
                                .filter(item => item.isActive)
                                .map(category => (
                                  <ListBox.Item
                                    key={category.id}
                                    id={category.id}>
                                    {getCategoryPath(category.id, categories)}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </EditableField>
                      <EditableField
                        title="Birim"
                        currentValue={displayCommonValue(common.unit)}
                        enabled={enabledFields.has('unit')}
                        onEnabledChange={enabled =>
                          toggleField('unit', enabled)
                        }>
                        <Select
                          fullWidth
                          selectedKey={unit}
                          onSelectionChange={key =>
                            setUnit(key as ProductUnit)
                          }>
                          <Label>Yeni birim</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {PRODUCT_UNITS.map(value => (
                                <ListBox.Item key={value} id={value}>
                                  {value}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </EditableField>
                      <EditableField
                        title="Ürün durumu"
                        currentValue={displayCommonValue(
                          common.isActive,
                          value => (value ? 'Aktif' : 'Pasif')
                        )}
                        enabled={enabledFields.has('isActive')}
                        onEnabledChange={enabled =>
                          toggleField('isActive', enabled)
                        }>
                        {booleanOptions(
                          isActive,
                          setIsActive,
                          'Aktif',
                          'Pasif'
                        )}
                      </EditableField>
                      <EditableField
                        title="Stok takibi"
                        currentValue={displayCommonValue(
                          common.trackStock,
                          value => (value ? 'Açık' : 'Kapalı')
                        )}
                        enabled={enabledFields.has('trackStock')}
                        onEnabledChange={enabled =>
                          toggleField('trackStock', enabled)
                        }>
                        {booleanOptions(
                          trackStock,
                          setTrackStock,
                          'Açık',
                          'Kapalı'
                        )}
                      </EditableField>
                    </div>
                  )}

                  {section === 'price' && (
                    <div className="space-y-3">
                      <EditableField
                        title="KDV oranı"
                        currentValue={displayCommonValue(
                          common.taxRate,
                          value => `%${value}`
                        )}
                        enabled={enabledFields.has('taxRate')}
                        onEnabledChange={enabled =>
                          toggleField('taxRate', enabled)
                        }>
                        <Select
                          fullWidth
                          selectedKey={taxRate}
                          onSelectionChange={key =>
                            setTaxRate(Number(key) as 0 | 1 | 10 | 20)
                          }>
                          <Label>Yeni KDV oranı</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {[0, 1, 10, 20].map(value => (
                                <ListBox.Item key={value} id={value}>
                                  %{value}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </EditableField>
                      <EditableField
                        title="KDV durumu"
                        currentValue={displayCommonValue(
                          common.priceIncludesTax,
                          value =>
                            value ? 'Fiyata dahil' : 'Fiyata dahil değil'
                        )}
                        enabled={enabledFields.has('priceIncludesTax')}
                        onEnabledChange={enabled =>
                          toggleField('priceIncludesTax', enabled)
                        }>
                        {booleanOptions(
                          priceIncludesTax,
                          setPriceIncludesTax,
                          'Fiyata dahil',
                          'Fiyata dahil değil'
                        )}
                      </EditableField>
                      <EditableField
                        title="Satış fiyatı"
                        currentValue={displayCommonValue(
                          common.salePrice,
                          formatMoney
                        )}
                        enabled={enabledFields.has('salePrice')}
                        onEnabledChange={enabled =>
                          toggleField('salePrice', enabled)
                        }>
                        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                          <Select
                            fullWidth
                            selectedKey={salePriceMode}
                            onSelectionChange={key =>
                              setSalePriceMode(key as BulkNumericOperationMode)
                            }>
                            <Label>İşlem</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {numericOperationOptions.map(option => (
                                  <ListBox.Item key={option.id} id={option.id}>
                                    {option.label}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <label className="text-sm font-medium text-gray-700">
                            {salePriceMode.includes('percent')
                              ? 'Oran (%)'
                              : 'Tutar (₺)'}
                            <Input
                              className="mt-1.5"
                              fullWidth
                              type="number"
                              min="0"
                              step="0.01"
                              value={salePriceValue}
                              onChange={event =>
                                setSalePriceValue(event.target.value)
                              }
                            />
                          </label>
                        </div>
                      </EditableField>
                      <EditableField
                        title="Alış fiyatı"
                        currentValue={displayCommonValue(
                          common.costPrice,
                          formatMoney
                        )}
                        enabled={enabledFields.has('costPrice')}
                        onEnabledChange={enabled =>
                          toggleField('costPrice', enabled)
                        }>
                        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                          <Select
                            fullWidth
                            selectedKey={costPriceMode}
                            onSelectionChange={key =>
                              setCostPriceMode(key as BulkNumericOperationMode)
                            }>
                            <Label>İşlem</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {numericOperationOptions.map(option => (
                                  <ListBox.Item key={option.id} id={option.id}>
                                    {option.label}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <label className="text-sm font-medium text-gray-700">
                            {costPriceMode.includes('percent')
                              ? 'Oran (%)'
                              : 'Tutar (₺)'}
                            <Input
                              className="mt-1.5"
                              fullWidth
                              type="number"
                              min="0"
                              step="0.01"
                              value={costPriceValue}
                              onChange={event =>
                                setCostPriceValue(event.target.value)
                              }
                            />
                          </label>
                        </div>
                      </EditableField>
                    </div>
                  )}

                  {section === 'stock' && (
                    <div className="space-y-3">
                      <EditableField
                        title="Düşük stok uyarısı"
                        currentValue={
                          common.useCompanyLowStock === MIXED
                            ? 'Karışık'
                            : common.useCompanyLowStock
                              ? 'Şirket varsayılanı'
                              : displayCommonValue(common.lowStockThreshold)
                        }
                        enabled={enabledFields.has('lowStock')}
                        onEnabledChange={enabled =>
                          toggleField('lowStock', enabled)
                        }>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Select
                            fullWidth
                            selectedKey={
                              useCompanyLowStock ? 'company' : 'custom'
                            }
                            onSelectionChange={key =>
                              setUseCompanyLowStock(key === 'company')
                            }>
                            <Label>Eşik kaynağı</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="company">
                                  Şirket varsayılanı
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                                <ListBox.Item id="custom">
                                  Özel eşik
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          {!useCompanyLowStock && (
                            <label className="text-sm font-medium text-gray-700">
                              Düşük stok eşiği
                              <Input
                                className="mt-1.5"
                                fullWidth
                                type="number"
                                min="0"
                                value={lowStockThreshold}
                                onChange={event =>
                                  setLowStockThreshold(event.target.value)
                                }
                              />
                            </label>
                          )}
                        </div>
                      </EditableField>
                      <EditableField
                        title="Stok adedi"
                        currentValue={displayCommonValue(common.stock)}
                        enabled={enabledFields.has('stock')}
                        onEnabledChange={enabled =>
                          toggleField('stock', enabled)
                        }>
                        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                          <Select
                            fullWidth
                            selectedKey={stockMode}
                            onSelectionChange={key =>
                              setStockMode(
                                key as 'set' | 'increase' | 'decrease'
                              )
                            }>
                            <Label>İşlem</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="set">
                                  Yeni stok olarak ayarla
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                                <ListBox.Item id="increase">
                                  Stok ekle
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                                <ListBox.Item id="decrease">
                                  Stok azalt
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <label className="text-sm font-medium text-gray-700">
                            Adet
                            <Input
                              className="mt-1.5"
                              fullWidth
                              type="number"
                              min="0"
                              step="0.01"
                              value={stockValue}
                              onChange={event =>
                                setStockValue(event.target.value)
                              }
                            />
                          </label>
                        </div>
                        <label className="mt-3 block text-sm font-medium text-gray-700">
                          Değişiklik gerekçesi
                          <TextArea
                            className="mt-1.5"
                            fullWidth
                            rows={3}
                            value={reason}
                            onChange={event => setReason(event.target.value)}
                            placeholder="Örn. Sayım düzeltmesi"
                          />
                        </label>
                      </EditableField>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Değişiklikleri kontrol edin
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Onayladığınızda tüm ürünlere tek işlem olarak uygulanır.
                      </p>
                    </div>
                    <Chip color="accent" variant="soft">
                      {items.length} ürün
                    </Chip>
                  </div>
                  <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    {summary.map(row => (
                      <div
                        key={row}
                        className="flex items-start gap-2 text-sm text-gray-700">
                        <Check
                          className="text-success mt-0.5 shrink-0"
                          size={16}
                        />
                        {row}
                      </div>
                    ))}
                  </div>
                  {validation.negativeStockItems.length > 0 && (
                    <div className="border-warning-300 bg-warning-50 text-warning-800 flex gap-3 rounded-2xl border p-4">
                      <AlertTriangle className="shrink-0" size={20} />
                      <div>
                        <p className="font-semibold">
                          {validation.negativeStockItems.length} ürünün stoğu
                          negatif olacak
                        </p>
                        <p className="mt-1 text-sm">
                          Devam ederseniz bu ürünler negatif stokla kaydedilir.
                        </p>
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">
                      Örnek değişiklikler
                    </h3>
                    <div className="space-y-2">
                      {validation.updatedItems.slice(0, 5).map(updated => {
                        const original = items.find(
                          item => item.id === updated.id
                        )!;
                        return (
                          <div
                            key={updated.id}
                            className="rounded-xl border border-gray-200 p-3">
                            <p className="truncate font-medium text-gray-900">
                              {updated.name}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-gray-500">
                              {enabledFields.has('salePrice') && (
                                <p>
                                  Satış:{' '}
                                  <span className="text-gray-700">
                                    {formatMoney(getSalePrice(original))} →{' '}
                                    {formatMoney(getSalePrice(updated))}
                                  </span>
                                </p>
                              )}
                              {enabledFields.has('costPrice') && (
                                <p>
                                  Alış:{' '}
                                  <span className="text-gray-700">
                                    {formatMoney(original.costPrice ?? 0)} →{' '}
                                    {formatMoney(updated.costPrice ?? 0)}
                                  </span>
                                </p>
                              )}
                              {enabledFields.has('stock') && (
                                <p>
                                  Stok:{' '}
                                  <span className="text-gray-700">
                                    {original.stock} → {updated.stock}
                                  </span>
                                </p>
                              )}
                              {enabledFields.has('unit') && (
                                <p>
                                  Birim:{' '}
                                  <span className="text-gray-700">
                                    {original.unit ?? 'adet'} → {updated.unit}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {validation.updatedItems.length > 5 && (
                      <Description className="mt-2 text-xs">
                        İlk 5 ürün gösteriliyor.
                      </Description>
                    )}
                  </div>
                </div>
              )}
              {error && (
                <div className="border-danger-200 bg-danger-50 text-danger-700 mt-4 rounded-xl border px-3 py-2 text-sm">
                  {error}
                </div>
              )}
            </Drawer.Body>

            <Drawer.Footer className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              {step === 'review' ? (
                <>
                  <Button
                    variant="ghost"
                    onPress={() => setStep('edit')}
                    isDisabled={isSaving}>
                    <ArrowLeft size={16} />
                    Geri dön
                  </Button>
                  <Button
                    variant="primary"
                    onPress={() => void handleApply()}
                    isPending={isSaving}>
                    {items.length} ürüne uygula
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onPress={onClose}>
                    İptal
                  </Button>
                  <Button variant="primary" onPress={handleReview}>
                    Değişiklikleri önizle
                  </Button>
                </>
              )}
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
