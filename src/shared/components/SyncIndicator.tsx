import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { WifiOff, Cloud } from 'lucide-react';
import { Button, Spinner, Tooltip } from '@heroui/react';
import { PendingSyncOperationsDialog } from './PendingSyncOperationsDialog';

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
  const [isPendingOperationsOpen, setIsPendingOperationsOpen] = useState(false);

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

  const status = !isOnline
    ? {
        label: 'Çevrimdışı Mod',
        description: 'Sırada bekleyen işlemleri görmek için tıklayın',
        className: 'border-amber-200 bg-amber-50 text-amber-600',
        icon: <WifiOff size={14} />
      }
    : isPreparing
      ? {
          label: 'Çevrim dışına hazırlanıyor',
          description:
            'İşletme verileri çevrim dışı kullanım için hazırlanıyor',
          className: 'border-primary/20 bg-primary/5 text-primary',
          icon: <Spinner size="sm" color="current" className="size-3.5" />
        }
      : {
          label: 'Buluta Bağlı',
          description: 'Bulut ile senkronize',
          className: 'border-emerald-200 bg-emerald-50 text-emerald-600',
          icon: <Cloud size={14} />
        };

  const offlineTrigger = iconOnly ? (
    <Button
      variant="ghost"
      isIconOnly
      onPress={() => setIsPendingOperationsOpen(true)}
      aria-label={status.description}
      className={clsx(
        'h-8 !w-8 !min-w-8 flex-shrink-0 rounded-lg border p-1.5 transition-colors',
        status.className
      )}>
      {status.icon}
    </Button>
  ) : (
    <button
      type="button"
      onClick={() => setIsPendingOperationsOpen(true)}
      className={clsx(
        'flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-95 focus:ring-2 focus:ring-amber-400/50 focus:outline-none',
        status.className,
        fullWidth && 'w-full'
      )}>
      {status.icon}
      <span className="hidden sm:inline">{status.label}</span>
    </button>
  );

  return (
    <>
      <Tooltip delay={0} closeDelay={0}>
        {!isOnline ? (
          offlineTrigger
        ) : iconOnly ? (
          <Button
            variant="ghost"
            isIconOnly
            aria-label={status.description}
            className={clsx(
              'h-8 !w-8 !min-w-8 flex-shrink-0 cursor-help rounded-lg border p-1.5 transition-colors',
              status.className
            )}>
            {status.icon}
          </Button>
        ) : (
          <Tooltip.Trigger
            aria-label={status.description}
            className={clsx(fullWidth && 'block w-full')}>
            <div
              className={clsx(
                'flex cursor-help items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                status.className,
                fullWidth && 'w-full'
              )}>
              {status.icon}
              <span className="hidden sm:inline">{status.label}</span>
            </div>
          </Tooltip.Trigger>
        )}
        <Tooltip.Content showArrow placement={tooltipPlacement}>
          <Tooltip.Arrow />
          <span className="px-1 py-0.5 text-xs font-medium">
            {status.description}
          </span>
        </Tooltip.Content>
      </Tooltip>
      <PendingSyncOperationsDialog
        isOpen={isPendingOperationsOpen}
        onOpenChange={setIsPendingOperationsOpen}
      />
    </>
  );
};
