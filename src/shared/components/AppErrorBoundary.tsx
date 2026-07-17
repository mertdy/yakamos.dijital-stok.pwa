import { Component, type ErrorInfo, type ReactNode } from 'react';
import posthog from 'posthog-js';

const CONTACT_URL = 'https://example.com';

type ErrorSource =
  | 'react_error_boundary'
  | 'window_error'
  | 'unhandled_rejection';

interface AppErrorBoundaryProps {
  children: ReactNode;
  contactUrl?: string;
  onRetry?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

const toError = (reason: unknown, fallbackMessage: string): Error =>
  reason instanceof Error ? reason : new Error(fallbackMessage);

const isLazyModuleLoadError = (error: Error) =>
  /dynamically imported module|importing a module script failed|chunkloaderror/i.test(
    error.message
  );

const reportApplicationError = (
  error: Error,
  source: ErrorSource,
  componentStack?: string
) => {
  try {
    posthog.captureException(error, {
      context: 'application_recovery_screen',
      error_source: source,
      route: window.location.pathname,
      component_stack: componentStack?.slice(0, 2000)
    });
  } catch (reportingError) {
    console.error('Application error reporting failed:', reportingError);
  }
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };
  private hasReportedError = false;

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection
    );
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection
    );
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.reportOnce(
      error,
      'react_error_boundary',
      errorInfo.componentStack ?? undefined
    );
  }

  private handleWindowError = (event: ErrorEvent) => {
    const error = toError(
      event.error,
      event.message || 'Beklenmeyen tarayıcı hatası'
    );
    // A route-level boundary can recover a failed lazy chunk. Let it render
    // its offline-specific fallback instead of replacing the entire app.
    if (isLazyModuleLoadError(error)) return;
    this.handleFatalError(error, 'window_error');
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = toError(event.reason, 'Yakalanmamış asenkron işlem hatası');
    if (isLazyModuleLoadError(error)) return;
    this.handleFatalError(error, 'unhandled_rejection');
  };

  private handleFatalError(error: Error, source: ErrorSource) {
    if (this.state.hasError) return;
    this.reportOnce(error, source);
    this.setState({ hasError: true });
  }

  private reportOnce(
    error: Error,
    source: ErrorSource,
    componentStack?: string
  ) {
    if (this.hasReportedError) return;
    this.hasReportedError = true;
    reportApplicationError(error, source, componentStack);
  }

  private handleRetry = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
      return;
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          aria-live="assertive"
          className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-900">
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              !
            </div>
            <h1 className="text-xl font-bold">Bir sorun yaşıyoruz</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              İnceleme kaydı alınmıştır. Lütfen daha sonra tekrar deneyiniz.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={this.handleRetry}
                className="bg-primary hover:bg-primary/90 inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors">
                Tekrar Dene
              </button>
              <a
                href={this.props.contactUrl ?? CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                İletişime Geç
              </a>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
