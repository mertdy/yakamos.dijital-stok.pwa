import { create } from 'zustand';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import { normalizeSearchText } from '@/shared/utils/searchText';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  writeBatch,
  where,
  increment,
  documentId
} from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { toast } from '@heroui/react';
import type { CartItem } from '@/features/sales';
import posthog from 'posthog-js';

export interface SaleTransaction {
  id: string;
  userId: string;
  /** Satış anındaki çalışanın görünen adı. Eski kayıtlar için üyelikten tamamlanır. */
  sellerName?: string;
  companyId: string;
  invoiceNumber: string;
  customerId: string | null;
  subtotal: number;
  discount: number;
  discountType?: 'percentage' | 'amount' | 'fixed';
  discountValue?: number;
  totalAmount: number;
  paymentMethod: string;
  cart: CartItem[];
  createdAt: string;
  status?: 'completed' | 'cancelled';
  syncStatus?: 'pending' | 'synced' | 'failed';
  pendingBackupCount?: number;
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
  recordSale: (sale: SaleTransaction) => void;
  updateSaleSyncStatus: (
    saleId: string,
    syncStatus: NonNullable<SaleTransaction['syncStatus']>
  ) => void;
  confirmSaleBackup: (saleId: string) => void;
  failSaleBackup: (saleId: string) => void;
  setFilters: (filters: Partial<SalesHistoryFilter>) => void;
  clearFilters: () => void;
  cancelSale: (saleId: string) => Promise<boolean>;
  clearSales: () => void;
}

