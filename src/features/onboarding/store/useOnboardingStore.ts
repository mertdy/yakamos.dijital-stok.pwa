import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/core/firebase/config';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import {
  EMPTY_ONBOARDING_PROGRESS,
  ONBOARDING_VERSION,
  type OnboardingProgress
} from '../domain/onboardingTasks';
import type { OnboardingModuleId } from '../domain/onboardingModules';

interface OnboardingState {
  progress: OnboardingProgress;
  loadedCompanyId: string | null;
  isLoading: boolean;
  isWelcomeOpen: boolean;
  isTourRunning: boolean;
  activeModule: OnboardingModuleId | null;
  loadOnboarding: (companyId: string | null) => Promise<void>;
  markWelcomeSeen: () => Promise<void>;
  startTour: () => Promise<void>;
  stopTour: () => void;
  dismissChecklist: () => Promise<void>;
  restartOnboarding: () => Promise<void>;
  resetOnboardingProgress: () => Promise<void>;
  startModule: (moduleId: OnboardingModuleId) => Promise<void>;
  completeModule: (moduleId: OnboardingModuleId) => Promise<void>;
  saveExampleProductId: (id: string | null) => Promise<void>;
  clearOnboarding: () => void;
}

const normalizeProgress = (value?: Partial<OnboardingProgress>) => ({
  ...EMPTY_ONBOARDING_PROGRESS,
  ...value,
  completedModules: {
    ...(value?.tourCompletedAt ? { 'quick-tour': value.tourCompletedAt } : {}),
    ...value?.completedModules
  },
  version: ONBOARDING_VERSION
});

export const useOnboardingStore = getSingletonStore('onboarding', () =>
  create<OnboardingState>((set, get) => {
    const persistProgress = async (patch: Partial<OnboardingProgress>) => {
      const user = auth.currentUser;
      const companyId = get().loadedCompanyId;
      if (!user || !companyId) return;

      const nextProgress = normalizeProgress({ ...get().progress, ...patch });
      set({ progress: nextProgress });
      await setDoc(
        doc(db, 'userPreferences', user.uid),
        { onboardingByCompany: { [companyId]: nextProgress } },
        { merge: true }
      );
    };

    return {
      progress: EMPTY_ONBOARDING_PROGRESS,
      loadedCompanyId: null,
      isLoading: false,
      isWelcomeOpen: false,
      isTourRunning: false,
      activeModule: null,

      loadOnboarding: async companyId => {
        const user = auth.currentUser;
        if (!user || !companyId) {
          get().clearOnboarding();
          return;
        }
        if (get().loadedCompanyId === companyId) return;

        set({
          loadedCompanyId: companyId,
          isLoading: true,
          isWelcomeOpen: false,
          isTourRunning: false,
          activeModule: null,
          progress: EMPTY_ONBOARDING_PROGRESS
        });

        try {
          const snapshot = await getDoc(doc(db, 'userPreferences', user.uid));
          if (get().loadedCompanyId !== companyId) return;
          const stored = snapshot.data()?.onboardingByCompany?.[companyId] as
            | Partial<OnboardingProgress>
            | undefined;
          const progress = normalizeProgress(stored);
          set({
            progress,
            isWelcomeOpen: !progress.welcomeSeenAt,
            isLoading: false
          });
        } catch (error) {
          console.error('Onboarding preferences could not be loaded:', error);
          if (get().loadedCompanyId === companyId) {
            set({ isLoading: false });
          }
        }
      },

      markWelcomeSeen: async () => {
        await persistProgress({ welcomeSeenAt: new Date().toISOString() });
        set({ isWelcomeOpen: false });
      },

      startTour: async () => {
        if (!get().progress.welcomeSeenAt) {
          await persistProgress({ welcomeSeenAt: new Date().toISOString() });
        }
        set({
          isWelcomeOpen: false,
          isTourRunning: true,
          activeModule: 'quick-tour'
        });
      },

      stopTour: () => set({ isTourRunning: false, activeModule: null }),

      dismissChecklist: async () => {
        await persistProgress({ dismissedAt: new Date().toISOString() });
      },

      restartOnboarding: async () => {
        await persistProgress({ dismissedAt: null });
        set({
          isWelcomeOpen: false,
          isTourRunning: true,
          activeModule: 'quick-tour'
        });
      },

      resetOnboardingProgress: async () => {
        await persistProgress(EMPTY_ONBOARDING_PROGRESS);
        set({ isWelcomeOpen: true, isTourRunning: false, activeModule: null });
      },

      startModule: async moduleId => {
        if (!get().progress.welcomeSeenAt) {
          await persistProgress({ welcomeSeenAt: new Date().toISOString() });
        }
        set({
          isWelcomeOpen: false,
          isTourRunning: true,
          activeModule: moduleId
        });
      },

      completeModule: async moduleId => {
        set({ isTourRunning: false, activeModule: null });
        await persistProgress({
          completedModules: {
            ...get().progress.completedModules,
            [moduleId]: new Date().toISOString()
          }
        });
      },

      saveExampleProductId: async id => {
        await persistProgress({ exampleProductId: id });
      },

      clearOnboarding: () =>
        set({
          progress: EMPTY_ONBOARDING_PROGRESS,
          loadedCompanyId: null,
          isLoading: false,
          isWelcomeOpen: false,
          isTourRunning: false,
          activeModule: null
        })
    };
  })
);
