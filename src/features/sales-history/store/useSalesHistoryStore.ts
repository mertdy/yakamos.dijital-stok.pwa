import { create } from 'zustand';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  writeBatch,
  getDoc,
  where,
  increment
} from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { toast } from '@heroui/react';
import type { CartItem } from '@/features/sales';
import posthog from 'posthog-js';

export interface SaleTransaction {
  id: string;
  userId: string;
  companyId: string;
  invoiceNumber: string;
  customerId: string | null;
  subtotal: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  totalAmount: number;
  paymentMethod: string;
  cart: CartItem[];
  createdAt: string;
  status?: 'completed' | 'cancelled';
}

export interface SalesHistoryFilter {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
}

interface SalesHistoryState {
  sales: SaleTransaction[];
  isLoading: boolean;
  filters: SalesHistoryFilter;

  fetchSales: () => Promise<void>;
  setFilters: (filters: Partial<SalesHistoryFilter>) => void;
  clearFilters: () => void;
  cancelSale: (saleId: string) => Promise<boolean>;
  clearSales: () => void;
}

export const useSalesHistoryStore = create<SalesHistoryState>((set, get) => ({
  sales: [],
  isLoading: false,
  filters: {},

  setFilters: newFilters => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }));
    get().fetchSales();
  },

  clearFilters: () => {
    set({ filters: {} });
    get().fetchSales();
  },

  fetchSales: async () => {
    const user = auth.currentUser;
    if (!user) return;

    const profile = useAuthStore.getState().profile;
    const activeMembership = useAuthStore.getState().activeMembership;
    if (!profile?.activeCompanyId) return;

    set({ isLoading: true });
    try {
      const salesRef = collection(db, 'sales');
      // Query sales for current company
      const q = query(
        salesRef,
        where('companyId', '==', profile.activeCompanyId),
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(q);
      let fetchedSales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SaleTransaction[];

      // Filter by cashier if cashier role and lacks VIEW_SALES_HISTORY permission
      const isOwner = activeMembership?.role === 'OWNER';
      if (
        !isOwner &&
        activeMembership?.role === 'EMPLOYEE' &&
        !activeMembership.permissions.includes('VIEW_SALES_HISTORY')
      ) {
        fetchedSales = fetchedSales.filter(s => s.userId === user.uid);
      }

      const { filters } = get();

      if (filters.searchQuery) {
        const queryLower = filters.searchQuery.toLowerCase();
        fetchedSales = fetchedSales.filter(s =>
          s.invoiceNumber?.toLowerCase().includes(queryLower)
        );
      }

      if (filters.customerId) {
        fetchedSales = fetchedSales.filter(
          s => s.customerId === filters.customerId
        );
      }

      if (filters.paymentMethod) {
        fetchedSales = fetchedSales.filter(
          s => s.paymentMethod === filters.paymentMethod
        );
      }

      if (filters.minAmount !== undefined && !isNaN(filters.minAmount)) {
        fetchedSales = fetchedSales.filter(
          s => s.totalAmount >= filters.minAmount!
        );
      }

      if (filters.maxAmount !== undefined && !isNaN(filters.maxAmount)) {
        fetchedSales = fetchedSales.filter(
          s => s.totalAmount <= filters.maxAmount!
        );
      }

      if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        fetchedSales = fetchedSales.filter(
          s => new Date(s.createdAt).getTime() >= start
        );
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate).getTime();
        fetchedSales = fetchedSales.filter(
          s => new Date(s.createdAt).getTime() <= end
        );
      }

      set({ sales: fetchedSales });
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.danger('Satış geçmişi yüklenirken bir hata oluştu');
    } finally {
      set({ isLoading: false });
    }
  },

  cancelSale: async saleId => {
    try {
      const sale = get().sales.find(s => s.id === saleId);
      if (!sale) throw new Error('Satış bulunamadı');
      if (sale.status === 'cancelled')
        throw new Error('Satış zaten iptal edilmiş');

      const batch = writeBatch(db);

      // 1. Mark sale as cancelled
      const saleRef = doc(db, 'sales', saleId);
      batch.update(saleRef, { status: 'cancelled' });

      // 2. Restore inventory stock
      for (const item of sale.cart) {
        const productRef = doc(db, 'inventory', item.inventoryId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          batch.update(productRef, { stock: currentStock + item.quantity });
        }
      }

      // 3. Revert customer debt if it was a credit sale
      if (sale.paymentMethod === 'Credit' && sale.customerId) {
        const customerRef = doc(db, 'customers', sale.customerId);
        batch.update(customerRef, { totalDebt: increment(-sale.totalAmount) });
      }

      await batch.commit();

      posthog.capture('sale_cancelled', {
        sale_id: saleId,
        invoice_number: sale.invoiceNumber,
        total_amount: sale.totalAmount,
        payment_method: sale.paymentMethod,
        item_count: sale.cart.reduce((sum, item) => sum + item.quantity, 0),
        has_customer: Boolean(sale.customerId)
      });

      set(state => ({
        sales: state.sales.map(s =>
          s.id === saleId ? { ...s, status: 'cancelled' } : s
        )
      }));

      toast.success('Satış başarıyla iptal edildi ve stoklar güncellendi');
      return true;
    } catch (error: any) {
      console.error('Cancel sale error:', error);
      posthog.captureException(error, {
        context: 'sale_cancel',
        sale_id: saleId
      });
      toast.danger(error.message || 'Satış iptal edilirken bir hata oluştu');
      return false;
    }
  },

  clearSales: () => {
    set({ sales: [], filters: {} });
  }
}));
