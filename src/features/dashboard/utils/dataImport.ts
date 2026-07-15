import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/core/firebase/config';
import type { Customer } from '@/features/customers';
import type { InventoryItem } from '@/features/inventory';

export type ImportType = 'inventory' | 'customers';
export type DuplicateMode = 'update' | 'skip' | 'create';
export type StockMode = 'replace' | 'add';
export type ImportRow = Record<string, unknown>;
export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
}

export const IMPORT_FIELDS = {
  inventory: [
    ['name', 'Ürün adı', true],
    ['barcode', 'Barkod', false],
    ['sku', 'SKU', false],
    ['stock', 'Stok', false],
    ['price', 'Fiyat', false]
  ],
  customers: [
    ['name', 'Ad', true],
    ['surname', 'Soyad', false],
    ['phone', 'Telefon', false],
    ['email', 'E-posta', false],
    ['creditLimit', 'Kredi limiti', false]
  ]
} as const;

const aliases: Record<string, string[]> = {
  name: ['ürün adı', 'urun adi', 'ürün', 'urun', 'ad', 'isim', 'name'],
  barcode: ['barkod', 'barcode'],
  sku: ['sku', 'stok kodu', 'ürün kodu'],
  stock: ['stok', 'adet', 'miktar', 'quantity'],
  price: ['fiyat', 'birim fiyat', 'satış fiyatı', 'price'],
  surname: ['soyad', 'soyisim', 'surname'],
  phone: ['telefon', 'tel', 'phone'],
  email: ['e-posta', 'eposta', 'email'],
  creditLimit: ['kredi limiti', 'limit', 'credit limit']
};
const key = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
const numberValue = (value: unknown) =>
  Number(String(value ?? 0).replace(',', '.')) || 0;

export const suggestMapping = (headers: string[], type: ImportType) =>
  Object.fromEntries(
    IMPORT_FIELDS[type].map(([field]) => [
      field,
      headers.find(header => aliases[field]?.includes(key(header))) || ''
    ])
  );

export const parseImportFile = async (file: File) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    sheetRows: 5001
  });
  const sheetName = workbook.SheetNames[0];
  const values = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: ''
  }) as unknown[][];
  const headers = (values[0] || []).map(value => String(value).trim());
  return {
    headers,
    rows: values
      .slice(1)
      .filter(row => row.some(value => String(value).trim())),
    sheetName,
    totalRows: Math.max(values.length - 1, 0)
  };
};

export const buildImportRows = (
  rawRows: unknown[][],
  headers: string[],
  mapping: Record<string, string>
) =>
  rawRows.map(row => {
    const source = Object.fromEntries(
      headers.map((header, index) => [header, row[index]])
    );
    return Object.fromEntries(
      Object.entries(mapping).map(([field, header]) => [
        field,
        header ? source[header] : undefined
      ])
    );
  });

export const importRows = async ({
  type,
  rows,
  companyId,
  userId,
  inventory,
  customers,
  duplicateMode,
  stockMode
}: {
  type: ImportType;
  rows: ImportRow[];
  companyId: string;
  userId: string;
  inventory: InventoryItem[];
  customers: Customer[];
  duplicateMode: DuplicateMode;
  stockMode: StockMode;
}) => {
  const validRows = rows.filter(row => key(row.name));
  let created = 0,
    updated = 0,
    skipped = 0;
  for (let start = 0; start < validRows.length; start += 450) {
    const batch = writeBatch(db);
    validRows.slice(start, start + 450).forEach(row => {
      const now = new Date().toISOString();
      if (type === 'inventory') {
        const barcode = key(row.barcode);
        const sku = key(row.sku);
        const existing = inventory.find(
          item =>
            (barcode && key(item.barcode) === barcode) ||
            (sku && key(item.sku) === sku)
        );
        if (existing && duplicateMode === 'skip') {
          skipped++;
          return;
        }
        const payload = {
          name: String(row.name).trim(),
          barcode: String(row.barcode || '').trim(),
          sku: String(row.sku || '').trim(),
          stock:
            stockMode === 'add' && existing
              ? existing.stock + numberValue(row.stock)
              : numberValue(row.stock),
          price: numberValue(row.price),
          updatedAt: now,
          userId,
          companyId
        };
        if (existing && duplicateMode === 'update') {
          batch.set(doc(db, 'inventory', existing.id), payload, {
            merge: true
          });
          updated++;
        } else {
          batch.set(doc(collection(db, 'inventory')), payload);
          created++;
        }
      } else {
        const phone = key(row.phone).replace(/\D/g, '');
        const email = key(row.email);
        const existing = customers.find(
          customer =>
            (phone && key(customer.phone).replace(/\D/g, '') === phone) ||
            (email && key(customer.email) === email)
        );
        if (existing && duplicateMode === 'skip') {
          skipped++;
          return;
        }
        const payload = {
          name: String(row.name).trim(),
          surname: String(row.surname || '').trim(),
          phone: String(row.phone || '').trim(),
          email: String(row.email || '').trim(),
          creditLimit: numberValue(row.creditLimit),
          updatedAt: now,
          userId,
          companyId
        };
        if (existing && duplicateMode === 'update') {
          batch.set(doc(db, 'customers', existing.id), payload, {
            merge: true
          });
          updated++;
        } else {
          batch.set(doc(collection(db, 'customers')), {
            ...payload,
            totalDebt: 0,
            createdAt: now
          });
          created++;
        }
      }
    });
    await batch.commit();
  }
  return {
    created,
    updated,
    skipped,
    invalid: rows.length - validRows.length
  } satisfies ImportResult;
};
