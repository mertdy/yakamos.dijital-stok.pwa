import { describe, expect, it } from 'vitest';
import { createInternalBarcode, getBarcodeFormat } from './labelPrinting';

describe('label printing helpers', () => {
  it('uses retail formats for valid numeric barcodes', () => {
    expect(getBarcodeFormat('8690504012344')).toBe('EAN13');
    expect(getBarcodeFormat('12345670')).toBe('EAN8');
    expect(getBarcodeFormat('012345678905')).toBe('UPC');
  });

  it('uses Code 128 for application-generated and SKU barcodes', () => {
    expect(getBarcodeFormat('DSKU-123')).toBe('CODE128');
    expect(getBarcodeFormat('12341234')).toBe('CODE128');
    expect(getBarcodeFormat('8690504012345')).toBe('CODE128');
  });

  it('creates a stable compact barcode from the product id', () => {
    expect(
      createInternalBarcode({
        id: '12345678-90ab-cdef-1234-567890abcdef',
        name: 'Deneme',
        stock: 0,
        price: 0,
        updatedAt: '2026-01-01T00:00:00.000Z'
      })
    ).toBe('D1234567890AB');
  });
});
