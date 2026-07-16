import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@heroui/react';
import { LazyRouteErrorBoundary } from './LazyRouteErrorBoundary';

vi.mock('@heroui/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@heroui/react')>();
  return {
    ...actual,
    toast: { warning: vi.fn() }
  };
});

const ThrowLazyLoadError = () => {
  throw new TypeError('Failed to fetch dynamically imported module');
};

describe('LazyRouteErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the application shell alive and notifies the user after a route chunk fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <LazyRouteErrorBoundary>
        <ThrowLazyLoadError />
      </LazyRouteErrorBoundary>
    );

    expect(
      screen.getByRole('heading', { name: 'Bu sayfa şu anda açılamıyor' })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        'Bu sayfa şu anda açılamıyor. İnternete bağlandığınızda sayfa hazır olacak.'
      );
    });

    consoleError.mockRestore();
  });
});
