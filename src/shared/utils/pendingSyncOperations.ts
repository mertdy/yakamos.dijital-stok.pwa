import { db } from '@/core/firebase/config';

const STORAGE_KEY = 'dijital-stok.pending-sync-operations.v1';

export type PendingOperationTarget =
  | { type: 'sale'; id: string }
  | { type: 'inventory'; id: string }
  | { type: 'customer'; id: string };

export interface PendingSyncOperation {
  id: string;
  kind: 'sale' | 'inventory' | 'customer' | 'payment';
  title: string;
  details: string[];
  target?: PendingOperationTarget;
  createdAt: string;
}

export type NewPendingSyncOperation = Omit<
  PendingSyncOperation,
  'id' | 'createdAt'
>;

const readOperations = (): PendingSyncOperation[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];

    // Preserve entries created by the initial queue implementation so a
    // deployment does not hide an already-pending offline operation.
    return stored.map(entry => {
      if (entry.kind && entry.title) return entry as PendingSyncOperation;
      return {
        id: entry.id ?? crypto.randomUUID(),
        kind: 'inventory',
        title: entry.label ?? 'Bekleyen işlem',
        details: [],
        createdAt: entry.createdAt ?? new Date().toISOString()
      };
    });
  } catch {
    return [];
  }
};

const saveOperations = (operations: PendingSyncOperation[]) => {
  if (operations.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
};

export const getPendingSyncOperations = () => readOperations();

export const clearPendingSyncOperations = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const trackPendingSyncOperation = (
  operation: NewPendingSyncOperation
) => {
  const newOperation: PendingSyncOperation = {
    ...operation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  saveOperations([...readOperations(), newOperation]);

  const operationIds = new Set(readOperations().map(item => item.id));
  waitForOperationsToSync(operationIds);
};

const waitForOperationsToSync = (operationIds: Set<string>) => {
  void import('firebase/firestore')
    .then(({ waitForPendingWrites }) => waitForPendingWrites(db))
    .then(() => {
      saveOperations(
        readOperations().filter(item => !operationIds.has(item.id))
      );
    })
    .catch(() => {
      // Offline writes intentionally remain in the registry until they sync.
    });
};

export const resumePendingSyncOperationTracking = () => {
  const operations = readOperations();
  if (operations.length === 0) return;
  waitForOperationsToSync(new Set(operations.map(item => item.id)));
};
