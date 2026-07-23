/**
 * Feature stores are loaded only when their feature is needed. Logout is the
 * one place that must clear all of them, so load that cleanup graph on demand
 * instead of coupling the authentication shell to every feature bundle.
 */
export const clearFeatureSessionData = async () => {
  const [
    { useInventoryStore },
    { useCustomerStore },
    { useSalesStore },
    { usePreferencesStore },
    { useSalesHistoryStore },
    { usePricingRuleStore },
    { useOnboardingStore }
  ] = await Promise.all([
    import('@/features/inventory/store/useInventoryStore'),
    import('@/features/customers/store/useCustomerStore'),
    import('@/features/sales/store/useSalesStore'),
    import('@/features/sales/store/usePreferencesStore'),
    import('@/features/sales-history/store/useSalesHistoryStore'),
    import('@/features/promotions/store/usePricingRuleStore'),
    import('@/features/onboarding/store/useOnboardingStore')
  ]);

  useInventoryStore.getState().clearItems();
  useCustomerStore.getState().clearCustomers();
  useSalesStore.getState().clearCart();
  useSalesStore.getState().clearHeldSales();
  useSalesHistoryStore.getState().clearSales();
  usePricingRuleStore.getState().clearRules();
  usePreferencesStore.getState().clearPreferences();
  useOnboardingStore.getState().clearOnboarding();
};
