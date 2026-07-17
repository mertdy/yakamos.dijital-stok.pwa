import type { Company } from '@/core/types/tenant';
import type { Customer, CustomerTransaction } from '../store/useCustomerStore';

export type StatementRangePreset =
  | 'THIS_MONTH'
  | 'LAST_30_DAYS'
  | 'LAST_3_MONTHS'
  | 'ALL'
  | 'CUSTOM';

export interface StatementDateRange {
  startDate: string;
  endDate: string;
}

export interface StatementEntry extends CustomerTransaction {
  balanceImpactMinor: number;
  balanceAfterMinor: number;
}

export interface CustomerStatement {
  range: StatementDateRange;
  openingBalanceMinor: number;
  salesTotalMinor: number;
  paymentsTotalMinor: number;
  closingBalanceMinor: number;
  entries: StatementEntry[];
}

export const STATEMENT_SUMMARY_FIELDS = [
  'OPENING_BALANCE',
  'SALES_TOTAL',
  'PAYMENTS_TOTAL',
  'CURRENT_BALANCE'
] as const;

export type StatementSummaryField = (typeof STATEMENT_SUMMARY_FIELDS)[number];

export interface FormatStatementMessageOptions {
  includeTransactions: boolean;
  includedSummaryFields?: StatementSummaryField[];
  note?: string;
  maxTransactions?: number;
}

const ISTANBUL_OFFSET = '+03:00';

const shiftDate = (date: string, days: number): string => {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

const shiftMonths = (date: string, months: number): string => {
  const [year, month, day] = date.split('-').map(Number);
  const targetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const shifted = new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth(),
      Math.min(day, lastDayOfTargetMonth)
    )
  );
  return shifted.toISOString().slice(0, 10);
};

const toMinor = (amount: number): number => Math.round(amount * 100);

const formatMinor = (amountMinor: number): string =>
  `${(Math.abs(amountMinor) / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ₺`;

const formatBalance = (amountMinor: number): string => {
  if (amountMinor < 0) return `${formatMinor(amountMinor)} alacak`;
  return `${formatMinor(amountMinor)} borç`;
};

export const toIstanbulDateString = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const toIstanbulDayBounds = (
  range: StatementDateRange
): { startMs: number; endMs: number } => ({
  startMs: new Date(
    `${range.startDate}T00:00:00.000${ISTANBUL_OFFSET}`
  ).getTime(),
  endMs: new Date(`${range.endDate}T23:59:59.999${ISTANBUL_OFFSET}`).getTime()
});

export const getStatementDateRange = (
  preset: Exclude<StatementRangePreset, 'CUSTOM'>,
  earliestDate: string,
  now = new Date()
): StatementDateRange => {
  const today = toIstanbulDateString(now);

  switch (preset) {
    case 'THIS_MONTH':
      return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
    case 'LAST_30_DAYS':
      return { startDate: shiftDate(today, -29), endDate: today };
    case 'LAST_3_MONTHS':
      return { startDate: shiftMonths(today, -3), endDate: today };
    case 'ALL':
      return { startDate: earliestDate, endDate: today };
  }
};