const filterSales = (sales: SaleTransaction[], filters: SalesHistoryFilter) => {
  let filteredSales = sales;

  if (filters.searchQuery) {
    const normalizedQuery = normalizeSearchText(filters.searchQuery);
    filteredSales = filteredSales.filter(sale =>
      normalizeSearchText(sale.invoiceNumber ?? '').includes(normalizedQuery)
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

    recordSale: sale => {
      set(state => {
        // A checkout can finish while the user is on another screen. Keep the
        // active company's history in sync locally so navigating to history
        // never depends on a new Firestore read or an online connection.
        if (
          state.loadedCompanyId !== null &&
          state.loadedCompanyId !== sale.companyId
        ) {
          return state;
        }

        const rawSales = [
          {
            ...sale,
            pendingBackupCount:
              sale.syncStatus === 'pending' ? (sale.pendingBackupCount ?? 1) : 0
          },
          ...state.rawSales.filter(existingSale => existingSale.id !== sale.id)
        ].sort(
          (firstSale, secondSale) =>
            new Date(secondSale.createdAt).getTime() -
            new Date(firstSale.createdAt).getTime()
        );

        return { rawSales, sales: filterSales(rawSales, state.filters) };
      });
    },

    updateSaleSyncStatus: (saleId, syncStatus) => {
      set(state => {
        const rawSales = state.rawSales.map(sale =>
          sale.id === saleId ? { ...sale, syncStatus } : sale
        );
        return { rawSales, sales: filterSales(rawSales, state.filters) };
      });
    },

    confirmSaleBackup: saleId => {
      set(state => {
        const rawSales = state.rawSales.map(sale => {
          if (sale.id !== saleId || sale.syncStatus === 'failed') return sale;

          const pendingBackupCount = Math.max(
            0,
            (sale.pendingBackupCount ?? 1) - 1
          );
          return {
            ...sale,
            pendingBackupCount,
            syncStatus:
              pendingBackupCount > 0
                ? ('pending' as const)
                : ('synced' as const)
          };
        });
        return { rawSales, sales: filterSales(rawSales, state.filters) };
      });
    },

    failSaleBackup: saleId => {
      set(state => {
        const rawSales = state.rawSales.map(sale =>
          sale.id === saleId
            ? { ...sale, pendingBackupCount: 0, syncStatus: 'failed' as const }
            : sale
        );
        return { rawSales, sales: filterSales(rawSales, state.filters) };
      });
    },

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

      const companyId = useAuthStore.getState().profile?.activeCompanyId;
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
            ...doc.data(),
            syncStatus: doc.metadata?.hasPendingWrites ? 'pending' : 'synced',
            pendingBackupCount: doc.metadata?.hasPendingWrites ? 1 : 0
          })) as SaleTransaction[];

          // A company switch updates the profile first, while the membership
          // listener can still briefly expose the previous company's role.
          // Read the membership after the sales request resolves so an owner
          // entering another company never gets that stale employee-only
          // filter on the initial render.
          const currentAuthState = useAuthStore.getState();
          const activeMembership = currentAuthState.activeMembership;
          const profile = currentAuthState.profile;
          const isOwner = activeMembership?.role === 'OWNER';
          if (
            !isOwner &&
            activeMembership?.role === 'EMPLOYEE' &&
            !activeMembership.permissions.includes('VIEW_SALES_HISTORY')
          ) {
            fetchedSales = fetchedSales.filter(s => s.userId === user.uid);
          }

          // New sales carry this value directly so they stay useful offline.
          // Enrich older records from company memberships without making a
          // missing offline cache entry prevent the sales list from rendering.
          if (fetchedSales.some(sale => !sale.sellerName)) {
            try {
              const membershipsSnapshot = await getDocs(
                query(
                  collection(db, 'memberships'),
                  where('companyId', '==', companyId)
                )
              );
              const sellerDetails = new Map(
                membershipsSnapshot.docs.flatMap(membership => {
                  const data = membership.data() as {
                    userId?: string;
                    employeeName?: string;
                    email?: string;
                  };
                  return data.userId
                    ? [
                        [
                          data.userId,
                          {
                            employeeName: data.employeeName?.trim(),
                            email: data.email?.trim()
                          }
                        ] as const
                      ]
                    : [];
                })
              );
              const currentUserName =
                activeMembership?.employeeName?.trim() ||
                profile?.name?.trim() ||
                user.displayName?.trim() ||
                user.email?.split('@')[0];
              const userIdsMissingName = [
                ...new Set(
                  fetchedSales
                    .filter(
                      sale =>
                        !sale.sellerName &&
                        !sellerDetails.get(sale.userId)?.employeeName &&
                        sale.userId !== user.uid
                    )
                    .map(sale => sale.userId)
                )
              ];
              const profileNames = new Map<string, string>();

              // Firestore permits at most 30 values in an `in` filter. Only
              // profiles without a membership name are requested, in chunks.
              for (
                let index = 0;
                index < userIdsMissingName.length;
                index += 30
              ) {
                const userIds = userIdsMissingName.slice(index, index + 30);
                const profilesSnapshot = await getDocs(
                  query(
                    collection(db, 'users'),
                    where(documentId(), 'in', userIds)
                  )
                );
                profilesSnapshot.docs.forEach(profileDoc => {
                  const profileData = profileDoc.data() as { name?: string };
                  const name = profileData.name?.trim();
                  if (name) profileNames.set(profileDoc.id, name);
                });
              }

              fetchedSales = fetchedSales.map(sale => ({
                ...sale,
                sellerName:
                  sale.sellerName ||
                  sellerDetails.get(sale.userId)?.employeeName ||
                  profileNames.get(sale.userId) ||
                  (sale.userId === user.uid ? currentUserName : undefined) ||
                  sellerDetails.get(sale.userId)?.email ||
                  'Bilinmeyen çalışan'
              }));
            } catch (error) {
              console.warn(
                'Could not resolve salespeople for legacy sales',
                error
              );
            }
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

        // 2. Restore inventory stock. An increment can be queued locally, so
        // cancelling a sale never needs a network-dependent inventory read.
        for (const item of sale.cart) {
          const productRef = doc(db, 'inventory', item.inventoryId);
          batch.update(productRef, { stock: increment(item.quantity) });
        }

        // 3. Revert customer debt if it was a credit sale
        if (sale.paymentMethod === 'Credit' && sale.customerId) {
          const customerRef = doc(db, 'customers', sale.customerId);
          batch.update(customerRef, {
            totalDebt: increment(-sale.totalAmount)
          });
        }

        const backupPromise = batch.commit();

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
              ? {
                  ...sale,
                  status: 'cancelled' as const,
                  syncStatus: 'pending' as const,
                  pendingBackupCount:
                    (sale.pendingBackupCount ??
                      (sale.syncStatus === 'pending' ? 1 : 0)) + 1
                }
              : sale
          );
          return { rawSales, sales: filterSales(rawSales, state.filters) };
        });

        void backupPromise
          .then(() => {
            get().confirmSaleBackup(saleId);
          })
          .catch(error => {
            console.error('Sale cancellation backup failed:', error);
            get().failSaleBackup(saleId);
            posthog.captureException(error, {
              context: 'sale_cancel_backup',
              sale_id: saleId
            });
            toast.danger('Satış iptali yedeklenemedi');
          });

        toast.success('Satış iptal edildi, yedekleme bekliyor');
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
