import { lazy } from 'react';

export const SalesHistoryView = lazy(() =>
  import('./views/SalesHistoryView').then(m => ({
    default: m.SalesHistoryView
  }))
);
