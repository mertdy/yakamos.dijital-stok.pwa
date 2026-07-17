import React from 'react';
import { clsx } from 'clsx';
import { Button, Tooltip } from '@heroui/react';
import { Laptop, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/shared/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  isCollapsed: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isCollapsed
}) => {
  const { isInstallable, deviceType, installApp } = usePWAInstall();

  if (!isInstallable) return null;

  const isMobile = deviceType === 'mobile';
  const Icon = isMobile ? Smartphone : Laptop;
  const buttonText = isMobile ? 'Telefona İndir' : 'Bilgisayara İndir';
  const tooltipText = isMobile
    ? "Dijital Stok'u telefonunuza indirerek internetiniz kesilse bile dükkanınızda satış yapmaya ve stoklarınızı yönetmeye devam edebilirsiniz. Ayrıca ana ekranınızdaki simgeden tek tıkla hızlıca açabilirsiniz."
    : "Dijital Stok'u bilgisayarınıza indirerek internetiniz kesilse bile dükkanınızda satış yapmaya ve stoklarınızı yönetmeye devam edebilirsiniz. Ayrıca masaüstünüzdeki simgeden tek tıkla hızlıca açabilirsiniz.";

  const buttonElement = (
    <Button
      variant="ghost"
      aria-label="Uygulamayı İndir"
      className={clsx(
        'text-primary hover:bg-primary/10 mb-1 w-full font-semibold transition-all duration-200',
        isCollapsed
          ? 'h-12 !w-12 !min-w-12 justify-center rounded-2xl p-3'
          : 'h-11 justify-start gap-3 rounded-2xl px-4 py-2.5'
      )}
      onPress={installApp}>
      <Icon size={18} className="text-primary flex-shrink-0" />
      {!isCollapsed && <span className="text-sm">{buttonText}</span>}
    </Button>
  );

  return (
    <Tooltip delay={0} closeDelay={0}>
      {buttonElement}
      <Tooltip.Content showArrow placement="right" className="max-w-[280px]">
        <Tooltip.Arrow />
        <div className="p-1.5 text-xs leading-relaxed font-medium">
          {tooltipText}
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
};
