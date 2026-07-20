import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  Button,
  DateField,
  DateRangePicker,
  Drawer,
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
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
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

  const toggleQuickStockFilter = (
    stockStatus: InventoryFilterValues['stockStatus']
  ) => {
    setLocalFilters(current => ({
      ...current,
      stockStatus: current.stockStatus === stockStatus ? undefined : stockStatus
    }));
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
            variant={isFilterDrawerOpen ? 'primary' : 'outline'}
            onPress={() => setIsFilterDrawerOpen(true)}
            className={clsx(
              'h-9 gap-2 rounded-xl',
              isFilterDrawerOpen
                ? 'bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            )}>
            <Filter size={16} />
            <span className="hidden sm:inline">Gelişmiş Filtreler</span>
          </Button>
          {(activeFilterCount > 0 || searchQuery) && (
            <Button variant="tertiary" onPress={clearFilters}>
              <X size={17} className="mr-1.5" /> Temizle
            </Button>
          )}
        </div>
      </div>

      <Drawer isOpen={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl outline-none">
              <Drawer.Header className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
                <Drawer.Heading className="text-lg font-bold text-gray-900">
                  Gelişmiş Filtreler
                </Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body className="flex-1 overflow-y-auto p-5">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Hızlı filtreler
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['out', 'Stokta yok'],
                        ['low', 'Düşük stok'],
                        ['negative', 'Negatif stok']
                      ].map(([filterValue, label]) => (
                        <Button
                          key={filterValue}
                          size="sm"
                          variant={
                            localFilters.stockStatus === filterValue
                              ? 'primary'
                              : 'tertiary'
                          }
                          className={clsx(
                            'rounded-full',
                            localFilters.stockStatus === filterValue &&
                              'shadow-sm'
                          )}
                          onPress={() =>
                            toggleQuickStockFilter(
                              filterValue as InventoryFilterValues['stockStatus']
                            )
                          }>
                          {label}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant={
                          localFilters.barcodeStatus === 'noBarcode'
                            ? 'primary'
                            : 'tertiary'
                        }
                        className="rounded-full"
                        onPress={() =>
                          updateLocalFilter(
                            'barcodeStatus',
                            localFilters.barcodeStatus === 'noBarcode'
                              ? undefined
                              : 'noBarcode'
                          )
                        }>
                        Barkodsuz
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="grid grid-cols-1 gap-4">
                    <Select
                      fullWidth
                      selectedKey={selectValue(localFilters.categoryId)}
                      onSelectionChange={selectedKey =>
                        updateLocalFilter(
                          'categoryId',
                          selectedKey === 'all'
                            ? undefined
                            : String(selectedKey)
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

                    <div className="space-y-1.5">
                      <Label>Stok miktarı</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={localFilters.minStock?.toString() ?? ''}
                          onChange={event =>
                            updateLocalFilter(
                              'minStock',
                              event.target.value
                                ? Number(event.target.value)
                                : undefined
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
                              event.target.value
                                ? Number(event.target.value)
                                : undefined
                            )
                          }
                          placeholder="En fazla"
                          aria-label="En fazla stok"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Satış fiyatı</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={localFilters.minPrice?.toString() ?? ''}
                          onChange={event =>
                            updateLocalFilter(
                              'minPrice',
                              event.target.value
                                ? Number(event.target.value)
                                : undefined
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
                              event.target.value
                                ? Number(event.target.value)
                                : undefined
                            )
                          }
                          placeholder="Maks. fiyat"
                          aria-label="En yüksek satış fiyatı"
                        />
                      </div>
                    </div>

                    <DateRangePicker
                      className="w-full"
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
                                <RangeCalendar.HeaderCell>
                                  {day}
                                </RangeCalendar.HeaderCell>
                              )}
                            </RangeCalendar.GridHeader>
                            <RangeCalendar.GridBody>
                              {date => <RangeCalendar.Cell date={date} />}
                            </RangeCalendar.GridBody>
                          </RangeCalendar.Grid>
                          <RangeCalendar.YearPickerGrid>
                            <RangeCalendar.YearPickerGridBody>
                              {({ year }) => (
                                <RangeCalendar.YearPickerCell year={year} />
                              )}
                            </RangeCalendar.YearPickerGridBody>
                          </RangeCalendar.YearPickerGrid>
                        </RangeCalendar>
                      </DateRangePicker.Popover>
                    </DateRangePicker>
                  </div>
                </div>
              </Drawer.Body>
              <Drawer.Footer className="flex gap-2 border-t border-gray-100 pt-4">
                <Button
                  variant="outline"
                  onPress={clearFilters}
                  className="flex-1">
                  Temizle
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    applyFilters();
                    setIsFilterDrawerOpen(false);
                  }}
                  className="flex-1">
                  Filtrele
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
};
