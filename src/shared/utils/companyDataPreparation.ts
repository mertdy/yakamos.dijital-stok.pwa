/**
 * Hydrates company data after the authenticated shell has rendered. Keeping
 * these imports here prevents inventory, customer and history features from
 * becoming initial-login dependencies while preserving offline preparation.
 */
export const loadCompanyData = async () => {
  const [
    { useInventoryStore },
    { useCategoryStore },
    { useCustomerStore },
    { useSalesHistoryStore },
    { usePricingRuleStore }
  ] = await Promise.all([
    import('@/features/inventory/store/useInventoryStore'),
    import('@/features/inventory/store/useCategoryStore'),
    import('@/features/customers/store/useCustomerStore'),
    import('@/features/sales-history/store/useSalesHistoryStore'),
    import('@/features/promotions/store/usePricingRuleStore')
  ]);

  useInventoryStore.getState().loadItems();
  useCategoryStore.getState().loadCategories();
  useCustomerStore.getState().loadCustomers();
  useSalesHistoryStore.getState().fetchSales();
  usePricingRuleStore.getState().loadRules();
};

export const refreshSalesHistoryData = async () => {
  const { useSalesHistoryStore } =
    await import('@/features/sales-history/store/useSalesHistoryStore');
  await useSalesHistoryStore.getState().fetchSales({ force: true });
};
