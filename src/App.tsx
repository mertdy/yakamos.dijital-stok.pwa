import { useEffect, Suspense } from 'react';
import { Spinner } from '@heroui/react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './shared/layouts/MainLayout';
import { InventoryView, ProductFormView } from '@/features/inventory/routes';
import { SalesView } from '@/features/sales/routes';
import { useAuthStore } from '@/features/auth';
import {
  LoginView,
  OnboardingView,
  AccountSettingsView
} from '@/features/auth/routes';
import {
  CustomerListView,
  CustomerFormView,
  CustomerDetailView
} from '@/features/customers/routes';
import { SalesHistoryView } from '@/features/sales-history/routes';
import {
  DashboardView,
  CompanySettingsView,
  PricingPlansView
} from '@/features/dashboard/routes';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './core/firebase/config';
import { Loader2 } from 'lucide-react';

import { useInventoryStore } from '@/features/inventory';
import { useCustomerStore } from '@/features/customers';
import { useSalesHistoryStore } from '@/features/sales-history';

import { usePWAUpdate } from './shared/hooks/usePWAUpdate';
import { LazyRouteErrorBoundary } from './shared/components/LazyRouteErrorBoundary';

function App() {
  usePWAUpdate();
  const { user, profile, activeMembership, isInitialized, isLoading, setUser } =
    useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [setUser]);

  const activeCompanyId = profile?.activeCompanyId;

  useEffect(() => {
    if (activeCompanyId) {
      useInventoryStore.getState().loadItems();
      useCustomerStore.getState().loadCustomers();
      useSalesHistoryStore.getState().fetchSales();
    }
  }, [activeCompanyId]);

  useEffect(() => {
    const refreshSalesAfterReconnect = () => {
      useSalesHistoryStore.getState().fetchSales({ force: true });
    };

    window.addEventListener('online', refreshSalesAfterReconnect);
    return () => {
      window.removeEventListener('online', refreshSalesAfterReconnect);
    };
  }, []);

  if (!isInitialized || isLoading) {
    return (
      <div className="text-primary flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  const hasNoCompany = user && (!profile || !profile.activeCompanyId);
  const noCompanyRoute = '/onboarding';
  const isOwner = activeMembership?.role === 'OWNER';
  const isEmployee = activeMembership?.role === 'EMPLOYEE';
  const hasInventoryPermission =
    isOwner ||
    !isEmployee ||
    activeMembership?.permissions.includes('MANAGE_INVENTORY');
  const hasCustomerPermission =
    isOwner ||
    !isEmployee ||
    activeMembership?.permissions.includes('MANAGE_CUSTOMERS');

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50">
          <Spinner size="lg" color="accent" />
          <p className="text-sm font-medium text-gray-500">Yükleniyor...</p>
        </div>
      }>
      <Routes>
        {/* Public Route */}
        <Route
          path="/login"
          element={
            !user ? (
              <LazyRouteErrorBoundary>
                <LoginView />
              </LazyRouteErrorBoundary>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Onboarding Route */}
        <Route
          path="/onboarding"
          element={
            user ? (
              !hasNoCompany ? (
                <Navigate to="/" replace />
              ) : (
                <LazyRouteErrorBoundary>
                  <OnboardingView />
                </LazyRouteErrorBoundary>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/welcome"
          element={<Navigate to={user ? noCompanyRoute : '/login'} replace />}
        />
        <Route
          path="/account-settings"
          element={
            user && hasNoCompany ? (
              <LazyRouteErrorBoundary>
                <AccountSettingsView />
              </LazyRouteErrorBoundary>
            ) : (
              <Navigate
                to={user ? '/account-settings/app' : '/login'}
                replace
              />
            )
          }
        />

        {/* Protected Routes */}
        <Route
          element={
            user && !hasNoCompany ? (
              <MainLayout />
            ) : (
              <Navigate to={user ? noCompanyRoute : '/login'} replace />
            )
          }>
          <Route path="/" element={<DashboardView />} />
          <Route path="/sales" element={<SalesView />} />
          <Route path="/sales-history" element={<SalesHistoryView />} />
          <Route
            path="/company-settings"
            element={
              activeMembership?.role === 'OWNER' ? (
                <CompanySettingsView />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/account-settings/app"
            element={<AccountSettingsView />}
          />
          <Route
            path="/planlar-ve-fiyatlandirma"
            element={<PricingPlansView />}
          />
          <Route path="/customers" element={<CustomerListView />} />
          <Route
            path="/customers/new"
            element={
              hasCustomerPermission ? (
                <CustomerFormView />
              ) : (
                <Navigate to="/customers" replace />
              )
            }
          />
          <Route
            path="/customers/edit/:id"
            element={
              hasCustomerPermission ? (
                <CustomerFormView />
              ) : (
                <Navigate to="/customers" replace />
              )
            }
          />
          <Route
            path="/customers/details/:id"
            element={<CustomerDetailView />}
          />
          <Route path="/inventory" element={<InventoryView />} />
          <Route
            path="/inventory/new"
            element={
              hasInventoryPermission ? (
                <ProductFormView />
              ) : (
                <Navigate to="/inventory" replace />
              )
            }
          />
          <Route
            path="/inventory/edit/:id"
            element={
              hasInventoryPermission ? (
                <ProductFormView />
              ) : (
                <Navigate to="/inventory" replace />
              )
            }
          />
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            <Navigate
              to={user ? (hasNoCompany ? noCompanyRoute : '/') : '/login'}
              replace
            />
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
