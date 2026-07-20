import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useSalesHistoryStore } from '../store/useSalesHistoryStore';
import { useCustomerStore } from '@/features/customers';
import { Search, Filter, X } from 'lucide-react';
import { Button, Input, ListBox, Select } from '@heroui/react';
import {
  DateRangePicker,
  DateField,
  Label,
  RangeCalendar,
  TimeField
} from '@heroui/react';
import { parseAbsoluteToLocal } from '@internationalized/date';
import { useDebounce } from '@/shared/hooks/useDebounce';
export const SalesHistoryFilters: React.FC = () => {
  const { filters, setFilters, clearFilters } = useSalesHistoryStore();
  const { customers } = useCustomerStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local state for filters to apply them on button click
  const [localFilters, setLocalFilters] = useState(filters);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery ?? '');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    setFilters({ searchQuery: debouncedSearchQuery || undefined });
  }, [debouncedSearchQuery, setFilters]);

  const handleApplyFilters = () => {
    setFilters(localFilters);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setLocalFilters({});
    clearFilters();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setLocalFilters(prev => ({ ...prev, searchQuery: val }));
  };

  return (
    <div className="mb-6 space-y-4 rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
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
          variant={showAdvanced ? 'primary' : 'outline'}
          onPress={() => setShowAdvanced(!showAdvanced)}
          className={clsx(
            'h-9 gap-2 rounded-xl',
            showAdvanced
              ? 'bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          )}>
          <Filter size={16} />
          <span className="hidden sm:inline">Gelişmiş Filtreler</span>
        </Button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2 lg:grid-cols-4">
          <Select
            fullWidth
            selectedKey={localFilters.customerId || 'all'}
            onSelectionChange={value =>
              setLocalFilters({
                ...localFilters,
                customerId: value === 'all' ? undefined : String(value)
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
                paymentMethod: value === 'all' ? undefined : String(value)
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
                  minAmount: e.target.value ? Number(e.target.value) : undefined
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
                  maxAmount: e.target.value ? Number(e.target.value) : undefined
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
                      start: parseAbsoluteToLocal(localFilters.startDate),
                      end: parseAbsoluteToLocal(localFilters.endDate)
                    }
                  : null
              }
              onChange={(range: any) => {
                if (range) {
                  setLocalFilters({
                    ...localFilters,
                    startDate: range.start.toDate().toISOString(),
                    endDate: range.end.toDate().toISOString()
                  });
                } else {
                  setLocalFilters({
                    ...localFilters,
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
                    {(segment: any) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                  <DateRangePicker.RangeSeparator />
                  <DateField.Input slot="end">
                    {(segment: any) => <DateField.Segment segment={segment} />}
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
                        {(date: any) => <RangeCalendar.Cell date={date} />}
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

          <div className="mt-2 flex items-end justify-end gap-2 lg:col-span-4">
            <Button
              variant="outline"
              onPress={handleClearFilters}
              className="h-10 rounded-xl border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
              <X size={16} className="mr-2" />
              Temizle
            </Button>
            <Button
              variant="primary"
              onPress={handleApplyFilters}
              className="h-10 rounded-xl px-6 shadow-md">
              Filtrele
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
