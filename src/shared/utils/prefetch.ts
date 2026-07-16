/**
 * Runs a list of dynamic imports sequentially when the browser is idle.
 * Can be delayed using the `delay` parameter.
 */
export const runPrefetch = (tasks: (() => Promise<any>)[], delay = 0) => {
  if (typeof window === 'undefined') return;

  const execute = () => {
    tasks.forEach(task => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => task());
      } else {
        setTimeout(task, 100);
      }
    });
  };

  if (delay > 0) {
    setTimeout(execute, delay);
  } else {
    if (document.readyState === 'complete') {
      execute();
    } else {
      window.addEventListener('load', execute);
    }
  }
};
