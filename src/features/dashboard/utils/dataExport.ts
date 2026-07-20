import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/core/firebase/config';
import type { Company } from '@/core/types/tenant';

export type ExportFormat = 'xlsx' | 'csv';
export type ExportDelivery = 'combined' | 'separate';
export type ExportDataKey =
  | 'company'
  | 'team'
  | 'inventory'
  | 'categories'
  | 'customers'
  | 'sales'
  | 'saleItems'
  | 'payments'
  | 'statements';

export interface ExportDataset {
  key: ExportDataKey;
  label: string;
  fileName: string;
  rows: Record<string, string | number | boolean | null>[];
}

export const EXPORT_OPTIONS: {
  key: ExportDataKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'company',
    label: 'İşletme Profili',
    description: 'İşletme iletişim ve fiş bilgileri'
  },
  {
    key: 'team',
    label: 'Ekip ve Yetkiler',
    description: 'Çalışanlar, roller ve bekleyen davetler'
  },
  {
    key: 'inventory',
    label: 'Envanter',
    description: 'Ürünler, stoklar ve fiyatlar'
  },
  {
    key: 'categories',
    label: 'Kategoriler',
    description: 'Ürün kategori hiyerarşisi ve durumları'
  },
  {
    key: 'customers',
    label: 'Müşteriler',
    description: 'İletişim, limit ve borç bilgileri'
  },
  {
    key: 'sales',
    label: 'Satışlar',
    description: 'Faturalar ve satış özetleri'
  },
  {
    key: 'saleItems',
    label: 'Satış Kalemleri',
    description: 'Her satışın ürün satırları'
  },
  {
    key: 'payments',
    label: 'Tahsilatlar',
    description: 'Ödemeler ve tahsilatı alan kullanıcı'
  },
  {
    key: 'statements',
    label: 'Hesap Hareketleri',
    description: 'Veresiye satış ve tahsilat hareketleri'
  }
];

