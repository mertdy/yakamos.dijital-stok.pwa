import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '../store/useInventoryStore';
import {
  applyBulkInventoryChanges,
  applyNumericOperation,
  getBulkInventoryValidation,
  getCommonInventoryValue
} from './bulkInventoryEdit';

const item: InventoryItem = {
  id: 'item-1',
  name: 'Ürün',
  stock: 10,
  salePrice: 100,
  costPrice: 60,
  categoryId: 'old-category',
  unit: 'adet',
  updatedAt: '2026-07-21T00:00:00.000Z'
};

describe('bulkInventoryEdit', () => {
  it('supports fixed, amount and percentage price operations', () => {
    expect(applyNumericOperation(100, { mode: 'set', value: 25 })).toBe(25);
    expect(
      applyNumericOperation(100, { mode: 'increase_amount', value: 10 })
    ).toBe(110);
    expect(
      applyNumericOperation(100, { mode: 'decrease_percent', value: 15 })
    ).toBe(85);
  });

  it('applies common metadata, price and stock changes without touching identity fields', () => {
    const updated = applyBulkInventoryChanges(item, {
      categoryId: 'new-category',
      unit: 'paket',
      isActive: false,
      salePrice: { mode: 'increase_percent', value: 10 },
      stock: { mode: 'decrease', value: 3 },
      lowStock: { useCompanyDefault: false, threshold: 4 }
    });

    expect(updated).toMatchObject({
      id: item.id,
      name: item.name,
      categoryId: 'new-category',
      unit: 'paket',
      isActive: false,
      salePrice: 110,
      price: 110,
      stock: 7,
      useCompanyLowStockThreshold: false,
      lowStockThreshold: 4
    });
  });

  it('reports negative price as blocking and negative stock as warning data', () => {
    const validation = getBulkInventoryValidation([item], {
      salePrice: { mode: 'decrease_amount', value: 150 },
      stock: { mode: 'decrease', value: 15 }
    });

    expect(validation.negativePriceItems).toHaveLength(1);
    expect(validation.negativeStockItems).toHaveLength(1);
  });

  it('returns a common value or mixed for the selected products', () => {
    expect(
      getCommonInventoryValue([item, { ...item, id: 'item-2' }], 'unit')
    ).toBe('adet');
    expect(
      getCommonInventoryValue(
        [item, { ...item, id: 'item-2', unit: 'kg' }],
        'unit'
      )
    ).toBe('mixed');
  });
});
