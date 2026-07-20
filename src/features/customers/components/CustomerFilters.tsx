import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  Button,
  DateField,
  DateRangePicker,
  Drawer,
  Input,
  Label,
  RangeCalendar,
  Select,
  ListBox
} from '@heroui/react';
import { parseDate } from '@internationalized/date';
import { Filter, Search, X } from 'lucide-react';
import { useDebounce } from '@/shared/hooks/useDebounce';

export interface CustomerFilterValues {
  searchQuery?: string;
  debtStatus?: 'noDebt' | 'hasDebt' | 'limitExceeded';
  creditLimitStatus?: 'limited' | 'unlimited';
  phoneStatus?: 'hasPhone' | 'noPhone';
  emailStatus?: 'hasEmail' | 'noEmail';
  minDebt?: number;
  maxDebt?: number;
  minCreditLimit?: number;
  maxCreditLimit?: number;
  createdAfter?: string;
  createdBefore?: string;
  quickFilter?: 'recentlyAdded';
}

interface CustomerFiltersProps {
  value: CustomerFilterValues;
  onChange: (value: CustomerFilterValues) => void;
}

const EMPTY_FILTERS: CustomerFilterValues = {};
const selectValue = (value: string | undefined) => value || 'all';

const getRecentlyAddedRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    createdAfter: start.toISOString().slice(0, 10),
    createdBefore: end.toISOString().slice(0, 10)
  };
};

