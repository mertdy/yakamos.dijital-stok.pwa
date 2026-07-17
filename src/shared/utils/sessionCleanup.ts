import {
  clearIndexedDbPersistence,
  terminate,
  waitForPendingWrites
} from 'firebase/firestore';
import { db } from '@/core/firebase/config';
import { clearPendingSyncOperations } from './pendingSyncOperations';

const CHANNEL_NAME = 'dijital-stok-session';
const OFFLINE_CACHE_KEY = 'dijital-stok.offline-company-cache.v1';
const SALES_STORAGE_KEY = 'sales-storage';
const RETRY_CLEANUP_KEY = 'dijital-stok.local-cleanup-required.v1';

type SessionMessage = { type: 'logout-start' | 'logout-ready'; id: string };

let channel: BroadcastChannel | null = null;

const getChannel = () => {
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
};

export const clearUserLocalStorage = () => {
  localStorage.removeItem(OFFLINE_CACHE_KEY);
  localStorage.removeItem(SALES_STORAGE_KEY);
  clearPendingSyncOperations();
  localStorage.removeItem(RETRY_CLEANUP_KEY);
};

export const releaseFirestoreClient = async () => {
  try {
    await terminate(db);
  } catch (error) {
    // A terminated instance is already safe to discard on page navigation.
    console.warn('Firestore client could not be terminated cleanly.', error);
  }
};

/**
 * Firestore must be terminated before its IndexedDB persistence can be
 * deleted. The application is reloaded after this operation, so `db` is not
 * used again in the current page lifecycle.
 */
export const clearFirestorePersistence = async () => {
  try {
    await releaseFirestoreClient();
    await clearIndexedDbPersistence(db);
    localStorage.removeItem(RETRY_CLEANUP_KEY);
    return true;
  } catch (error) {
    // Another tab may still own the multi-tab persistence lease. Preserve a
    // marker so a later logout can retry instead of silently treating the
    // device as clean.
    localStorage.setItem(RETRY_CLEANUP_KEY, 'true');
    console.warn('Firestore local cache could not be cleared.', error);
    return false;
  }
};

export const waitForLocalWrites = async (timeoutMs = 5000) => {
  if (!navigator.onLine) return false;

  let timeoutId: number | undefined;
  try {
    await Promise.race([
      waitForPendingWrites(db),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('pending-writes-timeout')),
          timeoutMs
        );
      })
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
};

/** Tell other tabs to release their Firestore clients before cache deletion. */
export const notifyOtherTabsOfLogout = async () => {
  const activeChannel = getChannel();
  if (!activeChannel) return;

  const id = crypto.randomUUID();
  activeChannel.postMessage({
    type: 'logout-start',
    id
  } satisfies SessionMessage);
  // There is no tab enumeration API. This brief grace period lets open tabs
  // receive the message and release their IndexedDB lease before deletion.
  await new Promise(resolve => window.setTimeout(resolve, 400));
};

export const listenForRemoteLogout = (onRemoteLogout: () => Promise<void>) => {
  const activeChannel = getChannel();
  if (!activeChannel) return () => undefined;

  const onMessage = async (event: MessageEvent<SessionMessage>) => {
    if (event.data?.type !== 'logout-start') return;
    await onRemoteLogout();
    activeChannel.postMessage({ type: 'logout-ready', id: event.data.id });
  };
  activeChannel.addEventListener('message', onMessage);
  return () => activeChannel.removeEventListener('message', onMessage);
};
