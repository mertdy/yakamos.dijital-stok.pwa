import { lazy } from 'react';

export const SupportModal = lazy(() =>
  import('./components/SupportModal').then(module => ({
    default: module.SupportModal
  }))
);

export const SupportAccessModal = lazy(() =>
  import('./components/SupportAccessModal').then(module => ({
    default: module.SupportAccessModal
  }))
);
