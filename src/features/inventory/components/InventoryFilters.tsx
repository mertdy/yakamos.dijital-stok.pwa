import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  Button,
  DateField,
  DateRangePicker,
  Input,
  Label,
  ListBox,
  RangeCalendar,
  Select
} from '@heroui/react';
import { Filter, Search, X } from 'lucide-react';
import { parseDate } from '@internationalized/date';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useCategoryStore } from '../store/useCategoryStore';
import { PRODUCT_UNITS, type ProductUnit } from '../store/useInventoryStore';

export interface InventoryFilterValues {
  searchQuery?: string;
  categoryId?: string;
  unit?: ProductUnit;
  stockStatus?: 'out' | 'low' | 'available' | 'negative';
  activeStatus?: 'active' | 'inactive';
  stockTracking?: 'tracked' | 'untracked';
  barcodeStatus?: 'hasBarcode' | 'noBarcode';
  imageStatus?: 'hasImage' | 'noImage';
  minStock?: number;
  maxStock?: number;
  minPrice?: number;
  maxPrice?: number;
  updatedAfter?: string;
  updatedBefore?: string;
}

interface InventoryFiltersProps {
  value: InventoryFilterValues;
  onChange: (value: InventoryFilterValues) => void;
}

const EMPTY_FILTERS: InventoryFilterValues = {};

const selectValue = (value: string | undefined) => value || 'all';

