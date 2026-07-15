export interface Company {
  id: string;
  name: string;
  ownerId: string;
  receiptHeader?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
}

export type UserRole = 'OWNER' | 'EMPLOYEE';

export type PermissionKey =
  | 'VIEW_DASHBOARD'
  | 'MANAGE_INVENTORY'
  | 'MANAGE_CUSTOMERS'
  | 'TAKE_PAYMENT'
  | 'SHARE_CUSTOMER_STATEMENT'
  | 'VIEW_SALES_HISTORY'
  | 'MANAGE_SALES_HISTORY';

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
