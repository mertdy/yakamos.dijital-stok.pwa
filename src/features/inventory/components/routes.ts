import { lazy } from 'react';

export const BulkInventoryEditDrawer = lazy(() =>
  import('./BulkInventoryEditDrawer').then(module => ({
    default: module.BulkInventoryEditDrawer
  }))
);
