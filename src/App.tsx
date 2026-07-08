import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './shared/layouts/MainLayout';
import { InventoryView } from './features/inventory/views/InventoryView';
import { SalesView } from './features/sales/views/SalesView';
import { LoginView } from './features/auth/views/LoginView';
import { CustomerListView } from './features/customers/views/CustomerListView';
import { CustomerFormView } from './features/customers/views/CustomerFormView';
import { CustomerDetailView } from './features/customers/views/CustomerDetailView';
import { ProductFormView } from './features/inventory/views/ProductFormView';
import { SalesHistoryView } from './features/sales-history/views/SalesHistoryView';
import { DashboardView } from './features/dashboard/views/DashboardView';
import { useAuthStore } from './features/auth/store/useAuthStore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './core/firebase/config';
import { Loader2 } from 'lucide-react';

function App() {
  const { user, isInitialized, setUser } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [setUser]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-primary">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Route */}
      <Route 
        path="/login" 
        element={!user ? <LoginView /> : <Navigate to="/" replace />} 
      />

      {/* Protected Routes */}
      <Route 
        element={user ? <MainLayout /> : <Navigate to="/login" replace />}
      >
        <Route path="/" element={<DashboardView />} />
        <Route path="/sales" element={<SalesView />} />
        <Route path="/sales-history" element={<SalesHistoryView />} />
        <Route path="/customers" element={<CustomerListView />} />
        <Route path="/customers/new" element={<CustomerFormView />} />
        <Route path="/customers/edit/:id" element={<CustomerFormView />} />
        <Route path="/customers/details/:id" element={<CustomerDetailView />} />
        <Route path="/inventory" element={<InventoryView />} />
        <Route path="/inventory/new" element={<ProductFormView />} />
        <Route path="/inventory/edit/:id" element={<ProductFormView />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
