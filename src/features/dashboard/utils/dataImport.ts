import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/core/firebase/config';
import type { Customer } from '@/features/customers';
import type { InventoryItem } from '@/features/inventory';
import { MAX_IMPORT_DATA_ROWS } from './dataImport.constants';
import {
  prepareImportOperations,
  type PreparedImportResult
} from './dataImportPreparation';

export { MAX_IMPORT_DATA_ROWS } from './dataImport.constants';

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

export interface ParsedImportFile {
  headers: string[];
  rows: unknown[][];
  sheetName: string;
  totalRows: number;
  isTruncated: boolean;
}

export interface ImportFileInspection {
  sheetNames: string[];
}

export interface ImportProgress {
  completed: number;
  total: number;
  phase: 'preparing' | 'writing';
}

export const IMPORT_FIELDS = {
  inventory: [
    ['name', 'Ürün adı', true],
    ['barcode', 'Barkod', false],
    ['sku', 'SKU', false],
    ['stock', 'Stok', false],
    ['price', 'Satış fiyatı', false],
    ['costPrice', 'Alış fiyatı (Maliyet)', false],
    ['taxRate', 'KDV', false],
    ['unit', 'Birim', false],
    ['lowStockThreshold', 'Kritik stok', false],
    ['note', 'Not', false],
    ['description', 'Açıklama', false]
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
  costPrice: ['maliyet', 'alış fiyatı', 'alis fiyati', 'alış maliyeti', 'cost'],
  taxRate: ['kdv', 'kdv oranı', 'tax rate', 'vergi'],
  unit: ['birim', 'unit', 'ölçü birimi', 'olcu birimi'],
  lowStockThreshold: [
    'kritik stok',
    'minimum stok',
    'stok eşiği',
    'stok esigi'
  ],
  note: ['not', 'notlar'],
  description: ['açıklama', 'aciklama', 'description'],
  surname: ['soyad', 'soy isim', 'soyisim', 'surname', 'last name'],
  phone: ['telefon', 'telefon no', 'telefon numarası', 'tel', 'phone'],
  email: ['e-posta', 'eposta', 'email', 'e mail'],
  creditLimit: ['kredi limiti', 'kredi limit', 'limit', 'credit limit']
};

const importFieldsByType: Record<ImportType, readonly ImportField[]> = {
  inventory: [
    'name',
    'barcode',
    'sku',
    'stock',
    'price',
    'costPrice',
    'taxRate',
    'unit',
    'lowStockThreshold',
    'note',
    'description'
  ],
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

const inspectImportFileOnMainThread = async (
  file: File
): Promise<ImportFileInspection> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    bookSheets: true
  });
  return { sheetNames: workbook.SheetNames };
};

const parseImportFileOnMainThread = async (
  file: File,
  sheetName: string
): Promise<ParsedImportFile> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    sheetRows: MAX_IMPORT_DATA_ROWS + 2,
    codepage: 65001
  });
  if (!workbook.Sheets[sheetName]) {
    throw new Error('Çalışma sayfası bulunamadı');
  }
  const values = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: ''
  }) as unknown[][];
  const headers = (values[0] || []).map(value => String(value).trim());
  const populatedRows = values
    .slice(1)
    .filter(row => row.some(value => String(value).trim()));

  return {
    headers,
    rows: populatedRows.slice(0, MAX_IMPORT_DATA_ROWS),
    sheetName,
    totalRows: Math.min(populatedRows.length, MAX_IMPORT_DATA_ROWS),
    isTruncated: populatedRows.length > MAX_IMPORT_DATA_ROWS
  };
};

type ImportWorkerRequest =
  | { type: 'inspect' }
  | { type: 'parse'; sheetName: string };

const runImportWorker = async <T>(
  file: File,
  request: ImportWorkerRequest
): Promise<T> => {
  const buffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./dataImport.worker.ts', import.meta.url),
      {
        type: 'module'
      }
    );
    const cleanup = () => worker.terminate();

    worker.onmessage = (
      event: MessageEvent<{ type: 'success'; data: T } | { type: 'error' }>
    ) => {
      cleanup();
      if (event.data.type === 'success') resolve(event.data.data);
      else reject(new Error('Dosya okunamadı'));
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('Dosya okunamadı'));
    };
    worker.postMessage({ ...request, buffer }, [buffer]);
  });
};

