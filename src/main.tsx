import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import App from './App.tsx';
import './index.css';

import { ConfirmDialogProvider } from './shared/contexts/ConfirmDialogContext';
import { AppErrorBoundary } from './shared/components/AppErrorBoundary';
import { PWAInstallProvider } from './shared/hooks/usePWAInstall';
import posthog from 'posthog-js';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

import { ENV } from './core/config/env';
import {
  corePrefetches,
  secondaryPrefetches
} from './core/config/prefetchRegistry';
import { runPrefetch } from './shared/utils/prefetch';

// 1. PostHog Init
if (ENV.POSTHOG_KEY && ENV.POSTHOG_HOST) {
  posthog.init(ENV.POSTHOG_KEY, {
    api_host: ENV.POSTHOG_HOST,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_heatmaps: true,
    autocapture: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage',
    debug: false
  });
}

// 2. Crashlytics Init (Capacitor)
const initCrashlytics = async () => {
  if (!Capacitor.isNativePlatform()) {
    return; // Web platformunda Crashlytics devre dışı bırakılır
  }
  try {
    await FirebaseCrashlytics.setEnabled({ enabled: true });
  } catch (error) {
    console.error('Crashlytics init failed:', error);
  }
};
initCrashlytics();

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <StrictMode>
      <I18nProvider locale="tr-TR">
        <ToastProvider />
        <BrowserRouter>
          <PWAInstallProvider>
            <ConfirmDialogProvider>
              <App />
            </ConfirmDialogProvider>
          </PWAInstallProvider>
        </BrowserRouter>
      </I18nProvider>
    </StrictMode>
  </AppErrorBoundary>
);

// 3. Staggered prefetch of chunks when the browser is idle to support offline usage
runPrefetch(corePrefetches);
runPrefetch(secondaryPrefetches, 20000);
