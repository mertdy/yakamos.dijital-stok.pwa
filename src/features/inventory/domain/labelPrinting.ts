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
  | 'IMAGE';

export interface LabelSize {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  pageSize?: 'A4';
  columns?: number;
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
    label: 'A4 – 2 sütun / 14 etiket',
    widthMm: 99,
    heightMm: 38,
    pageSize: 'A4',
    columns: 2
  }
];

export const DEFAULT_LABEL_FIELDS: LabelField[] = ['NAME', 'PRICE', 'BARCODE'];

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
