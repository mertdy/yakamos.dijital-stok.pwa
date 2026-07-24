import React, { Suspense, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SyncIndicator } from '@/shared/components/SyncIndicator';
import { ROUTES } from '@/core/config/routes';
import { PWAInstallButton } from '@/shared/components/PWAInstallButton';
import { LazyRouteErrorBoundary } from '@/shared/components/LazyRouteErrorBoundary';
import { useAppHotkeys } from '@/shared/hooks/useAppHotkeys';
import { useThemeMode } from '@/shared/hooks/useThemeMode';
import { hasUnseenChangelog } from '@/core/config/changelog';
import { useSecureLogout } from '@/shared/hooks/useSecureLogout';
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import {
  Store,
  MonitorCheck,
  Package,
  FolderTree,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  LayoutDashboard,
  Settings,
  Loader2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  CircleUserRound,
  LifeBuoy,
  Moon,
  Sun,
  Sparkles,
  Keyboard,
  Tag,
  RefreshCw,
  GraduationCap,
  ShieldCheck,
  Menu
} from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { isActiveMembership } from '@/features/auth/store/useAuthStore';
import {
  Button,
  Dropdown,
  Drawer,
  Modal,
  Tooltip,
  toast,
  Switch
} from '@heroui/react';
import { useForm } from 'react-hook-form';
import { Timestamp, doc, writeBatch } from 'firebase/firestore';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormInput } from '@/shared/components/FormInput';
import { PhoneInput } from '@/shared/components/PhoneInput';
import { KeyboardShortcutsModal } from '@/shared/components/KeyboardShortcutsModal';
import { SupportAccessModal, SupportModal } from '@/features/support/routes';
import { PLATFORM_SUPPORT_ADMIN_EMAIL } from '@/core/config/support';
import { db } from '@/core/firebase/config';
import { GettingStartedCard, useOnboardingStore } from '@/features/onboarding';
import { OnboardingExperience } from '@/features/onboarding/routes';
import {
  normalizePhoneNumber,
  optionalPhoneNumberSchema
} from '@/shared/utils/phoneNumber';
import {
  getOfflineReadyCompanyIds,
  prepareCompanyForOffline
} from '@/shared/utils/offlineCompanyCache';
import { MobileNavigationContext } from '@/shared/contexts/MobileNavigationContext';
import { CompanySwitcher } from '@/shared/components/CompanySwitcher';
import { UserProfileMenu } from '@/shared/components/UserProfileMenu';

const newCompanySchema = z.object({
  name: z
    .string()
    .min(3, 'İşletme adı en az 3 karakter olmalıdır')
    .max(50, 'İşletme adı en fazla 50 karakter olmalıdır'),
  receiptHeader: z.string().optional(),
  phone: optionalPhoneNumberSchema,
  address: z.string().optional()
});

type NewCompanyFormData = z.infer<typeof newCompanySchema>;

interface SidebarTooltipProps {
  label: string;
  children: React.ReactElement;
}

const SidebarTooltip: React.FC<SidebarTooltipProps> = ({ label, children }) => (
  <Tooltip delay={0} closeDelay={0}>
    {children}
    <Tooltip.Content showArrow placement="right">
      <Tooltip.Arrow />
      <span className="px-1 py-0.5 text-xs font-medium whitespace-nowrap">
        {label}
      </span>
    </Tooltip.Content>
  </Tooltip>
);

const BrandMark: React.FC = () => (
  <div className="from-primary shadow-primary/25 ring-primary/10 relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br via-blue-500 to-indigo-500 text-white shadow-lg ring-1">
    <Store size={19} strokeWidth={2.5} />
    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-white/90 shadow-sm" />
    <span className="absolute -bottom-2 -left-2 h-5 w-5 rounded-full bg-white/15" />
  </div>
);

