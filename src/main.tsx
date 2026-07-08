import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import App from './App.tsx';
import './index.css';

import { ConfirmDialogProvider } from './shared/contexts/ConfirmDialogContext';
import posthog from 'posthog-js';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

import { ENV } from './core/config/env';

// 1. PostHog Init
posthog.init(ENV.POSTHOG_KEY, {
  api_host: ENV.POSTHOG_HOST,
  loaded: posthog => {
    if (import.meta.env.DEV) posthog.opt_out_capturing(); // Dev modunda kapalı
  }
});

// 2. Crashlytics Init (Capacitor)
const initCrashlytics = async () => {
  try {
    await FirebaseCrashlytics.setEnabled({ enabled: true });
  } catch (error) {
    console.error('Crashlytics init failed (Expected on Web):', error);
  }
};
initCrashlytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider locale="tr-TR">
      <ToastProvider />
      <BrowserRouter>
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>
);
