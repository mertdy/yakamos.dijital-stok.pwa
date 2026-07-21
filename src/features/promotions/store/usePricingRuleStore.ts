import { create } from 'zustand';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth';
import type { PricingRule } from '../domain/pricingRules';

type PricingRuleInput = Omit<
  PricingRule,
  'id' | 'companyId' | 'createdAt' | 'updatedAt'
>;

interface PricingRuleState {
  rules: PricingRule[];
  isLoading: boolean;
  companyId: string | null;
  unsubscribe: (() => void) | null;
  loadRules: () => void;
  saveRule: (id: string | null, input: PricingRuleInput) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  clearRules: () => void;
}

export const usePricingRuleStore = create<PricingRuleState>((set, get) => ({
  rules: [],
  isLoading: false,
  companyId: null,
  unsubscribe: null,
  loadRules: () => {
    const companyId = useAuthStore.getState().profile?.activeCompanyId;
    if (!companyId || (get().companyId === companyId && get().unsubscribe))
      return;
    get().unsubscribe?.();
    set({ companyId, rules: [], isLoading: true });
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'pricingRules'),
        where('companyId', '==', companyId)
      ),
      snapshot => {
        if (get().companyId !== companyId) return;
        set({
          rules: snapshot.docs
            .map(
              snapshotDoc =>
                ({ id: snapshotDoc.id, ...snapshotDoc.data() }) as PricingRule
            )
            .sort(
              (a, b) =>
                b.priority - a.priority || a.name.localeCompare(b.name, 'tr')
            ),
          isLoading: false
        });
      },
      () => set({ isLoading: false })
    );
    set({ unsubscribe });
  },
  saveRule: async (id, input) => {
    const companyId = useAuthStore.getState().profile?.activeCompanyId;
    const user = auth.currentUser;
    if (!companyId || !user) throw new Error('İşletme seçilmedi');
    const now = new Date().toISOString();
    const ref = id
      ? doc(db, 'pricingRules', id)
      : doc(collection(db, 'pricingRules'));
    await setDoc(
      ref,
      {
        ...input,
        companyId,
        updatedAt: now,
        ...(id ? {} : { createdAt: now, createdBy: user.uid })
      },
      { merge: true }
    );
  },
  deleteRule: async id => deleteDoc(doc(db, 'pricingRules', id)),
  clearRules: () => {
    get().unsubscribe?.();
    set({ rules: [], isLoading: false, companyId: null, unsubscribe: null });
  }
}));
