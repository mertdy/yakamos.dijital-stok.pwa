import { useEffect } from 'react';
import { toast } from '@heroui/react';
import { useSalesStore } from '@/features/sales/store/useSalesStore';

/**
 * Hook to check for PWA updates when connection is restored,
 * and prompt the user to reload the page when a new version activates.
 */
export const usePWAUpdate = () => {
  const heldSalesCount = useSalesStore(state => state.heldSales.length);

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

    // 1. Force check for updates when internet connection is restored
    const handleOnline = () => {
      navigator.serviceWorker.ready.then(registration => {
        registration.update();
      });
    };

    // 2. Notify the user to reload when a new service worker version activates
    const handleControllerChange = () => {
      toast('Yeni Sürüm Hazır!', {
        description:
          'Uygulama arka planda güncellendi. Yeni özellikleri kullanmak için lütfen sayfayı yenileyin.',
        variant: 'accent',
        timeout: 0, // Persistent toast that stays until dismissed or action clicked
        actionProps: {
          children: 'Yenile',
          variant: 'primary',
          size: 'sm',
          onPress: () => window.location.reload()
        }
      });
    };

    window.addEventListener('online', handleOnline);
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
    };
  }, []);
};
