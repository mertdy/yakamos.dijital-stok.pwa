// Çevrimdışı ve günlük kritik olan sayfalar (Aşama 1 - Immediate Idle)
export const corePrefetches = [
  () => import('@/features/dashboard/views/DashboardView'),
  () => import('@/features/inventory/views/InventoryView'),
  () => import('@/features/customers/views/CustomerListView'),
  () => import('@/features/sales-history/views/SalesHistoryView')
];

// İdari ve ikincil sayfalar (Aşama 2 - Delayed Idle)
export const secondaryPrefetches = [
  () => import('@/features/auth/views/AccountSettingsView'),
  () => import('@/features/auth/views/ChangelogView'),
  () => import('@/features/dashboard/views/CompanySettingsView'),
  () => import('@/features/dashboard/components/CompanyTransferModal'),
  () => import('@/features/support/components/SupportModal'),
  () => import('@/features/dashboard/views/PricingPlansView'),
  () => import('@/features/promotions/views/PromotionsView'),
  () => import('@/features/inventory/components/BulkInventoryEditDrawer')
];
