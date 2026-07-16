import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Hook to manage PWA installation prompt lifecycle.
 * Intercepts the browser's install event and allows custom UI triggers.
 */
export const usePWAInstall = () => {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  // Detect platform (mobile vs desktop) for dynamic wording
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    setDeviceType(isMobileDevice ? 'mobile' : 'desktop');

    // Check if the PWA is already running in standalone/installed mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Capacitor native apps do not need browser PWA installation
    if (Capacitor.isNativePlatform()) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser from automatically showing the install banner
      e.preventDefault();
      // Store the event so we can trigger it later on user click
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      console.log('Dijital Stok successfully installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async (): Promise<'accepted' | 'dismissed'> => {
    if (!installPromptEvent) {
      return 'dismissed';
    }

    try {
      // Show the native browser install prompt
      await installPromptEvent.prompt();

      // Wait for the user choice
      const choiceResult = await installPromptEvent.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA installation');
        setIsInstalled(true);
        setInstallPromptEvent(null);
        return 'accepted';
      } else {
        console.log('User dismissed PWA installation');
        return 'dismissed';
      }
    } catch (error) {
      console.error('Error during PWA installation prompt:', error);
      return 'dismissed';
    }
  };

  // The PWA is installable if we have the prompt event stashed and it's not already installed
  const isInstallable =
    !!installPromptEvent && !isInstalled && !Capacitor.isNativePlatform();

  return {
    isInstallable,
    deviceType,
    installApp
  };
};