export const CustomerFilters = ({ value, onChange }: CustomerFiltersProps) => {
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

  const updateLocalFilter = <Key extends keyof CustomerFilterValues>(
    key: Key,
    filterValue: CustomerFilterValues[Key]
  ) => {
    setLocalFilters(current => ({ ...current, [key]: filterValue }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setLocalFilters(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
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
            placeholder="İsim, soyisim veya telefon ile ara..."
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
                        ['hasDebt', 'Borçlu'],
                        ['limitExceeded', 'Limit aşımı'],
                        ['noPhone', 'Telefonsuz'],
                        ['noEmail', 'E-postasız']
                      ].map(([filterValue, label]) => {
                        const isSelected =
                          (filterValue === 'hasDebt' &&
                            localFilters.debtStatus === 'hasDebt') ||
                          (filterValue === 'limitExceeded' &&
                            localFilters.debtStatus === 'limitExceeded') ||
                          (filterValue === 'noPhone' &&
                            localFilters.phoneStatus === 'noPhone') ||
                          (filterValue === 'noEmail' &&
                            localFilters.emailStatus === 'noEmail');

                        return (
                          <Button
                            key={filterValue}
                            size="sm"
                            variant={isSelected ? 'primary' : 'tertiary'}
                            className="rounded-full"
                            onPress={() => {
                              if (filterValue === 'hasDebt') {
                                updateLocalFilter(
                                  'debtStatus',
                                  isSelected ? undefined : 'hasDebt'
                                );
                              } else if (filterValue === 'limitExceeded') {
                                updateLocalFilter(
                                  'debtStatus',
                                  isSelected ? undefined : 'limitExceeded'
                                );
                              } else if (filterValue === 'noPhone') {
                                updateLocalFilter(
                                  'phoneStatus',
                                  isSelected ? undefined : 'noPhone'
                                );
                              } else {
                                updateLocalFilter(
                                  'emailStatus',
                                  isSelected ? undefined : 'noEmail'
                                );
                              }
                            }}>
                            {label}
                          </Button>
                        );
                      })}
                      <Button
                        size="sm"
                        variant={
                          localFilters.quickFilter === 'recentlyAdded'
                            ? 'primary'
                            : 'tertiary'
                        }
                        className="rounded-full"
                        onPress={() =>
                          setLocalFilters(current =>
                            current.quickFilter === 'recentlyAdded'
                              ? {
                                  ...current,
                                  quickFilter: undefined,
                                  createdAfter: undefined,
                                  createdBefore: undefined
                                }
                              : {
                                  ...current,
                                  quickFilter: 'recentlyAdded',
                                  ...getRecentlyAddedRange()
                                }
                          )
                        }>
                        Son 30 gün
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  <div className="grid grid-cols-1 gap-4">
                    <Select
                      fullWidth
                      selectedKey={selectValue(localFilters.debtStatus)}
                      onSelectionChange={selectedKey =>
                        updateLocalFilter(
                          'debtStatus',
                          selectedKey === 'all'
                            ? undefined
                            : (String(
                                selectedKey
                              ) as CustomerFilterValues['debtStatus'])
                        )
                      }>
                      <Label>Borç durumu</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="all">Tümü</ListBox.Item>
                          <ListBox.Item id="noDebt">Borcu yok</ListBox.Item>
                          <ListBox.Item id="hasDebt">Borçlu</ListBox.Item>
                          <ListBox.Item id="limitExceeded">
                            Kredi limiti aşılmış
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Select
                      fullWidth
                      selectedKey={selectValue(localFilters.creditLimitStatus)}
                      onSelectionChange={selectedKey =>
                        updateLocalFilter(
                          'creditLimitStatus',
                          selectedKey === 'all'
                            ? undefined
                            : (String(
                                selectedKey
                              ) as CustomerFilterValues['creditLimitStatus'])
                        )
                      }>
                      <Label>Kredi limiti</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="all">Tümü</ListBox.Item>
                          <ListBox.Item id="limited">
                            Limit tanımlı
                          </ListBox.Item>
                          <ListBox.Item id="unlimited">Limitsiz</ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Select
                      fullWidth
                      selectedKey={selectValue(localFilters.phoneStatus)}
                      onSelectionChange={selectedKey =>
                        updateLocalFilter(
                          'phoneStatus',
                          selectedKey === 'all'
                            ? undefined
                            : (String(
                                selectedKey
                              ) as CustomerFilterValues['phoneStatus'])
                        )
                      }>
                      <Label>Telefon</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="all">Tümü</ListBox.Item>
                          <ListBox.Item id="hasPhone">
                            Telefonu var
                          </ListBox.Item>
                          <ListBox.Item id="noPhone">Telefonu yok</ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Select
                      fullWidth
                      selectedKey={selectValue(localFilters.emailStatus)}
                      onSelectionChange={selectedKey =>
                        updateLocalFilter(
                          'emailStatus',
                          selectedKey === 'all'
                            ? undefined
                            : (String(
                                selectedKey
                              ) as CustomerFilterValues['emailStatus'])
                        )
                      }>
                      <Label>E-posta</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="all">Tümü</ListBox.Item>
                          <ListBox.Item id="hasEmail">
                            E-postası var
                          </ListBox.Item>
                          <ListBox.Item id="noEmail">
                            E-postası yok
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <RangeInputs
                      label="Mevcut borç"
                      minValue={localFilters.minDebt}
                      maxValue={localFilters.maxDebt}
                      onMinChange={value => updateLocalFilter('minDebt', value)}
                      onMaxChange={value => updateLocalFilter('maxDebt', value)}
                    />
                    <RangeInputs
                      label="Kredi limiti"
                      minValue={localFilters.minCreditLimit}
                      maxValue={localFilters.maxCreditLimit}
                      onMinChange={value =>
                        updateLocalFilter('minCreditLimit', value)
                      }
                      onMaxChange={value =>
                        updateLocalFilter('maxCreditLimit', value)
                      }
                    />

                    <DateRangePicker
                      className="w-full"
                      value={
                        localFilters.createdAfter && localFilters.createdBefore
                          ? {
                              start: parseDate(localFilters.createdAfter),
                              end: parseDate(localFilters.createdBefore)
                            }
                          : null
                      }
                      onChange={range =>
                        setLocalFilters(current =>
                          range
                            ? {
                                ...current,
                                quickFilter: undefined,
                                createdAfter: range.start.toString(),
                                createdBefore: range.end.toString()
                              }
                            : {
                                ...current,
                                quickFilter: undefined,
                                createdAfter: undefined,
                                createdBefore: undefined
                              }
                        )
                      }>
                      <Label>Kayıt tarihi</Label>
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
                        <RangeCalendar aria-label="Kayıt tarihi aralığı">
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
                    onChange({ ...localFilters, searchQuery });
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

interface RangeInputsProps {
  label: string;
  minValue?: number;
  maxValue?: number;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
}

const RangeInputs = ({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange
}: RangeInputsProps) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <div className="grid grid-cols-2 gap-2">
      <Input
        type="number"
        value={minValue?.toString() ?? ''}
        onChange={event =>
          onMinChange(
            event.target.value ? Number(event.target.value) : undefined
          )
        }
        placeholder="En az"
        aria-label={`En az ${label.toLocaleLowerCase('tr-TR')}`}
      />
      <Input
        type="number"
        value={maxValue?.toString() ?? ''}
        onChange={event =>
          onMaxChange(
            event.target.value ? Number(event.target.value) : undefined
          )
        }
        placeholder="En fazla"
        aria-label={`En fazla ${label.toLocaleLowerCase('tr-TR')}`}
      />
    </div>
  </div>
);
