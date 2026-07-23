import { describe, expect, it } from 'vitest';
import { mergeLegacyOnboardingProgress } from './onboardingTasks';

describe('mergeLegacyOnboardingProgress', () => {
  it('combines company-scoped guide progress into one account record', () => {
    expect(
      mergeLegacyOnboardingProgress({
        first: {
          welcomeSeenAt: '2026-07-20T10:00:00.000Z',
          completedModules: { sales: '2026-07-20T11:00:00.000Z' }
        },
        second: {
          dismissedAt: '2026-07-21T10:00:00.000Z',
          completedModules: {
            'quick-tour': '2026-07-21T09:00:00.000Z',
            sales: '2026-07-21T11:00:00.000Z'
          }
        }
      })
    ).toMatchObject({
      welcomeSeenAt: '2026-07-20T10:00:00.000Z',
      dismissedAt: '2026-07-21T10:00:00.000Z',
      completedModules: {
        'quick-tour': '2026-07-21T09:00:00.000Z',
        sales: '2026-07-21T11:00:00.000Z'
      }
    });
  });
});
