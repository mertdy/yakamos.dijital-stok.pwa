import React, { useState } from 'react';
import { useSalesHistoryStore } from '../store/useSalesHistoryStore';
import { useCustomerStore } from '../../customers/store/useCustomerStore';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@heroui/react';
import { DateRangePicker, DateField, Label, RangeCalendar, TimeField } from '@heroui/react';
import { parseAbsoluteToLocal } from '@internationalized/date';
// Using native inputs as fallback if HeroUI compound components are too complex, 
// but we will attempt to integrate them if needed. 
// For now, let's use a unified advanced filter panel.

export const SalesHistoryFilters: React.FC = () => {
  const { filters, setFilters, clearFilters } = useSalesHistoryStore();
  const { customers } = useCustomerStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local state for filters to apply them on button click
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApplyFilters = () => {
    setFilters(localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    clearFilters();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalFilters(prev => ({ ...prev, searchQuery: val }));
    // We can auto-apply search
    setFilters({ searchQuery: val });
  };

  return (
    <div className="bg-white p-4 rounded-[28px] shadow-sm mb-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Fatura No veya Müşteri Adı ile ara..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
            value={localFilters.searchQuery || ''}
            onChange={handleSearchChange}
          />
        </div>
        <Button
          variant={showAdvanced ? "primary" : "outline"}
          onPress={() => setShowAdvanced(!showAdvanced)}
          className={`rounded-xl gap-2 h-9 ${showAdvanced ? 'bg-primary/10 text-primary border-none shadow-none hover:bg-primary/20' : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'}`}
        >
          <Filter size={16} />
          <span className="hidden sm:inline">Gelişmiş Filtreler</span>
        </Button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Müşteri</label>
            <select
              className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
              value={localFilters.customerId || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, customerId: e.target.value || undefined })}
            >
              <option value="">Tümü</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.surname}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Ödeme Yöntemi</label>
            <select
              className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
              value={localFilters.paymentMethod || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, paymentMethod: e.target.value || undefined })}
            >
              <option value="">Tümü</option>
              <option value="Cash">Nakit</option>
              <option value="Card">Kart</option>
              <option value="Credit">Veresiye</option>
              <option value="Scan">QR Kod</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Min Tutar (₺)</label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
              placeholder="0"
              value={localFilters.minAmount || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, minAmount: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 ml-1">Max Tutar (₺)</label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm"
              placeholder="10000"
              value={localFilters.maxAmount || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, maxAmount: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <DateRangePicker
              className="max-w-xs w-full"
              hideTimeZone
              hourCycle={24}
              granularity="minute"
              value={localFilters.startDate && localFilters.endDate ? {
                start: parseAbsoluteToLocal(localFilters.startDate),
                end: parseAbsoluteToLocal(localFilters.endDate)
              } : null}
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
              }}
            >
              <Label className="text-xs font-semibold text-gray-500 ml-1">Tarih ve Saat Aralığı</Label>
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
                        {(day: any) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                      </RangeCalendar.GridHeader>
                      <RangeCalendar.GridBody>
                        {(date: any) => <RangeCalendar.Cell date={date} />}
                      </RangeCalendar.GridBody>
                    </RangeCalendar.Grid>
                    <RangeCalendar.YearPickerGrid>
                      <RangeCalendar.YearPickerGridBody>
                        {({year}: any) => <RangeCalendar.YearPickerCell year={year} />}
                      </RangeCalendar.YearPickerGridBody>
                    </RangeCalendar.YearPickerGrid>
                  </RangeCalendar>

                  <div className="flex items-center gap-3 border-t border-gray-100 p-3 pt-4 bg-white/50">
                    <TimeField slot="start" className="flex-1">
                      <Label className="text-xs text-gray-500 mb-1">Başlangıç Saati</Label>
                      <TimeField.Group>
                        <TimeField.InputContainer>
                          <TimeField.Input>
                            {(segment: any) => <TimeField.Segment segment={segment} />}
                          </TimeField.Input>
                        </TimeField.InputContainer>
                      </TimeField.Group>
                    </TimeField>

                    <TimeField slot="end" className="flex-1">
                      <Label className="text-xs text-gray-500 mb-1">Bitiş Saati</Label>
                      <TimeField.Group>
                        <TimeField.InputContainer>
                          <TimeField.Input>
                            {(segment: any) => <TimeField.Segment segment={segment} />}
                          </TimeField.Input>
                        </TimeField.InputContainer>
                      </TimeField.Group>
                    </TimeField>
                  </div>
                </div>
              </DateRangePicker.Popover>
            </DateRangePicker>
          </div>

          <div className="lg:col-span-4 flex items-end justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onPress={handleClearFilters}
              className="rounded-xl h-10 border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
            >
              <X size={16} className="mr-2" />
              Temizle
            </Button>
            <Button
              variant="primary"
              onPress={handleApplyFilters}
              className="rounded-xl h-10 px-6 shadow-md"
            >
              Filtrele
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
