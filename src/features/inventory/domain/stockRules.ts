import type { Company } from '@/core/types/tenant';
import type { InventoryItem } from '../store/useInventoryStore';
import { isItemActive, isStockTracked } from '../store/useInventoryStore';

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export const getCompanyLowStockThreshold = (company?: Company | null) =>
  company?.defaultLowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

export const getEffectiveLowStockThreshold = (
  item: InventoryItem,
  company?: Company | null
) =>
  item.useCompanyLowStockThreshold !== false
    ? getCompanyLowStockThreshold(company)
    : (item.lowStockThreshold ?? getCompanyLowStockThreshold(company));

export const isLowStock = (item: InventoryItem, company?: Company | null) =>
  isItemActive(item) &&
  isStockTracked(item) &&
  item.stock <= getEffectiveLowStockThreshold(item, company);
