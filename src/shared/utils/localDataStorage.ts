import {
  collection,
  doc,
  getDocFromCache,
  getDocsFromCache,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { db } from '@/core/firebase/config';
import { getOfflineReadyCompanies } from './offlineCompanyCache';

export interface LocalDataSetSummary {
  label: string;
  recordCount: number;
  estimatedBytes: number;
}

export interface LocalCompanyDataSummary {
  companyId: string;
  companyName: string;
  preparedAt: string;
  dataSets: LocalDataSetSummary[];
  recordCount: number;
  estimatedBytes: number;
}

export interface LocalDataStorageSummary {
  companies: LocalCompanyDataSummary[];
  localBackupBytes: number;
  browserUsageBytes: number | null;
  browserQuotaBytes: number | null;
}

const estimateBytes = (value: unknown) =>
  new Blob([JSON.stringify(value)]).size;

const readCachedCollection = async (
  label: string,
  source: ReturnType<typeof query>
): Promise<LocalDataSetSummary> => {
  try {
    const snapshot = await getDocsFromCache(source);
    const records = snapshot.docs.map(entry => ({
      id: entry.id,
      ...(entry.data() as Record<string, unknown>)
    }));

    return {
      label,
      recordCount: records.length,
      estimatedBytes: estimateBytes(records)
    };
  } catch {
    return { label, recordCount: 0, estimatedBytes: 0 };
  }
};

const readCachedCompany = async (
  companyId: string
): Promise<
  Pick<LocalCompanyDataSummary, 'companyName'> & LocalDataSetSummary
> => {
  try {
    const snapshot = await getDocFromCache(doc(db, 'companies', companyId));
    if (!snapshot.exists()) {
      return {
        companyName: `İşletme ${companyId.slice(0, 8)}`,
        label: 'İşletme profili',
        recordCount: 0,
        estimatedBytes: 0
      };
    }

    const record: Record<string, unknown> = {
      id: snapshot.id,
      ...(snapshot.data() as Record<string, unknown>)
    };
    return {
      companyName: String(record.name || `İşletme ${companyId.slice(0, 8)}`),
      label: 'İşletme profili',
      recordCount: 1,
      estimatedBytes: estimateBytes(record)
    };
  } catch {
    return {
      companyName: `İşletme ${companyId.slice(0, 8)}`,
      label: 'İşletme profili',
      recordCount: 0,
      estimatedBytes: 0
    };
  }
};

const getCompanyLocalDataSummary = async (
  companyId: string,
  preparedAt: string
): Promise<LocalCompanyDataSummary> => {
  const company = await readCachedCompany(companyId);
  const dataSets = [
    company,
    await readCachedCollection(
      'Üyelikler',
      query(collection(db, 'memberships'), where('companyId', '==', companyId))
    ),
    await readCachedCollection(
      'Davetiyeler',
      query(collection(db, 'invitations'), where('companyId', '==', companyId))
    ),
    await readCachedCollection(
      'Ürünler',
      query(collection(db, 'inventory'), where('companyId', '==', companyId))
    ),
    await readCachedCollection(
      'Müşteriler',
      query(collection(db, 'customers'), where('companyId', '==', companyId))
    ),
    await readCachedCollection(
      'Son 500 satış',
      query(
        collection(db, 'sales'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(500)
      )
    )
  ];

  return {
    companyId,
    companyName: company.companyName,
    preparedAt,
    dataSets,
    recordCount: dataSets.reduce(
      (total, dataSet) => total + dataSet.recordCount,
      0
    ),
    estimatedBytes: dataSets.reduce(
      (total, dataSet) => total + dataSet.estimatedBytes,
      0
    )
  };
};

export const getLocalDataStorageSummary = async (
  userId?: string
): Promise<LocalDataStorageSummary> => {
  const companies = await Promise.all(
    getOfflineReadyCompanies(userId).map(entry =>
      getCompanyLocalDataSummary(entry.companyId, entry.preparedAt)
    )
  );
  const storageEstimate = await navigator.storage?.estimate?.();

  return {
    companies,
    localBackupBytes: companies.reduce(
      (total, company) => total + company.estimatedBytes,
      0
    ),
    browserUsageBytes: storageEstimate?.usage ?? null,
    browserQuotaBytes: storageEstimate?.quota ?? null
  };
};
