import type { InventoryItem, ProductUnit } from '../store/useInventoryStore';

export type BulkNumericOperationMode =
  | 'set'
  | 'increase_amount'
  | 'decrease_amount'
  | 'increase_percent'
  | 'decrease_percent';

export interface BulkNumericOperation {
  mode: BulkNumericOperationMode;
  value: number;
}

export type BulkStockOperation =
  | { mode: 'set'; value: number }
  | { mode: 'increase'; value: number }
  | { mode: 'decrease'; value: number };

export type BulkLowStockOperation =
  | { useCompanyDefault: true }
  | { useCompanyDefault: false; threshold: number };

export interface BulkInventoryChanges {
  categoryId?: string | null;
  unit?: ProductUnit;
  isActive?: boolean;
  trackStock?: boolean;
  taxRate?: 0 | 1 | 10 | 20;
  priceIncludesTax?: boolean;
  lowStock?: BulkLowStockOperation;
  salePrice?: BulkNumericOperation;
  costPrice?: BulkNumericOperation;
  stock?: BulkStockOperation;
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const applyNumericOperation = (
  currentValue: number,
  operation: BulkNumericOperation
) => {
  switch (operation.mode) {
    case 'set':
      return roundCurrency(operation.value);
    case 'increase_amount':
      return roundCurrency(currentValue + operation.value);
    case 'decrease_amount':
      return roundCurrency(currentValue - operation.value);
    case 'increase_percent':
      return roundCurrency(currentValue * (1 + operation.value / 100));
    case 'decrease_percent':
      return roundCurrency(currentValue * (1 - operation.value / 100));
  }
};

export const applyStockOperation = (
  currentValue: number,
  operation: BulkStockOperation
) => {
  switch (operation.mode) {
    case 'set':
      return operation.value;
    case 'increase':
      return currentValue + operation.value;
    case 'decrease':
      return currentValue - operation.value;
  }
};

export const getBulkInventoryPatch = (
  item: InventoryItem,
  changes: BulkInventoryChanges
): Partial<InventoryItem> => {
  const patch: Partial<InventoryItem> = {};

  if ('categoryId' in changes) patch.categoryId = changes.categoryId;
  if (changes.unit !== undefined) patch.unit = changes.unit;
  if (changes.isActive !== undefined) patch.isActive = changes.isActive;
  if (changes.trackStock !== undefined) patch.trackStock = changes.trackStock;
  if (changes.taxRate !== undefined) patch.taxRate = changes.taxRate;
  if (changes.priceIncludesTax !== undefined) {
    patch.priceIncludesTax = changes.priceIncludesTax;
  }
  if (changes.lowStock) {
    patch.useCompanyLowStockThreshold = changes.lowStock.useCompanyDefault;
    patch.lowStockThreshold = changes.lowStock.useCompanyDefault
      ? null
      : changes.lowStock.threshold;
  }
  if (changes.salePrice) {
    const salePrice = applyNumericOperation(
      item.salePrice ?? item.price ?? 0,
      changes.salePrice
    );
    patch.salePrice = salePrice;
    patch.price = salePrice;
  }
  if (changes.costPrice) {
    patch.costPrice = applyNumericOperation(
      item.costPrice ?? 0,
      changes.costPrice
    );
  }
  if (changes.stock) {
    patch.stock = applyStockOperation(item.stock, changes.stock);
  }

  return patch;
};

export const applyBulkInventoryChanges = (
  item: InventoryItem,
  changes: BulkInventoryChanges
): InventoryItem => ({
  ...item,
  ...getBulkInventoryPatch(item, changes)
});

export const hasBulkInventoryChanges = (changes: BulkInventoryChanges) =>
  Object.keys(changes).length > 0;

export const getBulkInventoryValidation = (
  items: InventoryItem[],
  changes: BulkInventoryChanges
) => {
  const updatedItems = items.map(item =>
    applyBulkInventoryChanges(item, changes)
  );
  const negativePriceItems = updatedItems.filter(
    item => (item.salePrice ?? item.price ?? 0) < 0 || (item.costPrice ?? 0) < 0
  );
  const negativeStockItems = updatedItems.filter(item => item.stock < 0);

  return {
    updatedItems,
    negativePriceItems,
    negativeStockItems
  };
};

export const getCommonInventoryValue = <Key extends keyof InventoryItem>(
  items: InventoryItem[],
  key: Key
): InventoryItem[Key] | 'mixed' => {
  if (items.length === 0) return undefined as InventoryItem[Key];
  const firstValue = items[0][key];
  return items.every(item => Object.is(item[key], firstValue))
    ? firstValue
    : 'mixed';
};
