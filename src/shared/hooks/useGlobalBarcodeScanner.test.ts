import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGlobalBarcodeScanner } from './useGlobalBarcodeScanner';

describe('useGlobalBarcodeScanner', () => {
  let currentTime: number;

  const pressKey = (key: string, elapsed = 10) => {
    currentTime += elapsed;
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true
    });
    act(() => document.dispatchEvent(event));
    return event;
  };

  const scan = (barcode: string) => {
    for (const character of barcode) pressKey(character);
    return pressKey('Enter');
  };

  beforeEach(() => {
    currentTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('claims a valid scanner Enter before downstream keyboard shortcuts', () => {
    const onScan = vi.fn();
    const downstreamListener = vi.fn();
    const { unmount } = renderHook(() => useGlobalBarcodeScanner({ onScan }));
    document.addEventListener('keydown', downstreamListener);

    for (const character of '8691234567890') pressKey(character);
    downstreamListener.mockClear();
    const enterEvent = pressKey('Enter');

    expect(onScan).toHaveBeenCalledWith('8691234567890');
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(downstreamListener).not.toHaveBeenCalled();

    document.removeEventListener('keydown', downstreamListener);
    unmount();
  });

  it('adds repeated scans without allowing Enter to trigger checkout', () => {
    let cartQuantity = 0;
    const checkout = vi.fn();
    const { unmount } = renderHook(() =>
      useGlobalBarcodeScanner({
        onScan: () => {
          cartQuantity += 1;
        }
      })
    );
    const checkoutShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && cartQuantity > 0) checkout();
    };
    document.addEventListener('keydown', checkoutShortcut);

    scan('8691234567890');
    scan('8691234567890');

    expect(cartQuantity).toBe(2);
    expect(checkout).not.toHaveBeenCalled();

    document.removeEventListener('keydown', checkoutShortcut);
    unmount();
  });

  it('allows an ordinary Enter to reach keyboard shortcuts', () => {
    const onScan = vi.fn();
    const downstreamListener = vi.fn();
    const { unmount } = renderHook(() => useGlobalBarcodeScanner({ onScan }));
    document.addEventListener('keydown', downstreamListener);

    const enterEvent = pressKey('Enter');

    expect(onScan).not.toHaveBeenCalled();
    expect(enterEvent.defaultPrevented).toBe(false);
    expect(downstreamListener).toHaveBeenCalledWith(enterEvent);

    document.removeEventListener('keydown', downstreamListener);
    unmount();
  });

  it('does not treat slow manual typing as a barcode scan', () => {
    const onScan = vi.fn();
    const downstreamListener = vi.fn();
    const { unmount } = renderHook(() => useGlobalBarcodeScanner({ onScan }));
    document.addEventListener('keydown', downstreamListener);

    pressKey('1');
    pressKey('2', 100);
    pressKey('3', 100);
    downstreamListener.mockClear();
    const enterEvent = pressKey('Enter');

    expect(onScan).not.toHaveBeenCalled();
    expect(enterEvent.defaultPrevented).toBe(false);
    expect(downstreamListener).toHaveBeenCalledWith(enterEvent);

    document.removeEventListener('keydown', downstreamListener);
    unmount();
  });
});
