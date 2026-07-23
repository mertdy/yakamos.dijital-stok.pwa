import { create } from 'zustand';
import { deleteField, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/core/firebase/config';
import { getSingletonStore } from '@/shared/utils/getSingletonStore';
import {
  EMPTY_ONBOARDING_PROGRESS,
  mergeLegacyOnboardingProgress,
  normalizeOnboardingProgress,
  type OnboardingProgress
} from '../domain/onboardingTasks';
import type { OnboardingModuleId } from '../domain/onboardingModules';

interface OnboardingState {
  progress: OnboardingProgress;
  loadedUserId: string | null;
  isLoading: boolean;
  isWelcomeOpen: boolean;
  isTourRunning: boolean;
  activeModule: OnboardingModuleId | null;
  loadOnboarding: () => Promise<void>;
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

export const useOnboardingStore = getSingletonStore('onboarding', () =>
  create<OnboardingState>((set, get) => {
    const persistProgress = async (patch: Partial<OnboardingProgress>) => {
      const user = auth.currentUser;
      if (!user || get().loadedUserId !== user.uid) return;

      const nextProgress = normalizeOnboardingProgress({
        ...get().progress,
        ...patch
      });
      set({ progress: nextProgress });
      await setDoc(
        doc(db, 'userPreferences', user.uid),
        { onboarding: nextProgress },
        { merge: true }
      );
    };

    return {
      progress: EMPTY_ONBOARDING_PROGRESS,
      loadedUserId: null,
      isLoading: false,
      isWelcomeOpen: false,
      isTourRunning: false,
      activeModule: null,

      loadOnboarding: async () => {
        const user = auth.currentUser;
        if (!user) {
          get().clearOnboarding();
          return;
        }
        if (get().loadedUserId === user.uid) return;

        set({
          loadedUserId: user.uid,
          isLoading: true,
          isWelcomeOpen: false,
          isTourRunning: false,
          activeModule: null,
          progress: EMPTY_ONBOARDING_PROGRESS
        });

        try {
          const snapshot = await getDoc(doc(db, 'userPreferences', user.uid));
          if (get().loadedUserId !== user.uid) return;
          const preferences = snapshot.data();
          const stored = preferences?.onboarding as
            | Partial<OnboardingProgress>
            | undefined;
          const legacyProgress = preferences?.onboardingByCompany as
            | Record<string, Partial<OnboardingProgress>>
            | undefined;
          const progress = stored
            ? normalizeOnboardingProgress(stored)
            : legacyProgress
              ? mergeLegacyOnboardingProgress(legacyProgress)
              : EMPTY_ONBOARDING_PROGRESS;
          if (!stored && legacyProgress) {
            await setDoc(
              doc(db, 'userPreferences', user.uid),
              { onboarding: progress, onboardingByCompany: deleteField() },
              { merge: true }
            );
          }
          set({
            progress,
            isWelcomeOpen: !progress.welcomeSeenAt,
            isLoading: false
          });
        } catch (error) {
          console.error('Onboarding preferences could not be loaded:', error);
          if (get().loadedUserId === user.uid) {
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
        const now = new Date().toISOString();
        await persistProgress({
          welcomeSeenAt: get().progress.welcomeSeenAt ?? now,
          dismissedAt: now
        });
        set({ isWelcomeOpen: false, isTourRunning: false, activeModule: null });
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
          loadedUserId: null,
          isLoading: false,
          isWelcomeOpen: false,
          isTourRunning: false,
          activeModule: null
        })
    };
  })
);
