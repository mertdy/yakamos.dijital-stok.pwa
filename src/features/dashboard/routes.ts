import { lazy } from 'react';

export const DashboardView = lazy(() =>
  import('./views/DashboardView').then(m => ({ default: m.DashboardView }))
);
export const CompanySettingsView = lazy(() =>
  import('./views/CompanySettingsView').then(m => ({
    default: m.CompanySettingsView
  }))
);
export const PricingPlansView = lazy(() =>
  import('./views/PricingPlansView').then(m => ({
    default: m.PricingPlansView
  }))
);
