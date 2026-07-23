import { describe, expect, it } from 'vitest';
import { getModuleProgress } from './onboardingModules';

describe('getModuleProgress', () => {
  it('counts only modules that are visible to the current user', () => {
    const result = getModuleProgress(
      {
        'quick-tour': '2026-07-23T08:00:00.000Z',
        customers: '2026-07-23T08:01:00.000Z'
      },
      ['quick-tour', 'sales', 'inventory-filters']
    );

    expect(result).toEqual({ completedCount: 1, totalCount: 3 });
  });
});
