import { describe, expect, it, vi } from 'vitest';
import { getDoc, getDocs } from 'firebase/firestore';
import { loadExportDatasets } from './dataExport';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
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

  it('reads sale items from their own collection and applies the transaction date range', async () => {
    vi.mocked(getDocs).mockReset();
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'customer-1',
            data: () => ({ name: 'Mert', surname: 'Yılmaz' })
          }
        ]
      } as any)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'sale-in-range',
            data: () => ({
              invoiceNumber: 'S-1',
              customerId: 'customer-1',
              createdAt: '2026-07-10T12:00:00.000Z'
            })
          },
          {
            id: 'sale-outside-range',
            data: () => ({
              invoiceNumber: 'S-2',
              customerId: 'customer-1',
              createdAt: '2026-06-10T12:00:00.000Z'
            })
          }
        ]
      } as any)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'item-in-range',
            data: () => ({
              saleId: 'sale-in-range',
              inventoryId: 'product-1',
              quantity: 2,
              unitPrice: 25
            })
          },
          {
            id: 'item-outside-range',
            data: () => ({
              saleId: 'sale-outside-range',
              inventoryId: 'product-2',
              quantity: 1,
              unitPrice: 10
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
      ['saleItems'],
      { start: '2026-07-01', end: '2026-07-31' }
    );

    expect(dataset).toMatchObject({
      key: 'saleItems',
      rows: [
        expect.objectContaining({
          ID: 'item-in-range',
          'Satış ID': 'sale-in-range',
          'Fatura No': 'S-1',
          Toplam: 50
        })
      ]
    });
    expect(dataset.rows).toHaveLength(1);
  });

  it('exports campaign rules and shared quick-add data', async () => {
    vi.mocked(getDocs).mockReset();
    vi.mocked(getDoc).mockReset();
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [{ id: 'product-1', data: () => ({ name: 'Çay' }) }]
      } as any)
      .mockResolvedValueOnce({
        docs: [{ id: 'category-1', data: () => ({ name: 'İçecekler' }) }]
      } as any)
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            data: () => ({
              name: 'Kartlı içecek indirimi',
              targetCategoryIds: ['category-1'],
              targetProductIds: ['product-1'],
              paymentMethods: ['Card'],
              effect: 'discount',
              amountType: 'fixed',
              application: 'per_cart',
              amount: 5
            })
          }
        ]
      } as any);
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ quickAddItems: ['product-1'] })
    } as any);

    const datasets = await loadExportDatasets(
      {
        id: 'company-1',
        name: 'Dijital Stok',
        ownerId: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      ['companyPreferences', 'pricingRules']
    );

    expect(datasets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'companyPreferences',
          rows: [
            expect.objectContaining({
              'Hızlı Ekle Ürünleri': 'Çay',
              'Ürün Sayısı': 1
            })
          ]
        }),
        expect.objectContaining({
          key: 'pricingRules',
          rows: [
            expect.objectContaining({
              'Kural Adı': 'Kartlı içecek indirimi',
              'Hedef Kategoriler': 'İçecekler',
              'Hedef Ürünler': 'Çay'
            })
          ]
        })
      ])
    );
  });
});
