import type { OnboardingModuleCompletion } from './onboardingModules';

export interface OnboardingProgress {
  version: number;
  welcomeSeenAt: string | null;
  tourCompletedAt: string | null;
  dismissedAt: string | null;
  exampleProductId: string | null;
  completedModules: OnboardingModuleCompletion;
}

export const ONBOARDING_VERSION = 1;

export const EMPTY_ONBOARDING_PROGRESS: OnboardingProgress = {
  version: ONBOARDING_VERSION,
  welcomeSeenAt: null,
  tourCompletedAt: null,
  dismissedAt: null,
  exampleProductId: null,
  completedModules: {}
};

const newest = (...values: Array<string | null | undefined>) =>
  values.reduce<string | null>(
    (latest, value) => (!value || (latest && latest >= value) ? latest : value),
    null
  );

/** Migrates company-scoped progress to the single account-scoped guide. */
export const mergeLegacyOnboardingProgress = (
  progressByCompany: Record<string, Partial<OnboardingProgress>>
): OnboardingProgress => {
  const entries = Object.values(progressByCompany);
  return normalizeOnboardingProgress({
    welcomeSeenAt: newest(...entries.map(entry => entry.welcomeSeenAt)),
    tourCompletedAt: newest(...entries.map(entry => entry.tourCompletedAt)),
    dismissedAt: newest(...entries.map(entry => entry.dismissedAt)),
    exampleProductId:
      entries.find(entry => entry.exampleProductId)?.exampleProductId ?? null,
    completedModules: entries.reduce<OnboardingProgress['completedModules']>(
      (modules, entry) => {
        Object.entries(entry.completedModules ?? {}).forEach(([id, date]) => {
          const moduleId = id as keyof OnboardingProgress['completedModules'];
          const completedAt = newest(modules[moduleId], date);
          if (completedAt) modules[moduleId] = completedAt;
        });
        return modules;
      },
      {}
    )
  });
};

export const normalizeOnboardingProgress = (
  value?: Partial<OnboardingProgress>
): OnboardingProgress => ({
  ...EMPTY_ONBOARDING_PROGRESS,
  ...value,
  completedModules: {
    ...(value?.tourCompletedAt ? { 'quick-tour': value.tourCompletedAt } : {}),
    ...value?.completedModules
  },
  version: ONBOARDING_VERSION
});
