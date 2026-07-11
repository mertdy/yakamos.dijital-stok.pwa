import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './shared/layouts/MainLayout';
import { InventoryView, ProductFormView } from '@/features/inventory';
import { SalesView } from '@/features/sales';
import {
  LoginView,
  OnboardingView,
  AccountSettingsView,
  useAuthStore
} from '@/features/auth';
import {
  CustomerListView,
  CustomerFormView,
  CustomerDetailView
} from '@/features/customers';
import { SalesHistoryView } from '@/features/sales-history';
import { DashboardView, CompanySettingsView } from '@/features/dashboard';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './core/firebase/config';
import { Loader2 } from 'lucide-react';

import { useInventoryStore } from '@/features/inventory';
import { useCustomerStore } from '@/features/customers';
import { useSalesHistoryStore } from '@/features/sales-history';

function App() {
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

  return (
    <Routes>
      {/* Public Route */}
      <Route
        path="/login"
        element={!user ? <LoginView /> : <Navigate to="/" replace />}
      />

      {/* Onboarding Route */}
      <Route
        path="/onboarding"
        element={
          user ? (
            !hasNoCompany ? (
              <Navigate to="/" replace />
            ) : (
              <OnboardingView />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Protected Routes */}
      <Route
        element={
          user && !hasNoCompany ? (
            <MainLayout />
          ) : (
            <Navigate to={user ? '/onboarding' : '/login'} replace />
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
        <Route path="/account-settings" element={<AccountSettingsView />} />
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
        <Route path="/customers/details/:id" element={<CustomerDetailView />} />
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
            to={user ? (hasNoCompany ? '/onboarding' : '/') : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;
