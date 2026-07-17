import { lazy } from 'react';

export const CustomerDetailView = lazy(() =>
  import('./views/CustomerDetailView').then(m => ({
    default: m.CustomerDetailView
  }))
);
export const CustomerFormView = lazy(() =>
  import('./views/CustomerFormView').then(m => ({
    default: m.CustomerFormView
  }))
);
export const CustomerListView = lazy(() =>
  import('./views/CustomerListView').then(m => ({
    default: m.CustomerListView
  }))
);
