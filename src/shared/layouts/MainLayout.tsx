import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { SyncIndicator } from '../components/SyncIndicator';
import {
  Store,
  MonitorCheck,
  Package,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard
} from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { Button } from '@heroui/react';

const navItems = [
  { name: 'Anasayfa', path: '/', icon: LayoutDashboard },
  { name: 'Satış', path: '/sales', icon: MonitorCheck },
  { name: 'Satış Geçmişi', path: '/sales-history', icon: History },
  { name: 'Müşteriler', path: '/customers', icon: Users },
  { name: 'Envanter', path: '/inventory', icon: Package }
];

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto collapse on sales screen
  useEffect(() => {
    if (location.pathname === '/sales') {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [location.pathname]);

  return (
    <div className="bg-background flex h-screen w-full flex-col overflow-hidden md:flex-row">
      {/* Desktop Sidebar */}
      <aside
        className={`bg-background relative hidden flex-col border-r border-gray-200/50 transition-all duration-300 ease-in-out md:flex ${
          isCollapsed ? 'w-20 items-center' : 'w-64'
        }`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hover:text-primary hover:border-primary absolute top-6 -right-3 z-50 rounded-full border border-gray-200 bg-white p-1 text-gray-500 shadow-sm transition-colors">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div
          className={`flex w-full flex-col gap-4 border-b border-gray-100 p-6 ${isCollapsed ? 'items-center px-2' : ''}`}>
          <h1
            className={`text-primary flex items-center gap-2 text-xl font-bold ${isCollapsed ? 'justify-center' : ''}`}>
            <Store className="flex-shrink-0 text-2xl" />
            {!isCollapsed && (
              <span className="whitespace-nowrap">Dijital Stok</span>
            )}
          </h1>

          {!isCollapsed ? (
            <SyncIndicator />
          ) : (
            <div
              className="h-2 w-2 rounded-full bg-green-500 shadow-sm"
              aria-label="Senkronize"
            />
          )}

          {/* User Profile Card */}
          {user && (
            <div
              className={`mt-2 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 ${isCollapsed ? 'justify-center p-1.5' : 'p-3'}`}>
              <img
                src={
                  user.photoURL ||
                  `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
                }
                alt="User avatar"
                className={`${isCollapsed ? 'h-8 w-8' : 'h-10 w-10'} flex-shrink-0 rounded-full object-cover shadow-sm transition-all`}
              />
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-semibold text-gray-900">
                    {user.displayName || 'İsimsiz Kullanıcı'}
                  </span>
                  <span className="truncate text-xs text-gray-500">
                    {user.email}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <nav
          className={`mt-4 w-full flex-1 space-y-2 px-4 ${isCollapsed ? 'px-2' : ''}`}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-2xl transition-all duration-200 ${
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-5 py-3'
                } ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'font-medium text-gray-600 hover:bg-gray-100/80'
                }`
              }>
              <item.icon className="flex-shrink-0 text-xl" />
              {!isCollapsed && (
                <span className="font-medium whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div
          className={`w-full border-t border-gray-100 p-4 ${isCollapsed ? 'px-2' : ''}`}>
          <Button
            variant="ghost"
            aria-label={isCollapsed ? 'Çıkış Yap' : undefined}
            className={`text-danger hover:text-danger hover:bg-danger/10 w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            onPress={logout}>
            <LogOut className={isCollapsed ? '' : 'mr-2'} size={20} />
            {!isCollapsed && <span>Çıkış Yap</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Mobile Header */}
        <header className="bg-background sticky top-0 z-10 flex items-center justify-between border-b border-gray-200/50 p-4 md:hidden">
          <h1 className="text-primary flex items-center gap-2 text-lg font-bold">
            <Store className="text-xl" />
            Dijital Stok
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
        {navItems.map(item => (
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
    </div>
  );
};
