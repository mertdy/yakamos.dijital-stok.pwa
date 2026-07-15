import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import posthog from 'posthog-js';
import { AppErrorBoundary } from './AppErrorBoundary';

vi.mock('posthog-js', () => ({
  default: { captureException: vi.fn() }
}));

const ThrowRenderError = () => {
  throw new Error('Render failed');
};

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a recovery screen and records React render errors', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <ThrowRenderError />
      </AppErrorBoundary>
    );

    expect(
      screen.getByRole('heading', { name: 'Bir sorun yaşıyoruz' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'İletişime Geç' })).toHaveAttribute(
      'href',
      'https://example.com'
    );
    await waitFor(() => {
      expect(posthog.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ error_source: 'react_error_boundary' })
      );
    });

    consoleError.mockRestore();
  });

  it('shows the recovery screen for unhandled promise rejections', async () => {
    render(
      <AppErrorBoundary>
        <p>Uygulama açık</p>
      </AppErrorBoundary>
    );

    await act(async () => {
      window.dispatchEvent(
        new Event('unhandledrejection') as PromiseRejectionEvent
      );
    });

    expect(await screen.findByText('Bir sorun yaşıyoruz')).toBeInTheDocument();
    expect(posthog.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ error_source: 'unhandled_rejection' })
    );
  });

  it('uses the supplied retry action', () => {
    const onRetry = vi.fn();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      <AppErrorBoundary onRetry={onRetry}>
        <ThrowRenderError />
      </AppErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tekrar Dene' }));

    expect(onRetry).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
