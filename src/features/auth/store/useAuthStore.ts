import { create } from 'zustand';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocFromCache,
  query,
  where,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { auth, googleProvider, db } from '@/core/firebase/config';
import {
  clearFirestorePersistence,
  clearUserLocalStorage,
  notifyOtherTabsOfLogout,
  releaseFirestoreClient
} from '@/shared/utils/sessionCleanup';
import { useInventoryStore } from '@/features/inventory';
import { useCustomerStore } from '@/features/customers';
import { useSalesStore, usePreferencesStore } from '@/features/sales';
import { useSalesHistoryStore } from '@/features/sales-history';
import { usePricingRuleStore } from '@/features/promotions';
import type {
  Company,
  UserProfile,
  Membership,
  Invitation,
  PermissionKey
} from '@/core/types/tenant';
import posthog from 'posthog-js';

/**
 * Converts Firebase auth error codes to user-friendly Turkish messages.
 */
export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-posta veya şifre hatalı.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanılıyor.';
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalıdır.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
    case 'auth/network-request-failed':
      return 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmıştır.';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

export const getAvailableActiveCompanyId = (
  activeCompanyId: string | null,
  memberships: Membership[]
): string | null => {
  if (
    memberships.some(membership => membership.companyId === activeCompanyId)
  ) {
    return activeCompanyId;
  }
  return memberships[0]?.companyId ?? null;
};

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  activeMembership: Membership | null;
  memberships: Membership[];
  activeCompany: Company | null;
  isLoading: boolean;
  isInitialized: boolean;
  authError: string | null;
  hasLoadedMemberships: boolean;

  setUser: (user: User | null) => Promise<void>;
  clearError: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: (options?: {
    notifyTabs?: boolean;
    clearPersistence?: boolean;
    releaseClient?: boolean;
  }) => Promise<void>;

  createCompany: (
    name: string,
    details?: { phone?: string; address?: string; receiptHeader?: string }
  ) => Promise<string>;
  switchCompany: (companyId: string) => Promise<void>;
  updateCompanyProfile: (
    details: Partial<Omit<Company, 'id' | 'ownerId' | 'createdAt'>>
  ) => Promise<void>;
  inviteEmployee: (
    email: string,
    permissions: PermissionKey[],
    employeeName: string,
    jobTitle: string
  ) => Promise<void>;
  updateEmployeePermissions: (
    userId: string,
    permissions: PermissionKey[]
  ) => Promise<void>;
  updateEmployeeDetails: (
    userId: string,
    details: Pick<Membership, 'employeeName' | 'jobTitle'>
  ) => Promise<void>;
  removeEmployee: (userId: string) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;

  // Real-time listener cleanup functions
  unsubscribeProfile: (() => void) | null;
  unsubscribeMemberships: (() => void) | null;
  unsubscribeActiveCompany: (() => void) | null;
}

const checkAndMigrateLegacyUser = async (user: User): Promise<UserProfile> => {
  const profileRef = doc(db, 'users', user.uid);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    return profileSnap.data() as UserProfile;
  }

  // Check legacy data in inventory & customers
  const legacyInventoryQuery = query(
    collection(db, 'inventory'),
    where('userId', '==', user.uid)
  );
  const legacyInventorySnap = await getDocs(legacyInventoryQuery);

  const legacyCustomersQuery = query(
    collection(db, 'customers'),
    where('userId', '==', user.uid)
  );
  const legacyCustomersSnap = await getDocs(legacyCustomersQuery);

  const hasLegacyData =
    !legacyInventorySnap.empty || !legacyCustomersSnap.empty;
  let activeCompanyId: string | null = null;

  if (hasLegacyData) {
    const companyId = crypto.randomUUID();
    const companyName = 'Varsayılan İşletmem';
    const createdAt = new Date().toISOString();

    // Create default company
    const companyRef = doc(db, 'companies', companyId);
    const companyData: Company = {
      id: companyId,
      name: companyName,
      ownerId: user.uid,
      createdAt
    };
    await setDoc(companyRef, companyData);

    // Create membership doc
    const membershipId = `${user.uid}_${companyId}`;
    const membershipRef = doc(db, 'memberships', membershipId);
    const membershipData: Membership = {
      id: membershipId,
      userId: user.uid,
      email: user.email || '',
      companyId,
      companyName,
      role: 'OWNER',
      permissions: [],
      createdAt
    };
    await setDoc(membershipRef, membershipData);

    // Batch update documents to companyId
    const batch = writeBatch(db);
    legacyInventorySnap.forEach(itemDoc => {
      batch.update(doc(db, 'inventory', itemDoc.id), { companyId });
    });
    legacyCustomersSnap.forEach(custDoc => {
      batch.update(doc(db, 'customers', custDoc.id), { companyId });
    });

    const legacySalesQuery = query(
      collection(db, 'sales'),
      where('userId', '==', user.uid)
    );
    const legacySalesSnap = await getDocs(legacySalesQuery);
    legacySalesSnap.forEach(saleDoc => {
      batch.update(doc(db, 'sales', saleDoc.id), { companyId });
    });

    await batch.commit();
    activeCompanyId = companyId;
  }

  const profileData: UserProfile = {
    id: user.uid,
    email: user.email || '',
    name: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
    activeCompanyId,
    createdAt: new Date().toISOString()
  };

  await setDoc(profileRef, profileData);
  return profileData;
};

