import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocalDataStorageSummary } from './localDataStorage';

const { getDocFromCache, getDocsFromCache } = vi.hoisted(() => ({
  getDocFromCache: vi.fn(),
  getDocsFromCache: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocFromCache,
  getDocsFromCache,
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(() => ({})),
  where: vi.fn()
}));

vi.mock('@/core/firebase/config', () => ({ db: {} }));

vi.mock('./offlineCompanyCache', () => ({
  getOfflineReadyCompanies: () => [
    { companyId: 'company-1', preparedAt: '2026-07-18T10:00:00.000Z' }
  ]
}));

describe('getLocalDataStorageSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocFromCache.mockResolvedValue({
      id: 'company-1',
      exists: () => true,
      data: () => ({ name: 'Bakkalım' })
    });
    getDocsFromCache.mockResolvedValue({
      docs: [{ id: 'record-1', data: () => ({ name: 'Kayıt' }) }]
    });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 4096, quota: 8192 })
      }
    });
  });

  it('summarizes cached company data sets and browser storage usage', async () => {
    const summary = await getLocalDataStorageSummary('user-1');

    expect(summary.browserUsageBytes).toBe(4096);
    expect(summary.browserQuotaBytes).toBe(8192);
    expect(summary.companies).toHaveLength(1);
    expect(summary.companies[0]).toMatchObject({
      companyId: 'company-1',
      companyName: 'Bakkalım',
      recordCount: 6
    });
    expect(summary.companies[0].dataSets).toHaveLength(6);
    expect(summary.localBackupBytes).toBeGreaterThan(0);
  });
});
