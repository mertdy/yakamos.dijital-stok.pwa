import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Package } from 'lucide-react';
import { Button } from '@heroui/react';

export const LoginView: React.FC = () => {
  const { loginWithGoogle, isLoading } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="animate-appearance-in flex w-full max-w-md flex-col items-center rounded-[32px] bg-white p-8 text-center shadow-xl">
        <div className="bg-primary/10 text-primary mb-6 flex h-20 w-20 items-center justify-center rounded-3xl shadow-inner">
          <Package size={40} />
        </div>

        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">
          Dijital Stok
        </h1>
        <p className="mb-8 font-medium text-gray-500">
          Bulut tabanlı modern stok ve satış yönetimi.
        </p>

        <Button
          variant="primary"
          size="lg"
          className="flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-lg shadow-lg"
          onPress={loginWithGoogle}
          isPending={isLoading}>
          {/* Google Logo */}
          {!isLoading && (
            <svg
              className="h-6 w-6 rounded-full bg-white p-1"
              viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Google ile Giriş Yap
        </Button>
      </div>
    </div>
  );
};
