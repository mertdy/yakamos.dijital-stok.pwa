/**
 * Runs dynamic imports one-by-one when the browser is idle. A cancellation
 * callback prevents a previous company/session from competing with the next.
 */
export const runPrefetch = (
  tasks: Array<() => Promise<unknown>>,
  delay = 0
) => {
  if (typeof window === 'undefined') return () => {};

  let cancelled = false;
  let delayTimer: number | undefined;
  let removeLoadListener: (() => void) | undefined;

  const waitForIdle = () =>
    new Promise<void>(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(), { timeout: 2_000 });
      } else {
        setTimeout(resolve, 100);
      }
    });

  const execute = async () => {
    for (const task of tasks) {
      await waitForIdle();
      if (cancelled) return;
      try {
        await task();
      } catch (error) {
        console.warn('Optional offline prefetch failed', error);
      }
    }
  };

  const schedule = () => {
    if (delay > 0) {
      delayTimer = window.setTimeout(() => void execute(), delay);
      return;
    }
    void execute();
  };

  if (document.readyState === 'complete') schedule();
  else {
    const onLoad = () => schedule();
    window.addEventListener('load', onLoad, { once: true });
    removeLoadListener = () => window.removeEventListener('load', onLoad);
  }

  return () => {
    cancelled = true;
    if (delayTimer !== undefined) window.clearTimeout(delayTimer);
    removeLoadListener?.();
  };
};
