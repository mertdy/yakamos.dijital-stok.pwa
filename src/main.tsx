import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@heroui/react';
import { I18nProvider } from '@react-aria/i18n';
import App from './App.tsx';
import './index.css';

import { ConfirmDialogProvider } from './shared/contexts/ConfirmDialogContext';

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
  </StrictMode>,
);
