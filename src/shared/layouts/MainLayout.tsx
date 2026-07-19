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
import { useSalesStore } from '@/features/sales';
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
  ChevronDown,
  Building2,
  WifiOff,
  Plus,
  Loader2,
  CheckCircle2,
  CloudCheck,
  ChevronRight,
  CreditCard,
  CircleUserRound,
  LifeBuoy,
  ExternalLink,
  Moon,
  Sun,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import {
  Button,
  Dropdown,
  Header,
  Label,
  Modal,
  Spinner,
  Tooltip,
  toast,
  Switch
} from '@heroui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormInput } from '@/shared/components/FormInput';
import { PhoneInput } from '@/shared/components/PhoneInput';
import {
  normalizePhoneNumber,
  optionalPhoneNumberSchema
} from '@/shared/utils/phoneNumber';
import {
  getOfflineReadyCompanyIds,
  prepareCompanyForOffline
} from '@/shared/utils/offlineCompanyCache';

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

export const MainLayout: React.FC = () => {
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
  const { cart, clearCart } = useSalesStore();
  const { confirm } = useConfirm();
  const logout = useSecureLogout();
  const { isDark, setTheme } = useThemeMode();
  const hasNewChangelog = hasUnseenChangelog();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [newCompanyModalOpen, setNewCompanyModalOpen] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineReadyCompanyIds, setOfflineReadyCompanyIds] = useState(() =>
    getOfflineReadyCompanyIds(user?.uid)
  );
  const [preparingCompanyId, setPreparingCompanyId] = useState<string | null>(
    null
  );

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
    if (key === 'account-settings') {
      navigate(ROUTES.ACCOUNT_SETTINGS);
    }

    if (key === 'plans') {
      navigate(ROUTES.PRICING_PLANS);
    }

    if (key === 'changelog') {
      navigate(ROUTES.CHANGELOG);
    }

    if (key === 'support') {
      window.open(
        'https://example.com/destek',
        '_blank',
        'noopener,noreferrer'
      );
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

  const companySwitcherButton = (
    <Button
      variant="ghost"
      aria-label="İşletme Seç"
      className={clsx(
        'flex w-full items-center justify-between rounded-2xl font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100/80',
        isCollapsed
          ? 'mx-auto h-12 !w-12 !min-w-12 justify-center rounded-2xl p-3'
          : 'h-11 gap-3 px-4 py-2.5'
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
    </Button>
  );

  const logoutButton = (
    <Button
      variant="ghost"
      aria-label="Çıkış Yap"
      className={clsx(
        'text-danger hover:bg-danger/10 w-full font-semibold',
        isCollapsed
          ? 'h-12 !w-12 !min-w-12 justify-center rounded-2xl p-3'
          : 'h-11 justify-start gap-3 rounded-2xl px-4 py-2.5'
      )}
      onPress={logout}>
      <LogOut size={18} className="text-danger flex-shrink-0" />
      {!isCollapsed && <span className="text-sm">Çıkış Yap</span>}
    </Button>
  );

  return (
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
            <Dropdown>
              {isCollapsed ? (
                <SidebarTooltip label={activeCompany?.name || 'İşletme seç'}>
                  {companySwitcherButton}
                </SidebarTooltip>
              ) : (
                companySwitcherButton
              )}
              <Dropdown.Popover className="min-w-[240px]">
                <Dropdown.Menu
                  aria-label="İşletme Geçişleri"
                  selectedKeys={
                    activeCompany?.id ? new Set([activeCompany.id]) : new Set()
                  }
                  selectionMode="single"
                  onSelectionChange={handleSelectionChange}>
                  {!isOnline && (
                    <Dropdown.Item
                      id="offline-status"
                      textValue="Çevrim dışı durum bilgisi"
                      isDisabled>
                      <div className="flex items-start gap-2 py-1 text-xs leading-4 text-amber-700">
                        <WifiOff size={15} className="mt-0.5 flex-shrink-0" />
                        <span>
                          Çevrim dışısınız. Yalnızca bu cihazda hazır olan
                          işletmelere geçebilirsiniz.
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
                    {memberships.map(m => (
                      <Dropdown.Item
                        id={m.companyId}
                        key={m.companyId}
                        textValue={m.companyName}
                        isDisabled={
                          isSwitching ||
                          (!isOnline &&
                            !offlineReadyCompanyIds.includes(m.companyId))
                        }
                        className={clsx(
                          m.companyId === activeCompany?.id &&
                            'text-primary bg-primary/5 font-bold'
                        )}>
                        <div className="flex w-full items-center gap-2">
                          <Building2 size={16} />
                          <Label>{m.companyName}</Label>
                          <span className="ml-auto flex items-center text-xs">
                            {preparingCompanyId === m.companyId ? (
                              <Spinner
                                size="sm"
                                color="current"
                                className="text-primary size-[15px]"
                                aria-label="Çevrim dışı kullanım için hazırlanıyor"
                              />
                            ) : offlineReadyCompanyIds.includes(m.companyId) ? (
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
          </div>
        </div>

        {/* Middle Section: Scrollable Navigation */}
        <nav
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
          <div className={clsx(isCollapsed && 'flex justify-center')}>
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
                        <span className="text-sm font-medium text-gray-700">
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
                  <Dropdown.Item id="support" textValue="Destek">
                    <span className="flex w-full items-center gap-2.5">
                      <LifeBuoy size={17} className="text-gray-500" />
                      <span className="flex-1">Destek</span>
                      <ExternalLink size={14} className="text-gray-400" />
                    </span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
          <PWAInstallButton isCollapsed={isCollapsed} />
          {isCollapsed ? (
            <SidebarTooltip label="Çıkış yap">{logoutButton}</SidebarTooltip>
          ) : (
            logoutButton
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Mobile Header */}
        <header className="bg-background sticky top-0 z-10 flex items-center justify-between border-b border-gray-200/50 p-4 md:hidden">
          <h1 className="text-primary flex items-center gap-2 text-lg font-bold">
            <Store className="text-xl" />
            {activeCompany?.name || 'Dijital Stok'}
          </h1>
          <div className="flex items-center gap-3">
            <SyncIndicator
              isPreparing={preparingCompanyId === activeCompany?.id}
            />
            {user && (
              <img
                src={
                  user.photoURL ||
                  `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
                }
                alt="User avatar"
                className="h-8 w-8 rounded-full border border-gray-200 object-cover shadow-sm"
              />
            )}
            <Button
              variant="ghost"
              isIconOnly
              className="text-danger"
              onPress={logout}>
              <LogOut size={20} />
            </Button>
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
      <nav className="pb-safe fixed right-0 bottom-0 left-0 z-50 flex h-16 items-center justify-around border-t border-gray-200/50 bg-white px-2 md:hidden">
        {filteredNavItems
          .filter(item => item.path !== ROUTES.COMPANY_SETTINGS)
          .map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex h-full w-full flex-col items-center justify-center space-y-1 transition-colors ${
                  isActive
                    ? 'text-primary font-semibold'
                    : 'font-medium text-gray-500 hover:text-gray-700'
                }`
              }>
              <item.icon className="text-2xl" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          ))}
      </nav>

      {/* New Company Modal */}
      <Modal
        isOpen={newCompanyModalOpen}
        onOpenChange={open => {
          if (!open) {
            setNewCompanyModalOpen(false);
            reset();
          }
        }}>
        <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
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

                <Modal.Footer className="flex gap-3 pt-6">
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
    </div>
  );
};
