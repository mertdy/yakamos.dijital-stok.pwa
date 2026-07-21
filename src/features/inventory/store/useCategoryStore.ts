import { create } from 'zustand';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { db, auth } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface ProductCategory {
  id: string;
  companyId: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type CategoryInput = Pick<ProductCategory, 'name' | 'parentId'>;
interface CategoryState {
  categories: ProductCategory[];
  isLoading: boolean;
  subscriptionCompanyId: string | null;
  unsubscribe: (() => void) | null;
  loadCategories: () => void;
  addCategory: (input: CategoryInput) => Promise<void>;
  updateCategory: (id: string, input: CategoryInput) => Promise<void>;
  setCategoryActive: (id: string, isActive: boolean) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  clearCategories: () => void;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  subscriptionCompanyId: null,
  unsubscribe: null,
  loadCategories: () => {
    const companyId = useAuthStore.getState().profile?.activeCompanyId;
    if (
      !companyId ||
      (get().subscriptionCompanyId === companyId && get().unsubscribe)
    )
      return;
    get().unsubscribe?.();
    set({ categories: [], isLoading: true, subscriptionCompanyId: companyId });
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'productCategories'),
        where('companyId', '==', companyId)
      ),
      snapshot => {
        if (get().subscriptionCompanyId !== companyId) return;
        set({
          categories: snapshot.docs
            .map(snapshotDoc => snapshotDoc.data() as ProductCategory)
            .sort(
              (a, b) =>
                a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr')
            ),
          isLoading: false
        });
      },
      () => {
        if (get().subscriptionCompanyId !== companyId) return;
        set({ isLoading: false, unsubscribe: null });
      }
    );
    set({ unsubscribe });
  },
  addCategory: async input => {
    const companyId = useAuthStore.getState().profile?.activeCompanyId;
    const user = auth.currentUser;
    if (!companyId || !user) throw new Error('İşletme seçilmedi');
    const name = input.name.trim();
    const parentId = input.parentId || null;
    const categories = get().categories;
    if (
      parentId &&
      categories.some(category => category.id === parentId && category.parentId)
    ) {
      throw new Error('Alt kategorinin altına kategori eklenemez');
    }
    if (
      categories.some(
        category =>
          category.parentId === parentId &&
          normalize(category.name) === normalize(name)
      )
    ) {
      throw new Error('Bu üst kategori altında aynı isimde bir kategori var');
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await setDoc(doc(db, 'productCategories', id), {
      id,
      companyId,
      name,
      parentId,
      isActive: true,
      sortOrder: categories.filter(category => category.parentId === parentId)
        .length,
      createdAt: now,
      updatedAt: now,
      userId: user.uid
    });
  },
  updateCategory: async (id, input) => {
    const category = get().categories.find(item => item.id === id);
    if (!category) return;
    const name = input.name.trim();
    const parentId = input.parentId || null;
    const categories = get().categories;
    if (
      parentId === id ||
      categories.some(item => item.parentId === id && item.id === parentId)
    ) {
      throw new Error('Kategori kendi altına taşınamaz');
    }
    if (category.parentId && parentId)
      throw new Error('Alt kategori yalnızca ana kategori altında kalabilir');
    if (
      parentId &&
      categories.some(item => item.id === parentId && item.parentId)
    )
      throw new Error('En fazla iki seviye kategori kullanılabilir');
    if (
      categories.some(
        item =>
          item.id !== id &&
          item.parentId === parentId &&
          normalize(item.name) === normalize(name)
      )
    )
      throw new Error('Bu üst kategori altında aynı isimde bir kategori var');
    await setDoc(
      doc(db, 'productCategories', id),
      { name, parentId, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  },
  setCategoryActive: async (id, isActive) => {
    await setDoc(
      doc(db, 'productCategories', id),
      { isActive, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  },
  deleteCategory: async id => {
    const companyId = useAuthStore.getState().profile?.activeCompanyId;
    const category = get().categories.find(item => item.id === id);
    if (!companyId || !category) throw new Error('Kategori bulunamadı');

    const [childrenSnapshot, productsSnapshot] = await Promise.all([
      getDocs(
        query(
          collection(db, 'productCategories'),
          where('companyId', '==', companyId),
          where('parentId', '==', id),
          limit(1)
        )
      ),
      getDocs(
        query(
          collection(db, 'inventory'),
          where('companyId', '==', companyId),
          where('categoryId', '==', id),
          limit(1)
        )
      )
    ]);

    if (!childrenSnapshot.empty) {
      throw new Error('Alt kategorisi olan bir kategori silinemez');
    }
    if (!productsSnapshot.empty) {
      throw new Error('Ürün bağlı olan bir kategori silinemez');
    }

    await deleteDoc(doc(db, 'productCategories', id));
  },
  clearCategories: () => {
    get().unsubscribe?.();
    set({
      categories: [],
      isLoading: false,
      subscriptionCompanyId: null,
      unsubscribe: null
    });
  }
}));

export const getCategoryPath = (
  categoryId: string | null | undefined,
  categories: ProductCategory[]
) => {
  const category = categories.find(item => item.id === categoryId);
  if (!category) return '';
  const parent = category.parentId
    ? categories.find(item => item.id === category.parentId)
    : null;
  return parent ? `${parent.name} › ${category.name}` : category.name;
};