const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('tr-TR');
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows: ExportDataset['rows']) => {
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const escape = (value: unknown) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`;
  return `\uFEFF${[
    headers,
    ...rows.map(row => headers.map(header => row[header]))
  ]
    .map(row => row.map(escape).join(';'))
    .join('\r\n')}`;
};

export const loadExportDatasets = async (
  company: Company,
  selected: readonly ExportDataKey[] = EXPORT_OPTIONS.map(option => option.key)
): Promise<ExportDataset[]> => {
  const scoped = (name: string) =>
    getDocs(query(collection(db, name), where('companyId', '==', company.id)));
  const hasSelected = (...keys: ExportDataKey[]) =>
    keys.some(key => selected.includes(key));
  const emptySnapshot = Promise.resolve({ docs: [] as any[] });
  const [
    inventorySnap,
    customersSnap,
    salesSnap,
    paymentsSnap,
    membershipsSnap,
    invitationsSnap,
    categoriesSnap
  ] = await Promise.all([
    hasSelected('inventory') ? scoped('inventory') : emptySnapshot,
    hasSelected('customers', 'sales', 'payments', 'statements')
      ? scoped('customers')
      : emptySnapshot,
    hasSelected('sales', 'saleItems', 'statements')
      ? scoped('sales')
      : emptySnapshot,
    hasSelected('payments', 'statements') ? scoped('payments') : emptySnapshot,
    hasSelected('team') ? scoped('memberships') : emptySnapshot,
    hasSelected('team') ? scoped('invitations') : emptySnapshot,
    hasSelected('categories') ? scoped('productCategories') : emptySnapshot
  ]);
  const toRecord = (snapshot: { id: string; data: () => unknown }) =>
    ({
      id: snapshot.id,
      ...(snapshot.data() as Record<string, any>)
    }) as Record<string, any>;
  const inventory = inventorySnap.docs.map(toRecord);
  const customers = customersSnap.docs.map(toRecord);
  const sales = salesSnap.docs.map(toRecord);
  const payments = paymentsSnap.docs.map(toRecord);
  const categories = categoriesSnap.docs.map(toRecord);
  const customerNames = new Map(
    customers.map(customer => [
      customer.id,
      `${customer.name || ''} ${customer.surname || ''}`.trim()
    ])
  );

  const datasets: ExportDataset[] = [
    {
      key: 'company',
      label: 'İşletme Profili',
      fileName: 'isletme-profili',
      rows: [
        {
          'İşletme Adı': company.name,
          'Fiş Başlığı': company.receiptHeader || '',
          Telefon: company.phone || '',
          Adres: company.address || '',
          'Oluşturulma Tarihi': formatDate(company.createdAt)
        }
      ]
    },
    {
      key: 'team',
      label: 'Ekip ve Yetkiler',
      fileName: 'ekip-ve-yetkiler',
      rows: [
        ...membershipsSnap.docs.map(snapshot => {
          const data = snapshot.data();
          return {
            Tür: 'Üyelik',
            'Kullanıcı ID': data.userId || '',
            Rol: data.role || '',
            Yetkiler: (data.permissions || []).join(', '),
            'Katılım Tarihi': formatDate(data.createdAt)
          };
        }),
        ...invitationsSnap.docs.map(snapshot => {
          const data = snapshot.data();
          return {
            Tür: 'Davet',
            'E-posta': data.email || '',
            Durum: data.status || '',
            Yetkiler: (data.permissions || []).join(', '),
            'Davet Tarihi': formatDate(data.createdAt)
          };
        })
      ]
    },
    {
      key: 'inventory',
      label: 'Envanter',
      fileName: 'envanter',
      rows: inventory.map(item => ({
        ID: item.id,
        'Ürün Adı': item.name || '',
        Barkod: item.barcode || '',
        SKU: item.sku || '',
        Stok: item.stock || 0,
        'Satış Fiyatı': item.salePrice ?? item.price ?? 0,
        'Alış fiyatı (Maliyet)': item.costPrice ?? '',
        KDV: item.taxRate ?? 20,
        Birim: item.unit ?? 'adet',
        'Kritik Stok':
          item.useCompanyLowStockThreshold === false
            ? (item.lowStockThreshold ?? '')
            : 'Şirket varsayılanı',
        Aktif: item.isActive !== false ? 'Evet' : 'Hayır',
        Not: item.note ?? '',
        Açıklama: item.description ?? '',
        'Güncellenme Tarihi': formatDate(item.updatedAt)
      }))
    },
    {
      key: 'categories',
      label: 'Kategoriler',
      fileName: 'kategoriler',
      rows: categories.map(category => {
        const parent = category.parentId
          ? categories.find(item => item.id === category.parentId)
          : null;
        return {
          ID: category.id,
          'Kategori Adı': category.name || '',
          'Üst Kategori ID': category.parentId || '',
          'Üst Kategori': parent?.name || '',
          Seviye: category.parentId ? 'Alt kategori' : 'Ana kategori',
          Durum: category.isActive !== false ? 'Aktif' : 'Pasif',
          'Sıra Numarası': category.sortOrder ?? 0,
          'Oluşturulma Tarihi': formatDate(category.createdAt),
          'Güncellenme Tarihi': formatDate(category.updatedAt)
        };
      })
    },
    {
      key: 'customers',
      label: 'Müşteriler',
      fileName: 'musteriler',
      rows: customers.map(customer => ({
        ID: customer.id,
        Ad: customer.name || '',
        Soyad: customer.surname || '',
        Telefon: customer.phone || '',
        Eposta: customer.email || '',
        'Kredi Limiti': customer.creditLimit || 0,
        'Güncel Borç': customer.totalDebt || 0,
        'Oluşturulma Tarihi': formatDate(customer.createdAt)
      }))
    },
    {
      key: 'sales',
      label: 'Satışlar',
      fileName: 'satislar',
      rows: sales.map(sale => ({
        ID: sale.id,
        'Fatura No': sale.invoiceNumber || '',
        Tarih: formatDate(sale.createdAt),
        Müşteri: customerNames.get(sale.customerId) || 'Genel Müşteri',
        'Ödeme Yöntemi': sale.paymentMethod || '',
        AraToplam: sale.subtotal || 0,
        İndirim: sale.discount || 0,
        Toplam: sale.totalAmount || 0,
        Durum: sale.status || '',
        'Kullanıcı ID': sale.userId || ''
      }))
    },
    {
      key: 'saleItems',
      label: 'Satış Kalemleri',
      fileName: 'satis-kalemleri',
      rows: sales.flatMap(sale =>
        (sale.cart || []).map((item: any) => ({
          'Fatura No': sale.invoiceNumber || '',
          'Satış Tarihi': formatDate(sale.createdAt),
          'Ürün ID': item.inventoryId || '',
          'Ürün Adı': item.name || '',
          Barkod: item.barcode || '',
          Adet: item.quantity || 0,
          'Birim Fiyat': item.price || 0,
          Toplam: (item.quantity || 0) * (item.price || 0)
        }))
      )
    },
    {
      key: 'payments',
      label: 'Tahsilatlar',
      fileName: 'tahsilatlar',
      rows: payments.map(payment => ({
        ID: payment.id,
        Tarih: formatDate(payment.createdAt),
        Müşteri: customerNames.get(payment.customerId) || '',
        Tutar: payment.amount || 0,
        'Tahsilatı Alan':
          payment.collectedBy?.displayName || 'Kullanıcı bilgisi yok',
        'Tahsilatı Alan Eposta': payment.collectedBy?.email || '',
        'Kullanıcı ID': payment.userId || ''
      }))
    },
    {
      key: 'statements',
      label: 'Hesap Hareketleri',
      fileName: 'hesap-hareketleri',
      rows: [
        ...sales
          .filter(sale => sale.paymentMethod === 'Credit')
          .map(sale => ({
            Tarih: formatDate(sale.createdAt),
            Müşteri: customerNames.get(sale.customerId) || '',
            Tür: 'Veresiye Satış',
            Tutar: sale.totalAmount || 0,
            Açıklama: sale.invoiceNumber || '',
            'İşlemi Yapan': sale.userId || ''
          })),
        ...payments.map(payment => ({
          Tarih: formatDate(payment.createdAt),
          Müşteri: customerNames.get(payment.customerId) || '',
          Tür: 'Tahsilat',
          Tutar: payment.amount || 0,
          Açıklama: 'Tahsilat',
          'İşlemi Yapan':
            payment.collectedBy?.displayName || 'Kullanıcı bilgisi yok'
        }))
      ]
    }
  ];

  return datasets.filter(dataset => selected.includes(dataset.key));
};

export const exportDatasets = async (
  datasets: ExportDataset[],
  format: ExportFormat,
  delivery: ExportDelivery,
  filePrefix: string
) => {
  if (format === 'csv') {
    if (delivery === 'separate') {
      datasets.forEach(dataset =>
        downloadBlob(
          new Blob([toCsv(dataset.rows)], { type: 'text/csv;charset=utf-8' }),
          `${filePrefix}-${dataset.fileName}.csv`
        )
      );
      return;
    }
    const { strToU8, zipSync } = await import('fflate');
    const files = Object.fromEntries(
      datasets.map(dataset => [
        `${dataset.fileName}.csv`,
        strToU8(toCsv(dataset.rows))
      ])
    );
    downloadBlob(
      new Blob([zipSync(files)], { type: 'application/zip' }),
      `${filePrefix}.zip`
    );
    return;
  }

  const XLSX = await import('xlsx');
  const createWorkbook = (selected: ExportDataset[]) => {
    const workbook = XLSX.utils.book_new();
    selected.forEach(dataset =>
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(dataset.rows),
        dataset.label.slice(0, 31)
      )
    );
    return workbook;
  };
  if (delivery === 'combined') {
    XLSX.writeFileXLSX(createWorkbook(datasets), `${filePrefix}.xlsx`, {
      compression: true
    });
    return;
  }
  datasets.forEach(dataset =>
    XLSX.writeFileXLSX(
      createWorkbook([dataset]),
      `${filePrefix}-${dataset.fileName}.xlsx`,
      { compression: true }
    )
  );
};
