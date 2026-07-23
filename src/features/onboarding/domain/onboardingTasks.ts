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
