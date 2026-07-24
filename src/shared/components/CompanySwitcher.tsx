import type { FC, Key } from 'react';
import { clsx } from 'clsx';
import {
  Building2,
  ChevronDown,
  CloudCheck,
  Plus,
  WifiOff
} from 'lucide-react';
import { Dropdown, Header, Label, Spinner, Tooltip } from '@heroui/react';
import type { Company, Membership } from '@/core/types/tenant';

interface CompanySwitcherProps {
  activeCompany: Company | null;
  memberships: Membership[];
  isCollapsed?: boolean;
  isOnline: boolean;
  offlineReadyCompanyIds: string[];
  preparingCompanyId: string | null;
  isSwitching: boolean;
  onSelectionChange: (keys: Set<Key>) => void;
}

export const CompanySwitcher: FC<CompanySwitcherProps> = ({
  activeCompany,
  memberships,
  isCollapsed = false,
  isOnline,
  offlineReadyCompanyIds,
  preparingCompanyId,
  isSwitching,
  onSelectionChange
}) => {
  const trigger = (
    <Dropdown.Trigger
      data-onboarding="company-switcher"
      aria-label="İşletme Seç"
      className={clsx(
        'flex w-full items-center justify-between rounded-2xl font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100/80',
        isCollapsed
          ? 'mx-auto h-12 !w-12 !min-w-12 justify-center p-3'
          : 'h-12 gap-3 px-4 py-2.5'
      )}
      isDisabled={isSwitching}>
      <div
        className={clsx(
          'flex min-w-0 items-center gap-3',
          isCollapsed && 'w-full justify-center'
        )}>
        <Building2 className="flex-shrink-0 text-lg text-gray-500" />
        {!isCollapsed && (
          <span className="truncate text-sm font-medium text-gray-700">
            {activeCompany?.name || 'Yükleniyor...'}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <ChevronDown
          size={16}
          className="ml-auto flex-shrink-0 text-gray-400"
        />
      )}
    </Dropdown.Trigger>
  );

  return (
    <Dropdown>
      {isCollapsed ? (
        <Tooltip delay={0} closeDelay={0}>
          {trigger}
          <Tooltip.Content showArrow placement="right">
            <Tooltip.Arrow />
            {activeCompany?.name || 'İşletme seç'}
          </Tooltip.Content>
        </Tooltip>
      ) : (
        trigger
      )}
      <Dropdown.Popover
        className={clsx(
          isCollapsed ? 'min-w-[240px]' : 'min-w-[min(19rem,calc(100vw-3rem))]'
        )}>
        <Dropdown.Menu
          aria-label="İşletme Geçişleri"
          selectedKeys={
            activeCompany?.id ? new Set([activeCompany.id]) : new Set()
          }
          selectionMode="single"
          onSelectionChange={keys => onSelectionChange(keys as Set<Key>)}>
          {!isOnline && (
            <Dropdown.Item
              id="offline-status"
              textValue="Çevrim dışı durum bilgisi"
              isDisabled>
              <div className="flex items-start gap-2 py-1 text-xs leading-4 text-amber-700">
                <WifiOff size={15} className="mt-0.5 flex-shrink-0" />
                <span>
                  Çevrim dışısınız. Yalnızca bu cihazda hazır olan işletmelere
                  geçebilirsiniz.
                </span>
              </div>
            </Dropdown.Item>
          )}
          <Dropdown.Item
            id="new-company"
            textValue="Yeni İşletme Kur"
            className="text-primary font-semibold">
            <div className="flex items-center gap-2">
              <Plus size={16} />
              <Label>Yeni İşletme Kur</Label>
            </div>
          </Dropdown.Item>

          <Dropdown.Section>
            <Header className="pointer-events-none px-3 py-1 text-[10px] font-bold uppercase opacity-50">
              {isOnline ? 'İşletmelerim' : 'Çevrim dışı işletmeler'}
            </Header>
            {memberships.map(membership => (
              <Dropdown.Item
                id={membership.companyId}
                key={membership.companyId}
                textValue={membership.companyName}
                isDisabled={
                  isSwitching ||
                  (!isOnline &&
                    !offlineReadyCompanyIds.includes(membership.companyId))
                }
                className={clsx(
                  membership.companyId === activeCompany?.id &&
                    'text-primary bg-primary/5 font-bold'
                )}>
                <div className="flex w-full items-center gap-2">
                  <Building2 size={16} />
                  <Label>{membership.companyName}</Label>
                  <span className="ml-auto flex items-center text-xs">
                    {preparingCompanyId === membership.companyId ? (
                      <Spinner
                        size="sm"
                        color="current"
                        className="text-primary size-[15px]"
                        aria-label="Çevrim dışı kullanım için hazırlanıyor"
                      />
                    ) : offlineReadyCompanyIds.includes(
                        membership.companyId
                      ) ? (
                      <CloudCheck
                        size={15}
                        className="text-emerald-500"
                        aria-label="Çevrim dışı kullanıma hazır"
                      />
                    ) : !isOnline ? (
                      <span className="text-[10px] font-medium text-gray-400">
                        İnternet gerekli
                      </span>
                    ) : null}
                  </span>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
