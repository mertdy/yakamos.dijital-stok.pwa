import type { FC, Key } from 'react';
import { clsx } from 'clsx';
import {
  ChevronRight,
  CircleUserRound,
  CreditCard,
  GraduationCap,
  Keyboard,
  LifeBuoy,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun
} from 'lucide-react';
import { Dropdown, Switch } from '@heroui/react';
import type { User } from 'firebase/auth';
import type { Membership } from '@/core/types/tenant';

interface UserProfileMenuProps {
  user: User;
  activeMembership: Membership | null;
  isDark: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  hasNewChangelog: boolean;
  isCheckingForUpdate: boolean;
  isPlatformSupportAdmin: boolean;
  onAction: (key: Key) => void;
  variant?: 'expanded' | 'compact' | 'mobile';
}

export const UserProfileMenu: FC<UserProfileMenuProps> = ({
  user,
  activeMembership,
  isDark,
  setTheme,
  hasNewChangelog,
  isCheckingForUpdate,
  isPlatformSupportAdmin,
  onAction,
  variant = 'expanded'
}) => {
  const isCompact = variant === 'compact';
  const isMobile = variant === 'mobile';
  const mobileProfileLabel =
    user.displayName?.trim().split(/\s+/)[0] || 'Profil';

  return (
    <Dropdown>
      <Dropdown.Trigger
        data-onboarding="profile-menu"
        aria-label="Kullanıcı menüsünü aç"
        className={clsx(
          'group focus-visible:border-primary/40 flex items-center rounded-xl border border-transparent text-left transition-all duration-200 outline-none hover:border-gray-200 hover:bg-gray-100/70 focus-visible:bg-gray-100/70',
          isMobile
            ? 'focus-visible:bg-primary/5 h-14 min-w-0 flex-1 flex-col justify-center text-gray-500 hover:border-transparent hover:bg-transparent hover:text-gray-700'
            : isCompact
              ? 'w-full justify-center gap-3 p-1.5'
              : 'w-full gap-3 p-2.5'
        )}>
        <img
          src={
            user.photoURL ||
            `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
          }
          alt="Kullanıcı avatarı"
          className={clsx(
            isMobile ? 'h-7 w-7' : isCompact ? 'h-8 w-8' : 'h-10 w-10',
            'flex-shrink-0 rounded-full object-cover',
            !isMobile &&
              'shadow-sm ring-2 ring-white transition-transform duration-200 group-hover:scale-[1.03]'
          )}
        />
        {isMobile && (
          <span className="max-w-full truncate text-[10px] font-medium">
            {mobileProfileLabel}
          </span>
        )}
        {!isCompact && !isMobile && (
          <>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm leading-tight font-semibold tracking-tight text-gray-900">
                {user.displayName || 'İsimsiz Kullanıcı'}
              </span>
              <span className="mt-0.5 truncate text-xs leading-normal text-gray-500">
                {activeMembership?.role === 'OWNER'
                  ? 'Şirket Sahibi'
                  : activeMembership?.jobTitle || 'Çalışan'}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors duration-200 group-hover:text-gray-500" />
          </>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover
        placement={isMobile ? 'top end' : isCompact ? 'right' : 'top start'}
        className="min-w-60">
        <div className="border-b border-gray-100 px-3 py-2.5">
          <Switch
            size="sm"
            isSelected={isDark}
            onChange={isSelected => setTheme(isSelected ? 'dark' : 'light')}
            aria-label="Koyu tema">
            {({ isSelected }) => (
              <Switch.Content className="w-full justify-between gap-3">
                <span className="ml-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Moon size={16} className="text-gray-500" />
                  Koyu tema
                </span>
                <Switch.Control>
                  <Switch.Thumb>
                    <Switch.Icon>
                      {isSelected ? (
                        <Sun className="size-3 text-inherit" />
                      ) : (
                        <Moon className="size-3 text-inherit" />
                      )}
                    </Switch.Icon>
                  </Switch.Thumb>
                </Switch.Control>
              </Switch.Content>
            )}
          </Switch>
        </div>
        <Dropdown.Menu aria-label="Kullanıcı menüsü" onAction={onAction}>
          <Dropdown.Item id="account-settings" textValue="Hesap Ayarları">
            <span className="flex items-center gap-2.5">
              <CircleUserRound size={17} className="text-gray-500" />
              <span>Hesap Ayarları</span>
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="plans" textValue="Planlar ve Fiyatlandırma">
            <span className="flex items-center gap-2.5">
              <CreditCard size={17} className="text-gray-500" />
              <span>Planlar ve Fiyatlandırma</span>
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="changelog" textValue="Yenilikler">
            <span className="flex w-full items-center gap-2.5">
              <Sparkles size={17} className="text-gray-500" />
              <span className="flex-1">Yenilikler</span>
              {hasNewChangelog && (
                <span
                  className="bg-primary h-2 w-2 rounded-full"
                  aria-label="Yeni yenilikler var"
                />
              )}
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="getting-started" textValue="Başlangıç rehberi">
            <span className="flex items-center gap-2.5">
              <GraduationCap size={17} className="text-gray-500" />
              <span>Başlangıç rehberi</span>
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="keyboard-shortcuts" textValue="Klavye kısayolları">
            <span className="flex items-center gap-2.5">
              <Keyboard size={17} className="text-gray-500" />
              <span>Klavye kısayolları</span>
            </span>
          </Dropdown.Item>
          <Dropdown.Item
            id="check-for-updates"
            textValue="Güncellemeleri kontrol et">
            <span className="flex items-center gap-2.5">
              <RefreshCw
                size={17}
                className={
                  isCheckingForUpdate
                    ? 'animate-spin text-gray-500'
                    : 'text-gray-500'
                }
              />
              <span>
                {isCheckingForUpdate
                  ? 'Kontrol ediliyor...'
                  : 'Güncellemeleri kontrol et'}
              </span>
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="support" textValue="Destek">
            <span className="flex w-full items-center gap-2.5">
              <LifeBuoy size={17} className="text-gray-500" />
              <span className="flex-1">Destek</span>
            </span>
          </Dropdown.Item>
          {isPlatformSupportAdmin && (
            <Dropdown.Item id="support-access" textValue="Destek oturumu aç">
              <span className="flex w-full items-center gap-2.5">
                <ShieldCheck size={17} className="text-primary" />
                <span className="flex-1">Destek oturumu aç</span>
              </span>
            </Dropdown.Item>
          )}
          {activeMembership?.supportSessionId && (
            <Dropdown.Item
              id="end-support-access"
              textValue="Destek oturumunu sonlandır"
              className="text-warning">
              <span className="flex w-full items-center gap-2.5">
                <ShieldCheck size={17} />
                <span className="flex-1">Destek oturumunu sonlandır</span>
              </span>
            </Dropdown.Item>
          )}
          <Dropdown.Item
            id="logout"
            textValue="Çıkış Yap"
            className="text-danger mt-1 border-t border-gray-100 pt-2">
            <span className="flex items-center gap-2.5">
              <LogOut size={17} />
              <span>Çıkış Yap</span>
            </span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
