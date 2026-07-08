import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks for Capacitor plugins
vi.mock('@capacitor/sqlite', () => ({
  CapacitorSQLite: {
    createConnection: vi.fn(),
    closeConnection: vi.fn(),
  }
}));

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  }
}));

vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeScanner: {
    installGoogleBarcodeScannerModule: vi.fn(),
    requestPermissions: vi.fn().mockResolvedValue({ camera: true }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    startScan: vi.fn(),
    stopScan: vi.fn(),
  },
  BarcodeFormat: {
    QrCode: 'QR_CODE',
    Ean13: 'EAN_13',
    Ean8: 'EAN_8',
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn().mockReturnValue('web'),
  }
}));
