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
    vi.mocked(getDocs).mockClear();
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

  it('exports category hierarchy fields', async () => {
    vi.mocked(getDocs).mockClear();
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        {
          id: 'category-1',
          data: () => ({
            id: 'category-1',
            name: 'İçecekler',
            parentId: null,
            isActive: true,
            sortOrder: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z'
          })
        },
        {
          id: 'category-2',
          data: () => ({
            id: 'category-2',
            name: 'Soğuk İçecekler',
            parentId: 'category-1',
            isActive: false,
            sortOrder: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z'
          })
        }
      ]
    } as any);

    const [dataset] = await loadExportDatasets(
      {
        id: 'company-1',
        name: 'Dijital Stok',
        ownerId: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      ['categories']
    );

    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(dataset).toMatchObject({
      key: 'categories',
      fileName: 'kategoriler',
      rows: [
        expect.objectContaining({
          'Kategori Adı': 'İçecekler',
          Seviye: 'Ana kategori',
          Durum: 'Aktif'
        }),
        expect.objectContaining({
          'Kategori Adı': 'Soğuk İçecekler',
          'Üst Kategori': 'İçecekler',
          Seviye: 'Alt kategori',
          Durum: 'Pasif'
        })
      ]
    });
  });
});
