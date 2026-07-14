import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, toast } from '@heroui/react';
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
  const [range, setRange] = useState<StatementDateRange>({
    startDate: '',
    endDate: ''
  });
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [note, setNote] = useState('');
  const [isOpening, setIsOpening] = useState(false);

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
    setRange(getStatementDateRange('THIS_MONTH', earliestDate));
    setIncludeTransactions(true);
    setNote('');
    setIsOpening(false);
  }, [earliestDate, isOpen]);

  const statement = useMemo(
    () => buildCustomerStatement(transactions, range),
    [range, transactions]
  );
  const normalizedPhone = normalizeWhatsAppPhone(customer.phone);
  const isRangeValid =
    Boolean(range.startDate && range.endDate) &&
    range.startDate <= range.endDate;
  const message = useMemo(() => {
    if (!activeCompany || !isRangeValid) return '';
    return formatStatementMessage(statement, activeCompany, customer, {
      includeTransactions,
      note,
      maxTransactions: 10
    });
  }, [
    activeCompany,
    customer,
    includeTransactions,
    isRangeValid,
    note,
    statement
  ]);

  const selectPreset = (selectedPreset: RangeOption['key']) => {
    setPreset(selectedPreset);
    setRange(getStatementDateRange(selectedPreset, earliestDate));
  };

  const updateCustomRange = (
    field: keyof StatementDateRange,
    value: string
  ) => {
    setPreset('CUSTOM');
    setRange(current => ({ ...current, [field]: value }));
  };

  const handleOpenWhatsApp = async () => {
    if (!normalizedPhone || !activeCompany || !isRangeValid) return;

    setIsOpening(true);
    try {
      const openedWindow = window.open(
        createWhatsAppUrl(normalizedPhone, message),
        '_blank'
      );
      if (openedWindow) openedWindow.opener = null;

      await recordStatementShare({
        customerId: customer.id,
        periodStart: range.startDate,
        periodEnd: range.endDate,
        openingBalanceMinor: statement.openingBalanceMinor,
        closingBalanceMinor: statement.closingBalanceMinor,
        transactionCount: statement.entries.length,
        includedTransactions: includeTransactions,
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
        <Modal.Container>
          <Modal.Dialog className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-xl outline-none">
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
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        preset === option.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {preset === option.key && (
                        <Check className="mr-1 inline" size={14} />
                      )}
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-gray-600">
                    Başlangıç
                    <input
                      type="date"
                      value={range.startDate}
                      max={range.endDate}
                      onChange={event =>
                        updateCustomRange('startDate', event.target.value)
                      }
                      className="focus:ring-primary mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2"
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-600">
                    Bitiş
                    <input
                      type="date"
                      value={range.endDate}
                      min={range.startDate}
                      max={toIstanbulDateString(new Date())}
                      onChange={event =>
                        updateCustomRange('endDate', event.target.value)
                      }
                      className="focus:ring-primary mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2"
                    />
                  </label>
                </div>
                {!isRangeValid && (
                  <p className="text-danger mt-2 text-xs">
                    Başlangıç tarihi bitiş tarihinden sonra olamaz.
                  </p>
                )}
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
                    <p className={`mt-1 text-base font-bold ${color}`}>
                      {formatMinor(Number(value))}
                    </p>
                  </div>
                ))}
              </section>

              <section className="space-y-3">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 p-3">
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">
                      Hareketleri mesaja ekle
                    </span>
                    <span className="text-xs text-gray-500">
                      En son 10 hareket gösterilir
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={includeTransactions}
                    onChange={event =>
                      setIncludeTransactions(event.target.checked)
                    }
                    className="text-primary focus:ring-primary h-5 w-5 rounded border-gray-300"
                  />
                </label>

                <label className="block text-xs font-medium text-gray-600">
                  Ek not (isteğe bağlı)
                  <textarea
                    value={note}
                    onChange={event =>
                      setNote(event.target.value.slice(0, 200))
                    }
                    rows={2}
                    maxLength={200}
                    placeholder="Örn: Sorunuz olursa bizi arayabilirsiniz."
                    className="focus:ring-primary mt-1 block w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2"
                  />
                  <span className="mt-1 block text-right text-[10px] text-gray-400">
                    {note.length}/200
                  </span>
                </label>
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
                onPress={handleOpenWhatsApp}
                isDisabled={
                  isOpening ||
                  !normalizedPhone ||
                  !activeCompany ||
                  !isRangeValid
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