export const InventoryFilters = ({
  value,
  onChange
}: InventoryFiltersProps) => {
  const { categories } = useCategoryStore();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(value);
  const [searchQuery, setSearchQuery] = useState(value.searchQuery ?? '');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    setLocalFilters(value);
    setSearchQuery(value.searchQuery ?? '');
  }, [value]);

  useEffect(() => {
    if (debouncedSearchQuery !== (value.searchQuery ?? '')) {
      onChange({ ...value, searchQuery: debouncedSearchQuery || undefined });
    }
  }, [debouncedSearchQuery, onChange, value]);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(value).filter(([key, filterValue]) =>
        key === 'searchQuery' ? false : filterValue !== undefined
      ).length,
    [value]
  );

  const updateLocalFilter = <Key extends keyof InventoryFilterValues>(
    key: Key,
    filterValue: InventoryFilterValues[Key]
  ) => {
    setLocalFilters(current => ({ ...current, [key]: filterValue }));
  };

  const applyFilters = () => onChange({ ...localFilters, searchQuery });

  const clearFilters = () => {
    setSearchQuery('');
    setLocalFilters(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
  };

  const applyQuickFilter = (
    stockStatus: InventoryFilterValues['stockStatus']
  ) => {
    const nextFilters = { ...value, stockStatus };
    setLocalFilters(nextFilters);
    onChange(nextFilters);
  };

  return (
    <div className="space-y-4 border-b border-gray-100 bg-gray-50/50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full max-w-xl flex-1">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            type="text"
            fullWidth
            placeholder="Ürün adı veya barkod ile ara..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={isAdvancedOpen ? 'primary' : 'outline'}
            onPress={() => setIsAdvancedOpen(current => !current)}>
            <Filter size={17} className="mr-2" />
            Gelişmiş filtreler
            {activeFilterCount > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {(activeFilterCount > 0 || searchQuery) && (
            <Button variant="tertiary" onPress={clearFilters}>
              <X size={17} className="mr-1.5" /> Temizle
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['out', 'Stokta yok'],
          ['low', 'Düşük stok'],
          ['negative', 'Negatif stok']
        ].map(([filterValue, label]) => (
          <Button
            key={filterValue}
            size="sm"
            variant={value.stockStatus === filterValue ? 'primary' : 'tertiary'}
            className={clsx(
              'rounded-full',
              value.stockStatus === filterValue && 'shadow-sm'
            )}
            onPress={() =>
              applyQuickFilter(
                value.stockStatus === filterValue
                  ? undefined
                  : (filterValue as InventoryFilterValues['stockStatus'])
              )
            }>
            {label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={value.barcodeStatus === 'noBarcode' ? 'primary' : 'tertiary'}
          className="rounded-full"
          onPress={() => {
            const nextFilters = {
              ...value,
              barcodeStatus:
                value.barcodeStatus === 'noBarcode' ? undefined : 'noBarcode'
            } as InventoryFilterValues;
            setLocalFilters(nextFilters);
            onChange(nextFilters);
          }}>
          Barkodsuz
        </Button>
      </div>

      {isAdvancedOpen && (
        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 xl:grid-cols-4">
          <Select
            fullWidth
            selectedKey={selectValue(localFilters.categoryId)}
            onSelectionChange={selectedKey =>
              updateLocalFilter(
                'categoryId',
                selectedKey === 'all' ? undefined : String(selectedKey)
              )
            }>
            <Label>Kategori</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all">
                  Tüm kategoriler
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {categories.map(category => (
                  <ListBox.Item key={category.id} id={category.id}>
                    {category.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            fullWidth
            selectedKey={selectValue(localFilters.activeStatus)}
            onSelectionChange={selectedKey =>
              updateLocalFilter(
                'activeStatus',
                selectedKey === 'all'
                  ? undefined
                  : (String(
                      selectedKey
                    ) as InventoryFilterValues['activeStatus'])
              )
            }>
            <Label>Ürün durumu</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all">
                  Tümü
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="active">
                  Aktif
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="inactive">
                  Pasif
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            fullWidth
            selectedKey={selectValue(localFilters.stockTracking)}
            onSelectionChange={selectedKey =>
              updateLocalFilter(
                'stockTracking',
                selectedKey === 'all'
                  ? undefined
                  : (String(
                      selectedKey
                    ) as InventoryFilterValues['stockTracking'])
              )
            }>
            <Label>Stok takibi</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all">
                  Tümü
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="tracked">
                  Takip edilen
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="untracked">
                  Takip edilmeyen
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            fullWidth
            selectedKey={selectValue(localFilters.unit)}
            onSelectionChange={selectedKey =>
              updateLocalFilter(
                'unit',
                selectedKey === 'all'
                  ? undefined
                  : (String(selectedKey) as ProductUnit)
              )
            }>
            <Label>Birim</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all">
                  Tüm birimler
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {PRODUCT_UNITS.map(unit => (
                  <ListBox.Item key={unit} id={unit}>
                    {unit}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            fullWidth
            selectedKey={selectValue(localFilters.barcodeStatus)}
            onSelectionChange={selectedKey =>
              updateLocalFilter(
                'barcodeStatus',
                selectedKey === 'all'
                  ? undefined
                  : (String(
                      selectedKey
                    ) as InventoryFilterValues['barcodeStatus'])
              )
            }>
            <Label>Barkod</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all">
                  Tümü
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="hasBarcode">
                  Barkodlu
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="noBarcode">
                  Barkodsuz
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            fullWidth
            selectedKey={selectValue(localFilters.imageStatus)}
            onSelectionChange={selectedKey =>
              updateLocalFilter(
                'imageStatus',
                selectedKey === 'all'
                  ? undefined
                  : (String(
                      selectedKey
                    ) as InventoryFilterValues['imageStatus'])
              )
            }>
            <Label>Ürün görseli</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all">
                  Tümü
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="hasImage">
                  Görselli
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="noImage">
                  Görselsiz
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={localFilters.minStock?.toString() ?? ''}
              onChange={event =>
                updateLocalFilter(
                  'minStock',
                  event.target.value ? Number(event.target.value) : undefined
                )
              }
              placeholder="En az"
              aria-label="En az stok"
            />
            <Input
              type="number"
              value={localFilters.maxStock?.toString() ?? ''}
              onChange={event =>
                updateLocalFilter(
                  'maxStock',
                  event.target.value ? Number(event.target.value) : undefined
                )
              }
              placeholder="En fazla"
              aria-label="En fazla stok"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={localFilters.minPrice?.toString() ?? ''}
              onChange={event =>
                updateLocalFilter(
                  'minPrice',
                  event.target.value ? Number(event.target.value) : undefined
                )
              }
              placeholder="Min. fiyat"
              aria-label="En düşük satış fiyatı"
            />
            <Input
              type="number"
              value={localFilters.maxPrice?.toString() ?? ''}
              onChange={event =>
                updateLocalFilter(
                  'maxPrice',
                  event.target.value ? Number(event.target.value) : undefined
                )
              }
              placeholder="Maks. fiyat"
              aria-label="En yüksek satış fiyatı"
            />
          </div>

          <DateRangePicker
            className="w-full xl:col-span-2"
            value={
              localFilters.updatedAfter && localFilters.updatedBefore
                ? {
                    start: parseDate(localFilters.updatedAfter),
                    end: parseDate(localFilters.updatedBefore)
                  }
                : null
            }
            onChange={range =>
              range
                ? setLocalFilters(current => ({
                    ...current,
                    updatedAfter: range.start.toString(),
                    updatedBefore: range.end.toString()
                  }))
                : setLocalFilters(current => ({
                    ...current,
                    updatedAfter: undefined,
                    updatedBefore: undefined
                  }))
            }>
            <Label>Son güncelleme tarihi</Label>
            <DateField.Group>
              <DateField.InputContainer>
                <DateField.Input slot="start">
                  {segment => <DateField.Segment segment={segment} />}
                </DateField.Input>
                <DateRangePicker.RangeSeparator />
                <DateField.Input slot="end">
                  {segment => <DateField.Segment segment={segment} />}
                </DateField.Input>
              </DateField.InputContainer>
              <DateField.Suffix>
                <DateRangePicker.Trigger>
                  <DateRangePicker.TriggerIndicator />
                </DateRangePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>
            <DateRangePicker.Popover>
              <RangeCalendar aria-label="Son güncelleme tarih aralığı">
                <RangeCalendar.Header>
                  <RangeCalendar.YearPickerTrigger>
                    <RangeCalendar.YearPickerTriggerHeading />
                    <RangeCalendar.YearPickerTriggerIndicator />
                  </RangeCalendar.YearPickerTrigger>
                  <RangeCalendar.NavButton slot="previous" />
                  <RangeCalendar.NavButton slot="next" />
                </RangeCalendar.Header>
                <RangeCalendar.Grid>
                  <RangeCalendar.GridHeader>
                    {day => (
                      <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                    )}
                  </RangeCalendar.GridHeader>
                  <RangeCalendar.GridBody>
                    {date => <RangeCalendar.Cell date={date} />}
                  </RangeCalendar.GridBody>
                </RangeCalendar.Grid>
                <RangeCalendar.YearPickerGrid>
                  <RangeCalendar.YearPickerGridBody>
                    {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
                  </RangeCalendar.YearPickerGridBody>
                </RangeCalendar.YearPickerGrid>
              </RangeCalendar>
            </DateRangePicker.Popover>
          </DateRangePicker>

          <div className="flex justify-end gap-2 md:col-span-2 xl:col-span-4">
            <Button variant="tertiary" onPress={clearFilters}>
              Temizle
            </Button>
            <Button variant="primary" onPress={applyFilters}>
              Filtrele
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
