import { lazy } from 'react';

export const PromotionsView = lazy(() =>
  import('./views/PromotionsView').then(m => ({ default: m.PromotionsView }))
);
