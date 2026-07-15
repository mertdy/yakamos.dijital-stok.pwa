import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  Button,
  Checkbox,
  Description,
  FieldError,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  toast
} from '@heroui/react';
import {
  CalendarDays,
  Check,
  Loader2,
  MessageCircle,
  ReceiptText
} from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import {
  buildCustomerStatement,
  createWhatsAppUrl,
  formatStatementMessage,
  getStatementDateRange,
  normalizeWhatsAppPhone,
  toIstanbulDateString,
  type StatementDateRange,
  type StatementRangePreset
} from '../domain/customerStatement';
import {
  useCustomerStore,
  type Customer,
  type CustomerTransaction
} from '../store/useCustomerStore';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface ShareStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  transactions: CustomerTransaction[];
}

interface RangeOption {
  key: Exclude<StatementRangePreset, 'CUSTOM'>;
  label: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  { key: 'THIS_MONTH', label: 'Bu ay' },
  { key: 'LAST_30_DAYS', label: 'Son 30 gün' },
  { key: 'LAST_3_MONTHS', label: 'Son 3 ay' },
  { key: 'ALL', label: 'Tümü' }
];

const statementShareSchema = z
  .object({
    startDate: z.string().min(1, 'Başlangıç tarihi gereklidir.'),
    endDate: z.string().min(1, 'Bitiş tarihi gereklidir.'),
    includeTransactions: z.boolean(),
    note: z.string().max(200, 'Ek not en fazla 200 karakter olabilir.')
  })
  .refine(data => data.startDate <= data.endDate, {
    path: ['endDate'],
    message: 'Başlangıç tarihi bitiş tarihinden sonra olamaz.'
  });

type StatementShareFormData = z.infer<typeof statementShareSchema>;

const formatMinor = (amountMinor: number): string =>
  `${(Math.abs(amountMinor) / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ₺`;

