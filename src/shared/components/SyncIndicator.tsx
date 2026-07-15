import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { WifiOff, Cloud } from 'lucide-react';
import { Button, Spinner, Tooltip } from '@heroui/react';

interface SyncIndicatorProps {
  iconOnly?: boolean;
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left';
  isPreparing?: boolean;
  fullWidth?: boolean;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  iconOnly = false,
  tooltipPlacement = 'top',
  isPreparing = false,
  fullWidth = false
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
    const tooltipLabel = isPreparing
      ? 'İşletme çevrim dışı kullanım için hazırlanıyor'
      : isOnline
        ? 'Bulut ile Senkronize'
        : 'Çevrimdışı Mod (İnternet Bağlantısı Yok)';

    return (
      <Tooltip delay={0} closeDelay={0}>
        <Button
          variant="ghost"
          isIconOnly
          aria-label={tooltipLabel}
          className={clsx(
            'h-8 !w-8 !min-w-8 flex-shrink-0 cursor-help rounded-lg border p-1.5 transition-colors',
            isPreparing
              ? 'border-primary/20 bg-primary/5 text-primary'
              : isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                : 'border-amber-200 bg-amber-50 text-amber-600'
          )}>
          {isPreparing ? (
            <Spinner size="sm" color="current" className="size-3.5" />
          ) : isOnline ? (
            <Cloud size={14} />
          ) : (
            <WifiOff size={14} />
          )}
        </Button>
        <Tooltip.Content showArrow placement={tooltipPlacement}>
          <Tooltip.Arrow />
          <span className="px-1 py-0.5 text-xs font-medium">
            {tooltipLabel}
          </span>
        </Tooltip.Content>
      </Tooltip>
    );
  }

  if (!isOnline) {
    return (
      <Tooltip delay={0} closeDelay={0}>
        <Tooltip.Trigger
          aria-label="Çevrim dışı durum bilgisi"
          className={clsx(fullWidth && 'block w-full')}>
          <div
            className={clsx(
              'flex cursor-help items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600',
              fullWidth && 'w-full'
            )}>
            <WifiOff size={14} />
            <span className="hidden sm:inline">Çevrimdışı Mod</span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement={tooltipPlacement}>
          <Tooltip.Arrow />
          <span className="px-1 py-0.5 text-xs font-medium">
            Veriler çevrimdışı kaydediliyor
          </span>
        </Tooltip.Content>
      </Tooltip>
    );
  }

  if (isPreparing) {
    return (
      <Tooltip delay={0} closeDelay={0}>
        <Tooltip.Trigger
          aria-label="Çevrim dışı hazırlık durumu"
          className={clsx(fullWidth && 'block w-full')}>
          <div
            className={clsx(
              'bg-primary/5 text-primary border-primary/20 flex cursor-help items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              fullWidth && 'w-full'
            )}>
            <Spinner size="sm" color="current" className="size-3.5" />
            <span className="hidden sm:inline">Çevrim dışına hazırlanıyor</span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement={tooltipPlacement}>
          <Tooltip.Arrow />
          <span className="px-1 py-0.5 text-xs font-medium">
            İşletme verileri çevrim dışı kullanım için hazırlanıyor
          </span>
        </Tooltip.Content>
      </Tooltip>
    );
  }

  return (
    <Tooltip delay={0} closeDelay={0}>
      <Tooltip.Trigger
        aria-label="Bulut bağlantı durumu"
        className={clsx(fullWidth && 'block w-full')}>
        <div
          className={clsx(
            'flex cursor-help items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600',
            fullWidth && 'w-full'
          )}>
          <Cloud size={14} />
          <span className="hidden sm:inline">Buluta Bağlı</span>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow placement={tooltipPlacement}>
        <Tooltip.Arrow />
        <span className="px-1 py-0.5 text-xs font-medium">
          Bulut ile senkronize
        </span>
      </Tooltip.Content>
    </Tooltip>
  );
};
