import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/core/firebase/config';
import type { Customer } from '@/features/customers';
import type { InventoryItem } from '@/features/inventory';

export type ImportType = 'inventory' | 'customers';
export type DuplicateMode = 'update' | 'skip' | 'create';
export type StockMode = 'replace' | 'add';
export type ImportRow = Record<string, unknown>;
export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
}

export const IMPORT_FIELDS = {
  inventory: [
    ['name', 'Ürün adı', true],
    ['barcode', 'Barkod', false],
    ['sku', 'SKU', false],
    ['stock', 'Stok', false],
    ['price', 'Fiyat', false]
  ],
  customers: [
    ['name', 'Ad', true],
    ['surname', 'Soyad', false],
    ['phone', 'Telefon', false],
    ['email', 'E-posta', false],
    ['creditLimit', 'Kredi limiti', false]
  ]
} as const;

type ImportField = (typeof IMPORT_FIELDS)[ImportType][number][0];

const fieldAliases: Record<ImportField, string[]> = {
  name: [
    'ürün adı',
    'urun adi',
    'ürün ismi',
    'urun ismi',
    'ürün',
    'urun',
    'ad',
    'isim',
    'name'
  ],
  barcode: [
    'barkod',
    'barkod no',
    'barkod numarası',
    'barkod numarasi',
    'barkod kodu',
    'ürün barkodu',
    'urun barkodu',
    'barcode',
    'ean',
    'gtin',
    'upc'
  ],
  sku: [
    'sku',
    'stok kodu',
    'ürün kodu',
    'urun kodu',
    'ürün no',
    'urun no',
    'ürün numarası',
    'urun numarasi'
  ],
  stock: ['stok', 'stok adedi', 'mevcut stok', 'adet', 'miktar', 'quantity'],
  price: [
    'fiyat',
    'birim fiyat',
    'satış fiyatı',
    'satis fiyati',
    'liste fiyatı',
    'liste fiyati',
    'price'
  ],
  surname: ['soyad', 'soy isim', 'soyisim', 'surname', 'last name'],
  phone: ['telefon', 'telefon no', 'telefon numarası', 'tel', 'phone'],
  email: ['e-posta', 'eposta', 'email', 'e mail'],
  creditLimit: ['kredi limiti', 'kredi limit', 'limit', 'credit limit']
};

const importFieldsByType: Record<ImportType, readonly ImportField[]> = {
  inventory: ['name', 'barcode', 'sku', 'stock', 'price'],
  customers: ['name', 'surname', 'phone', 'email', 'creditLimit']
};

const TURKISH_CHARACTER_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u'
};

const MATCH_SCORE_THRESHOLD = 78;

/** Makes exported spreadsheet headers comparable across common Turkish formats. */
export const normalizeImportHeader = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, character => TURKISH_CHARACTER_MAP[character])
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const headerTokens = (header: string) =>
  normalizeImportHeader(header).split(' ').filter(Boolean);

const editDistance = (first: string, second: string) => {
  const previous = Array.from(
    { length: second.length + 1 },
    (_, index) => index
  );

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex++) {
    let diagonal = previous[0];
    previous[0] = firstIndex;

    for (let secondIndex = 1; secondIndex <= second.length; secondIndex++) {
      const above = previous[secondIndex];
      previous[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + 1,
        diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }

  return previous[second.length];
};

const similarityScore = (first: string, second: string) => {
  const longestLength = Math.max(first.length, second.length);
  if (longestLength < 5) return 0;

  const similarity = 1 - editDistance(first, second) / longestLength;
  if (similarity >= 0.92) return 86;
  if (similarity >= 0.83) return 78;
  return 0;
};

const getPriceTaxMatchScore = (headerTokens: Set<string>) => {
  const isPriceHeader = headerTokens.has('fiyat') || headerTokens.has('price');
  if (!isPriceHeader) return null;

  const mentionsVat = headerTokens.has('kdv');
  if (mentionsVat && headerTokens.has('dahil')) return 100;
  if (mentionsVat && headerTokens.has('haric')) return 0;

  return null;
};

const getHeaderMatchScore = (header: string, field: ImportField) => {
  const normalizedHeader = normalizeImportHeader(header);
  if (!normalizedHeader) return 0;

  const normalizedHeaderTokens = new Set(headerTokens(header));
  if (field === 'price') {
    const priceTaxMatchScore = getPriceTaxMatchScore(normalizedHeaderTokens);
    if (priceTaxMatchScore !== null) return priceTaxMatchScore;
  }

  return fieldAliases[field].reduce((highestScore, alias) => {
    const normalizedAlias = normalizeImportHeader(alias);
    if (normalizedHeader === normalizedAlias) return 100;

    const aliasTokens = headerTokens(alias);
    const containsAlias = aliasTokens.every(token =>
      normalizedHeaderTokens.has(token)
    );
    if (containsAlias) {
      const extraTokens = normalizedHeaderTokens.size - aliasTokens.length;
      const tokenScore =
        aliasTokens.length > 1
          ? 92 - Math.min(extraTokens * 4, 12)
          : 82 - Math.min(extraTokens * 4, 8);
      return Math.max(highestScore, tokenScore);
    }

    return Math.max(
      highestScore,
      similarityScore(normalizedHeader, normalizedAlias)
    );
  }, 0);
};

const key = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
const numberValue = (value: unknown) =>
  Number(String(value ?? 0).replace(',', '.')) || 0;

export const suggestMapping = (headers: string[], type: ImportType) => {
  const mapping = Object.fromEntries(
    importFieldsByType[type].map(field => [field, ''])
  ) as Record<string, string>;
  const candidates = importFieldsByType[type]
    .flatMap(field =>
      headers.map((header, headerIndex) => ({
        field,
        header,
        headerIndex,
        score: getHeaderMatchScore(header, field)
      }))
    )
    .filter(candidate => candidate.score >= MATCH_SCORE_THRESHOLD)
    .sort(
      (first, second) =>
        second.score - first.score || first.headerIndex - second.headerIndex
    );
  const assignedHeaders = new Set<number>();

  for (const candidate of candidates) {
    if (
      mapping[candidate.field] ||
      assignedHeaders.has(candidate.headerIndex)
    ) {
      continue;
    }

    mapping[candidate.field] = candidate.header;
    assignedHeaders.add(candidate.headerIndex);
  }

  return mapping;
};

export const parseImportFile = async (file: File) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    sheetRows: 5001,
    codepage: 65001
  });
  const sheetName = workbook.SheetNames[0];
  const values = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: ''
  }) as unknown[][];
  const headers = (values[0] || []).map(value => String(value).trim());
  return {
    headers,
    rows: values
      .slice(1)
      .filter(row => row.some(value => String(value).trim())),
    sheetName,
    totalRows: Math.max(values.length - 1, 0)
  };
};

