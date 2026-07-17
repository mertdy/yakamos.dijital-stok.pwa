import type { StoreApi, UseBoundStore } from 'zustand';

type BoundStore<T> = UseBoundStore<StoreApi<T>>;

type StoreRegistry = Record<string, BoundStore<unknown>>;

const STORE_REGISTRY_KEY = '__dijitalStokStoreRegistry__';

/**
 * Keeps Zustand store instances stable while Vite replaces modules during HMR.
 * The registry lives only for the lifetime of the current browser page.
 */
export const getSingletonStore = <T>(
  key: string,
  createStore: () => BoundStore<T>
): BoundStore<T> => {
  const globalScope = globalThis as typeof globalThis & {
    [STORE_REGISTRY_KEY]?: StoreRegistry;
  };
  const registry = (globalScope[STORE_REGISTRY_KEY] ??= {});
  const existingStore = registry[key] as BoundStore<T> | undefined;

  if (existingStore) return existingStore;

  const store = createStore();
  registry[key] = store as BoundStore<unknown>;
  return store;
};
