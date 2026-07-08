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

export interface Customer {
  id: string;
  name: string;
  surname?: string;
  email?: string;
  phone?: string;
  creditLimit?: number;
  totalDebt?: number;
  userId?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  userId: string;
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
    customer: Omit<Customer, 'id' | 'createdAt' | 'userId' | 'totalDebt'>
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
    const user = auth.currentUser;
    if (!user) return;

    const { unsubscribeSnapshot } = get();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    set({ isLoading: true });

    const q = query(
      collection(db, 'customers'),
      where('userId', '==', user.uid)
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
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newCustomer: Customer = {
      id,
      ...newCustomerData,
      totalDebt: 0,
      createdAt,
      userId: user.uid
    };

    // Firestore will automatically cache this write and sync when online
    setDoc(doc(db, 'customers', id), newCustomer).catch(err => {
      console.error('Firestore background sync failed', err);
    });

    return id;
  },

  updateCustomer: async (
    id: string,
    customerData: Partial<Omit<Customer, 'id' | 'createdAt'>>
  ) => {
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
    } catch (error) {
      console.error('Error updating customer:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  addPayment: async (customerId: string, amount: number) => {
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

      // Add to payments collection
      const paymentRef = doc(collection(db, 'payments'), paymentId);
      batch.set(paymentRef, {
        id: paymentId,
        customerId,
        userId: user.uid,
        amount,
        createdAt
      });

      // Update customer totalDebt
      const customerRef = doc(db, 'customers', customerId);
      batch.update(customerRef, {
        totalDebt: increment(-amount)
      });

      await batch.commit();
      set({ isLoading: false });
      return paymentId;
    } catch (error) {
      console.error('Error adding payment:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getCustomerTransactions: async (
    customerId: string
  ): Promise<CustomerTransaction[]> => {
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      return [];
    }

    try {
      // 1. Get Sales (Credit)
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

      // 2. Get Payments
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

      // Combine and sort by date descending (newest first)
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
