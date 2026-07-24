import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFirestorePersistence } from './sessionCleanup';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  clearIndexedDbPersistence: vi.fn(),
  terminate: vi.fn()
}));

vi.mock('@/core/firebase/config', () => ({
  db: {}
}));

describe('clearFirestorePersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(terminate).mockResolvedValue(undefined);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('times out and preserves a cleanup retry marker when persistence clearing stalls', async () => {
    vi.mocked(clearIndexedDbPersistence).mockImplementation(
      () => new Promise(() => undefined)
    );

    const cleanup = clearFirestorePersistence(50);
    await vi.advanceTimersByTimeAsync(50);

    await expect(cleanup).resolves.toBe(false);
    expect(localStorage.getItem('dijital-stok.local-cleanup-required.v1')).toBe(
      'true'
    );
  });
});
