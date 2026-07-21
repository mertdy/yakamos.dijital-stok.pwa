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

  const markUpdateAvailable = useCallback(() => {
    updateAvailableRef.current = true;
    showUpdateToast();
  }, [showUpdateToast]);

  const checkForUpdate = useCallback(
    async ({ showStatus = false }: { showStatus?: boolean } = {}) => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        if (showStatus) {
          toast.warning('Güncelleme kontrolü bu ortamda kullanılamıyor.');
        }
        return;
      }

      if (!navigator.onLine) {
        if (showStatus) {
          toast.warning(
            'Güncellemeleri kontrol etmek için internete bağlanın.'
          );
        }
        return;
      }

      try {
        console.info('[PWA] Güncelleme kontrolü yapılıyor.');
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          markUpdateAvailable();
          return;
        }

        const updatedRegistration = await registration.update();
        if (updatedRegistration.waiting) {
          markUpdateAvailable();
          return;
        }

        if (!updatedRegistration.installing && showStatus) {
          toast.success('Uygulama güncel.');
        }
      } catch (error) {
        console.error('[PWA] Güncelleme kontrolü başarısız oldu.', error);
        if (showStatus) {
          toast.danger('Güncellemeler kontrol edilirken bir hata oluştu.');
        }
      }
    },
    [markUpdateAvailable]
  );

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

    const checkForAutomaticUpdate = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate();
      } else {
        console.info('[PWA] Güncelleme kontrolü atlandı.', {
          online: navigator.onLine,
          visibility: document.visibilityState
        });
      }
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
    checkForAutomaticUpdate();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForAutomaticUpdate();
        showUpdateToast();
      }
    };

    const intervalId = window.setInterval(
      checkForAutomaticUpdate,
      UPDATE_CHECK_INTERVAL_MS
    );

    window.addEventListener('online', checkForAutomaticUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      markUpdateAvailable
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', checkForAutomaticUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        markUpdateAvailable
      );
    };
  }, [checkForUpdate, markUpdateAvailable, showUpdateToast]);

  useEffect(() => {
    showUpdateToast();
  }, [isSaleProcessing, showUpdateToast]);

  return { checkForUpdate };
};
