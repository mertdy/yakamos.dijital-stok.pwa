import { lazy } from 'react';

export const SalesView = lazy(() =>
  import('./views/SalesView').then(m => ({ default: m.SalesView }))
);
