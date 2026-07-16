import { act, renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PWAInstallProvider,
  usePWAInstall,
  type BeforeInstallPromptEvent
} from './usePWAInstall';

const { isNativePlatform } = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false)
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform }
}));

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(PWAInstallProvider, null, children);

const createPromptEvent = (outcome: 'accepted' | 'dismissed') => {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  Object.assign(event, {
    preventDefault: vi.fn(),
    prompt: vi.fn().mockResolvedValue({ outcome, platform: 'web' }),
    userChoice: Promise.resolve({ outcome, platform: 'web' })
  });
  return event;
};

describe('usePWAInstall', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  it('starts hidden until the browser provides an install prompt', () => {
    const { result } = renderHook(() => usePWAInstall(), { wrapper });

    expect(result.current.isInstallable).toBe(false);
    expect(result.current.deviceType).toBe('desktop');
  });

  it('retains the browser event and exposes the in-app install action', () => {
    const { result } = renderHook(() => usePWAInstall(), { wrapper });
    const event = createPromptEvent('accepted');

    act(() => window.dispatchEvent(event));

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(result.current.isInstallable).toBe(true);
  });

  it('clears the event after an accepted installation', async () => {
    const { result } = renderHook(() => usePWAInstall(), { wrapper });
    const event = createPromptEvent('accepted');
    act(() => window.dispatchEvent(event));

    let outcome: 'accepted' | 'dismissed' | undefined;
    await act(async () => {
      outcome = await result.current.installApp();
    });

    expect(event.prompt).toHaveBeenCalledOnce();
    expect(outcome).toBe('accepted');
    expect(result.current.isInstallable).toBe(false);
  });

  it('clears the event after a dismissed installation prompt', async () => {
    const { result } = renderHook(() => usePWAInstall(), { wrapper });
    const event = createPromptEvent('dismissed');
    act(() => window.dispatchEvent(event));

    await act(async () => {
      await result.current.installApp();
    });

    expect(event.prompt).toHaveBeenCalledOnce();
    expect(result.current.isInstallable).toBe(false);
  });

  it('hides the in-app action when installation happens through browser UI', () => {
    const { result } = renderHook(() => usePWAInstall(), { wrapper });
    act(() => window.dispatchEvent(createPromptEvent('accepted')));
    expect(result.current.isInstallable).toBe(true);

    act(() => window.dispatchEvent(new Event('appinstalled')));

    expect(result.current.isInstallable).toBe(false);
  });
});
