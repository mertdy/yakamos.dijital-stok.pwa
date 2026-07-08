import { create } from 'zustand';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/config';
import { toast } from '@heroui/react';
import type { CartItem } from '../../sales/store/useSalesStore';

export interface SaleTransaction {
  id: string;
  userId: string;
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

    set({ isLoading: true });
    try {
      const salesRef = collection(db, 'sales');
      // Sadece 500 satış çekeceğiz ve geri kalan filtrelemeyi client-side yapacağız.
      const q = query(salesRef, orderBy('createdAt', 'desc'), limit(500));

      const snapshot = await getDocs(q);
      let fetchedSales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SaleTransaction[];

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

  cancelSale: async (saleId: string) => {
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
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          const currentDebt = customerSnap.data().totalDebt || 0;
          const newDebt = Math.max(0, currentDebt - sale.totalAmount);
          batch.update(customerRef, { totalDebt: newDebt });
        }
      }

      await batch.commit();

      set(state => ({
        sales: state.sales.map(s =>
          s.id === saleId ? { ...s, status: 'cancelled' } : s
        )
      }));

      toast.success('Satış başarıyla iptal edildi ve stoklar güncellendi');
      return true;
    } catch (error: any) {
      console.error('Cancel sale error:', error);
      toast.danger(error.message || 'Satış iptal edilirken bir hata oluştu');
      return false;
    }
  }
}));
