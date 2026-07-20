import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import { writeBatch, doc, collection, increment } from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
  useSalesHistoryStore,
  type SaleTransaction
} from '@/features/sales-history';
import posthog from 'posthog-js';
import { trackPendingSyncOperation } from '@/shared/utils/pendingSyncOperations';
import { useInventoryStore } from '@/features/inventory';

export interface CartItem {
  inventoryId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  barcode?: string;
}

type CartProductDetails = Pick<
  CartItem,
  'inventoryId' | 'name' | 'price' | 'imageUrl' | 'barcode'
>;

export type PaymentMethod = 'Cash' | 'Card' | 'Scan' | 'Credit';
export type DiscountType = 'amount' | 'percentage';

export interface HeldSale {
  id: string;
  cart: CartItem[];
  customerId: string | null;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  timestamp: string;
}

interface SalesState {
  cart: CartItem[];
  isProcessing: boolean;
  customerId: string | null;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  heldSales: HeldSale[];
  addToCart: (item: CartItem) => void;
  syncCartItemProduct: (product: CartProductDetails) => void;
  removeFromCart: (inventoryId: string) => void;
  updateQuantity: (inventoryId: string, quantity: number) => void;
  clearCart: () => void;
  setCustomerId: (id: string | null) => void;
  setDiscount: (type: DiscountType, value: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  checkout: () => Promise<boolean>;
  holdSale: () => void;
  restoreSale: (id: string) => void;
  removeHeldSale: (id: string) => void;
  clearHeldSales: () => void;
}

export const useSalesStore = getSingletonStore('sales', () =>
  create<SalesState>()(
    persist(
      (set, get) => ({
        cart: [],
        isProcessing: false,
        customerId: null,
        discountType: 'amount',
        discountValue: 0,
        paymentMethod: 'Cash',
        heldSales: [],

        addToCart: newItem => {
          set(state => {
            const existing = state.cart.find(
              item => item.inventoryId === newItem.inventoryId
            );
            if (existing) {
              return {
                cart: state.cart.map(item =>
                  item.inventoryId === newItem.inventoryId
                    ? { ...item, quantity: item.quantity + newItem.quantity }
                    : item
                )
              };
            }
            return { cart: [...state.cart, newItem] };
          });
        },

        syncCartItemProduct: product => {
          set(state => {
            if (
              !state.cart.some(item => item.inventoryId === product.inventoryId)
            ) {
              return state;
            }

            return {
              cart: state.cart.map(item =>
                item.inventoryId === product.inventoryId
                  ? {
                      ...item,
                      name: product.name,
                      price: product.price,
                      barcode: product.barcode,
                      imageUrl: product.imageUrl
                    }
                  : item
              )
            };
          });
        },

        removeFromCart: inventoryId => {
          set(state => ({
            cart: state.cart.filter(item => item.inventoryId !== inventoryId)
          }));
        },

        updateQuantity: (inventoryId, quantity) => {
          set(state => ({
            cart: state.cart.map(item =>
              item.inventoryId === inventoryId ? { ...item, quantity } : item
            )
          }));
        },

        clearCart: () =>
          set({
            cart: [],
            customerId: null,
            discountType: 'amount',
            discountValue: 0,
            paymentMethod: 'Cash'
          }),

        setCustomerId: id => set({ customerId: id }),
        setDiscount: (type, value) =>
          set({ discountType: type, discountValue: value }),
        setPaymentMethod: method => set({ paymentMethod: method }),

        holdSale: () => {
          const {
            cart,
            customerId,
            discountType,
            discountValue,
            paymentMethod,
            heldSales
          } = get();
          if (cart.length === 0) return;

          const newHeldSale: HeldSale = {
            id: crypto.randomUUID(),
            cart: [...cart],
            customerId,
            discountType,
            discountValue,
            paymentMethod,
            timestamp: new Date().toISOString()
          };

          set({
            heldSales: [newHeldSale, ...heldSales],
            cart: [],
            customerId: null,
            discountType: 'amount',
            discountValue: 0,
            paymentMethod: 'Cash'
          });

          posthog.capture('sale_held', {
            held_sale_id: newHeldSale.id,
            item_count: cart.reduce((sum, item) => sum + item.quantity, 0),
            cart_size: cart.length,
            payment_method: paymentMethod,
            has_customer: Boolean(customerId)
          });
        },

        restoreSale: (id: string) => {
          const { heldSales } = get();
          const saleToRestore = heldSales.find(s => s.id === id);
          if (!saleToRestore) return;

          set({
            cart: [...saleToRestore.cart],
            customerId: saleToRestore.customerId,
            discountType: saleToRestore.discountType || 'amount',
            discountValue: saleToRestore.discountValue || 0,
            paymentMethod: saleToRestore.paymentMethod,
            heldSales: heldSales.filter(s => s.id !== id)
          });

          posthog.capture('held_sale_restored', {
            held_sale_id: id,
            item_count: saleToRestore.cart.reduce(
              (sum, item) => sum + item.quantity,
              0
            ),
            cart_size: saleToRestore.cart.length,
            payment_method: saleToRestore.paymentMethod,
            has_customer: Boolean(saleToRestore.customerId)
          });
        },

        removeHeldSale: (id: string) => {
          set(state => ({
            heldSales: state.heldSales.filter(s => s.id !== id)
          }));
        },

        clearHeldSales: () => {
          set({ heldSales: [] });
        },

        checkout: async () => {
          const {
            cart,
            customerId,
            discountType,
            discountValue,
            paymentMethod
          } = get();
          if (cart.length === 0) return false;

          const profile = useAuthStore.getState().profile;
          const activeMembership = useAuthStore.getState().activeMembership;
          if (!profile?.activeCompanyId) {
            console.error('No active company selected');
            return false;
          }

          const user = auth.currentUser;
          if (!user) {
            console.error('User not authenticated');
            return false;
          }

          if (paymentMethod === 'Credit' && !customerId) {
            console.error('Veresiye satış için müşteri seçilmelidir.');
            return false;
          }

          set({ isProcessing: true });
          try {
            const subtotal = cart.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );

            let discountAmount = 0;
            if (discountType === 'percentage') {
              discountAmount = subtotal * (discountValue / 100);
            } else {
              discountAmount = discountValue;
            }

            const totalAmount = subtotal - discountAmount;

            const createdAt = new Date().toISOString();
            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
            const sellerName =
              activeMembership?.employeeName?.trim() ||
              profile.name?.trim() ||
              user.displayName?.trim() ||
              user.email?.split('@')[0] ||
              'Bilinmeyen çalışan';

            const batch = writeBatch(db);

            const saleRef = doc(collection(db, 'sales'));
            batch.set(saleRef, {
              userId: user.uid,
              sellerName,
              companyId: profile.activeCompanyId,
              invoiceNumber,
              customerId,
              subtotal,
              discount: discountAmount,
              discountType,
              discountValue,
              totalAmount,
              paymentMethod,
              status: 'completed',
              createdAt,
              cart
            });

            for (const item of cart) {
              const saleItemRef = doc(collection(db, 'saleItems'));
              batch.set(saleItemRef, {
                saleId: saleRef.id,
                userId: user.uid,
                companyId: profile.activeCompanyId,
                inventoryId: item.inventoryId,
                quantity: item.quantity,
                unitPrice: item.price
              });

              const inventoryItem = useInventoryStore
                .getState()
                .items.find(product => product.id === item.inventoryId);
              if (inventoryItem?.trackStock !== false) {
                const invRef = doc(db, 'inventory', item.inventoryId);
                batch.update(invRef, {
                  stock: increment(-item.quantity),
                  updatedAt: createdAt
                });
              }
            }

            if (paymentMethod === 'Credit' && customerId) {
              const customerRef = doc(db, 'customers', customerId);
              batch.update(customerRef, {
                totalDebt: increment(totalAmount)
              });
            }

            const backupPromise = batch.commit();
            trackPendingSyncOperation({
              kind: 'sale',
              title: `Fatura No: ${invoiceNumber}`,
              details: [
                `Satış tutarı: ${totalAmount.toLocaleString('tr-TR')} ₺`
              ],
              target: { type: 'sale', id: saleRef.id }
            });

            const completedSale: SaleTransaction = {
              id: saleRef.id,
              userId: user.uid,
              sellerName,
              companyId: profile.activeCompanyId,
              invoiceNumber,
              customerId,
              subtotal,
              discount: discountAmount,
              discountType,
              discountValue,
              totalAmount,
              paymentMethod,
              status: 'completed',
              syncStatus: 'pending',
              pendingBackupCount: 1,
              createdAt,
              cart
            };
            useSalesHistoryStore.getState().recordSale(completedSale);

            void backupPromise
              .then(() => {
                useSalesHistoryStore.getState().confirmSaleBackup(saleRef.id);
              })
              .catch(error => {
                console.error('Sale backup failed:', error);
                useSalesHistoryStore.getState().failSaleBackup(saleRef.id);
                posthog.captureException(error, {
                  context: 'sale_checkout_backup',
                  sale_id: saleRef.id,
                  invoice_number: invoiceNumber
                });
              });

            posthog.capture('sale_completed', {
              sale_id: saleRef.id,
              invoice_number: invoiceNumber,
              item_count: cart.reduce((sum, item) => sum + item.quantity, 0),
              cart_size: cart.length,
              subtotal,
              discount_amount: discountAmount,
              total_amount: totalAmount,
              payment_method: paymentMethod,
              has_customer: Boolean(customerId)
            });

            set({
              cart: [],
              isProcessing: false,
              customerId: null,
              discountType: 'amount',
              discountValue: 0,
              paymentMethod: 'Cash'
            });
            return true;
          } catch (error) {
            console.error('Checkout failed:', error);
            posthog.captureException(error, {
              context: 'sale_checkout'
            });
            set({ isProcessing: false });
            return false;
          }
        }
      }),
      {
        name: 'sales-storage',
        partialize: state => ({ heldSales: state.heldSales })
      }
    )
  )
);