export const buildCustomerStatement = (
  transactions: CustomerTransaction[],
  range: StatementDateRange
): CustomerStatement => {
  const { startMs, endMs } = toIstanbulDayBounds(range);
  const validTransactions = transactions
    .filter(transaction => transaction.status !== 'cancelled')
    .filter(transaction =>
      Number.isFinite(new Date(transaction.date).getTime())
    )
    .sort(
      (first, second) =>
        new Date(first.date).getTime() - new Date(second.date).getTime()
    );

  let openingBalanceMinor = 0;
  let runningBalanceMinor = 0;
  let salesTotalMinor = 0;
  let paymentsTotalMinor = 0;
  const entries: StatementEntry[] = [];

  validTransactions.forEach(transaction => {
    const transactionMs = new Date(transaction.date).getTime();
    const amountMinor = toMinor(transaction.amount);
    const balanceImpactMinor =
      transaction.type === 'SALE' ? amountMinor : -amountMinor;

    if (transactionMs < startMs) {
      openingBalanceMinor += balanceImpactMinor;
      return;
    }

    if (transactionMs > endMs) return;

    runningBalanceMinor += balanceImpactMinor;
    if (transaction.type === 'SALE') salesTotalMinor += amountMinor;
    else paymentsTotalMinor += amountMinor;

    entries.push({
      ...transaction,
      balanceImpactMinor,
      balanceAfterMinor: openingBalanceMinor + runningBalanceMinor
    });
  });

  return {
    range,
    openingBalanceMinor,
    salesTotalMinor,
    paymentsTotalMinor,
    closingBalanceMinor: openingBalanceMinor + runningBalanceMinor,
    entries
  };
};

export const normalizeWhatsAppPhone = (phone?: string): string | null => {
  if (!phone?.trim()) return null;

  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11)
    digits = `90${digits.slice(1)}`;
  else if (digits.startsWith('5') && digits.length === 10)
    digits = `90${digits}`;

  const normalized = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
};

export const createWhatsAppUrl = (phone: string, message: string): string =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

export const formatStatementMessage = (
  statement: CustomerStatement,
  company: Company,
  customer: Customer,
  options: FormatStatementMessageOptions
): string => {
  const companyName = company.receiptHeader?.trim() || company.name;
  const customerName = `${customer.name} ${customer.surname || ''}`.trim();
  const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit'
  });
  const { startMs, endMs } = toIstanbulDayBounds(statement.range);
  const includedSummaryFields = options.includedSummaryFields ?? [
    ...STATEMENT_SUMMARY_FIELDS
  ];
  const summaryLines: Record<StatementSummaryField, string> = {
    OPENING_BALANCE: `Devir bakiyesi: ${formatBalance(statement.openingBalanceMinor)}`,
    SALES_TOTAL: `Veresiye alışlar: ${formatMinor(statement.salesTotalMinor)}`,
    PAYMENTS_TOTAL: `Tahsilatlar: ${formatMinor(statement.paymentsTotalMinor)}`,
    CURRENT_BALANCE: `*${statement.closingBalanceMinor < 0 ? 'Güncel alacak' : 'Güncel borç'}: ${formatMinor(statement.closingBalanceMinor)}*`
  };
  const lines = [
    `*${companyName}*`,
    '*Hesap Ekstresi*',
    '',
    `Sayın ${customerName},`,
    '',
    `Dönem: ${dateFormatter.format(startMs)} – ${dateFormatter.format(endMs)}`,
    '',
    ...STATEMENT_SUMMARY_FIELDS.filter(field =>
      includedSummaryFields.includes(field)
    ).map(field => summaryLines[field])
  ];

  if (options.includeTransactions && statement.entries.length > 0) {
    const maxTransactions = options.maxTransactions ?? 10;
    const visibleEntries = statement.entries.slice(-maxTransactions);
    lines.push('', 'Son hareketler:');
    visibleEntries.forEach(entry => {
      const typeLabel = entry.type === 'SALE' ? 'Veresiye satış' : 'Tahsilat';
      const sign = entry.type === 'SALE' ? '+' : '-';
      lines.push(
        `• ${shortDateFormatter.format(new Date(entry.date))} ${typeLabel} — ${sign}${formatMinor(toMinor(entry.amount))}`
      );
    });
    if (statement.entries.length > visibleEntries.length) {
      lines.push(
        `Bu dönemde toplam ${statement.entries.length} hareket bulunmaktadır.`
      );
    }
  }

  const note = options.note?.trim();
  if (note) lines.push('', note);
  lines.push('', 'Bu ekstre bilgilendirme amaçlıdır.');

  return lines.join('\n');
};
