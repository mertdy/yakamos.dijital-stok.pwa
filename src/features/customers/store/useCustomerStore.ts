import { create } from 'zustand';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  increment,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import posthog from 'posthog-js';

export interface Customer {
  id: string;
  name: string;
  surname?: string;
  email?: string;
  phone?: string;
  creditLimit?: number;
  totalDebt?: number;
  userId?: string;
  companyId?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  userId: string;
  companyId: string;
  amount: number;
  createdAt: string;
}

export interface CustomerTransaction {
  id: string;
  type: 'SALE' | 'PAYMENT';
  amount: number;
  date: string;
  description: string;
  cart?: any[];
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  subtotal?: number;
  invoiceNumber?: string;
}

interface CustomerState {
  customers: Customer[];
  isLoading: boolean;
  unsubscribeSnapshot: (() => void) | null;
  loadCustomers: () => void;
  addCustomer: (
    customer: Omit<
      Customer,
      'id' | 'createdAt' | 'userId' | 'companyId' | 'totalDebt'
    >
  ) => Promise<string>;
  updateCustomer: (
    id: string,
    customerData: Partial<Omit<Customer, 'id' | 'createdAt'>>
  ) => Promise<void>;
  addPayment: (
    customerId: string,
    amount: number
  ) => Promise<string | undefined>;
  getCustomerTransactions: (
    customerId: string
  ) => Promise<CustomerTransaction[]>;
  clearCustomers: () => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoading: false,
  unsubscribeSnapshot: null,

  loadCustomers: () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.activeCompanyId) return;

    const { unsubscribeSnapshot } = get();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    set({ isLoading: true });

    const q = query(
      collection(db, 'customers'),
      where('companyId', '==', profile.activeCompanyId)
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const customers: Customer[] = [];
        snapshot.forEach(doc => {
          customers.push({ id: doc.id, ...doc.data() } as Customer);
        });
        set({ customers, isLoading: false });
      },
      error => {
        console.error('Firestore snapshot error:', error);
        set({ isLoading: false });
      }
    );

    set({ unsubscribeSnapshot: unsubscribe });
  },

  addCustomer: async newCustomerData => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.activeCompanyId)
      throw new Error('No active company selected');

    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newCustomer: Customer = {
      id,
      ...newCustomerData,
      totalDebt: 0,
      createdAt,
      userId: user.uid,
      companyId: profile.activeCompanyId
    };

    setDoc(doc(db, 'customers', id), newCustomer).catch(err => {
      console.error('Firestore background sync failed', err);
      posthog.captureException(err, {
        context: 'customer_add',
        customer_id: id
      });
    });

    posthog.capture('customer_created', {
      customer_id: id,
      has_email: Boolean(newCustomer.email),
      has_phone: Boolean(newCustomer.phone),
      credit_limit: newCustomer.creditLimit ?? 0
    });

    return id;
  },

  updateCustomer: async (id, customerData) => {
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    set({ isLoading: true });
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, {
        ...customerData,
        updatedAt: new Date().toISOString()
      });

      set(state => ({
        customers: state.customers.map(c =>
          c.id === id ? { ...c, ...customerData } : c
        ),
        isLoading: false
      }));

      posthog.capture('customer_updated', {
        customer_id: id,
        updated_fields: Object.keys(customerData)
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      posthog.captureException(error, {
        context: 'customer_update',
        customer_id: id
      });
      set({ isLoading: false });
      throw error;
    }
  },

  addPayment: async (customerId, amount) => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.activeCompanyId)
      throw new Error('No active company selected');

    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    set({ isLoading: true });
    try {
      const paymentId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const batch = writeBatch(db);

      const paymentRef = doc(collection(db, 'payments'), paymentId);
      batch.set(paymentRef, {
        id: paymentId,
        customerId,
        userId: user.uid,
        companyId: profile.activeCompanyId,
        amount,
        createdAt
      });

      const customerRef = doc(db, 'customers', customerId);
      batch.update(customerRef, {
        totalDebt: increment(-amount)
      });

      await batch.commit();
      posthog.capture('customer_payment_recorded', {
        customer_id: customerId,
        payment_id: paymentId,
        amount
      });
      set({ isLoading: false });
      return paymentId;
    } catch (error) {
      console.error('Error adding payment:', error);
      posthog.captureException(error, {
        context: 'customer_add_payment',
        customer_id: customerId
      });
      set({ isLoading: false });
      throw error;
    }
  },

  getCustomerTransactions: async customerId => {
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      return [];
    }

    try {
      const salesQuery = query(
        collection(db, 'sales'),
        where('customerId', '==', customerId),
        where('paymentMethod', '==', 'Credit')
      );
      const salesSnapshot = await getDocs(salesQuery);
      const salesTransactions: CustomerTransaction[] = salesSnapshot.docs.map(
        doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'SALE',
            amount: data.totalAmount || 0,
            date: data.createdAt,
            description: data.invoiceNumber
              ? `Fatura: ${data.invoiceNumber}`
              : 'Veresiye Satış',
            cart: data.cart || [],
            discountType: data.discountType,
            discountValue: data.discountValue,
            subtotal: data.subtotal,
            invoiceNumber: data.invoiceNumber
          };
        }
      );

      const paymentsQuery = query(
        collection(db, 'payments'),
        where('customerId', '==', customerId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsTransactions: CustomerTransaction[] =
        paymentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'PAYMENT',
            amount: data.amount || 0,
            date: data.createdAt,
            description: 'Tahsilat'
          };
        });

      const allTransactions = [...salesTransactions, ...paymentsTransactions];
      allTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return allTransactions;
    } catch (error) {
      console.error('Error fetching customer transactions:', error);
      return [];
    }
  },

  clearCustomers: () => {
    const { unsubscribeSnapshot } = get();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
    set({ customers: [], unsubscribeSnapshot: null });
  }
}));
