import { lazy } from 'react';

export const SupportModal = lazy(() =>
  import('./components/SupportModal').then(module => ({
    default: module.SupportModal
  }))
);