export const inspectImportFile = async (
  file: File
): Promise<ImportFileInspection> => {
  if (typeof Worker === 'undefined') return inspectImportFileOnMainThread(file);
  return runImportWorker<ImportFileInspection>(file, { type: 'inspect' });
};

export const parseImportFile = async (
  file: File,
  sheetName: string
): Promise<ParsedImportFile> => {
  if (typeof Worker === 'undefined') {
    return parseImportFileOnMainThread(file, sheetName);
  }
  return runImportWorker<ParsedImportFile>(file, { type: 'parse', sheetName });
};

export const buildImportRows = (
  rawRows: unknown[][],
  headers: string[],
  mapping: Record<string, string>
) => {
  const headerIndexes = new Map(
    headers.map((header, index) => [header, index])
  );
  const mappedFields: Array<[string, number | undefined]> = Object.entries(
    mapping
  ).map(([field, header]) => [
    field,
    header ? headerIndexes.get(header) : undefined
  ]);

  return rawRows.map(row =>
    Object.fromEntries(
      mappedFields.map(([field, index]) => [
        field,
        index === undefined ? undefined : row[index]
      ])
    )
  );
};

const yieldToBrowser = () =>
  new Promise<void>(resolve => window.setTimeout(resolve, 0));

const prepareImportRows = async (input: {
  type: ImportType;
  rows: ImportRow[];
  companyId: string;
  userId: string;
  inventory: InventoryItem[];
  customers: Customer[];
  duplicateMode: DuplicateMode;
  stockMode: StockMode;
}): Promise<PreparedImportResult> => {
  if (typeof Worker === 'undefined') return prepareImportOperations(input);

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./dataImportProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );
    const cleanup = () => worker.terminate();
    worker.onmessage = (
      event: MessageEvent<
        { type: 'success'; data: PreparedImportResult } | { type: 'error' }
      >
    ) => {
      cleanup();
      if (event.data.type === 'success') resolve(event.data.data);
      else reject(new Error('İçe aktarma hazırlanamadı'));
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('İçe aktarma hazırlanamadı'));
    };
    worker.postMessage(input);
  });
};

export const importRows = async ({
  type,
  rows,
  companyId,
  userId,
  inventory,
  customers,
  duplicateMode,
  stockMode,
  onProgress
}: {
  type: ImportType;
  rows: ImportRow[];
  companyId: string;
  userId: string;
  inventory: InventoryItem[];
  customers: Customer[];
  duplicateMode: DuplicateMode;
  stockMode: StockMode;
  onProgress?: (progress: ImportProgress) => void;
}) => {
  onProgress?.({ completed: 0, total: rows.length, phase: 'preparing' });
  await yieldToBrowser();
  const prepared = await prepareImportRows({
    type,
    rows,
    companyId,
    userId,
    inventory,
    customers,
    duplicateMode,
    stockMode
  });
  const { operations } = prepared;
  onProgress?.({ completed: 0, total: operations.length, phase: 'writing' });
  for (let start = 0; start < operations.length; start += 450) {
    const batch = writeBatch(db);
    operations.slice(start, start + 450).forEach(operation => {
      if (operation.id) {
        batch.set(
          doc(db, operation.collection, operation.id),
          operation.payload,
          { merge: true }
        );
      } else {
        batch.set(doc(collection(db, operation.collection)), operation.payload);
      }
    });
    await batch.commit();
    const completed = Math.min(start + 450, operations.length);
    onProgress?.({ completed, total: operations.length, phase: 'writing' });
    if (completed < operations.length) await yieldToBrowser();
  }
  if (operations.length === 0) {
    onProgress?.({ completed: 0, total: 0, phase: 'writing' });
  }
  return prepared satisfies ImportResult;
};
