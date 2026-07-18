import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { db } from '@/core/firebase/config';

export interface OfflineCompanyCacheEntry {
  companyId: string;
  preparedAt: string;
}

type OfflineCompanyCacheRegistry = Record<string, OfflineCompanyCacheEntry[]>;

const STORAGE_KEY = 'dijital-stok.offline-company-cache.v1';

const getRegistry = (): OfflineCompanyCacheRegistry => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const saveRegistry = (registry: OfflineCompanyCacheRegistry) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
};

export const getOfflineReadyCompanyIds = (userId?: string) => {
  if (!userId) return [];
  return getRegistry()[userId]?.map(entry => entry.companyId) ?? [];
};

export const getOfflineReadyCompanies = (userId?: string) => {
  if (!userId) return [];
  return getRegistry()[userId] ?? [];
};

export const markCompanyOfflineReady = (userId: string, companyId: string) => {
  const registry = getRegistry();
  const entries = registry[userId] ?? [];
  registry[userId] = [
    ...entries.filter(entry => entry.companyId !== companyId),
    { companyId, preparedAt: new Date().toISOString() }
  ];
  saveRegistry(registry);
};

/**
 * Downloads every company-scoped data set used by the application into
 * Firestore's persistent cache. The registry is only marked ready after all
 * reads have completed from the server successfully.
 */
export const prepareCompanyForOffline = async (
  userId: string,
  companyId: string
) => {
  await Promise.all([
    getDocFromServer(doc(db, 'companies', companyId)),
    getDocFromServer(doc(db, 'memberships', `${userId}_${companyId}`)),
    getDocsFromServer(
      query(collection(db, 'memberships'), where('companyId', '==', companyId))
    ),
    getDocsFromServer(
      query(collection(db, 'invitations'), where('companyId', '==', companyId))
    ),
    getDocsFromServer(
      query(collection(db, 'inventory'), where('companyId', '==', companyId))
    ),
    getDocsFromServer(
      query(collection(db, 'customers'), where('companyId', '==', companyId))
    ),
    getDocsFromServer(
      query(
        collection(db, 'sales'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(500)
      )
    )
  ]);

  markCompanyOfflineReady(userId, companyId);
};
