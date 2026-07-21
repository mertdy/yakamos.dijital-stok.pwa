import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Drawer,
  Input,
  Label,
  Radio,
  RadioGroup,
  Skeleton,
  Switch
} from '@heroui/react';
import {
  CalendarClock,
  CircleDollarSign,
  Package,
  ShoppingCart
} from 'lucide-react';
import { useInventoryStore } from '@/features/inventory';
import { useCategoryStore } from '@/features/inventory/store/useCategoryStore';
import type { PaymentMethod } from '@/features/sales';
import {
  getPricingRuleSummary,
  type PricingRule
} from '../domain/pricingRules';
import { TargetProductsTable } from './TargetProductsTable';

interface Props {
  rule: PricingRule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    rule: Omit<PricingRule, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
}

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'Cash', label: 'Nakit' },
  { value: 'Card', label: 'Kart' },
  { value: 'Scan', label: 'QR Kod' },
  { value: 'Credit', label: 'Veresiye' }
];

const dayOptions = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const emptySchedule = (): NonNullable<PricingRule['schedule']> => ({
  startsAt: null,
  endsAt: null,
  daysOfWeek: [],
  startTime: null,
  endTime: null
});

const hasScheduleRestrictions = (schedule: PricingRule['schedule']) =>
  Boolean(
    schedule?.startsAt ||
    schedule?.endsAt ||
    schedule?.daysOfWeek?.length ||
    schedule?.startTime ||
    schedule?.endTime
  );

const emptyRule = (): Omit<
  PricingRule,
  'id' | 'companyId' | 'createdAt' | 'updatedAt'
> => ({
  name: '',
  description: '',
  isActive: true,
  priority: 100,
  targetCategoryIds: [],
  targetProductIds: [],
  paymentMethods: ['Card'],
  otherItemsMaxTotal: null,
  effect: 'surcharge',
  amountType: 'fixed',
  amount: 0,
  application: 'per_item',
  schedule: emptySchedule()
});

const createDraft = (rule: PricingRule | null) =>
  rule ? { ...rule, schedule: rule.schedule ?? emptySchedule() } : emptyRule();

