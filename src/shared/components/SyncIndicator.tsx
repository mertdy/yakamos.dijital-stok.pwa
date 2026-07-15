import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { WifiOff, Cloud } from 'lucide-react';
import { Tooltip } from '@heroui/react';

interface SyncIndicatorProps {
  iconOnly?: boolean;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  iconOnly = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (iconOnly) {
    return (
      <Tooltip delay={0} closeDelay={0}>
        <Tooltip.Trigger>
          <div
            className={clsx(
              'flex-shrink-0 cursor-help rounded-lg border p-1.5 transition-colors',
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                : 'border-amber-200 bg-amber-50 text-amber-600'
            )}>
            {isOnline ? <Cloud size={14} /> : <WifiOff size={14} />}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow />
          <span className="px-1 py-0.5 text-xs font-semibold">
            {isOnline
              ? 'Bulut ile Senkronize'
              : 'Çevrimdışı Mod (İnternet Bağlantısı Yok)'}
          </span>
        </Tooltip.Content>
      </Tooltip>
    );
  }

  if (!isOnline) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600"
        title="Veriler çevrimdışı kaydediliyor">
        <WifiOff size={14} />
        <span className="hidden sm:inline">Çevrimdışı Mod</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600"
      title="Bulut ile senkronize">
      <Cloud size={14} />
      <span className="hidden sm:inline">Buluta Bağlı</span>
    </div>
  );
};