export const ShareStatementModal = ({
  isOpen,
  onClose,
  customer,
  transactions
}: ShareStatementModalProps) => {
  const { activeCompany } = useAuthStore();
  const { recordStatementShare } = useCustomerStore();
  const [preset, setPreset] = useState<StatementRangePreset>('THIS_MONTH');
  const [isOpening, setIsOpening] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<StatementShareFormData>({
    resolver: zodResolver(statementShareSchema),
    mode: 'onChange',
    defaultValues: {
      startDate: '',
      endDate: '',
      includeTransactions: true,
      note: ''
    }
  });
  const [startDate, endDate, includeTransactions, note] = useWatch({
    control,
    name: ['startDate', 'endDate', 'includeTransactions', 'note']
  });
  const range: StatementDateRange = useMemo(
    () => ({ startDate, endDate }),
    [endDate, startDate]
  );

  const earliestDate = useMemo(() => {
    const validDates = transactions
      .map(transaction => new Date(transaction.date))
      .filter(date => Number.isFinite(date.getTime()))
      .sort((first, second) => first.getTime() - second.getTime());
    const firstDate = validDates[0] || new Date(customer.createdAt);
    return toIstanbulDateString(firstDate);
  }, [customer.createdAt, transactions]);

  useEffect(() => {
    if (!isOpen) return;
    setPreset('THIS_MONTH');
    reset({
      ...getStatementDateRange('THIS_MONTH', earliestDate),
      includeTransactions: true,
      note: ''
    });
    setIsOpening(false);
  }, [earliestDate, isOpen, reset]);

  const statement = useMemo(
    () => buildCustomerStatement(transactions, range),
    [range, transactions]
  );
  const normalizedPhone = normalizeWhatsAppPhone(customer.phone);
  const hasValidRange = Boolean(startDate && endDate && startDate <= endDate);
  const message = useMemo(() => {
    if (!activeCompany || !hasValidRange) return '';
    return formatStatementMessage(statement, activeCompany, customer, {
      includeTransactions,
      note,
      maxTransactions: 10
    });
  }, [
    activeCompany,
    customer,
    hasValidRange,
    includeTransactions,
    note,
    statement
  ]);

  const selectPreset = (selectedPreset: RangeOption['key']) => {
    setPreset(selectedPreset);
    const nextRange = getStatementDateRange(selectedPreset, earliestDate);
    setValue('startDate', nextRange.startDate, { shouldValidate: true });
    setValue('endDate', nextRange.endDate, { shouldValidate: true });
  };

  const updateCustomRange = (
    field: keyof StatementDateRange,
    value: string
  ) => {
    setPreset('CUSTOM');
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
  };

  const handleOpenWhatsApp = async (data: StatementShareFormData) => {
    if (!normalizedPhone || !activeCompany) return;

    setIsOpening(true);
    try {
      const openedWindow = window.open(
        createWhatsAppUrl(normalizedPhone, message),
        '_blank'
      );
      if (openedWindow) openedWindow.opener = null;

      await recordStatementShare({
        customerId: customer.id,
        periodStart: data.startDate,
        periodEnd: data.endDate,
        openingBalanceMinor: statement.openingBalanceMinor,
        closingBalanceMinor: statement.closingBalanceMinor,
        transactionCount: statement.entries.length,
        includedTransactions: data.includeTransactions,
        messageCharacterCount: message.length
      });
      toast.success('WhatsApp açıldı');
      onClose();
    } catch (error) {
      console.error('WhatsApp statement share failed:', error);
      toast.danger('WhatsApp açılırken veya kayıt oluşturulurken hata oluştu');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}>
      <button className="hidden" aria-hidden="true" tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container scroll="inside">
          <Modal.Dialog className="max-h-[92vh] w-full max-w-2xl rounded-3xl bg-white shadow-xl outline-none">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-[#25D366]/10 text-[#128C7E]">
                <MessageCircle className="size-5" />
              </Modal.Icon>
              <div>
                <Modal.Heading className="text-xl">
                  WhatsApp Ekstresi
                </Modal.Heading>
                <p className="text-sm font-normal text-gray-500">
                  {customer.name} {customer.surname || ''} • {normalizedPhone}
                </p>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-5">
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <CalendarDays size={17} /> Ekstre dönemi
                </h3>
                <div className="flex flex-wrap gap-2">
                  {RANGE_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => selectPreset(option.key)}
                      className={clsx(
                        'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                        preset === option.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}>
                      {preset === option.key && (
                        <Check className="mr-1 inline" size={14} />
                      )}
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField
                    fullWidth
                    name="startDate"
                    value={range.startDate}
                    onChange={value => updateCustomRange('startDate', value)}
                    isInvalid={Boolean(errors.startDate)}>
                    <Label>Başlangıç</Label>
                    <Input type="date" fullWidth max={range.endDate} />
                    <FieldError>{errors.startDate?.message}</FieldError>
                  </TextField>
                  <TextField
                    fullWidth
                    name="endDate"
                    value={range.endDate}
                    onChange={value => updateCustomRange('endDate', value)}
                    isInvalid={Boolean(errors.endDate)}>
                    <Label>Bitiş</Label>
                    <Input
                      type="date"
                      fullWidth
                      min={range.startDate}
                      max={toIstanbulDateString(new Date())}
                    />
                    <FieldError>{errors.endDate?.message}</FieldError>
                  </TextField>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ['Devir', statement.openingBalanceMinor, 'text-gray-900'],
                  ['Veresiye', statement.salesTotalMinor, 'text-orange-600'],
                  [
                    'Tahsilat',
                    statement.paymentsTotalMinor,
                    'text-emerald-600'
                  ],
                  [
                    statement.closingBalanceMinor < 0 ? 'Alacak' : 'Kapanış',
                    statement.closingBalanceMinor,
                    statement.closingBalanceMinor > 0
                      ? 'text-orange-600'
                      : 'text-blue-600'
                  ]
                ].map(([label, value, color]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <p className={clsx('mt-1 text-base font-bold', color)}>
                      {formatMinor(Number(value))}
                    </p>
                  </div>
                ))}
              </section>

              <section className="space-y-3">
                <Checkbox
                  isSelected={includeTransactions}
                  onChange={isSelected =>
                    setValue('includeTransactions', isSelected, {
                      shouldDirty: true,
                      shouldValidate: true
                    })
                  }>
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Label>Hareketleri mesaja ekle</Label>
                  </Checkbox.Content>
                  <Description>En son 10 hareket gösterilir</Description>
                </Checkbox>

                <TextField
                  fullWidth
                  name="note"
                  value={note}
                  onChange={value =>
                    setValue('note', value, {
                      shouldDirty: true,
                      shouldValidate: true
                    })
                  }
                  isInvalid={Boolean(errors.note)}>
                  <Label>Ek not (isteğe bağlı)</Label>
                  <TextArea
                    fullWidth
                    rows={2}
                    maxLength={200}
                    placeholder="Örn: Sorunuz olursa bizi arayabilirsiniz."
                  />
                  <Description>{note.length}/200</Description>
                  <FieldError>{errors.note?.message}</FieldError>
                </TextField>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <ReceiptText size={17} /> Mesaj önizlemesi
                </h3>
                <pre className="max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-4 font-sans text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
                  {message}
                </pre>
                <p className="mt-2 text-xs text-gray-400">
                  Tutarlar hesap hareketlerinden otomatik hesaplanır ve
                  değiştirilemez.
                </p>
              </section>
            </Modal.Body>

            <Modal.Footer className="flex gap-3 border-t border-gray-100 p-6">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onPress={onClose}
                isDisabled={isOpening}>
                Vazgeç
              </Button>
              <Button
                type="button"
                className="flex-1 border-none bg-[#25D366] font-bold text-white hover:bg-[#1DB954]"
                onPress={() => void handleSubmit(handleOpenWhatsApp)()}
                isDisabled={
                  isOpening ||
                  !normalizedPhone ||
                  !activeCompany ||
                  !hasValidRange ||
                  Boolean(errors.note)
                }>
                {isOpening ? (
                  <Loader2 className="mr-2 animate-spin" size={18} />
                ) : (
                  <MessageCircle className="mr-2" size={18} />
                )}
                WhatsApp'ta Aç
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
