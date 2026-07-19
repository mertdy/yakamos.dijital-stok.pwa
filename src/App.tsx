import { useEffect, Suspense } from 'react';
import { Spinner } from '@heroui/react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './shared/layouts/MainLayout';
import {
  InventoryView,
  ProductFormView,
  CategoryManagementView
} from '@/features/inventory/routes';
import { SalesView } from '@/features/sales/routes';
import { useAuthStore } from '@/features/auth';
import {
  LoginView,
  OnboardingView,
  AccountSettingsView,
  ChangelogView
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
import { useCategoryStore } from '@/features/inventory/store/useCategoryStore';
import { useCustomerStore } from '@/features/customers';
import { useSalesHistoryStore } from '@/features/sales-history';

import { usePWAUpdate } from './shared/hooks/usePWAUpdate';
import { LazyRouteErrorBoundary } from './shared/components/LazyRouteErrorBoundary';
import { ROUTES } from '@/core/config/routes';
import { listenForRemoteLogout } from '@/shared/utils/sessionCleanup';
import { resumePendingSyncOperationTracking } from '@/shared/utils/pendingSyncOperations';

function App() {
  usePWAUpdate();
  const { user, profile, activeMembership, isInitialized, isLoading, setUser } =
    useAuthStore();

  useEffect(() => {
    resumePendingSyncOperationTracking();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(
    () =>
      listenForRemoteLogout(async () => {
        await useAuthStore.getState().logout({
          notifyTabs: false,
          clearPersistence: false,
          releaseClient: true
        });
        window.location.replace(ROUTES.LOGIN);
      }),
    []
  );

  const activeCompanyId = profile?.activeCompanyId;

  useEffect(() => {
    if (activeCompanyId) {
      useInventoryStore.getState().loadItems();
      useCategoryStore.getState().loadCategories();
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
  const hasCategoryPermission =
    isOwner ||
    !isEmployee ||
    activeMembership?.permissions.includes('MANAGE_CATEGORIES');

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
          path={ROUTES.LOGIN}
          element={
            !user ? (
              <LazyRouteErrorBoundary>
                <LoginView />
              </LazyRouteErrorBoundary>
            ) : (
              <Navigate to={ROUTES.DASHBOARD} replace />
            )
          }
        />

        {/* Onboarding Route */}
        <Route
          path={ROUTES.ONBOARDING}
          element={
            user ? (
              !hasNoCompany ? (
                <Navigate to={ROUTES.DASHBOARD} replace />
              ) : (
                <LazyRouteErrorBoundary>
                  <OnboardingView />
                </LazyRouteErrorBoundary>
              )
            ) : (
              <Navigate to={ROUTES.LOGIN} replace />
            )
          }
        />
        <Route
          path="/welcome"
          element={
            <Navigate to={user ? ROUTES.ONBOARDING : ROUTES.LOGIN} replace />
          }
        />

        {/* Protected Routes */}
        <Route
          element={
            user && !hasNoCompany ? (
              <MainLayout />
            ) : (
              <Navigate to={user ? ROUTES.ONBOARDING : ROUTES.LOGIN} replace />
            )
          }>
          <Route path={ROUTES.DASHBOARD} element={<DashboardView />} />
          <Route path={ROUTES.SALES} element={<SalesView />} />
          <Route path={ROUTES.SALES_HISTORY} element={<SalesHistoryView />} />
          <Route
            path={ROUTES.COMPANY_SETTINGS}
            element={
              activeMembership?.role === 'OWNER' ? (
                <CompanySettingsView />
              ) : (
                <Navigate to={ROUTES.DASHBOARD} replace />
              )
            }
          />
          <Route
            path={ROUTES.ACCOUNT_SETTINGS}
            element={<AccountSettingsView />}
          />
          <Route path={ROUTES.CHANGELOG} element={<ChangelogView />} />
          <Route path={ROUTES.PRICING_PLANS} element={<PricingPlansView />} />
          <Route path={ROUTES.CUSTOMERS.INDEX} element={<CustomerListView />} />
          <Route
            path={ROUTES.CUSTOMERS.NEW}
            element={
              hasCustomerPermission ? (
                <CustomerFormView />
              ) : (
                <Navigate to={ROUTES.CUSTOMERS.INDEX} replace />
              )
            }
          />
          <Route
            path={ROUTES.CUSTOMERS.EDIT_ROUTE}
            element={
              hasCustomerPermission ? (
                <CustomerFormView />
              ) : (
                <Navigate to={ROUTES.CUSTOMERS.INDEX} replace />
              )
            }
          />
          <Route
            path={ROUTES.CUSTOMERS.DETAILS_ROUTE}
            element={<CustomerDetailView />}
          />
          <Route path={ROUTES.INVENTORY.INDEX} element={<InventoryView />} />
          <Route
            path={ROUTES.CATEGORIES}
            element={
              hasCategoryPermission ? (
                <CategoryManagementView />
              ) : (
                <Navigate to={ROUTES.INVENTORY.INDEX} replace />
              )
            }
          />
          <Route
            path={ROUTES.INVENTORY.NEW}
            element={
              hasInventoryPermission ? (
                <ProductFormView />
              ) : (
                <Navigate to={ROUTES.INVENTORY.INDEX} replace />
              )
            }
          />
          <Route
            path={ROUTES.INVENTORY.EDIT_ROUTE}
            element={
              hasInventoryPermission ? (
                <ProductFormView />
              ) : (
                <Navigate to={ROUTES.INVENTORY.INDEX} replace />
              )
            }
          />
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                user
                  ? hasNoCompany
                    ? ROUTES.ONBOARDING
                    : ROUTES.DASHBOARD
                  : ROUTES.LOGIN
              }
              replace
            />
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
