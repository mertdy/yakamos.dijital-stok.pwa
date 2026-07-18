import { lazy } from 'react';

export const InventoryView = lazy(() =>
  import('./views/InventoryView').then(m => ({ default: m.InventoryView }))
);
export const ProductFormView = lazy(() =>
  import('./views/ProductFormView').then(m => ({ default: m.ProductFormView }))
);
export const CategoryManagementView = lazy(() =>
  import('./views/CategoryManagementView').then(m => ({
    default: m.CategoryManagementView
  }))
);
