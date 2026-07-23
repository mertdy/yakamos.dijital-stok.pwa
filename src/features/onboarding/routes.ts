import { lazy } from 'react';

export const OnboardingExperience = lazy(() =>
  import('./components/OnboardingExperience').then(module => ({
    default: module.OnboardingExperience
  }))
);
