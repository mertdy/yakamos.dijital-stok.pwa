import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePWAUpdate } from './usePWAUpdate';

const toastMock = vi.hoisted(() =>
  Object.assign(vi.fn(), {
    success: vi.fn(),
    warning: vi.fn(),
    danger: vi.fn()
  })
);

vi.mock('@heroui/react', () => ({ toast: toastMock }));
vi.mock('@/features/sales/store/useSalesStore', () => ({
  useSalesStore: (selector: (state: unknown) => unknown) =>
    selector({ heldSales: [], isProcessing: false })
}));

describe('usePWAUpdate', () => {
  let registration: ServiceWorkerRegistration;
  let updateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.setItem('pwa-successfully-opened', 'true');
    updateMock = vi.fn();
    registration = {
      waiting: null,
      installing: null,
      update: updateMock,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as ServiceWorkerRegistration;
    updateMock.mockResolvedValue(registration);

    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: {
        ready: Promise.resolve(registration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    });
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem('pwa-successfully-opened');
  });

  const renderUpdateHook = async () => {
    const hook = renderHook(() => usePWAUpdate(true));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    updateMock.mockClear();
    toastMock.mockClear();
    toastMock.success.mockClear();
    return hook;
  };

  it('shows an up-to-date toast when a manual check finds no update', async () => {
    const { result, unmount } = await renderUpdateHook();

    await act(async () => {
      await result.current.checkForUpdate({ showStatus: true });
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith('Uygulama güncel.');
    unmount();
  });

  it('uses the standard update toast when a waiting version exists', async () => {
    const { result, unmount } = await renderUpdateHook();
    Object.defineProperty(registration, 'waiting', {
      configurable: true,
      value: {}
    });

    await act(async () => {
      await result.current.checkForUpdate({ showStatus: true });
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Yeni sürüm hazır!',
      expect.objectContaining({
        variant: 'accent',
        timeout: 0,
        actionProps: expect.objectContaining({ children: 'Şimdi yenile' })
      })
    );
    unmount();
  });
});
