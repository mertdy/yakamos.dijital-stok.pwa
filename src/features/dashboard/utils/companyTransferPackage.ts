import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  writeBatch,
  where
} from 'firebase/firestore';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { db } from '@/core/firebase/config';
import type { Company } from '@/core/types/tenant';

export const COMPANY_TRANSFER_PACKAGE_VERSION = 1;
const PACKAGE_FILE_NAME = 'dijital-stok-aktarim.json';
const TRANSFER_COLLECTIONS = [
  'inventory',
  'productCategories',
  'customers',
  'sales',
  'saleItems',
  'payments',
  'statementShares',
  'pricingRules'
] as const;
const WRITE_BATCH_SIZE = 150;

type TransferCollection = (typeof TRANSFER_COLLECTIONS)[number];
type RecordData = Record<string, unknown>;
export type CompanyTransferProfileField =
  | 'name'
  | 'receiptHeader'
  | 'phone'
  | 'address'
  | 'defaultLowStockThreshold';

export const COMPANY_TRANSFER_PROFILE_FIELDS: Array<{
  key: CompanyTransferProfileField;
  label: string;
}> = [
  { key: 'name', label: 'İşletme adı' },
  { key: 'receiptHeader', label: 'Fiş başlığı' },
  { key: 'phone', label: 'Telefon numarası' },
  { key: 'address', label: 'Adres' },
  { key: 'defaultLowStockThreshold', label: 'Varsayılan kritik stok seviyesi' }
];

export interface CompanyTransferPackage {
  type: 'dijital-stok-company-transfer';
  version: number;
  id: string;
  exportedAt: string;
  sourceCompany: {
    name: string;
    receiptHeader?: string | null;
    phone?: string | null;
    address?: string | null;
    defaultLowStockThreshold?: number | null;
  };
  records: Record<TransferCollection, RecordData[]>;
  companyPreferences: RecordData | null;
}

export interface CompanyTransferPreview {
  package: CompanyTransferPackage;
  counts: Record<TransferCollection | 'companyPreferences', number>;
}

export interface CompanyTransferProgress {
  completed: number;
  total: number;
}

const isRecord = (value: unknown): value is RecordData =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const toSerializable = (value: unknown): unknown => {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (isRecord(value) && typeof value.toDate === 'function') {
    return (value.toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(toSerializable);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        toSerializable(nested)
      ])
    );
  }
  return value;
};

const asRecord = (value: unknown, message: string): RecordData => {
  if (!isRecord(value)) throw new Error(message);
  return value;
};

const scopedRecords = async (companyId: string, name: TransferCollection) => {
  const snapshot = await getDocs(
    query(collection(db, name), where('companyId', '==', companyId))
  );
  return snapshot.docs.map(snapshot =>
    toSerializable({ id: snapshot.id, ...snapshot.data() })
  ) as RecordData[];
};

export const buildCompanyTransferArchive = (data: CompanyTransferPackage) =>
  new Blob([zipSync({ [PACKAGE_FILE_NAME]: strToU8(JSON.stringify(data)) })], {
    type: 'application/zip'
  });

export const createCompanyTransferPackage = async (company: Company) => {
  const [records, preferencesSnapshot] = await Promise.all([
    Promise.all(
      TRANSFER_COLLECTIONS.map(async name => [
        name,
        await scopedRecords(company.id, name)
      ])
    ),
    getDoc(doc(db, 'companyPreferences', company.id))
  ]);
  const packageData: CompanyTransferPackage = {
    type: 'dijital-stok-company-transfer',
    version: COMPANY_TRANSFER_PACKAGE_VERSION,
    id: createId(),
    exportedAt: new Date().toISOString(),
    sourceCompany: {
      name: company.name,
      receiptHeader: company.receiptHeader ?? null,
      phone: company.phone ?? null,
      address: company.address ?? null,
      defaultLowStockThreshold: company.defaultLowStockThreshold ?? null
    },
    records: Object.fromEntries(records) as CompanyTransferPackage['records'],
    companyPreferences: preferencesSnapshot.exists()
      ? (toSerializable(preferencesSnapshot.data()) as RecordData)
      : null
  };
  return {
    blob: buildCompanyTransferArchive(packageData),
    packageData
  };
};

