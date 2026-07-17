import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import { Capacitor } from '@capacitor/core';

type InstallOutcome = 'accepted' | 'dismissed';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
  prompt(): Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
}

interface PWAInstallContextValue {
  isInstallable: boolean;
  deviceType: 'mobile' | 'desktop';
  installApp: () => Promise<InstallOutcome>;
}

const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

/**
 * Captures the browser install event as soon as the React application mounts.
 * It must remain above routes that are mounted only after authentication.
 */
export const PWAInstallProvider: React.FC<PropsWithChildren> = ({
  children
}) => {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');
  const isNativePlatform = Capacitor.isNativePlatform();

  useEffect(() => {
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.matchMedia('(pointer: coarse)').matches;

    setDeviceType(isMobileDevice ? 'mobile' : 'desktop');

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }
  }, []);

  useEffect(() => {
    if (isNativePlatform) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
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
  }, [isNativePlatform]);

  const installApp = useCallback(async (): Promise<InstallOutcome> => {
    if (!installPromptEvent) return 'dismissed';

    // A BeforeInstallPromptEvent can only be prompted once. Clear it before
    // awaiting the browser UI so repeated clicks cannot reuse a stale event.
    setInstallPromptEvent(null);

    try {
      const { outcome } = await installPromptEvent.prompt();

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }

      return outcome;
    } catch (error) {
      console.error('Error during PWA installation prompt:', error);
      return 'dismissed';
    }
  }, [installPromptEvent]);

  const value = useMemo<PWAInstallContextValue>(
    () => ({
      isInstallable: !!installPromptEvent && !isInstalled && !isNativePlatform,
      deviceType,
      installApp
    }),
    [deviceType, installApp, installPromptEvent, isInstalled, isNativePlatform]
  );

  return createElement(PWAInstallContext.Provider, { value }, children);
};

export const usePWAInstall = () => {
  const context = useContext(PWAInstallContext);

  if (!context) {
    throw new Error('usePWAInstall must be used within PWAInstallProvider');
  }

  return context;
};
