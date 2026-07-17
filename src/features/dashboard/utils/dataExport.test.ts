import { describe, expect, it, vi } from 'vitest';
import { getDocs } from 'firebase/firestore';
import { loadExportDatasets } from './dataExport';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
  where: vi.fn()
}));

vi.mock('@/core/firebase/config', () => ({ db: {} }));

describe('loadExportDatasets', () => {
  it('queries only the data needed for the selected export', async () => {
    const datasets = await loadExportDatasets(
      {
        id: 'company-1',
        name: 'Dijital Stok',
        ownerId: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      ['inventory']
    );

    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(datasets).toEqual([expect.objectContaining({ key: 'inventory' })]);
  });
});
