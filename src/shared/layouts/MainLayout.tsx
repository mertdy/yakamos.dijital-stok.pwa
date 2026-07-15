import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SyncIndicator } from '@/shared/components/SyncIndicator';
import { useAppHotkeys } from '@/shared/hooks/useAppHotkeys';
import {
  Store,
  MonitorCheck,
  Package,
  Users,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Building2,
  Plus,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import {
  Button,
  Dropdown,
  Header,
  Label,
  Modal,
  toast,
  Tooltip
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

export const MainLayout: React.FC = () => {
  useAppHotkeys();
  const {
    user,
    activeMembership,
    activeCompany,
    memberships,
    switchCompany,
    createCompany,
    logout
  } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [newCompanyModalOpen, setNewCompanyModalOpen] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

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
    if (location.pathname === '/sales') {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [location.pathname]);

  // Redirect if employee lacks dashboard view permission
  useEffect(() => {
    const isOwner = activeMembership?.role === 'OWNER';
    if (
      location.pathname === '/' &&
      !isOwner &&
      activeMembership?.role === 'EMPLOYEE' &&
      !activeMembership.permissions.includes('VIEW_DASHBOARD')
    ) {
      navigate('/sales');
    }
  }, [location.pathname, activeMembership, navigate]);

  const handleSwitchCompany = async (companyId: string) => {
    setIsSwitching(true);
    try {
      await switchCompany(companyId);
      toast.success('İşletme değiştirildi');
    } catch (err) {
      console.error(err);
      toast.danger('İşletme değiştirilirken bir hata oluştu');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSelectionChange = (keys: any) => {
    const selectedKey = Array.from(keys)[0]?.toString();
    if (selectedKey) {
      if (selectedKey === 'new-company') {
        setNewCompanyModalOpen(true);
      } else {
        handleSwitchCompany(selectedKey);
      }
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

  const baseNavItems = [
    { name: 'Anasayfa', path: '/', icon: LayoutDashboard },
    { name: 'Satış', path: '/sales', icon: MonitorCheck },
    { name: 'Satış Geçmişi', path: '/sales-history', icon: History },
    { name: 'Müşteriler', path: '/customers', icon: Users },
    { name: 'Envanter', path: '/inventory', icon: Package }
  ];

  let filteredNavItems = baseNavItems;
  const isOwner = activeMembership?.role === 'OWNER';
  if (
    !isOwner &&
    activeMembership?.role === 'EMPLOYEE' &&
    !activeMembership.permissions.includes('VIEW_DASHBOARD')
  ) {
    filteredNavItems = baseNavItems.filter(item => item.path !== '/');
  }

  if (activeMembership?.role === 'OWNER') {
    filteredNavItems = [
      ...filteredNavItems,
      { name: 'Şirket Ayarları', path: '/company-settings', icon: Settings }
    ];
  }

  filteredNavItems = [
    ...filteredNavItems,
    { name: 'Hesap Ayarları', path: '/account-settings', icon: User }
  ];

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
            'flex w-full flex-col gap-3 border-b border-gray-100 p-4',
            isCollapsed && 'items-center px-2'
          )}>
          <div
            className={clsx(
              'flex w-full items-center justify-between gap-2',
              isCollapsed && 'flex-col justify-center'
            )}>
            {!isCollapsed && (
              <h1 className="text-primary flex items-center gap-2 text-lg font-bold">
                <Store className="flex-shrink-0 text-xl" />
                <span className="whitespace-nowrap">Dijital Stok</span>
              </h1>
            )}

            {isCollapsed && !isSidebarHovered ? (
              <Store className="text-primary flex-shrink-0 text-xl" />
            ) : (
              <Tooltip delay={0} closeDelay={0}>
                <Tooltip.Trigger>
                  <button
                    type="button"
                    aria-label={
                      isCollapsed
                        ? 'Kenar çubuğunu genişlet'
                        : 'Kenar çubuğunu daralt'
                    }
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={clsx(
                      'flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900',
                      isCollapsed ? 'cursor-e-resize' : 'cursor-w-resize'
                    )}>
                    {isCollapsed ? (
                      <PanelLeftOpen size={18} />
                    ) : (
                      <PanelLeftClose size={18} />
                    )}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content showArrow>
                  <Tooltip.Arrow />
                  <span className="px-1 py-0.5 text-xs font-medium">
                    {isCollapsed
                      ? 'Kenar çubuğunu genişlet'
                      : 'Kenar çubuğunu daralt'}
                  </span>
                </Tooltip.Content>
              </Tooltip>
            )}
          </div>

          {/* Company Switcher Dropdown */}
          <div className="w-full">
            <Dropdown>
              <Button
                variant="ghost"
                aria-label="İşletme Seç"
                className={clsx(
                  'flex w-full items-center justify-between rounded-2xl font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100/80',
                  isCollapsed
                    ? 'h-11 min-w-0 justify-center p-3'
                    : 'h-11 gap-3 px-4 py-2.5'
                )}
                isDisabled={isSwitching}>
                <div className="flex min-w-0 items-center gap-3">
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
              <Dropdown.Popover className="min-w-[240px]">
                <Dropdown.Menu
                  aria-label="İşletme Geçişleri"
                  selectedKeys={
                    activeCompany?.id ? new Set([activeCompany.id]) : new Set()
                  }
                  selectionMode="single"
                  onSelectionChange={handleSelectionChange}>
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
                      İşletmelerim
                    </Header>
                    {memberships.map(m => (
                      <Dropdown.Item
                        id={m.companyId}
                        key={m.companyId}
                        textValue={m.companyName}
                        className={clsx(
                          m.companyId === activeCompany?.id &&
                            'text-primary bg-primary/5 font-bold'
                        )}>
                        <div className="flex items-center gap-2">
                          <Building2 size={16} />
                          <Label>{m.companyName}</Label>
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
            'w-full flex-1 space-y-1.5 overflow-y-auto px-4 py-4',
            isCollapsed && 'px-2'
          )}>
          {filteredNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-2xl transition-all duration-200',
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'font-medium text-gray-600 hover:bg-gray-100/80'
                )
              }>
              <item.icon className="flex-shrink-0 text-lg" />
              {!isCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section: User Profile & Logout */}
        <div
          className={clsx(
            'flex w-full flex-col gap-3 border-t border-gray-100 p-4',
            isCollapsed && 'items-center px-2'
          )}>
          <div className={clsx(isCollapsed && 'flex justify-center')}>
            <SyncIndicator iconOnly={isCollapsed} />
          </div>
          {user && (
            <div
              className={clsx(
                'flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50',
                isCollapsed ? 'justify-center p-1.5' : 'w-full p-3'
              )}>
              <img
                src={
                  user.photoURL ||
                  `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
                }
                alt="User avatar"
                className={clsx(
                  isCollapsed ? 'h-8 w-8' : 'h-10 w-10',
                  'flex-shrink-0 rounded-full object-cover shadow-sm transition-all'
                )}
              />
              {!isCollapsed && (
                <div className="flex min-w-0 flex-col overflow-hidden">
                  <span className="truncate text-sm leading-tight font-semibold text-gray-900">
                    {user.displayName || 'İsimsiz Kullanıcı'}
                  </span>
                  <span className="mt-0.5 truncate text-xs leading-normal text-gray-500">
                    {activeMembership?.role === 'OWNER'
                      ? 'Şirket Sahibi'
                      : 'Çalışan'}
                  </span>
                </div>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            aria-label="Çıkış Yap"
            className={clsx(
              'text-danger hover:bg-danger/10 w-full font-semibold',
              isCollapsed
                ? 'h-10 justify-center px-0'
                : 'h-11 justify-start gap-3 rounded-2xl px-4 py-2.5'
            )}
            onPress={logout}>
            <LogOut size={18} className="text-danger flex-shrink-0" />
            {!isCollapsed && <span className="text-sm">Çıkış Yap</span>}
          </Button>
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
            <SyncIndicator />
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

        <div className="mx-auto h-full w-full max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="pb-safe fixed right-0 bottom-0 left-0 z-50 flex h-16 items-center justify-around border-t border-gray-200/50 bg-white px-2 md:hidden">
        {filteredNavItems
          .filter(item => item.path !== '/company-settings')
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