export const useAuthStore = getSingletonStore('auth', () =>
  create<AuthState>((set, get) => ({
    user: null,
    profile: null,
    activeMembership: null,
    memberships: [],
    activeCompany: null,
    isLoading: false,
    isInitialized: false,
    authError: null,
    hasLoadedMemberships: false,

    unsubscribeProfile: null,
    unsubscribeMemberships: null,
    unsubscribeActiveCompany: null,

    setUser: async user => {
      const {
        unsubscribeProfile,
        unsubscribeMemberships,
        unsubscribeActiveCompany
      } = get();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeMemberships) unsubscribeMemberships();
      if (unsubscribeActiveCompany) unsubscribeActiveCompany();

      set({
        unsubscribeProfile: null,
        unsubscribeMemberships: null,
        unsubscribeActiveCompany: null
      });

      if (!user) {
        posthog.reset();
        set({
          user: null,
          profile: null,
          activeMembership: null,
          memberships: [],
          activeCompany: null,
          isInitialized: true,
          isLoading: false,
          hasLoadedMemberships: false
        });
        return;
      }

      posthog.identify(user.uid, {
        email: user.email ?? undefined,
        name: user.displayName ?? undefined
      });

      set({ isLoading: true, hasLoadedMemberships: false });

      try {
        await checkAndMigrateLegacyUser(user);

        // Listen to profile
        const subProfile = onSnapshot(
          doc(db, 'users', user.uid),
          async userSnap => {
            if (!userSnap.exists()) return;
            const profileData = userSnap.data() as UserProfile;

            const { memberships, hasLoadedMemberships } = get();
            const nextActiveCompanyId = hasLoadedMemberships
              ? getAvailableActiveCompanyId(
                  profileData.activeCompanyId,
                  memberships
                )
              : profileData.activeCompanyId;
            const normalizedProfile =
              nextActiveCompanyId === profileData.activeCompanyId
                ? profileData
                : { ...profileData, activeCompanyId: nextActiveCompanyId };
            const activeMembership =
              memberships.find(
                m => m.companyId === normalizedProfile.activeCompanyId
              ) || null;

            if (normalizedProfile !== profileData) {
              updateDoc(doc(db, 'users', user.uid), {
                activeCompanyId: normalizedProfile.activeCompanyId
              }).catch(error =>
                console.error('Active company reconciliation failed:', error)
              );
            }

            set({
              profile: normalizedProfile,
              activeMembership,
              activeCompany: null
            });

            if (normalizedProfile.activeCompanyId) {
              const { unsubscribeActiveCompany: oldSubCompany } = get();
              if (oldSubCompany) oldSubCompany();

              const subCompany = onSnapshot(
                doc(db, 'companies', normalizedProfile.activeCompanyId),
                companySnap => {
                  if (companySnap.exists()) {
                    set({ activeCompany: companySnap.data() as Company });
                  } else {
                    set({ activeCompany: null });
                  }
                }
              );
              set({ unsubscribeActiveCompany: subCompany });
            } else {
              set({ activeCompany: null });
            }
          }
        );

        // Listen to memberships
        const membershipsQuery = query(
          collection(db, 'memberships'),
          where('userId', '==', user.uid)
        );
        const subMemberships = onSnapshot(membershipsQuery, snap => {
          const memberships: Membership[] = [];
          snap.forEach(doc => {
            memberships.push(doc.data() as Membership);
          });

          if (user.email) {
            memberships
              .filter(membership => !membership.email)
              .forEach(membership => {
                updateDoc(doc(db, 'memberships', membership.id), {
                  email: user.email
                }).catch(error =>
                  console.error('Membership email backfill failed:', error)
                );
              });
          }

          const profile = get().profile;
          const activeCompanyId = profile?.activeCompanyId ?? null;
          const nextActiveCompanyId = getAvailableActiveCompanyId(
            activeCompanyId,
            memberships
          );
          const activeMembership =
            memberships.find(
              membership => membership.companyId === nextActiveCompanyId
            ) || null;

          if (profile && nextActiveCompanyId !== activeCompanyId) {
            const { unsubscribeActiveCompany } = get();
            if (unsubscribeActiveCompany) unsubscribeActiveCompany();

            set({
              profile: { ...profile, activeCompanyId: nextActiveCompanyId },
              activeCompany: null,
              unsubscribeActiveCompany: null
            });
            updateDoc(doc(db, 'users', user.uid), {
              activeCompanyId: nextActiveCompanyId
            }).catch(error =>
              console.error('Active company reconciliation failed:', error)
            );
          }

          set({
            memberships,
            activeMembership,
            isInitialized: true,
            isLoading: false,
            hasLoadedMemberships: true
          });
        });

        set({
          user,
          unsubscribeProfile: subProfile,
          unsubscribeMemberships: subMemberships
        });
      } catch (err) {
        console.error('Error setting user profile:', err);
        set({
          user,
          isInitialized: true,
          isLoading: false
        });
      }
    },

    clearError: () => set({ authError: null }),

    loginWithGoogle: async () => {
      set({ isLoading: true, authError: null });
      try {
        const result = await signInWithPopup(auth, googleProvider);
        posthog.identify(result.user.uid, {
          email: result.user.email ?? undefined,
          name: result.user.displayName ?? undefined
        });
        posthog.capture('user_logged_in', {
          login_method: 'google',
          is_email_verified: result.user.emailVerified
        });
      } catch (error: unknown) {
        console.error('Google login failed:', error);
        posthog.captureException(error, {
          context: 'login_with_google'
        });
        const code = (error as { code?: string }).code ?? '';
        set({ authError: getAuthErrorMessage(code), isLoading: false });
        throw error;
      }
    },

    loginWithEmail: async (email, password) => {
      set({ isLoading: true, authError: null });
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        posthog.identify(credential.user.uid, {
          email: credential.user.email ?? undefined,
          name: credential.user.displayName ?? undefined
        });
        posthog.capture('user_logged_in', {
          login_method: 'email',
          is_email_verified: credential.user.emailVerified
        });
      } catch (error: unknown) {
        posthog.captureException(error, {
          context: 'login_with_email'
        });
        const code = (error as { code?: string }).code ?? '';
        set({ authError: getAuthErrorMessage(code), isLoading: false });
        throw error;
      }
    },

    registerWithEmail: async (email, password) => {
      set({ isLoading: true, authError: null });
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await sendEmailVerification(credential.user);
        posthog.identify(credential.user.uid, {
          email: credential.user.email ?? undefined,
          name: credential.user.displayName ?? undefined
        });
        posthog.capture('user_registered', {
          registration_method: 'email',
          verification_email_sent: true
        });
      } catch (error: unknown) {
        posthog.captureException(error, {
          context: 'register_with_email'
        });
        const code = (error as { code?: string }).code ?? '';
        set({ authError: getAuthErrorMessage(code), isLoading: false });
        throw error;
      }
    },

    updateDisplayName: async displayName => {
      const user = get().user;
      const name = displayName.trim();

      if (!user) throw new Error('User not authenticated');
      if (!name) throw new Error('Display name is required');

      await updateProfile(user, { displayName: name });
      await updateDoc(doc(db, 'users', user.uid), { name });

      posthog.identify(user.uid, { name });
      set({ user });
    },

    resetPassword: async email => {
      set({ isLoading: true, authError: null });
      try {
        await sendPasswordResetEmail(auth, email);
        posthog.capture('password_reset_requested', {
          request_source: 'login_view'
        });
      } catch (error: unknown) {
        posthog.captureException(error, {
          context: 'reset_password'
        });
        const code = (error as { code?: string }).code ?? '';
        set({ authError: getAuthErrorMessage(code) });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    logout: async ({
      notifyTabs = true,
      clearPersistence = true,
      releaseClient = false
    } = {}) => {
      set({ isLoading: true });
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          posthog.capture('user_logged_out', {
            had_verified_email: currentUser.emailVerified
          });
        }
        if (notifyTabs) await notifyOtherTabsOfLogout();
        await signOut(auth);
        posthog.reset();
        useInventoryStore.getState().clearItems();
        useCustomerStore.getState().clearCustomers();
        useSalesStore.getState().clearCart();
        useSalesStore.getState().clearHeldSales();
        useSalesHistoryStore.getState().clearSales();
        usePricingRuleStore.getState().clearRules();
        usePreferencesStore.getState().clearPreferences();
        clearUserLocalStorage();
        if (clearPersistence) {
          await clearFirestorePersistence();
          // `terminate(db)` makes the singleton unusable. Start a fresh client
          // on the login page regardless of whether another tab delayed cache
          // deletion; the retry marker preserves that state.
          window.location.replace('/login');
        } else if (releaseClient) {
          await releaseFirestoreClient();
        }
      } catch (error) {
        console.error('Logout failed:', error);
        posthog.captureException(error, {
          context: 'logout'
        });
      } finally {
        set({ isLoading: false });
      }
    },

    createCompany: async (name, details) => {
      const user = get().user;
      if (!user) throw new Error('User not authenticated');

      const companyId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const companyRef = doc(db, 'companies', companyId);
      const companyData: Company = {
        id: companyId,
        name,
        ownerId: user.uid,
        phone: details?.phone || null,
        address: details?.address || null,
        receiptHeader: details?.receiptHeader || null,
        defaultLowStockThreshold: 10,
        createdAt
      };
      await setDoc(companyRef, companyData);

      const membershipId = `${user.uid}_${companyId}`;
      const membershipRef = doc(db, 'memberships', membershipId);
      const membershipData: Membership = {
        id: membershipId,
        userId: user.uid,
        email: user.email || '',
        companyId,
        companyName: name,
        role: 'OWNER',
        permissions: [],
        createdAt
      };
      await setDoc(membershipRef, membershipData);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        activeCompanyId: companyId
      });

      const profile = get().profile;
      set({
        profile: profile ? { ...profile, activeCompanyId: companyId } : profile,
        activeMembership: membershipData,
        activeCompany: companyData,
        memberships: [
          ...get().memberships.filter(
            membership => membership.id !== membershipId
          ),
          membershipData
        ]
      });

      return companyId;
    },

    switchCompany: async companyId => {
      const user = get().user;
      if (!user) throw new Error('User not authenticated');

      const userRef = doc(db, 'users', user.uid);
      const updatePromise = updateDoc(userRef, {
        activeCompanyId: companyId
      });

      if (!navigator.onLine) {
        const [companySnap, profile] = await Promise.all([
          getDocFromCache(doc(db, 'companies', companyId)),
          Promise.resolve(get().profile)
        ]);
        const activeMembership = get().memberships.find(
          membership => membership.companyId === companyId
        );

        if (!companySnap.exists() || !activeMembership || !profile) {
          updatePromise.catch(error =>
            console.error('Queued offline company switch failed', error)
          );
          throw new Error('Company is not available in the offline cache');
        }

        set({
          profile: { ...profile, activeCompanyId: companyId },
          activeMembership,
          activeCompany: companySnap.data() as Company
        });

        updatePromise.catch(error =>
          console.error('Queued offline company switch failed', error)
        );
        return;
      }

      await updatePromise;
    },

    updateCompanyProfile: async details => {
      const activeCompany = get().activeCompany;
      if (!activeCompany) throw new Error('No active company selected');

      const companyRef = doc(db, 'companies', activeCompany.id);

      if (
        typeof details.name === 'string' &&
        details.name !== activeCompany.name
      ) {
        const membershipsSnapshot = await getDocs(
          query(
            collection(db, 'memberships'),
            where('companyId', '==', activeCompany.id)
          )
        );
        const membershipDocs = membershipsSnapshot.docs;

        // Firestore batches allow at most 500 writes. Reserve one write in the
        // first batch for the company document itself.
        for (let start = 0; start < Math.max(membershipDocs.length, 1); ) {
          const isFirstBatch = start === 0;
          const batchSize = isFirstBatch ? 499 : 500;
          const membershipBatch = membershipDocs.slice(
            start,
            start + batchSize
          );
          const batch = writeBatch(db);

          if (isFirstBatch) batch.update(companyRef, details);
          membershipBatch.forEach(membershipDoc => {
            batch.update(membershipDoc.ref, { companyName: details.name });
          });

          await batch.commit();
          start += membershipBatch.length || 1;
        }
        return;
      }

      await updateDoc(companyRef, details);
    },

    inviteEmployee: async (email, permissions, employeeName, jobTitle) => {
      const activeCompany = get().activeCompany;
      const user = get().user;
      if (!activeCompany || !user)
        throw new Error('Active company or user missing');

      const inviteId = crypto.randomUUID();
      const invitation: Invitation = {
        id: inviteId,
        companyId: activeCompany.id,
        companyName: activeCompany.name,
        email: email.toLowerCase().trim(),
        employeeName: employeeName.trim(),
        jobTitle: jobTitle.trim(),
        permissions,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        invitedBy: user.uid
      };

      await setDoc(doc(db, 'invitations', inviteId), invitation);
    },

    updateEmployeePermissions: async (userId, permissions) => {
      const activeCompany = get().activeCompany;
      if (!activeCompany) throw new Error('No active company');

      const membershipId = `${userId}_${activeCompany.id}`;
      const membershipRef = doc(db, 'memberships', membershipId);
      await updateDoc(membershipRef, { permissions });
    },

    updateEmployeeDetails: async (userId, details) => {
      const activeCompany = get().activeCompany;
      if (!activeCompany) throw new Error('No active company');

      const membershipId = `${userId}_${activeCompany.id}`;
      await updateDoc(doc(db, 'memberships', membershipId), details);
    },

    removeEmployee: async userId => {
      const activeCompany = get().activeCompany;
      if (!activeCompany) throw new Error('No active company');

      const membershipId = `${userId}_${activeCompany.id}`;
      await deleteDoc(doc(db, 'memberships', membershipId));
    },

    acceptInvitation: async invitationId => {
      const user = get().user;
      if (!user) throw new Error('User not authenticated');

      const inviteRef = doc(db, 'invitations', invitationId);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) throw new Error('Invitation not found');
      const invite = inviteSnap.data() as Invitation;

      const createdAt = new Date().toISOString();

      const membershipId = `${user.uid}_${invite.companyId}`;
      const membershipRef = doc(db, 'memberships', membershipId);
      const membershipData: Membership = {
        id: membershipId,
        userId: user.uid,
        email: user.email || invite.email,
        employeeName: invite.employeeName,
        jobTitle: invite.jobTitle,
        companyId: invite.companyId,
        companyName: invite.companyName,
        role: 'EMPLOYEE',
        permissions: invite.permissions,
        invitationId: invite.id,
        createdAt
      };
      await setDoc(membershipRef, membershipData);

      await updateDoc(inviteRef, { status: 'ACCEPTED' });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        activeCompanyId: invite.companyId
      });

      const profile = get().profile;
      set({
        profile: profile
          ? { ...profile, activeCompanyId: invite.companyId }
          : profile,
        activeMembership: membershipData,
        activeCompany: null,
        memberships: [
          ...get().memberships.filter(
            membership => membership.id !== membershipId
          ),
          membershipData
        ]
      });
    },

    declineInvitation: async invitationId => {
      const inviteRef = doc(db, 'invitations', invitationId);
      await updateDoc(inviteRef, { status: 'DECLINED' });
    }
  }))
);
