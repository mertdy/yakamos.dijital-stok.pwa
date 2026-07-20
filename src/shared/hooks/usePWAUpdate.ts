import { useCallback, useEffect, useRef } from 'react';
import { useSalesStore } from '@/features/sales/store/useSalesStore';
import { toast } from '@heroui/react';

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const SUCCESSFUL_OPEN_STORAGE_KEY = 'pwa-successfully-opened';

const hasOpenedSuccessfullyBefore = () => {
  try {
    return localStorage.getItem(SUCCESSFUL_OPEN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Hook to check for PWA updates when connection is restored,
 * and prompt the user to reload the page when a new version activates.
 */
export const usePWAUpdate = (isAuthenticatedAndReady: boolean) => {
  const heldSalesCount = useSalesStore(state => state.heldSales.length);
  const isSaleProcessing = useSalesStore(state => state.isProcessing);
  const updateAvailableRef = useRef(false);
  const hasShownUpdateToastRef = useRef(false);
  const hasOpenedSuccessfullyRef = useRef(hasOpenedSuccessfullyBefore());

  const showUpdateToast = useCallback(() => {
    if (
      !updateAvailableRef.current ||
      hasShownUpdateToastRef.current ||
      !isAuthenticatedAndReady ||
      !hasOpenedSuccessfullyRef.current ||
      isSaleProcessing ||
      document.visibilityState !== 'visible'
    ) {
      return;
    }

    hasShownUpdateToastRef.current = true;
    toast('Yeni sürüm hazır!', {
      description:
        'Uygulamanın yeni sürümü indirildi. Yeni özellikleri kullanmak için yenileyin.',
      variant: 'accent',
      timeout: 0,
      actionProps: {
        children: 'Şimdi yenile',
        variant: 'primary',
        size: 'sm',
        onPress: () => window.location.reload()
      }
    });
  }, [isAuthenticatedAndReady, isSaleProcessing]);

  useEffect(() => {
    if (!isAuthenticatedAndReady) return;

    if (!hasOpenedSuccessfullyRef.current) {
      hasOpenedSuccessfullyRef.current = true;
      updateAvailableRef.current = false;
      try {
        localStorage.setItem(SUCCESSFUL_OPEN_STORAGE_KEY, 'true');
      } catch {
        console.warn('[PWA] İlk başarılı açılış bilgisi kaydedilemedi.');
      }
      return;
    }

    showUpdateToast();
  }, [isAuthenticatedAndReady, showUpdateToast]);

  // 1. Update App Badge when heldSalesCount changes (PWA Badging API)
  useEffect(() => {
    if (typeof window === 'undefined' || !('setAppBadge' in navigator)) return;

    if (heldSalesCount > 0) {
      navigator.setAppBadge(heldSalesCount).catch(err => {
        console.error('Failed to set app badge:', err);
      });
    } else {
      navigator.clearAppBadge().catch(err => {
        console.error('Failed to clear app badge:', err);
      });
    }
  }, [heldSalesCount]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return;

    const checkForUpdate = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        console.info('[PWA] Güncelleme kontrolü yapılıyor.');
        void navigator.serviceWorker.ready.then(registration =>
          registration.update()
        );
      } else {
        console.info('[PWA] Güncelleme kontrolü atlandı.', {
          online: navigator.onLine,
          visibility: document.visibilityState
        });
      }
    };

    const markUpdateAvailable = () => {
      updateAvailableRef.current = true;
      showUpdateToast();
    };

    const observeRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) markUpdateAvailable();
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            markUpdateAvailable();
          }
        });
      });
    };

    void navigator.serviceWorker.ready.then(observeRegistration);
    checkForUpdate();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
        showUpdateToast();
      }
    };

    const intervalId = window.setInterval(
      checkForUpdate,
      UPDATE_CHECK_INTERVAL_MS
    );

    window.addEventListener('online', checkForUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      markUpdateAvailable
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', checkForUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        markUpdateAvailable
      );
    };
  }, [showUpdateToast]);

  useEffect(() => {
    showUpdateToast();
  }, [isSaleProcessing, showUpdateToast]);
};
