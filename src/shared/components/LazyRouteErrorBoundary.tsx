import { Component, type ReactNode } from 'react';
import { CloudOff } from 'lucide-react';
import { Button, toast } from '@heroui/react';

interface LazyRouteErrorBoundaryProps {
  children: ReactNode;
}

interface LazyRouteErrorBoundaryState {
  hasError: boolean;
}

/**
 * Keeps a failed route chunk scoped to its page. This commonly happens when a
 * page has not been cached yet and the user opens it while offline.
 */
export class LazyRouteErrorBoundary extends Component<
  LazyRouteErrorBoundaryProps,
  LazyRouteErrorBoundaryState
> {
  state: LazyRouteErrorBoundaryState = { hasError: false };
  private hasShownToast = false;

  static getDerivedStateFromError(): LazyRouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    if (this.hasShownToast) return;
    this.hasShownToast = true;
    toast.warning(
      'Bu sayfa şu anda açılamıyor. İnternete bağlandığınızda sayfa hazır olacak.'
    );
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="flex min-h-[60vh] items-center justify-center p-6 text-center">
          <div className="border-warning/20 bg-warning/5 max-w-md rounded-2xl border p-7">
            <CloudOff className="text-warning mx-auto mb-4" size={32} />
            <h1 className="text-lg font-semibold text-gray-900">
              Bu sayfa şu anda açılamıyor
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Sayfa bu cihazda henüz hazır değil. İnternete bağlandığınızda
              tekrar deneyebilirsiniz.
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onPress={this.handleReload}>
              Sayfayı Yenile
            </Button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