export const parseCompanyTransferPackage = async (
  file: File
): Promise<CompanyTransferPreview> => {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('Aktarım paketi ZIP biçiminde okunamadı.');
  }
  const packageFile = files[PACKAGE_FILE_NAME];
  if (!packageFile)
    throw new Error('Bu dosya geçerli bir aktarım paketi değil.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(packageFile));
  } catch {
    throw new Error('Aktarım paketi okunamadı.');
  }
  const packageData = asRecord(parsed, 'Aktarım paketi geçersiz.');
  if (
    packageData.type !== 'dijital-stok-company-transfer' ||
    packageData.version !== COMPANY_TRANSFER_PACKAGE_VERSION ||
    typeof packageData.id !== 'string' ||
    !isRecord(packageData.sourceCompany) ||
    !isRecord(packageData.records)
  ) {
    throw new Error('Aktarım paketi sürümü desteklenmiyor.');
  }
  const rawRecords = packageData.records as RecordData;
  const records = Object.fromEntries(
    TRANSFER_COLLECTIONS.map(name => {
      const value = rawRecords[name];
      if (!Array.isArray(value) || value.some(item => !isRecord(item))) {
        throw new Error(`Aktarım paketindeki ${name} verisi geçersiz.`);
      }
      return [name, value as RecordData[]];
    })
  ) as CompanyTransferPackage['records'];
  const transferPackage: CompanyTransferPackage = {
    type: 'dijital-stok-company-transfer',
    version: COMPANY_TRANSFER_PACKAGE_VERSION,
    id: packageData.id,
    exportedAt: String(packageData.exportedAt || ''),
    sourceCompany:
      packageData.sourceCompany as CompanyTransferPackage['sourceCompany'],
    records,
    companyPreferences: isRecord(packageData.companyPreferences)
      ? packageData.companyPreferences
      : null
  };
  return {
    package: transferPackage,
    counts: {
      ...Object.fromEntries(
        TRANSFER_COLLECTIONS.map(name => [name, records[name].length])
      ),
      companyPreferences: transferPackage.companyPreferences ? 1 : 0
    } as CompanyTransferPreview['counts']
  };
};

const targetId = (packageId: string, sourceId: unknown) =>
  `${packageId}_${String(sourceId)}`;

const mapReference = (idMap: Map<string, string>, value: unknown) =>
  typeof value === 'string' ? (idMap.get(value) ?? value) : value;

const isTargetReady = async (companyId: string, packageId: string) => {
  const checks = await Promise.all([
    ...TRANSFER_COLLECTIONS.map(name =>
      getDocs(query(collection(db, name), where('companyId', '==', companyId)))
    ),
    getDoc(doc(db, 'companyPreferences', companyId))
  ]);
  return checks.every(snapshot => {
    if ('docs' in snapshot) {
      return snapshot.docs.every(
        item => item.data().companyTransferPackageId === packageId
      );
    }
    return (
      !snapshot.exists() ||
      snapshot.data()?.companyTransferPackageId === packageId
    );
  });
};

const withTransferMetadata = (
  data: RecordData,
  id: string,
  companyId: string,
  packageId: string,
  userId: string
) => ({
  ...data,
  id,
  companyId,
  companyTransferPackageId: packageId,
  transferredAt: new Date().toISOString(),
  userId
});