export const PricingRuleEditorDrawer = ({
  rule,
  isOpen,
  onClose,
  onSave
}: Props) => {
  const { categories } = useCategoryStore();
  const { items } = useInventoryStore();
  const [draft, setDraft] = useState(() => createDraft(rule));
  const [isAlwaysValid, setIsAlwaysValid] = useState(
    () => !hasScheduleRestrictions(createDraft(rule).schedule)
  );
  const [isTargetTableReady, setIsTargetTableReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const activeProducts = useMemo(
    () => items.filter(item => item.isActive !== false),
    [items]
  );

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => setIsTargetTableReady(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const handleTargetProductsChange = useCallback(
    (targetProductIds: string[]) =>
      setDraft(current => ({ ...current, targetProductIds })),
    []
  );

  const setAlwaysValid = (isSelected: boolean) => {
    setIsAlwaysValid(isSelected);
    if (isSelected) {
      setDraft(current => ({ ...current, schedule: emptySchedule() }));
    }
  };

  const toggle = (
    key: 'targetCategoryIds' | 'targetProductIds' | 'paymentMethods',
    value: string
  ) => {
    setDraft(current => ({
      ...current,
      [key]: current[key].includes(value as never)
        ? current[key].filter(item => item !== value)
        : [...current[key], value as never]
    }));
  };
  const toggleDay = (day: number) =>
    setDraft(current => ({
      ...current,
      schedule: {
        ...current.schedule,
        daysOfWeek: current.schedule?.daysOfWeek?.includes(day)
          ? current.schedule.daysOfWeek.filter(item => item !== day)
          : [...(current.schedule?.daysOfWeek ?? []), day]
      }
    }));

  const save = async () => {
    if (
      !draft.name.trim() ||
      !draft.amount ||
      !draft.paymentMethods.length ||
      (!draft.targetCategoryIds.length && !draft.targetProductIds.length)
    )
      return;
    setIsSaving(true);
    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        description: draft.description?.trim() || null
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };
  const preview = getPricingRuleSummary({
    ...draft,
    id: 'preview',
    companyId: '',
    createdAt: '',
    updatedAt: ''
  });

  return (
    <Drawer isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl outline-none">
            <Drawer.Header className="flex justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
              <div>
                <Drawer.Heading className="text-lg font-bold text-gray-900">
                  {rule ? 'Fiyat kuralını düzenle' : 'Yeni fiyat kuralı'}
                </Drawer.Heading>
                <p className="mt-0.5 text-sm text-gray-500">
                  Koşullar sağlandığında satışta otomatik uygulanır.
                </p>
              </div>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body className="flex-1 overflow-y-auto p-5">
              <div className="space-y-7">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      Temel bilgiler
                    </h3>
                    <Switch
                      isSelected={draft.isActive}
                      onChange={isActive =>
                        setDraft(current => ({ ...current, isActive }))
                      }
                      aria-label="Kural aktif">
                      {({ isSelected }) => (
                        <Switch.Content className="gap-2">
                          <span className="text-sm text-gray-600">
                            {isSelected ? 'Aktif' : 'Pasif'}
                          </span>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Content>
                      )}
                    </Switch>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="pricing-rule-name"
                        className="block text-sm font-medium text-gray-700">
                        Kural adı
                      </label>
                      <Input
                        id="pricing-rule-name"
                        fullWidth
                        value={draft.name}
                        onChange={event =>
                          setDraft(current => ({
                            ...current,
                            name: event.target.value
                          }))
                        }
                        placeholder="Örn. Kartlı küçük alışveriş"
                        aria-label="Kural adı"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="pricing-rule-priority"
                        className="block text-sm font-medium text-gray-700">
                        Öncelik
                      </label>
                      <Input
                        id="pricing-rule-priority"
                        fullWidth
                        type="number"
                        min="1"
                        value={String(draft.priority)}
                        onChange={event =>
                          setDraft(current => ({
                            ...current,
                            priority: Number(event.target.value) || 1
                          }))
                        }
                        aria-label="Öncelik"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="pricing-rule-description"
                      className="block text-sm font-medium text-gray-700">
                      Açıklama
                    </label>
                    <Input
                      id="pricing-rule-description"
                      fullWidth
                      value={draft.description ?? ''}
                      onChange={event =>
                        setDraft(current => ({
                          ...current,
                          description: event.target.value
                        }))
                      }
                      placeholder="Kasiyere gösterilecek kısa açıklama (isteğe bağlı)"
                      aria-label="Açıklama"
                    />
                  </div>
                </section>

                <section className="space-y-3 border-t border-gray-100 pt-5">
                  <h3 className="font-semibold text-gray-900">
                    Ne zaman uygulansın?
                  </h3>
                  <div>
                    <Label className="mb-2 block text-sm">Ödeme yöntemi</Label>
                    <div className="flex flex-wrap gap-2">
                      {paymentOptions.map(option => (
                        <Checkbox
                          key={option.value}
                          isSelected={draft.paymentMethods.includes(
                            option.value
                          )}
                          onChange={() =>
                            toggle('paymentMethods', option.value)
                          }>
                          <Checkbox.Content className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 rounded-xl border border-gray-200 px-3 py-2 text-sm">
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            {option.label}
                          </Checkbox.Content>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">
                      Hedef kategoriler
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => (
                        <Checkbox
                          key={category.id}
                          isSelected={draft.targetCategoryIds.includes(
                            category.id
                          )}
                          onChange={() =>
                            toggle('targetCategoryIds', category.id)
                          }>
                          <Checkbox.Content className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 rounded-xl border border-gray-200 px-3 py-2 text-sm">
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            {category.name}
                          </Checkbox.Content>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Hedef ürünler</Label>
                    {isTargetTableReady ? (
                      <TargetProductsTable
                        products={activeProducts}
                        selectedProductIds={draft.targetProductIds}
                        onSelectedProductIdsChange={handleTargetProductsChange}
                      />
                    ) : (
                      <div
                        className="space-y-3"
                        aria-label="Hedef ürün listesi hazırlanıyor">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-2xl" />
                        <Skeleton className="h-4 w-56 rounded-md" />
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                    <Label className="mb-1 block text-sm font-medium">
                      Hedef dışındaki ürünler için üst toplam
                    </Label>
                    <p className="mb-3 text-xs text-gray-500">
                      Hedef ürünlerin kendi tutarı bu hesaba dahil edilmez.
                    </p>
                    <Input
                      type="number"
                      min="0"
                      value={draft.otherItemsMaxTotal ?? ''}
                      onChange={event =>
                        setDraft(current => ({
                          ...current,
                          otherItemsMaxTotal:
                            event.target.value === ''
                              ? null
                              : Number(event.target.value)
                        }))
                      }
                      placeholder="Sınır yok"
                      aria-label="Hedef dışı ürünler üst toplamı"
                    />
                  </div>
                </section>

                <section className="border-t border-gray-100 pt-5">
                  <h3 className="font-semibold text-gray-900">Fiyat etkisi</h3>
                  <RadioGroup
                    className="mt-0"
                    name="effect"
                    value={draft.effect}
                    onChange={value =>
                      setDraft(current => ({
                        ...current,
                        effect: value as PricingRule['effect']
                      }))
                    }>
                    <div className="grid w-full grid-cols-2 gap-3">
                      <Radio className="w-full" value="surcharge">
                        <Radio.Content className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 relative flex w-full rounded-2xl border border-gray-200 p-5">
                          <Radio.Control className="absolute top-3 right-3">
                            <Radio.Indicator />
                          </Radio.Control>
                          <CircleDollarSign
                            className="text-primary mb-2"
                            size={20}
                          />
                          <span className="font-semibold">Ek ücret</span>
                        </Radio.Content>
                      </Radio>
                      <Radio className="w-full" value="discount">
                        <Radio.Content className="data-[selected=true]:border-success data-[selected=true]:bg-success/5 relative flex w-full rounded-2xl border border-gray-200 p-5">
                          <Radio.Control className="absolute top-3 right-3">
                            <Radio.Indicator />
                          </Radio.Control>
                          <ShoppingCart
                            className="text-success mb-2"
                            size={20}
                          />
                          <span className="font-semibold">İndirim</span>
                        </Radio.Content>
                      </Radio>
                    </div>
                  </RadioGroup>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="pricing-rule-amount"
                        className="block text-sm font-medium text-gray-700">
                        Tutar
                      </label>
                      <Input
                        id="pricing-rule-amount"
                        fullWidth
                        type="number"
                        min="0"
                        value={String(draft.amount || '')}
                        onChange={event =>
                          setDraft(current => ({
                            ...current,
                            amount: Number(event.target.value)
                          }))
                        }
                        placeholder="Tutar"
                        aria-label="Tutar"
                      />
                    </div>
                    <RadioGroup
                      name="amount-type"
                      value={draft.amountType}
                      onChange={value =>
                        setDraft(current => ({
                          ...current,
                          amountType: value as PricingRule['amountType']
                        }))
                      }>
                      <Label>Tutar türü</Label>
                      <Radio value="fixed">
                        <Radio.Content>
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          ₺ Sabit
                        </Radio.Content>
                      </Radio>
                      <Radio value="percentage">
                        <Radio.Content>
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          % Yüzde
                        </Radio.Content>
                      </Radio>
                    </RadioGroup>
                    <RadioGroup
                      name="application"
                      value={draft.application}
                      onChange={value =>
                        setDraft(current => ({
                          ...current,
                          application: value as PricingRule['application']
                        }))
                      }>
                      <Label>Uygulama</Label>
                      <Radio value="per_item">
                        <Radio.Content>
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          Ürün başına
                        </Radio.Content>
                      </Radio>
                      <Radio value="per_cart">
                        <Radio.Content>
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          Sepete bir kez
                        </Radio.Content>
                      </Radio>
                    </RadioGroup>
                  </div>
                </section>

                <section className="space-y-4 border-t border-gray-100 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="text-primary" size={18} />
                      <h3 className="font-semibold text-gray-900">
                        Geçerlilik zamanı
                      </h3>
                    </div>
                    <Checkbox
                      isSelected={isAlwaysValid}
                      onChange={setAlwaysValid}>
                      <Checkbox.Content className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium">
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        Her zaman
                      </Checkbox.Content>
                    </Checkbox>
                  </div>
                  <p className="text-xs text-gray-500">
                    {isAlwaysValid
                      ? 'Kampanya tarih, saat ve gün kısıtı olmadan uygulanır.'
                      : 'Kampanyanın uygulanacağı tarih, saat ve günleri belirleyin.'}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      type="date"
                      disabled={isAlwaysValid}
                      value={draft.schedule?.startsAt?.slice(0, 10) ?? ''}
                      onChange={event =>
                        setDraft(current => ({
                          ...current,
                          schedule: {
                            ...current.schedule,
                            startsAt: event.target.value
                              ? new Date(
                                  `${event.target.value}T00:00:00`
                                ).toISOString()
                              : null
                          }
                        }))
                      }
                      aria-label="Başlangıç tarihi"
                    />
                    <Input
                      type="date"
                      disabled={isAlwaysValid}
                      value={draft.schedule?.endsAt?.slice(0, 10) ?? ''}
                      onChange={event =>
                        setDraft(current => ({
                          ...current,
                          schedule: {
                            ...current.schedule,
                            endsAt: event.target.value
                              ? new Date(
                                  `${event.target.value}T23:59:59`
                                ).toISOString()
                              : null
                          }
                        }))
                      }
                      aria-label="Bitiş tarihi"
                    />
                    <Input
                      type="time"
                      disabled={isAlwaysValid}
                      value={draft.schedule?.startTime ?? ''}
                      onChange={event =>
                        setDraft(current => ({
                          ...current,
                          schedule: {
                            ...current.schedule,
                            startTime: event.target.value || null
                          }
                        }))
                      }
                      aria-label="Başlangıç saati"
                    />
                    <Input
                      type="time"
                      disabled={isAlwaysValid}
                      value={draft.schedule?.endTime ?? ''}
                      onChange={event =>
                        setDraft(current => ({
                          ...current,
                          schedule: {
                            ...current.schedule,
                            endTime: event.target.value || null
                          }
                        }))
                      }
                      aria-label="Bitiş saati"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map((day, index) => (
                      <Button
                        key={day}
                        size="sm"
                        isDisabled={isAlwaysValid}
                        variant={
                          draft.schedule?.daysOfWeek?.includes(index)
                            ? 'primary'
                            : 'tertiary'
                        }
                        className="rounded-full"
                        onPress={() => toggleDay(index)}>
                        {day}
                      </Button>
                    ))}
                  </div>
                </section>
                <div className="border-primary/20 bg-primary/5 rounded-2xl border p-4">
                  <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Package size={16} className="text-primary" /> Kural özeti
                  </p>
                  <p className="text-sm text-gray-600">
                    {draft.name || 'Adsız kural'} · {preview}
                  </p>
                </div>
              </div>
            </Drawer.Body>
            <Drawer.Footer className="flex gap-3 border-t border-gray-100 pt-4">
              <Button variant="tertiary" className="flex-1" onPress={onClose}>
                Vazgeç
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                isDisabled={
                  !draft.name.trim() ||
                  !draft.amount ||
                  !draft.paymentMethods.length ||
                  (!draft.targetCategoryIds.length &&
                    !draft.targetProductIds.length)
                }
                isPending={isSaving}
                onPress={() => void save()}>
                {rule ? 'Kaydet' : 'Kuralı oluştur'}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
