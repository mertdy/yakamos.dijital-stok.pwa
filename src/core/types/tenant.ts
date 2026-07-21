export interface Company {
  id: string;
  name: string;
  ownerId: string;
  receiptHeader?: string | null;
  phone?: string | null;
  address?: string | null;
  /** Used by products that do not define their own low-stock threshold. */
  defaultLowStockThreshold?: number;
  createdAt: string;
}

export type UserRole = 'OWNER' | 'EMPLOYEE';

export type PermissionKey =
  | 'VIEW_DASHBOARD'
  | 'MANAGE_INVENTORY'
  | 'MANAGE_CATEGORIES'
  | 'MANAGE_CUSTOMERS'
  | 'TAKE_PAYMENT'
  | 'SHARE_CUSTOMER_STATEMENT'
  | 'VIEW_SALES_HISTORY'
  | 'MANAGE_SALES_HISTORY'
  | 'MANAGE_COMPANY_QUICK_ADD'
  | 'MANAGE_PROMOTIONS';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  activeCompanyId: string | null;
  createdAt: string;
}

export interface Membership {
  id: string; // "userId_companyId"
  userId: string;
  email?: string;
  employeeName?: string;
  jobTitle?: string;
  companyId: string;
  companyName: string;
  role: UserRole;
  permissions: PermissionKey[];
  /** Present only for employee memberships created by accepting an invitation. */
  invitationId?: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  companyId: string;
  companyName: string;
  email: string;
  employeeName: string;
  jobTitle: string;
  permissions: PermissionKey[];
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  invitedBy: string;
}
