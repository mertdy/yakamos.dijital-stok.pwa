import { describe, expect, it } from 'vitest';
import { normalizeImportHeader, suggestMapping } from './dataImport';

describe('normalizeImportHeader', () => {
  it('normalizes Turkish characters, punctuation and whitespace', () => {
    expect(normalizeImportHeader('  BARKOD-NUMARASI # ')).toBe(
      'barkod numarasi'
    );
  });
});

describe('suggestMapping', () => {
  it('maps common inventory column variants', () => {
    expect(
      suggestMapping(
        ['Ürün Adı', 'Barkod No', 'Stok Kodu', 'Miktar', 'Satış Fiyatı'],
        'inventory'
      )
    ).toMatchObject({
      name: 'Ürün Adı',
      barcode: 'Barkod No',
      sku: 'Stok Kodu',
      stock: 'Miktar',
      price: 'Satış Fiyatı'
    });
  });

  it('recognizes punctuation and Turkish suffix variations for barcode', () => {
    expect(
      suggestMapping(['Ürün Adı', 'BARKOD-NUMARASI'], 'inventory')
    ).toMatchObject({
      name: 'Ürün Adı',
      barcode: 'BARKOD-NUMARASI'
    });
  });

  it('prefers VAT-inclusive price over VAT-exclusive price', () => {
    expect(
      suggestMapping(
        ['Ürün Adı', 'Fiyat (KDV Hariç, TL)', 'Fiyat Bilgisi (KDV Dahil, TL)'],
        'inventory'
      )
    ).toMatchObject({
      price: 'Fiyat Bilgisi (KDV Dahil, TL)'
    });
  });

  it('does not automatically map a VAT-exclusive price', () => {
    expect(
      suggestMapping(['Ürün Adı', 'Fiyat (KDV Hariç, TL)'], 'inventory')
    ).toMatchObject({
      price: ''
    });
  });

  it('keeps stock code assigned to SKU instead of stock quantity', () => {
    expect(
      suggestMapping(['Ürün Adı', 'Stok Kodu', 'Stok Adedi'], 'inventory')
    ).toMatchObject({
      sku: 'Stok Kodu',
      stock: 'Stok Adedi'
    });
  });

  it('uses a high-confidence fuzzy match for minor header typos', () => {
    expect(suggestMapping(['Ürün Adı', 'Barkd'], 'inventory')).toMatchObject({
      barcode: 'Barkd'
    });
  });

  it('does not assign ambiguous headers automatically', () => {
    expect(suggestMapping(['Ürün Adı', 'Kod'], 'inventory')).toMatchObject({
      barcode: '',
      sku: ''
    });
  });

  it('maps common customer column variants', () => {
    expect(
      suggestMapping(
        ['Ad', 'Soy İsim', 'Telefon Numarası', 'E-Posta', 'Kredi Limit'],
        'customers'
      )
    ).toMatchObject({
      name: 'Ad',
      surname: 'Soy İsim',
      phone: 'Telefon Numarası',
      email: 'E-Posta',
      creditLimit: 'Kredi Limit'
    });
  });
});