export const importCompanyTransferPackage = async ({
  packageData,
  targetCompany,
  userId,
  profileFields,
  onProgress
}: {
  packageData: CompanyTransferPackage;
  targetCompany: Company;
  userId: string;
  profileFields: CompanyTransferProfileField[];
  onProgress?: (progress: CompanyTransferProgress) => void;
}) => {
  if (!(await isTargetReady(targetCompany.id, packageData.id))) {
    throw new Error(
      'Hedef işletmede aktarılacak mevcut veri var. Aktarım yalnızca boş işletmeye yapılabilir.'
    );
  }
  const idMaps = new Map<TransferCollection, Map<string, string>>();
  TRANSFER_COLLECTIONS.forEach(name => {
    idMaps.set(
      name,
      new Map(
        packageData.records[name].map(record => [
          String(record.id),
          targetId(packageData.id, record.id)
        ])
      )
    );
  });
  const now = new Date().toISOString();
  const operations: Array<{
    collection: TransferCollection;
    id: string;
    data: RecordData;
  }> = [];
  const add = (
    collectionName: TransferCollection,
    source: RecordData,
    data: RecordData
  ) => {
    const id = idMaps.get(collectionName)?.get(String(source.id));
    if (!id) throw new Error('Aktarım kimliği oluşturulamadı.');
    operations.push({
      collection: collectionName,
      id,
      data: withTransferMetadata(
        data,
        id,
        targetCompany.id,
        packageData.id,
        userId
      )
    });
  };

  packageData.records.productCategories.forEach(source =>
    add('productCategories', source, {
      ...source,
      parentId: mapReference(idMaps.get('productCategories')!, source.parentId)
    })
  );
  packageData.records.inventory.forEach(source =>
    add('inventory', source, {
      ...source,
      categoryId: mapReference(
        idMaps.get('productCategories')!,
        source.categoryId
      )
    })
  );
  packageData.records.customers.forEach(source =>
    add('customers', source, source)
  );
  packageData.records.sales.forEach(source => {
    const cart = Array.isArray(source.cart)
      ? source.cart.map(item =>
          isRecord(item)
            ? {
                ...item,
                inventoryId: mapReference(
                  idMaps.get('inventory')!,
                  item.inventoryId
                ),
                categoryId: mapReference(
                  idMaps.get('productCategories')!,
                  item.categoryId
                )
              }
            : item
        )
      : source.cart;
    const pricingAdjustments = Array.isArray(source.pricingAdjustments)
      ? source.pricingAdjustments.map(item =>
          isRecord(item)
            ? {
                ...item,
                ruleId: mapReference(idMaps.get('pricingRules')!, item.ruleId)
              }
            : item
        )
      : source.pricingAdjustments;
    add('sales', source, {
      ...source,
      userId,
      sellerName: source.sellerName || 'Aktarılan kayıt',
      customerId: mapReference(idMaps.get('customers')!, source.customerId),
      cart,
      pricingAdjustments
    });
  });
  packageData.records.saleItems.forEach(source =>
    add('saleItems', source, {
      ...source,
      saleId: mapReference(idMaps.get('sales')!, source.saleId),
      inventoryId: mapReference(idMaps.get('inventory')!, source.inventoryId)
    })
  );
  packageData.records.payments.forEach(source =>
    add('payments', source, {
      ...source,
      userId,
      customerId: mapReference(idMaps.get('customers')!, source.customerId),
      collectedBy: isRecord(source.collectedBy)
        ? { ...source.collectedBy, userId }
        : { userId, displayName: 'Aktarılan kayıt', email: null }
    })
  );
  packageData.records.statementShares.forEach(source =>
    add('statementShares', source, {
      ...source,
      createdBy: userId,
      customerId: mapReference(idMaps.get('customers')!, source.customerId)
    })
  );
  packageData.records.pricingRules.forEach(source =>
    add('pricingRules', source, {
      ...source,
      targetCategoryIds: Array.isArray(source.targetCategoryIds)
        ? source.targetCategoryIds.map(id =>
            mapReference(idMaps.get('productCategories')!, id)
          )
        : [],
      targetProductIds: Array.isArray(source.targetProductIds)
        ? source.targetProductIds.map(id =>
            mapReference(idMaps.get('inventory')!, id)
          )
        : []
    })
  );

  const profileUpdate = Object.fromEntries(
    profileFields.map(field => [
      field,
      packageData.sourceCompany[field] ?? null
    ])
  );
  const preferenceOperation = packageData.companyPreferences
    ? {
        ...packageData.companyPreferences,
        companyId: targetCompany.id,
        quickAddItems: Array.isArray(
          packageData.companyPreferences.quickAddItems
        )
          ? packageData.companyPreferences.quickAddItems.map(id =>
              mapReference(idMaps.get('inventory')!, id)
            )
          : [],
        companyTransferPackageId: packageData.id,
        transferredAt: now
      }
    : null;
  const membershipsToRename = profileFields.includes('name')
    ? (
        await getDocs(
          query(
            collection(db, 'memberships'),
            where('companyId', '==', targetCompany.id)
          )
        )
      ).docs
    : [];
  const total =
    operations.length +
    (preferenceOperation ? 1 : 0) +
    (Object.keys(profileUpdate).length ? 1 : 0) +
    membershipsToRename.length;
  let completed = 0;
  onProgress?.({ completed, total });
  for (let start = 0; start < operations.length; start += WRITE_BATCH_SIZE) {
    const batch = writeBatch(db);
    operations
      .slice(start, start + WRITE_BATCH_SIZE)
      .forEach(operation =>
        batch.set(doc(db, operation.collection, operation.id), operation.data)
      );
    await batch.commit();
    completed += Math.min(WRITE_BATCH_SIZE, operations.length - start);
    onProgress?.({ completed, total });
  }
  const finalWrites: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  if (preferenceOperation) {
    finalWrites.push(batch =>
      batch.set(
        doc(db, 'companyPreferences', targetCompany.id),
        preferenceOperation
      )
    );
  }
  if (Object.keys(profileUpdate).length) {
    finalWrites.push(batch =>
      batch.update(doc(db, 'companies', targetCompany.id), profileUpdate)
    );
  }
  membershipsToRename.forEach(snapshot =>
    finalWrites.push(batch =>
      batch.update(snapshot.ref, {
        companyName: packageData.sourceCompany.name
      })
    )
  );
  for (let start = 0; start < finalWrites.length; start += WRITE_BATCH_SIZE) {
    const batch = writeBatch(db);
    finalWrites
      .slice(start, start + WRITE_BATCH_SIZE)
      .forEach(write => write(batch));
    await batch.commit();
    completed += Math.min(WRITE_BATCH_SIZE, finalWrites.length - start);
    onProgress?.({ completed, total });
  }
  return { totalRecords: operations.length, packageId: packageData.id };
};