export const buildImportRows = (
  rawRows: unknown[][],
  headers: string[],
  mapping: Record<string, string>
) =>
  rawRows.map(row => {
    const source = Object.fromEntries(
      headers.map((header, index) => [header, row[index]])
    );
    return Object.fromEntries(
      Object.entries(mapping).map(([field, header]) => [
        field,
        header ? source[header] : undefined
      ])
    );
  });

export const importRows = async ({
  type,
  rows,
  companyId,
  userId,
  inventory,
  customers,
  duplicateMode,
  stockMode
}: {
  type: ImportType;
  rows: ImportRow[];
  companyId: string;
  userId: string;
  inventory: InventoryItem[];
  customers: Customer[];
  duplicateMode: DuplicateMode;
  stockMode: StockMode;
}) => {
  const validRows = rows.filter(row => key(row.name));
  let created = 0,
    updated = 0,
    skipped = 0;
  for (let start = 0; start < validRows.length; start += 450) {
    const batch = writeBatch(db);
    validRows.slice(start, start + 450).forEach(row => {
      const now = new Date().toISOString();
      if (type === 'inventory') {
        const barcode = key(row.barcode);
        const sku = key(row.sku);
        const existing = inventory.find(
          item =>
            (barcode && key(item.barcode) === barcode) ||
            (sku && key(item.sku) === sku)
        );
        if (existing && duplicateMode === 'skip') {
          skipped++;
          return;
        }
        const payload = {
          name: String(row.name).trim(),
          barcode: String(row.barcode || '').trim(),
          sku: String(row.sku || '').trim(),
          stock:
            stockMode === 'add' && existing
              ? existing.stock + numberValue(row.stock)
              : numberValue(row.stock),
          price: numberValue(row.price),
          updatedAt: now,
          userId,
          companyId
        };
        if (existing && duplicateMode === 'update') {
          batch.set(doc(db, 'inventory', existing.id), payload, {
            merge: true
          });
          updated++;
        } else {
          batch.set(doc(collection(db, 'inventory')), payload);
          created++;
        }
      } else {
        const phone = key(row.phone).replace(/\D/g, '');
        const email = key(row.email);
        const existing = customers.find(
          customer =>
            (phone && key(customer.phone).replace(/\D/g, '') === phone) ||
            (email && key(customer.email) === email)
        );
        if (existing && duplicateMode === 'skip') {
          skipped++;
          return;
        }
        const payload = {
          name: String(row.name).trim(),
          surname: String(row.surname || '').trim(),
          phone: String(row.phone || '').trim(),
          email: String(row.email || '').trim(),
          creditLimit: numberValue(row.creditLimit),
          updatedAt: now,
          userId,
          companyId
        };
        if (existing && duplicateMode === 'update') {
          batch.set(doc(db, 'customers', existing.id), payload, {
            merge: true
          });
          updated++;
        } else {
          batch.set(doc(collection(db, 'customers')), {
            ...payload,
            totalDebt: 0,
            createdAt: now
          });
          created++;
        }
      }
    });
    await batch.commit();
  }
  return {
    created,
    updated,
    skipped,
    invalid: rows.length - validRows.length
  } satisfies ImportResult;
};
