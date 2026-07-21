import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/firebase/config', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn()
}));

import {
  buildCompanyTransferArchive,
  parseCompanyTransferPackage,
  type CompanyTransferPackage
} from './companyTransferPackage';

const transferPackage: CompanyTransferPackage = {
  type: 'dijital-stok-company-transfer',
  version: 1,
  id: 'package-1',
  exportedAt: '2026-07-21T12:00:00.000Z',
  sourceCompany: { name: 'AA İşletmesi', phone: '+905555555555' },
  records: {
    inventory: [{ id: 'product-1', name: 'Ürün' }],
    productCategories: [{ id: 'category-1', name: 'Kategori' }],
    customers: [{ id: 'customer-1', name: 'Müşteri' }],
    sales: [{ id: 'sale-1', customerId: 'customer-1' }],
    saleItems: [{ id: 'sale-item-1', saleId: 'sale-1' }],
    payments: [],
    statementShares: [],
    pricingRules: []
  },
  companyPreferences: { quickAddItems: ['product-1'] }
};

describe('company transfer package', () => {
  it('keeps the package metadata and record counts through ZIP round-trip', async () => {
    const archive = buildCompanyTransferArchive(transferPackage);
    const preview = await parseCompanyTransferPackage({
      arrayBuffer: () => archive.arrayBuffer()
    } as File);

    expect(preview.package.sourceCompany.name).toBe('AA İşletmesi');
    expect(preview.package.records.sales[0].customerId).toBe('customer-1');
    expect(preview.counts).toMatchObject({
      inventory: 1,
      customers: 1,
      saleItems: 1,
      companyPreferences: 1
    });
  });

  it('rejects an unrelated ZIP file', async () => {
    const file = new File(['başka bir dosya'], 'invalid.zip', {
      type: 'application/zip'
    });

    await expect(parseCompanyTransferPackage(file)).rejects.toThrow(
      'Aktarım paketi ZIP biçiminde okunamadı'
    );
  });
});
