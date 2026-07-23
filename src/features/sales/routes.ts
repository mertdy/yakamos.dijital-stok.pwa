import { lazy } from 'react';

const loadScannerModal = () => import('./components/ScannerModal');
const loadReceiptPrintButton = () => import('./components/ReceiptPrintButton');

export const SalesView = lazy(() =>
  import('./views/SalesView').then(m => ({ default: m.SalesView }))
);

export const ScannerModal = lazy(loadScannerModal);
export const ReceiptPrintButton = lazy(loadReceiptPrintButton);

export const preloadScannerModal = loadScannerModal;
export const preloadReceiptPrint = loadReceiptPrintButton;
