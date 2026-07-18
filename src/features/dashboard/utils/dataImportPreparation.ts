import type { Customer } from '@/features/customers';
import type { InventoryItem } from '@/features/inventory';

export type ImportPreparationType = 'inventory' | 'customers';
export type ImportPreparationDuplicateMode = 'update' | 'skip' | 'create';
export type ImportPreparationStockMode = 'replace' | 'add';
export type ImportPreparationRow = Record<string, unknown>;

export interface PreparedImportOperation {
  collection: 'inventory' | 'customers';
  id?: string;
  payload: Record<string, unknown>;
}

export interface PreparedImportResult {
  operations: PreparedImportOperation[];
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
}

const key = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
const numberValue = (value: unknown) =>
  Number(String(value ?? 0).replace(',', '.')) || 0;
const units = new Set(['adet', 'kg', 'g', 'lt', 'ml', 'paket', 'koli']);

export const prepareImportOperations = ({
  type,
  rows,
  companyId,
  userId,
  inventory,
  customers,
  duplicateMode,
  stockMode
}: {
  type: ImportPreparationType;
  rows: ImportPreparationRow[];
  companyId: string;
  userId: string;
  inventory: InventoryItem[];
  customers: Customer[];
  duplicateMode: ImportPreparationDuplicateMode;
  stockMode: ImportPreparationStockMode;
}): PreparedImportResult => {
  const validRows = rows.filter(row => key(row.name));
  const inventoryByBarcode = new Map(
    inventory
      .filter(item => key(item.barcode))
      .map(item => [key(item.barcode), item])
  );
  const inventoryBySku = new Map(
    inventory.filter(item => key(item.sku)).map(item => [key(item.sku), item])
  );
  const customersByPhone = new Map(
    customers
      .filter(customer => key(customer.phone))
      .map(customer => [key(customer.phone).replace(/\D/g, ''), customer])
  );
  const customersByEmail = new Map(
    customers
      .filter(customer => key(customer.email))
      .map(customer => [key(customer.email), customer])
  );
  const operations: PreparedImportOperation[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  validRows.forEach(row => {
    const now = new Date().toISOString();
    if (type === 'inventory') {
      const barcode = key(row.barcode);
      const sku = key(row.sku);
      const existing =
        (barcode ? inventoryByBarcode.get(barcode) : undefined) ??
        (sku ? inventoryBySku.get(sku) : undefined);
      if (existing && duplicateMode === 'skip') {
        skipped++;
        return;
      }
      const unit = String(row.unit || '').trim();
      const payload = {
        name: String(row.name).trim(),
        barcode: String(row.barcode || '').trim(),
        sku: String(row.sku || '').trim(),
        stock:
          stockMode === 'add' && existing
            ? existing.stock + numberValue(row.stock)
            : numberValue(row.stock),
        salePrice: numberValue(row.price),
        price: numberValue(row.price),
        costPrice:
          row.costPrice === undefined || row.costPrice === ''
            ? null
            : numberValue(row.costPrice),
        taxRate: ([0, 1, 10, 20].includes(numberValue(row.taxRate))
          ? numberValue(row.taxRate)
          : 20) as 0 | 1 | 10 | 20,
        priceIncludesTax: true,
        unit: units.has(unit) ? unit : 'adet',
        trackStock: true,
        useCompanyLowStockThreshold:
          row.lowStockThreshold === undefined || row.lowStockThreshold === '',
        lowStockThreshold:
          row.lowStockThreshold === undefined || row.lowStockThreshold === ''
            ? null
            : numberValue(row.lowStockThreshold),
        isActive: true,
        note: String(row.note || '').trim() || null,
        description: String(row.description || '').trim() || null,
        createdAt: now,
        updatedAt: now,
        userId,
        companyId
      };
      operations.push({
        collection: 'inventory',
        id: existing && duplicateMode === 'update' ? existing.id : undefined,
        payload
      });
      if (existing && duplicateMode === 'update') updated++;
      else created++;
      return;
    }

    const phone = key(row.phone).replace(/\D/g, '');
    const email = key(row.email);
    const existing =
      (phone ? customersByPhone.get(phone) : undefined) ??
      (email ? customersByEmail.get(email) : undefined);
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
    operations.push({
      collection: 'customers',
      id: existing && duplicateMode === 'update' ? existing.id : undefined,
      payload: existing ? payload : { ...payload, totalDebt: 0, createdAt: now }
    });
    if (existing && duplicateMode === 'update') updated++;
    else created++;
  });

  return {
    operations,
    created,
    updated,
    skipped,
    invalid: rows.length - validRows.length
  };
};
