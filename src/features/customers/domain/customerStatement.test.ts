import { describe, expect, it } from 'vitest';
import {
  buildCustomerStatement,
  createWhatsAppUrl,
  formatStatementMessage,
  normalizeWhatsAppPhone,
  toIstanbulDayBounds
} from './customerStatement';

const transactions = [
  {
    id: 'old-sale',
    type: 'SALE' as const,
    amount: 100,
    date: '2026-06-30T12:00:00.000Z',
    description: 'Eski satış'
  },
  {
    id: 'sale',
    type: 'SALE' as const,
    amount: 50.25,
    date: '2026-07-01T07:00:00.000Z',
    description: 'Satış'
  },
  {
    id: 'cancelled-sale',
    type: 'SALE' as const,
    amount: 500,
    date: '2026-07-02T07:00:00.000Z',
    description: 'İptal satış',
    status: 'cancelled' as const
  },
  {
    id: 'payment',
    type: 'PAYMENT' as const,
    amount: 125,
    date: '2026-07-03T07:00:00.000Z',
    description: 'Tahsilat'
  }
];

describe('customerStatement', () => {
  it('calculates opening, period totals and customer credit in minor units', () => {
    const statement = buildCustomerStatement(transactions, {
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    });

    expect(statement.openingBalanceMinor).toBe(10_000);
    expect(statement.salesTotalMinor).toBe(5_025);
    expect(statement.paymentsTotalMinor).toBe(12_500);
    expect(statement.closingBalanceMinor).toBe(2_525);
    expect(statement.entries.map(entry => entry.id)).toEqual([
      'sale',
      'payment'
    ]);
    expect(statement.entries[1].balanceAfterMinor).toBe(2_525);
  });

  it('uses Istanbul day boundaries', () => {
    expect(
      new Date(
        toIstanbulDayBounds({ startDate: '2026-07-01', endDate: '2026-07-01' })
          .startMs
      ).toISOString()
    ).toBe('2026-06-30T21:00:00.000Z');
  });

  it.each([
    ['0555 123 45 67', '+905551234567'],
    ['5551234567', '+905551234567'],
    ['+90 (555) 123-45-67', '+905551234567'],
    ['0044 7700 900123', '+447700900123']
  ])('normalizes %s for WhatsApp', (input, expected) => {
    expect(normalizeWhatsAppPhone(input)).toBe(expected);
  });

  it('rejects invalid phone numbers', () => {
    expect(normalizeWhatsAppPhone('123')).toBeNull();
  });

  it('formats an encoded click-to-chat URL and statement message', () => {
    const statement = buildCustomerStatement(transactions, {
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    });
    const message = formatStatementMessage(
      statement,
      {
        id: 'co',
        name: 'Test Market',
        ownerId: 'owner',
        createdAt: '2026-01-01'
      },
      {
        id: 'customer',
        name: 'Ali',
        surname: 'Yılmaz',
        createdAt: '2026-01-01'
      },
      { includeTransactions: true }
    );

    expect(message).toContain('*Test Market*');
    expect(message).toContain('Sayın Ali Yılmaz');
    expect(message).toContain('*Güncel borç: 25,25 ₺*');
    expect(createWhatsAppUrl('+905551234567', message)).toContain(
      'https://wa.me/905551234567?text='
    );
  });
});
