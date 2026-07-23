import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runPrefetch } from './prefetch';

describe('runPrefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete'
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads optional chunks sequentially while idle', async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);

    runPrefetch([first, second]);

    await vi.advanceTimersByTimeAsync(100);
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(second).toHaveBeenCalledOnce();
  });

  it('does not start delayed work after cancellation', async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    const cancel = runPrefetch([task], 1_000);

    cancel();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(task).not.toHaveBeenCalled();
  });
});
