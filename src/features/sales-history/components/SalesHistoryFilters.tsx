import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useSalesHistoryStore } from '../store/useSalesHistoryStore';
import { useCustomerStore } from '@/features/customers';
import { Search, Filter, X } from 'lucide-react';
import { Button, Drawer, Input, ListBox, Select } from '@heroui/react';
import {
  DateRangePicker,
  DateField,
  Label,
  RangeCalendar,
  TimeField
} from '@heroui/react';
import { parseAbsoluteToLocal } from '@internationalized/date';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useSearchParams } from 'react-router-dom';
import type { SalesHistoryFilter } from '../store/useSalesHistoryStore';

const getFiltersFromSearchParams = (
  searchParams: URLSearchParams
): SalesHistoryFilter => {
  const getNumber = (key: string) => {
    const value = searchParams.get(key);
    if (!value) return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  };
  const period = searchParams.get('period');
  const status = searchParams.get('status');

  return {
    searchQuery: searchParams.get('q') || undefined,
    customerId: searchParams.get('customer') || undefined,
    paymentMethod: searchParams.get('payment') || undefined,
    minAmount: getNumber('minAmount'),
    maxAmount: getNumber('maxAmount'),
    startDate: searchParams.get('start') || undefined,
    endDate: searchParams.get('end') || undefined,
    quickPeriod: period === 'today' || period === 'week' ? period : undefined,
    hasDiscount: searchParams.get('discount') === '1' || undefined,
    status:
      status === 'completed' || status === 'cancelled' ? status : undefined
  };
};

const getSearchParamsFromFilters = (filters: SalesHistoryFilter) => {
  const searchParams = new URLSearchParams();
  const entries: Array<[string, string | number | undefined]> = [
    ['q', filters.searchQuery],
    ['customer', filters.customerId],
    ['payment', filters.paymentMethod],
    ['minAmount', filters.minAmount],
    ['maxAmount', filters.maxAmount],
    ['start', filters.startDate],
    ['end', filters.endDate],
    ['period', filters.quickPeriod],
    ['discount', filters.hasDiscount ? '1' : undefined],
    ['status', filters.status]
  ];

  entries.forEach(([key, value]) => {
    if (value !== undefined && value !== '')
      searchParams.set(key, String(value));
  });

  return searchParams;
};

const getQuickPeriodRange = (period: 'today' | 'week') => {
  const start = new Date();
  const end = new Date();

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    const day = start.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysSinceMonday);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

