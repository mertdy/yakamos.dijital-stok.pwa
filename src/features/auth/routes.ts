import { lazy } from 'react';

export const LoginView = lazy(() =>
  import('./views/LoginView').then(m => ({ default: m.LoginView }))
);
export const OnboardingView = lazy(() =>
  import('./views/OnboardingView').then(m => ({ default: m.OnboardingView }))
);
export const AccountSettingsView = lazy(() =>
  import('./views/AccountSettingsView').then(m => ({
    default: m.AccountSettingsView
  }))
);
export const NoCompanyView = lazy(() =>
  import('./views/NoCompanyView').then(m => ({ default: m.NoCompanyView }))
);
