import { beforeAll, beforeEach, afterAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

import rules from '../../../firestore.rules?raw';

const COMPANY_A = 'company-a';
const COMPANY_B = 'company-b';
const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';
const PLATFORM_ADMIN = 'platform-admin';
const PLATFORM_ADMIN_EMAIL = 'm.osmandonmezyurek@gmail.com';

let testEnv: RulesTestEnvironment;

const firestore = (uid: string, email = `${uid}@example.com`) =>
  testEnv.authenticatedContext(uid, { email }).firestore();

const membership = (
  userId: string,
  companyId: string,
  role: 'OWNER' | 'EMPLOYEE' = 'EMPLOYEE',
  permissions: string[] = []
) => ({
  id: `${userId}_${companyId}`,
  userId,
  email: `${userId}@example.com`,
  companyId,
  companyName: companyId,
  role,
  permissions,
  createdAt: '2026-07-21T10:00:00.000Z'
});

const inventory = (companyId: string, id = 'product-1') => ({
  id,
  companyId,
  userId: OWNER_A,
  name: 'Test ürünü',
  stock: 10,
  salePrice: 20,
  updatedAt: '2026-07-21T10:00:00.000Z'
});

const supportReport = (id: string, companyId = COMPANY_A) => ({
  id,
  type: 'BUG',
  title: 'Satış ekranı kapandı',
  description:
    'Kartla ödeme seçildiğinde satış ekranı beklenmedik şekilde kapandı.',
  status: 'OPEN',
  createdBy: OWNER_A,
  createdByEmail: `${OWNER_A}@example.com`,
  recipientEmail: PLATFORM_ADMIN_EMAIL,
  companyId,
  companyName: 'AA',
  route: '/sales',
  appVersion: 'web',
  client: { userAgent: 'vitest', isOnline: true },
  technicalErrors: [],
  screenshot: null,
  createdAt: '2026-07-21T10:00:00.000Z'
});

const seed = async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'companies', COMPANY_A), {
        id: COMPANY_A,
        ownerId: OWNER_A,
        name: 'AA',
        createdAt: '2026-07-21T10:00:00.000Z'
      }),
      setDoc(doc(db, 'companies', COMPANY_B), {
        id: COMPANY_B,
        ownerId: OWNER_B,
        name: 'BB',
        createdAt: '2026-07-21T10:00:00.000Z'
      }),
      setDoc(
        doc(db, 'memberships', `${OWNER_A}_${COMPANY_A}`),
        membership(OWNER_A, COMPANY_A, 'OWNER')
      ),
      setDoc(
        doc(db, 'memberships', `${OWNER_B}_${COMPANY_B}`),
        membership(OWNER_B, COMPANY_B, 'OWNER')
      ),
      setDoc(
        doc(db, 'memberships', `inventory-manager_${COMPANY_A}`),
        membership('inventory-manager', COMPANY_A, 'EMPLOYEE', [
          'MANAGE_INVENTORY'
        ])
      ),
      setDoc(
        doc(db, 'memberships', `cashier_${COMPANY_A}`),
        membership('cashier', COMPANY_A)
      ),
      setDoc(
        doc(db, 'inventory', 'product-a'),
        inventory(COMPANY_A, 'product-a')
      )
    ]);
  });
};

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'dijital-stok-rules-test',
      firestore: { rules }
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seed();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('isolates company inventory from users outside the company', async () => {
    const ownerA = firestore(OWNER_A);
    const ownerB = firestore(OWNER_B);

    await assertSucceeds(getDoc(doc(ownerA, 'inventory', 'product-a')));
    await assertFails(getDoc(doc(ownerB, 'inventory', 'product-a')));
    await assertFails(
      getDocs(
        query(
          collection(ownerB, 'inventory'),
          where('companyId', '==', COMPANY_A)
        )
      )
    );
  });

  it('allows only inventory managers to create products', async () => {
    await assertSucceeds(
      setDoc(
        doc(firestore('inventory-manager'), 'inventory', 'manager-product'),
        inventory(COMPANY_A, 'manager-product')
      )
    );
    await assertFails(
      setDoc(
        doc(firestore('cashier'), 'inventory', 'cashier-product'),
        inventory(COMPANY_A, 'cashier-product')
      )
    );
  });

  it('prevents a product from being moved to another company', async () => {
    await assertFails(
      updateDoc(doc(firestore('inventory-manager'), 'inventory', 'product-a'), {
        companyId: COMPANY_B
      })
    );
  });

  it('allows a regular member to update only sale-driven stock changes', async () => {
    const cashier = firestore('cashier');

    await assertSucceeds(
      updateDoc(doc(cashier, 'inventory', 'product-a'), {
        stock: 9,
        updatedAt: '2026-07-21T10:01:00.000Z'
      })
    );
    await assertFails(
      updateDoc(doc(cashier, 'inventory', 'product-a'), {
        salePrice: 1
      })
    );
  });

  it('allows an invited user to create only the membership defined by their invitation', async () => {
    const invitationId = 'invite-employee-a';
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'invitations', invitationId), {
        id: invitationId,
        companyId: COMPANY_A,
        companyName: 'AA',
        email: 'invited@example.com',
        employeeName: 'Davetli',
        jobTitle: 'Kasiyer',
        role: 'EMPLOYEE',
        permissions: ['TAKE_PAYMENT'],
        status: 'PENDING',
        invitedBy: OWNER_A,
        createdAt: '2026-07-21T10:00:00.000Z'
      });
    });

    const invited = firestore('invited', 'invited@example.com');
    await assertSucceeds(
      setDoc(doc(invited, 'memberships', `invited_${COMPANY_A}`), {
        ...membership('invited', COMPANY_A, 'EMPLOYEE', ['TAKE_PAYMENT']),
        email: 'invited@example.com',
        invitationId
      })
    );
    await assertFails(
      setDoc(doc(invited, 'memberships', `invited_${COMPANY_B}`), {
        ...membership('invited', COMPANY_B, 'EMPLOYEE', ['MANAGE_INVENTORY']),
        email: 'invited@example.com',
        invitationId
      })
    );
  });

  it('keeps user preferences private and shared quick-add permissioned', async () => {
    const cashier = firestore('cashier');
    const ownerA = firestore(OWNER_A);

    await assertSucceeds(
      setDoc(doc(cashier, 'userPreferences', 'cashier'), {
        quickAddItemsByCompany: { [COMPANY_A]: ['product-a'] }
      })
    );
    await assertFails(getDoc(doc(ownerA, 'userPreferences', 'cashier')));
    await assertFails(
      setDoc(doc(cashier, 'companyPreferences', COMPANY_A), {
        companyId: COMPANY_A,
        quickAddItems: ['product-a']
      })
    );
    await assertSucceeds(
      setDoc(doc(ownerA, 'companyPreferences', COMPANY_A), {
        companyId: COMPANY_A,
        quickAddItems: ['product-a']
      })
    );
  });

  it('allows company members to submit support reports only to platform support', async () => {
    const ownerA = firestore(OWNER_A);

    await assertSucceeds(
      setDoc(
        doc(ownerA, 'supportReports', 'support-report-1'),
        supportReport('support-report-1')
      )
    );
    await assertFails(
      setDoc(doc(ownerA, 'supportReports', 'support-report-2'), {
        ...supportReport('support-report-2'),
        recipientEmail: 'someone-else@example.com'
      })
    );
    await assertFails(
      setDoc(
        doc(firestore(OWNER_B), 'supportReports', 'support-report-3'),
        supportReport('support-report-3', COMPANY_A)
      )
    );
  });

  it('keeps support reports private for their author and platform support', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(
        doc(context.firestore(), 'supportReports', 'support-report-1'),
        supportReport('support-report-1')
      );
    });

    await assertSucceeds(
      getDoc(doc(firestore(OWNER_A), 'supportReports', 'support-report-1'))
    );
    await assertFails(
      getDoc(doc(firestore('cashier'), 'supportReports', 'support-report-1'))
    );
    await assertSucceeds(
      getDoc(
        doc(
          firestore(PLATFORM_ADMIN, PLATFORM_ADMIN_EMAIL),
          'supportReports',
          'support-report-1'
        )
      )
    );
  });

  it('allows only platform support to read support notification events', async () => {
    const notification = {
      id: 'notification-1',
      kind: 'SUPPORT_REPORT',
      recipientEmail: PLATFORM_ADMIN_EMAIL,
      title: 'Yeni destek kaydı',
      body: 'AA · Hata bildirimi Satış ekranı kapandı',
      resourceType: 'supportReport',
      resourceId: 'support-report-1',
      createdBy: OWNER_A,
      companyId: COMPANY_A,
      isRead: false,
      createdAt: '2026-07-21T10:00:00.000Z',
      delivery: { transport: 'wirepusher-client', status: 'REQUESTED' }
    };

    await assertSucceeds(
      setDoc(
        doc(firestore(OWNER_A), 'notifications', notification.id),
        notification
      )
    );
    await assertFails(
      getDoc(doc(firestore(OWNER_A), 'notifications', notification.id))
    );
    await assertSucceeds(
      getDoc(
        doc(
          firestore(PLATFORM_ADMIN, PLATFORM_ADMIN_EMAIL),
          'notifications',
          notification.id
        )
      )
    );
  });
});