interface MainLayoutProps {
  onCheckForUpdate: () => Promise<void>;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ onCheckForUpdate }) => {
  useAppHotkeys();
  const {
    user,
    activeMembership,
    activeCompany,
    memberships,
    switchCompany,
    createCompany
  } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const logout = useSecureLogout();
  const { isDark, setTheme } = useThemeMode();
  const hasNewChangelog = hasUnseenChangelog();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [newCompanyModalOpen, setNewCompanyModalOpen] = useState(false);
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportAccessModalOpen, setSupportAccessModalOpen] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineReadyCompanyIds, setOfflineReadyCompanyIds] = useState(() =>
    getOfflineReadyCompanyIds(user?.uid)
  );
  const [preparingCompanyId, setPreparingCompanyId] = useState<string | null>(
    null
  );
  const restartOnboarding = useOnboardingStore(
    state => state.restartOnboarding
  );
  const switchableMemberships = memberships.filter(isActiveMembership);

  const handleCollapsedSidebarClick = (
    event: React.MouseEvent<HTMLElement>
  ) => {
    if (!isCollapsed) return;

    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
      return;
    }

    setIsCollapsed(false);
  };

  const { control, handleSubmit, reset } = useForm<NewCompanyFormData>({
    resolver: zodResolver(newCompanySchema)
  });

  // Auto collapse on sales screen
  useEffect(() => {
    if (location.pathname === ROUTES.SALES) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [location.pathname]);

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

  useEffect(() => {
    setOfflineReadyCompanyIds(getOfflineReadyCompanyIds(user?.uid));
  }, [user?.uid]);

  useEffect(() => {
    if (!isOnline || !user?.uid || !activeCompany?.id) return;

    let isCancelled = false;
    setPreparingCompanyId(activeCompany.id);

    prepareCompanyForOffline(user.uid, activeCompany.id)
      .then(() => {
        if (!isCancelled) {
          setOfflineReadyCompanyIds(getOfflineReadyCompanyIds(user.uid));
        }
      })
      .catch(error => {
        console.warn('Offline company preparation failed', error);
      })
      .finally(() => {
        if (!isCancelled) setPreparingCompanyId(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeCompany?.id, isOnline, user?.uid]);

  // Redirect if employee lacks dashboard view permission
  useEffect(() => {
    const isOwner = activeMembership?.role === 'OWNER';
    if (
      location.pathname === ROUTES.DASHBOARD &&
      !isOwner &&
      activeMembership?.role === 'EMPLOYEE' &&
      !activeMembership.permissions.includes('VIEW_DASHBOARD')
    ) {
      navigate(ROUTES.SALES);
    }
  }, [location.pathname, activeMembership, navigate]);

  const handleSwitchCompany = async (companyId: string) => {
    setIsSwitching(true);
    try {
      await switchCompany(companyId);
      toast.success('İşletme değiştirildi');
      return true;
    } catch (err) {
      console.error(err);
      toast.danger('İşletme değiştirilirken bir hata oluştu');
      return false;
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSelectionChange = async (keys: any) => {
    const selectedKey = Array.from(keys)[0]?.toString();
    if (!selectedKey) return;

    if (selectedKey === 'new-company') {
      setNewCompanyModalOpen(true);
      return;
    }

    if (selectedKey === activeCompany?.id) return;

    const isOfflineReady = offlineReadyCompanyIds.includes(selectedKey);
    if (!isOnline && !isOfflineReady) {
      toast.warning(
        'Bu işletmenin verileri bu cihazda henüz çevrim dışı kullanıma hazır değil.'
      );
      return;
    }

    const { useSalesStore } =
      await import('@/features/sales/store/useSalesStore');
    const { cart, clearCart } = useSalesStore.getState();

    if (cart.length > 0) {
      const productCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      const confirmed = await confirm({
        title: 'Sepet temizlenecek',
        description: `Sepetinizde ${productCount} ürün bulunuyor. İşletme değiştirildiğinde bu sepetteki ürünler temizlenecek.`,
        confirmText: 'Sepeti Temizle ve Değiştir',
        cancelText: 'Vazgeç',
        variant: 'danger',
        status: 'warning',
        secondaryAction:
          location.pathname !== ROUTES.SALES
            ? {
                text: 'Sepete Git',
                onPress: () => navigate(ROUTES.SALES)
              }
            : undefined
      });

      if (!confirmed) return;
    }

    const didSwitch = await handleSwitchCompany(selectedKey);
    if (didSwitch && cart.length > 0) {
      clearCart();
    }
  };

  const handleProfileMenuAction = (key: React.Key) => {
    if (key === 'logout') {
      void logout();
      return;
    }

    if (key === 'account-settings') {
      navigate(ROUTES.ACCOUNT_SETTINGS);
    }

    if (key === 'plans') {
      navigate(ROUTES.PRICING_PLANS);
    }

    if (key === 'changelog') {
      navigate(ROUTES.CHANGELOG);
    }

    if (key === 'keyboard-shortcuts') {
      setKeyboardShortcutsOpen(true);
    }

    if (key === 'check-for-updates') {
      if (isCheckingForUpdate) return;
      setIsCheckingForUpdate(true);
      void onCheckForUpdate().finally(() => setIsCheckingForUpdate(false));
    }

    if (key === 'support') {
      setSupportModalOpen(true);
    }

    if (key === 'support-access') {
      setSupportAccessModalOpen(true);
    }

    if (key === 'end-support-access') {
      const supportSessionId = activeMembership?.supportSessionId;
      if (!user || !supportSessionId) return;
      void (async () => {
        const confirmed = await confirm({
          title: 'Destek oturumu sonlandırılsın mı?',
          description:
            'Bu işletmeye olan geçici erişiminiz hemen kaldırılacak.',
          confirmText: 'Oturumu Sonlandır',
          cancelText: 'Vazgeç',
          variant: 'danger',
          status: 'warning'
        });
        if (!confirmed) return;
        const batch = writeBatch(db);
        batch.update(doc(db, 'supportSessions', supportSessionId), {
          status: 'CLOSED',
          endedAt: Timestamp.now()
        });
        batch.delete(doc(db, 'memberships', activeMembership.id));
        await batch.commit();
        toast.success('Destek oturumu sonlandırıldı.');
      })().catch(error => {
        console.error('Support session could not be closed:', error);
        toast.danger('Destek oturumu sonlandırılamadı.');
      });
    }

    if (key === 'getting-started') {
      void restartOnboarding();
    }
  };

  const handleCreateCompany = async (data: NewCompanyFormData) => {
    setIsCreatingCompany(true);
    try {
      await createCompany(data.name, {
        phone: normalizePhoneNumber(data.phone) || undefined,
        address: data.address,
        receiptHeader: data.receiptHeader
      });
      toast.success('Yeni işletme başarıyla kuruldu!');
      setNewCompanyModalOpen(false);
      reset();
    } catch (err) {
      console.error(err);
      toast.danger('İşletme kurulurken bir hata oluştu');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const baseNavItems: Array<{
    name: string;
    path: string;
    icon: React.ComponentType<any>;
  }> = [
    { name: 'Anasayfa', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { name: 'Satış', path: ROUTES.SALES, icon: MonitorCheck },
    { name: 'Satış Geçmişi', path: ROUTES.SALES_HISTORY, icon: History },
    { name: 'Kampanyalar', path: ROUTES.PROMOTIONS, icon: Tag },
    { name: 'Müşteriler', path: ROUTES.CUSTOMERS.INDEX, icon: Users },
    { name: 'Envanter', path: ROUTES.INVENTORY.INDEX, icon: Package },
    { name: 'Kategoriler', path: ROUTES.CATEGORIES, icon: FolderTree }
  ];

  let filteredNavItems = baseNavItems;
  const isOwner = activeMembership?.role === 'OWNER';
  const isEmployee = activeMembership?.role === 'EMPLOYEE';
  if (
    !isOwner &&
    activeMembership?.role === 'EMPLOYEE' &&
    !activeMembership.permissions.includes('VIEW_DASHBOARD')
  ) {
    filteredNavItems = baseNavItems.filter(
      item => item.path !== ROUTES.DASHBOARD
    );
  }

  if (
    isEmployee &&
    !activeMembership.permissions.includes('MANAGE_PROMOTIONS')
  ) {
    filteredNavItems = filteredNavItems.filter(
      item => item.path !== ROUTES.PROMOTIONS
    );
  }

  if (
    isEmployee &&
    !activeMembership.permissions.includes('MANAGE_CATEGORIES')
  ) {
    filteredNavItems = filteredNavItems.filter(
      item => item.path !== ROUTES.CATEGORIES
    );
  }

  if (activeMembership?.role === 'OWNER') {
    filteredNavItems = [
      ...filteredNavItems,
      { name: 'Şirket Ayarları', path: ROUTES.COMPANY_SETTINGS, icon: Settings }
    ];
  }

  const isSalesRoute = location.pathname === ROUTES.SALES;
  const mobilePrimaryPaths: string[] = [
    ROUTES.DASHBOARD,
    ROUTES.SALES,
    ROUTES.INVENTORY.INDEX,
    ROUTES.CUSTOMERS.INDEX
  ];
  const mobilePrimaryNavItems = filteredNavItems.filter(item =>
    mobilePrimaryPaths.includes(item.path)
  );

  const sidebarToggleButton = (
    <Button
      variant="ghost"
      isIconOnly
      aria-label={
        isCollapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'
      }
      onPress={() => setIsCollapsed(!isCollapsed)}
      className={clsx(
        'h-9 !w-9 !min-w-9 rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900',
        isCollapsed ? 'cursor-e-resize' : 'cursor-w-resize'
      )}>
      {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
    </Button>
  );

  return (
    <MobileNavigationContext.Provider
      value={{ openMobileNavigation: () => setMobileMenuOpen(true) }}>
      <div className="bg-background flex h-screen w-full flex-col overflow-hidden md:flex-row">
        {/* Desktop Sidebar */}
        <aside
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          onClick={handleCollapsedSidebarClick}
          className={clsx(
            'bg-background relative hidden flex-col border-r border-gray-200/50 transition-all duration-300 ease-in-out md:flex',
            isCollapsed ? 'w-20 cursor-e-resize items-center' : 'w-64'
          )}>
          {/* Top Section: Header & Company Switcher */}
          <div
            className={clsx(
              'flex w-full flex-col gap-3 border-b border-gray-100 p-3',
              isCollapsed && 'items-center px-2'
            )}>
            <div
              className={clsx(
                'flex w-full items-center justify-between gap-2',
                isCollapsed && 'flex-col justify-center'
              )}>
              {!isCollapsed && (
                <h1 className="ml-2.5 flex h-9 items-center gap-2.5">
                  <BrandMark />
                  <span className="flex flex-col leading-none whitespace-nowrap">
                    <span className="text-[10px] font-bold tracking-[0.18em] text-gray-400 uppercase">
                      Dijital
                    </span>
                    <span className="from-primary bg-gradient-to-r to-indigo-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
                      Stok
                    </span>
                  </span>
                </h1>
              )}

              {isCollapsed ? (
                <div className="relative h-9 w-9">
                  <div
                    aria-hidden={isSidebarHovered}
                    className={clsx(
                      'absolute inset-0 transition-all duration-200 ease-out motion-reduce:transition-none',
                      isSidebarHovered
                        ? 'pointer-events-none -translate-y-1 scale-90 opacity-0'
                        : 'translate-y-0 scale-100 opacity-100'
                    )}>
                    <div aria-label="Dijital Stok" role="img">
                      <BrandMark />
                    </div>
                  </div>
                  <div
                    className={clsx(
                      'absolute inset-0 transition-all duration-200 ease-out motion-reduce:transition-none',
                      isSidebarHovered
                        ? 'translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none translate-y-1 scale-90 opacity-0'
                    )}>
                    <SidebarTooltip label="Kenar çubuğunu genişlet">
                      {sidebarToggleButton}
                    </SidebarTooltip>
                  </div>
                </div>
              ) : (
                sidebarToggleButton
              )}
            </div>

            {/* Company Switcher Dropdown */}
            <div className="w-full">
              <CompanySwitcher
                activeCompany={activeCompany}
                memberships={switchableMemberships}
                isCollapsed={isCollapsed}
                isOnline={isOnline}
                offlineReadyCompanyIds={offlineReadyCompanyIds}
                preparingCompanyId={preparingCompanyId}
                isSwitching={isSwitching}
                onSelectionChange={handleSelectionChange}
              />
            </div>
          </div>

          {/* Middle Section: Scrollable Navigation */}
          <nav
            data-onboarding="main-navigation"
            className={clsx(
              'w-full flex-1 overflow-x-hidden overflow-y-auto p-3',
              isCollapsed
                ? 'flex flex-col items-center gap-1.5 px-2'
                : 'space-y-1.5'
            )}>
            {filteredNavItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const collapsedNavItem = (
                <Button
                  variant="ghost"
                  isIconOnly
                  aria-label={item.name}
                  className={clsx(
                    'flex h-12 !w-12 !min-w-12 items-center justify-center rounded-2xl p-3 transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'font-medium text-gray-600 hover:bg-gray-100/80'
                  )}
                  onPress={() => navigate(item.path)}>
                  <Icon className="!h-5 !w-5 flex-shrink-0" />
                </Button>
              );
              const expandedNavItem = (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center rounded-2xl transition-all duration-200',
                      'gap-3 px-4 py-2.5',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'font-medium text-gray-600 hover:bg-gray-100/80'
                    )
                  }>
                  <Icon className="flex-shrink-0 text-lg" />
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.name}
                  </span>
                </NavLink>
              );

              return (
                <React.Fragment key={item.path}>
                  {isCollapsed ? (
                    <SidebarTooltip label={item.name}>
                      {collapsedNavItem}
                    </SidebarTooltip>
                  ) : (
                    expandedNavItem
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Bottom Section: User Profile & Logout */}
          <div
            className={clsx(
              'flex w-full flex-col gap-3 border-t border-gray-100 p-3',
              isCollapsed && 'items-center px-2'
            )}>
            <div
              data-onboarding="sync-indicator"
              className={clsx(isCollapsed && 'flex justify-center')}>
              <SyncIndicator
                iconOnly={isCollapsed}
                tooltipPlacement="right"
                isPreparing={preparingCompanyId === activeCompany?.id}
                fullWidth={!isCollapsed}
              />
            </div>
            {user && (
              <Dropdown>
                <Dropdown.Trigger
                  data-onboarding="profile-menu"
                  aria-label="Kullanıcı menüsünü aç"
                  className={clsx(
                    'group focus-visible:border-primary/40 flex w-full items-center gap-3 rounded-xl border border-transparent text-left transition-all duration-200 outline-none hover:border-gray-200 hover:bg-gray-100/70 focus-visible:bg-gray-100/70',
                    isCollapsed ? 'justify-center p-1.5' : 'p-2.5'
                  )}>
                  <img
                    src={
                      user.photoURL ||
                      `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
                    }
                    alt="User avatar"
                    className={clsx(
                      isCollapsed ? 'h-8 w-8' : 'h-10 w-10',
                      'flex-shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white transition-transform duration-200 group-hover:scale-[1.03]'
                    )}
                  />
                  {!isCollapsed && (
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
                  placement={isCollapsed ? 'right' : 'top start'}
                  className="min-w-60">
                  <div className="border-b border-gray-100 px-3 py-2.5">
                    <Switch
                      size="sm"
                      isSelected={isDark}
                      onChange={isSelected =>
                        setTheme(isSelected ? 'dark' : 'light')
                      }
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
                  <Dropdown.Menu
                    aria-label="Kullanıcı menüsü"
                    onAction={handleProfileMenuAction}>
                    <Dropdown.Item
                      id="account-settings"
                      textValue="Hesap Ayarları">
                      <span className="flex items-center gap-2.5">
                        <CircleUserRound size={17} className="text-gray-500" />
                        <span>Hesap Ayarları</span>
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="plans"
                      textValue="Planlar ve Fiyatlandırma">
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
                    <Dropdown.Item
                      id="getting-started"
                      textValue="Başlangıç rehberi">
                      <span className="flex items-center gap-2.5">
                        <GraduationCap size={17} className="text-gray-500" />
                        <span>Başlangıç rehberi</span>
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="keyboard-shortcuts"
                      textValue="Klavye kısayolları">
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
                    {user?.email === PLATFORM_SUPPORT_ADMIN_EMAIL && (
                      <Dropdown.Item
                        id="support-access"
                        textValue="Destek oturumu aç">
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
                          <span className="flex-1">
                            Destek oturumunu sonlandır
                          </span>
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
            )}
            <PWAInstallButton isCollapsed={isCollapsed} />
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className={clsx(
            'relative flex-1 overflow-y-auto',
            isSalesRoute ? 'pb-0' : 'pb-20 md:pb-0'
          )}>
          {/* Mobile Header */}
          <header
            className={clsx(
              'bg-background sticky top-0 z-10 items-center justify-between border-b border-gray-200/50 p-3 md:hidden',
              isSalesRoute ? 'hidden' : 'flex'
            )}>
            <Button
              variant="ghost"
              isIconOnly
              aria-label="Menüyü aç"
              className="h-11 !w-11 !min-w-11 rounded-xl"
              onPress={() => setMobileMenuOpen(true)}>
              <Menu size={22} />
            </Button>
            <h1 className="text-primary flex min-w-0 flex-1 items-center gap-2 text-lg font-bold">
              <Store className="text-xl" />
              <span className="truncate">
                {activeCompany?.name || 'Dijital Stok'}
              </span>
            </h1>
            <div className="flex items-center">
              <SyncIndicator
                isPreparing={preparingCompanyId === activeCompany?.id}
              />
            </div>
          </header>

          <div className="h-full w-full">
            <LazyRouteErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex min-h-[400px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <Loader2 className="text-primary h-8 w-8 animate-spin" />
                      <span className="text-sm font-medium">
                        Sayfa hazırlanıyor...
                      </span>
                    </div>
                  </div>
                }>
                <Outlet />
              </Suspense>
            </LazyRouteErrorBoundary>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav
          className={clsx(
            'pb-safe fixed right-0 bottom-0 left-0 z-50 h-[calc(4.5rem+env(safe-area-inset-bottom))] items-start justify-around border-t border-gray-200/50 bg-white px-1 pt-1 md:hidden',
            isSalesRoute ? 'hidden' : 'flex'
          )}>
          {mobilePrimaryNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors',
                  isActive
                    ? 'text-primary bg-primary/5 font-semibold'
                    : 'font-medium text-gray-500 hover:text-gray-700'
                )
              }>
              <item.icon className="text-2xl" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          ))}
          {user && (
            <UserProfileMenu
              user={user}
              activeMembership={activeMembership}
              isDark={isDark}
              setTheme={setTheme}
              hasNewChangelog={hasNewChangelog}
              isCheckingForUpdate={isCheckingForUpdate}
              isPlatformSupportAdmin={
                user.email === PLATFORM_SUPPORT_ADMIN_EMAIL
              }
              onAction={handleProfileMenuAction}
              variant="mobile"
            />
          )}
        </nav>

        <Drawer isOpen={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <Drawer.Backdrop>
            <Drawer.Content placement="left">
              <Drawer.Dialog className="flex h-full w-[min(22rem,calc(100vw-1.5rem))] flex-col bg-white p-2 shadow-2xl outline-none">
                <Drawer.Header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <Drawer.Heading className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <BrandMark /> Menü
                  </Drawer.Heading>
                  <Drawer.CloseTrigger />
                </Drawer.Header>
                <Drawer.Body className="flex-1 space-y-4 overflow-y-auto p-4">
                  <CompanySwitcher
                    activeCompany={activeCompany}
                    memberships={switchableMemberships}
                    isOnline={isOnline}
                    offlineReadyCompanyIds={offlineReadyCompanyIds}
                    preparingCompanyId={preparingCompanyId}
                    isSwitching={isSwitching}
                    onSelectionChange={handleSelectionChange}
                  />

                  <nav className="space-y-1" aria-label="Uygulama menüsü">
                    {filteredNavItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            clsx(
                              'flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 hover:bg-gray-100'
                            )
                          }>
                          <Icon size={19} />
                          {item.name}
                        </NavLink>
                      );
                    })}
                  </nav>

                  {user && (
                    <section className="space-y-3 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-3 px-1">
                        <img
                          src={
                            user.photoURL ||
                            `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
                          }
                          alt="Kullanıcı avatarı"
                          className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {user.displayName || 'İsimsiz Kullanıcı'}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {activeMembership?.role === 'OWNER'
                              ? 'Şirket Sahibi'
                              : activeMembership?.jobTitle || 'Çalışan'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        isSelected={isDark}
                        onChange={isSelected =>
                          setTheme(isSelected ? 'dark' : 'light')
                        }
                        aria-label="Koyu tema">
                        <Switch.Content className="w-full justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Koyu tema
                          </span>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          className="min-h-11 justify-start"
                          onPress={() => {
                            setMobileMenuOpen(false);
                            handleProfileMenuAction('account-settings');
                          }}>
                          <CircleUserRound size={17} /> Hesap
                        </Button>
                        <Button
                          variant="secondary"
                          className="min-h-11 justify-start"
                          onPress={() => {
                            setMobileMenuOpen(false);
                            handleProfileMenuAction('support');
                          }}>
                          <LifeBuoy size={17} /> Destek
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-11 justify-start"
                          onPress={() => {
                            setMobileMenuOpen(false);
                            handleProfileMenuAction('check-for-updates');
                          }}>
                          <RefreshCw size={17} /> Güncelleme
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-11 justify-start"
                          onPress={() => {
                            setMobileMenuOpen(false);
                            handleProfileMenuAction('changelog');
                          }}>
                          <Sparkles size={17} /> Yenilikler
                        </Button>
                      </div>
                    </section>
                  )}
                </Drawer.Body>
                <Drawer.Footer className="flex flex-col gap-3 border-t border-gray-100 pt-4">
                  <SyncIndicator
                    fullWidth
                    isPreparing={preparingCompanyId === activeCompany?.id}
                  />
                  <PWAInstallButton isCollapsed={false} />
                  <Button
                    variant="danger"
                    className="min-h-11 w-full"
                    onPress={logout}>
                    <LogOut size={18} /> Çıkış yap
                  </Button>
                </Drawer.Footer>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>

        {/* New Company Modal */}
        <Modal
          isOpen={newCompanyModalOpen}
          onOpenChange={open => {
            if (!open) {
              setNewCompanyModalOpen(false);
              reset();
            }
          }}>
          <button
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-xl outline-none">
                <Modal.CloseTrigger />
                <form onSubmit={handleSubmit(handleCreateCompany)}>
                  <Modal.Header>
                    <Modal.Heading className="text-xl">
                      Yeni İşletme Kur
                    </Modal.Heading>
                  </Modal.Header>

                  <Modal.Body className="space-y-4">
                    <FormInput
                      control={control}
                      name="name"
                      label="İşletme Adı"
                      isRequired
                      type="text"
                      placeholder="Örn: Yakamos Süpermarket"
                    />

                    <FormInput
                      control={control}
                      name="receiptHeader"
                      label="Fiş Başlığı (Opsiyonel)"
                      type="text"
                      placeholder="Örn: YAKAMOS GIDA LTD. ŞTİ."
                    />

                    <PhoneInput
                      control={control}
                      name="phone"
                      label="Telefon (Opsiyonel)"
                      placeholder="555 555 55 55"
                    />

                    <FormInput
                      control={control}
                      name="address"
                      label="Adres (Opsiyonel)"
                      type="text"
                      placeholder="Örn: Kadıköy, İstanbul"
                    />
                  </Modal.Body>

                  <Modal.Footer className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      onPress={() => {
                        setNewCompanyModalOpen(false);
                        reset();
                      }}
                      isDisabled={isCreatingCompany}>
                      İptal
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1 font-bold"
                      isDisabled={isCreatingCompany}>
                      {isCreatingCompany ? (
                        <Loader2 className="mr-2 animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 className="mr-2" size={16} />
                      )}
                      Kurulumu Tamamla
                    </Button>
                  </Modal.Footer>
                </form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <KeyboardShortcutsModal
          isOpen={keyboardShortcutsOpen}
          onOpenChange={setKeyboardShortcutsOpen}
        />
        <Suspense fallback={null}>
          {location.pathname !== ROUTES.DASHBOARD && (
            <GettingStartedCard compact />
          )}
          <OnboardingExperience />
          <SupportModal
            isOpen={supportModalOpen}
            onClose={() => setSupportModalOpen(false)}
          />
          <SupportAccessModal
            isOpen={supportAccessModalOpen}
            onClose={() => setSupportAccessModalOpen(false)}
          />
        </Suspense>
      </div>
    </MobileNavigationContext.Provider>
  );
};