export const SalesHistoryFilters: React.FC = () => {
  const { filters, setFilters, clearFilters } = useSalesHistoryStore();
  const { customers } = useCustomerStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Local state for filters to apply them on button click
  const [localFilters, setLocalFilters] = useState(filters);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery ?? '');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) =>
        key === 'searchQuery' ? false : value !== undefined
      ).length,
    [filters]
  );

  useEffect(() => {
    const urlFilters = getFiltersFromSearchParams(searchParams);
    clearFilters();
    setFilters(urlFilters);
    setLocalFilters(urlFilters);
    setSearchQuery(urlFilters.searchQuery ?? '');
  }, [clearFilters, searchParams, setFilters]);

  useEffect(() => {
    if (
      debouncedSearchQuery === searchQuery &&
      debouncedSearchQuery !== (filters.searchQuery ?? '')
    ) {
      setSearchParams(
        getSearchParamsFromFilters({
          ...filters,
          searchQuery: debouncedSearchQuery || undefined
        })
      );
    }
  }, [debouncedSearchQuery, filters, searchQuery, setSearchParams]);

  const handleApplyFilters = () => {
    setSearchParams(
      getSearchParamsFromFilters({ ...localFilters, searchQuery })
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setLocalFilters({});
    clearFilters();
    setSearchParams(new URLSearchParams());
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setLocalFilters(prev => ({ ...prev, searchQuery: val }));
  };

  return (
    <div className="space-y-4 border-b border-gray-100 bg-gray-50/50 p-4">
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-xl flex-1">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            type="text"
            fullWidth
            placeholder="Fatura No veya Müşteri Adı ile ara..."
            className="pl-10"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
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
          <Button variant="tertiary" onPress={handleClearFilters}>
            <X size={17} className="mr-1.5" /> Temizle
          </Button>
        )}
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Tarih
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ['today', 'Bugün'],
                          ['week', 'Bu hafta']
                        ].map(([period, label]) => (
                          <Button
                            key={period}
                            size="sm"
                            variant={
                              localFilters.quickPeriod === period
                                ? 'primary'
                                : 'tertiary'
                            }
                            className="rounded-full"
                            onPress={() =>
                              setLocalFilters(current =>
                                current.quickPeriod === period
                                  ? {
                                      ...current,
                                      quickPeriod: undefined,
                                      startDate: undefined,
                                      endDate: undefined
                                    }
                                  : {
                                      ...current,
                                      quickPeriod: period as 'today' | 'week',
                                      ...getQuickPeriodRange(
                                        period as 'today' | 'week'
                                      )
                                    }
                              )
                            }>
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Ödeme yöntemi
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ['Cash', 'Nakit'],
                          ['Card', 'Kart'],
                          ['Scan', 'QR'],
                          ['Credit', 'Veresiye']
                        ].map(([method, label]) => (
                          <Button
                            key={method}
                            size="sm"
                            variant={
                              localFilters.paymentMethod === method
                                ? 'primary'
                                : 'tertiary'
                            }
                            className="rounded-full"
                            onPress={() =>
                              setLocalFilters(current => ({
                                ...current,
                                paymentMethod:
                                  current.paymentMethod === method
                                    ? undefined
                                    : method
                              }))
                            }>
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={
                          localFilters.hasDiscount ? 'primary' : 'tertiary'
                        }
                        className="rounded-full"
                        onPress={() =>
                          setLocalFilters(current => ({
                            ...current,
                            hasDiscount: !current.hasDiscount || undefined
                          }))
                        }>
                        İndirimli
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          localFilters.status === 'cancelled'
                            ? 'primary'
                            : 'tertiary'
                        }
                        className="rounded-full"
                        onPress={() =>
                          setLocalFilters(current => ({
                            ...current,
                            status:
                              current.status === 'cancelled'
                                ? undefined
                                : 'cancelled'
                          }))
                        }>
                        İptal edilmiş
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="grid grid-cols-1 gap-4">
                    <Select
                      fullWidth
                      selectedKey={localFilters.customerId || 'all'}
                      onSelectionChange={value =>
                        setLocalFilters({
                          ...localFilters,
                          customerId:
                            value === 'all' ? undefined : String(value)
                        })
                      }>
                      <Label>Müşteri</Label>
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
                          {customers.map(customer => (
                            <ListBox.Item key={customer.id} id={customer.id}>
                              {customer.name} {customer.surname}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Select
                      fullWidth
                      selectedKey={localFilters.paymentMethod || 'all'}
                      onSelectionChange={value =>
                        setLocalFilters({
                          ...localFilters,
                          paymentMethod:
                            value === 'all' ? undefined : String(value)
                        })
                      }>
                      <Label>Ödeme Yöntemi</Label>
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
                          <ListBox.Item id="Cash">
                            Nakit
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="Card">
                            Kart
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="Credit">
                            Veresiye
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="Scan">
                            QR Kod
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <div className="space-y-1.5">
                      <label className="ml-1 text-xs font-semibold text-gray-500">
                        Min Tutar (₺)
                      </label>
                      <Input
                        type="number"
                        fullWidth
                        placeholder="0"
                        value={localFilters.minAmount || ''}
                        onChange={e =>
                          setLocalFilters({
                            ...localFilters,
                            minAmount: e.target.value
                              ? Number(e.target.value)
                              : undefined
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="ml-1 text-xs font-semibold text-gray-500">
                        Max Tutar (₺)
                      </label>
                      <Input
                        type="number"
                        fullWidth
                        placeholder="10000"
                        value={localFilters.maxAmount || ''}
                        onChange={e =>
                          setLocalFilters({
                            ...localFilters,
                            maxAmount: e.target.value
                              ? Number(e.target.value)
                              : undefined
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5 lg:col-span-2">
                      <DateRangePicker
                        className="w-full max-w-xs"
                        hideTimeZone
                        hourCycle={24}
                        granularity="minute"
                        value={
                          localFilters.startDate && localFilters.endDate
                            ? {
                                start: parseAbsoluteToLocal(
                                  localFilters.startDate
                                ),
                                end: parseAbsoluteToLocal(localFilters.endDate)
                              }
                            : null
                        }
                        onChange={(range: any) => {
                          if (range) {
                            setLocalFilters({
                              ...localFilters,
                              quickPeriod: undefined,
                              startDate: range.start.toDate().toISOString(),
                              endDate: range.end.toDate().toISOString()
                            });
                          } else {
                            setLocalFilters({
                              ...localFilters,
                              quickPeriod: undefined,
                              startDate: undefined,
                              endDate: undefined
                            });
                          }
                        }}>
                        <Label className="ml-1 text-xs font-semibold text-gray-500">
                          Tarih ve Saat Aralığı
                        </Label>
                        <DateField.Group>
                          <DateField.InputContainer>
                            <DateField.Input slot="start">
                              {(segment: any) => (
                                <DateField.Segment segment={segment} />
                              )}
                            </DateField.Input>
                            <DateRangePicker.RangeSeparator />
                            <DateField.Input slot="end">
                              {(segment: any) => (
                                <DateField.Segment segment={segment} />
                              )}
                            </DateField.Input>
                          </DateField.InputContainer>

                          <DateField.Suffix>
                            <DateRangePicker.Trigger>
                              <DateRangePicker.TriggerIndicator />
                            </DateRangePicker.Trigger>
                          </DateField.Suffix>
                        </DateField.Group>

                        <DateRangePicker.Popover>
                          <div className="flex flex-col">
                            <RangeCalendar aria-label="Tarih ve Saat Aralığı">
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
                                  {(day: any) => (
                                    <RangeCalendar.HeaderCell>
                                      {day}
                                    </RangeCalendar.HeaderCell>
                                  )}
                                </RangeCalendar.GridHeader>
                                <RangeCalendar.GridBody>
                                  {(date: any) => (
                                    <RangeCalendar.Cell date={date} />
                                  )}
                                </RangeCalendar.GridBody>
                              </RangeCalendar.Grid>
                              <RangeCalendar.YearPickerGrid>
                                <RangeCalendar.YearPickerGridBody>
                                  {({ year }: any) => (
                                    <RangeCalendar.YearPickerCell year={year} />
                                  )}
                                </RangeCalendar.YearPickerGridBody>
                              </RangeCalendar.YearPickerGrid>
                            </RangeCalendar>

                            <div className="flex items-center gap-3 border-t border-gray-100 bg-white/50 p-3 pt-4">
                              <TimeField slot="start" className="flex-1">
                                <Label className="mb-1 text-xs text-gray-500">
                                  Başlangıç Saati
                                </Label>
                                <TimeField.Group>
                                  <TimeField.InputContainer>
                                    <TimeField.Input>
                                      {(segment: any) => (
                                        <TimeField.Segment segment={segment} />
                                      )}
                                    </TimeField.Input>
                                  </TimeField.InputContainer>
                                </TimeField.Group>
                              </TimeField>

                              <TimeField slot="end" className="flex-1">
                                <Label className="mb-1 text-xs text-gray-500">
                                  Bitiş Saati
                                </Label>
                                <TimeField.Group>
                                  <TimeField.InputContainer>
                                    <TimeField.Input>
                                      {(segment: any) => (
                                        <TimeField.Segment segment={segment} />
                                      )}
                                    </TimeField.Input>
                                  </TimeField.InputContainer>
                                </TimeField.Group>
                              </TimeField>
                            </div>
                          </div>
                        </DateRangePicker.Popover>
                      </DateRangePicker>
                    </div>
                  </div>
                </div>
              </Drawer.Body>
              <Drawer.Footer className="flex gap-2 border-t border-gray-100 pt-4">
                <Button
                  variant="outline"
                  onPress={handleClearFilters}
                  className="h-10 flex-1 rounded-xl border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
                  <X size={16} className="mr-2" />
                  Temizle
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    handleApplyFilters();
                    setIsFilterDrawerOpen(false);
                  }}
                  className="h-10 flex-1 rounded-xl shadow-md">
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
