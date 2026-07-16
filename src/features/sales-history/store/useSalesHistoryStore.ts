import { create } from 'zustand';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
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
  rawSales: SaleTransaction[];
  isLoading: boolean;
  loadedCompanyId: string | null;
  loadingCompanyId: string | null;
  filters: SalesHistoryFilter;

  fetchSales: (options?: { force?: boolean }) => Promise<void>;
  setFilters: (filters: Partial<SalesHistoryFilter>) => void;
  clearFilters: () => void;
  cancelSale: (saleId: string) => Promise<boolean>;
  clearSales: () => void;
}

const filterSales = (sales: SaleTransaction[], filters: SalesHistoryFilter) => {
  let filteredSales = sales;

  if (filters.searchQuery) {
    const queryLower = filters.searchQuery.toLowerCase();
    filteredSales = filteredSales.filter(sale =>
      sale.invoiceNumber?.toLowerCase().includes(queryLower)
    );
  }

  if (filters.customerId) {
    filteredSales = filteredSales.filter(
      sale => sale.customerId === filters.customerId
    );
  }

  if (filters.paymentMethod) {
    filteredSales = filteredSales.filter(
      sale => sale.paymentMethod === filters.paymentMethod
    );
  }

  if (filters.minAmount !== undefined && !isNaN(filters.minAmount)) {
    filteredSales = filteredSales.filter(
      sale => sale.totalAmount >= filters.minAmount!
    );
  }

  if (filters.maxAmount !== undefined && !isNaN(filters.maxAmount)) {
    filteredSales = filteredSales.filter(
      sale => sale.totalAmount <= filters.maxAmount!
    );
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    filteredSales = filteredSales.filter(
      sale => new Date(sale.createdAt).getTime() >= start
    );
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    filteredSales = filteredSales.filter(
      sale => new Date(sale.createdAt).getTime() <= end
    );
  }

  return filteredSales;
};

const inFlightSalesRequests = new Map<string, Promise<void>>();
let salesRequestVersion = 0;

export const useSalesHistoryStore = getSingletonStore('sales-history', () =>
  create<SalesHistoryState>((set, get) => ({
    sales: [],
    rawSales: [],
    isLoading: false,
    loadedCompanyId: null,
    loadingCompanyId: null,
    filters: {},

    setFilters: newFilters => {
      const filters = { ...get().filters, ...newFilters };
      set({ filters, sales: filterSales(get().rawSales, filters) });
    },

    clearFilters: () => {
      set({ filters: {}, sales: get().rawSales });
    },

    fetchSales: async ({ force = false } = {}) => {
      const user = auth.currentUser;
      if (!user) return;

      const profile = useAuthStore.getState().profile;
      const activeMembership = useAuthStore.getState().activeMembership;
      const companyId = profile?.activeCompanyId;
      if (!companyId) return;

      const state = get();
      if (!force && state.loadedCompanyId === companyId) return;

      const existingRequest = inFlightSalesRequests.get(companyId);
      if (!force && existingRequest) return existingRequest;

      const requestVersion = ++salesRequestVersion;
      const request = (async () => {
        set({
          sales: state.loadedCompanyId === companyId ? state.sales : [],
          rawSales: state.loadedCompanyId === companyId ? state.rawSales : [],
          isLoading: true,
          loadedCompanyId:
            state.loadedCompanyId === companyId ? companyId : null,
          loadingCompanyId: companyId
        });

        try {
          const salesRef = collection(db, 'sales');
          const q = query(
            salesRef,
            where('companyId', '==', companyId),
            orderBy('createdAt', 'desc'),
            limit(500)
          );

          const snapshot = await getDocs(q);
          let fetchedSales = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as SaleTransaction[];

          const isOwner = activeMembership?.role === 'OWNER';
          if (
            !isOwner &&
            activeMembership?.role === 'EMPLOYEE' &&
            !activeMembership.permissions.includes('VIEW_SALES_HISTORY')
          ) {
            fetchedSales = fetchedSales.filter(s => s.userId === user.uid);
          }

          const isStillCurrent =
            requestVersion === salesRequestVersion &&
            auth.currentUser?.uid === user.uid &&
            useAuthStore.getState().profile?.activeCompanyId === companyId;
          if (!isStillCurrent) return;

          const filters = get().filters;
          set({
            rawSales: fetchedSales,
            sales: filterSales(fetchedSales, filters),
            loadedCompanyId: companyId
          });
        } catch (error) {
          const isStillCurrent =
            requestVersion === salesRequestVersion &&
            useAuthStore.getState().profile?.activeCompanyId === companyId;
          if (!isStillCurrent) return;
          console.error('Error fetching sales:', error);
          toast.danger('Satış geçmişi yüklenirken bir hata oluştu');
        } finally {
          if (
            requestVersion === salesRequestVersion &&
            get().loadingCompanyId === companyId
          ) {
            set({ isLoading: false, loadingCompanyId: null });
          }
        }
      })();

      inFlightSalesRequests.set(companyId, request);
      try {
        await request;
      } finally {
        if (inFlightSalesRequests.get(companyId) === request) {
          inFlightSalesRequests.delete(companyId);
        }
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
          batch.update(customerRef, {
            totalDebt: increment(-sale.totalAmount)
          });
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

        set(state => {
          const rawSales = state.rawSales.map(sale =>
            sale.id === saleId
              ? { ...sale, status: 'cancelled' as const }
              : sale
          );
          return { rawSales, sales: filterSales(rawSales, state.filters) };
        });

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
      salesRequestVersion++;
      inFlightSalesRequests.clear();
      set({
        sales: [],
        rawSales: [],
        isLoading: false,
        loadedCompanyId: null,
        loadingCompanyId: null,
        filters: {}
      });
    }
  }))
);
