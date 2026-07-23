export const ONBOARDING_MODULE_IDS = [
  'quick-tour',
  'sales',
  'inventory-filters',
  'customers'
] as const;

export type OnboardingModuleId = (typeof ONBOARDING_MODULE_IDS)[number];

export type OnboardingModuleCompletion = Partial<
  Record<OnboardingModuleId, string>
>;

export const getModuleProgress = (
  completedModules: OnboardingModuleCompletion,
  visibleModuleIds: OnboardingModuleId[]
) => ({
  completedCount: visibleModuleIds.filter(id => Boolean(completedModules[id]))
    .length,
  totalCount: visibleModuleIds.length
});
