import { useEffect } from 'react';
import {
  corePrefetches,
  secondaryPrefetches
} from '@/core/config/prefetchRegistry';
import { runPrefetch } from '@/shared/utils/prefetch';

/**
 * Once an authenticated company workspace is visible, progressively cache
 * route and optional POS chunks while the browser is idle. This keeps first
 * paint light without sacrificing later offline access.
 */
export const useOfflineExperiencePreparation = (isReady: boolean) => {
  useEffect(() => {
    if (!isReady || !navigator.onLine) return;

    let cancelled = false;
    let cancelPrefetches = () => {};

    void (async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
      if (cancelled) return;

      const cancelCore = runPrefetch(corePrefetches);
      const cancelSecondary = runPrefetch(secondaryPrefetches, 20_000);
      cancelPrefetches = () => {
        cancelCore();
        cancelSecondary();
      };
    })().catch(error => {
      console.warn('Offline experience preparation failed', error);
    });

    return () => {
      cancelled = true;
      cancelPrefetches();
    };
  }, [isReady]);
};
