import type { InventoryItem } from '../store/useInventoryStore';

export type LabelTemplate =
  | 'PRODUCT_BARCODE'
  | 'SHELF_PRICE'
  | 'DISCOUNT'
  | 'PACKAGE';
export type LabelField =
  | 'NAME'
  | 'PRICE'
  | 'BARCODE'
  | 'BARCODE_TEXT'
  | 'SKU'
  | 'STOCK'
  | 'UPDATED_AT'
  | 'IMAGE'
  | 'UNIT';

export interface LabelSize {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  pageSize?: 'A4';
  columns?: number;
  pagePaddingMm?: { top: number; right: number; bottom: number; left: number };
}

export const LABEL_TEMPLATES: {
  id: LabelTemplate;
  label: string;
  description: string;
}[] = [
  {
    id: 'PRODUCT_BARCODE',
    label: 'Ürün barkodu',
    description: 'Ürün üzerinde kullanım için'
  },
  {
    id: 'SHELF_PRICE',
    label: 'Raf fiyat etiketi',
    description: 'Raf ve teşhir alanları için'
  },
  {
    id: 'DISCOUNT',
    label: 'İndirim etiketi',
    description: 'Fiyat vurgulu kampanyalar için'
  },
  { id: 'PACKAGE', label: 'Koli / paket', description: 'Depo ve sevkiyat için' }
];

export const LABEL_SIZES: LabelSize[] = [
  {
    id: '40x30',
    label: '40 × 30 mm (standart ürün)',
    widthMm: 40,
    heightMm: 30
  },
  { id: '50x30', label: '50 × 30 mm', widthMm: 50, heightMm: 30 },
  { id: '58x40', label: '58 × 40 mm', widthMm: 58, heightMm: 40 },
  {
    id: '100x50',
    label: '100 × 50 mm (standart raf)',
    widthMm: 100,
    heightMm: 50
  },
  {
    id: '100x150',
    label: '100 × 150 mm (koli / paket)',
    widthMm: 100,
    heightMm: 150
  },
  {
    id: 'a4-2x7',
    label: 'A4 – 14 etiket (99,1 × 38,1 mm)',
    widthMm: 99.1,
    heightMm: 38.1,
    pageSize: 'A4',
    columns: 2,
    pagePaddingMm: { top: 15, right: 5.9, bottom: 15, left: 5.9 }
  },
  {
    id: 'a4-3x7',
    label: 'A4 – 21 etiket (63,5 × 38,1 mm)',
    widthMm: 63.5,
    heightMm: 38.1,
    pageSize: 'A4',
    columns: 3,
    pagePaddingMm: { top: 15, right: 9.75, bottom: 15, left: 9.75 }
  },
  {
    id: 'a4-3x8',
    label: 'A4 – 24 etiket (63,5 × 33,9 mm)',
    widthMm: 63.5,
    heightMm: 33.9,
    pageSize: 'A4',
    columns: 3,
    pagePaddingMm: { top: 12.9, right: 9.75, bottom: 12.9, left: 9.75 }
  },
  {
    id: 'a4-3x9',
    label: 'A4 – 27 etiket (63,5 × 29,6 mm)',
    widthMm: 63.5,
    heightMm: 29.6,
    pageSize: 'A4',
    columns: 3,
    pagePaddingMm: { top: 15.3, right: 9.75, bottom: 15.3, left: 9.75 }
  },
  {
    id: 'a4-4x10',
    label: 'A4 – 40 etiket (52,5 × 29,7 mm)',
    widthMm: 52.5,
    heightMm: 29.7,
    pageSize: 'A4',
    columns: 4
  },
  {
    id: 'a4-5x13',
    label: 'A4 – 65 etiket (38,1 × 21,2 mm)',
    widthMm: 38.1,
    heightMm: 21.2,
    pageSize: 'A4',
    columns: 5,
    pagePaddingMm: { top: 10.7, right: 9.75, bottom: 10.7, left: 9.75 }
  }
];

export const DEFAULT_LABEL_FIELDS: LabelField[] = [
  'NAME',
  'PRICE',
  'UNIT',
  'BARCODE'
];
export const DEFAULT_LABEL_SIZE_ID = '40x30';

const hasValidGs1CheckDigit = (barcode: string): boolean => {
  if (!/^\d+$/.test(barcode) || barcode.length < 2) return false;

  const digits = [...barcode].map(Number);
  const checkDigit = digits.pop();
  if (checkDigit === undefined) return false;

  const weightedSum = digits
    .reverse()
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  const expectedCheckDigit = (10 - (weightedSum % 10)) % 10;
  return checkDigit === expectedCheckDigit;
};

export const getBarcodeFormat = (
  barcode: string
): 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' => {
  if (/^\d{13}$/.test(barcode) && hasValidGs1CheckDigit(barcode)) {
    return 'EAN13';
  }
  if (/^\d{8}$/.test(barcode) && hasValidGs1CheckDigit(barcode)) {
    return 'EAN8';
  }
  if (/^\d{12}$/.test(barcode) && hasValidGs1CheckDigit(barcode)) {
    return 'UPC';
  }
  return 'CODE128';
};

export const createInternalBarcode = (item: InventoryItem): string =>
  `D${item.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;

export const formatPrice = (price: number): string =>
  price.toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  });

export const formatUpdatedAt = (updatedAt: string): string => {
  const date = new Date(updatedAt);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('tr-TR')
    : '';
};
