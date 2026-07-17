import type { ReactNode } from 'react';
import { Card } from '@heroui/react';
import { clsx } from 'clsx';

interface SettingsCardProps {
  title: ReactNode;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export const SettingsCard = ({
  title,
  icon,
  children,
  className
}: SettingsCardProps) => (
  <Card
    className={clsx(
      'rounded-2xl border border-gray-100 bg-white p-6 shadow-sm',
      className
    )}>
    <h2 className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-3 text-lg font-bold text-gray-900">
      {icon}
      {title}
    </h2>
    {children}
  </Card>
);
