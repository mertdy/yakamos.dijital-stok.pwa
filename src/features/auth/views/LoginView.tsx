import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useAuthStore } from '../store/useAuthStore';
import { Package, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@heroui/react';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı')
});

const registerSchema = z
  .object({
    email: z.email('Geçerli bir e-posta girin'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
    confirmPassword: z.string()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword']
  });

const forgotSchema = z.object({
  email: z.email('Geçerli bir e-posta girin')
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotFormData = z.infer<typeof forgotSchema>;
type ActiveTab = 'login' | 'register';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
  rightElement?: React.ReactNode;
  autoComplete?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  placeholder,
  error,
  registration,
  rightElement,
  autoComplete
}) => (
  <div className="flex flex-col gap-1.5 text-left">
    <label htmlFor={id} className="text-sm font-semibold text-gray-700">
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all outline-none focus:ring-2 focus:ring-blue-500/30 ${
          error
            ? 'border-red-400 bg-red-50 focus:border-red-400'
            : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white'
        } ${rightElement ? 'pr-12' : ''}`}
        {...registration}
      />
      {rightElement && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {rightElement}
        </div>
      )}
    </div>
    {error && (
      <p
        id={`${id}-error`}
        role="alert"
        className="mt-0.5 text-xs font-medium text-red-500">
        {error}
      </p>
    )}
  </div>
);

// ─── Password Toggle Hook ─────────────────────────────────────────────────────

function usePasswordToggle() {
  const [show, setShow] = useState(false);
  const toggle = () => setShow(v => !v);
  const Icon = show ? EyeOff : Eye;
  return { show, toggle, Icon };
}

// ─── Google Divider ───────────────────────────────────────────────────────────

const GoogleDivider: React.FC = () => (
  <div className="relative flex items-center gap-3 py-1">
    <div className="h-px flex-1 bg-gray-200" />
    <span className="text-xs font-medium text-gray-400">veya</span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
);

const GoogleIcon: React.FC = () => (
  <svg
    className="h-5 w-5 shrink-0 rounded-full bg-white p-0.5"
    viewBox="0 0 24 24"
    aria-hidden="true">
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
);

// ─── Forgot Password Screen ───────────────────────────────────────────────────

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBack
}) => {
  const { resetPassword, isLoading, authError, clearError } = useAuthStore();
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotFormData>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (data: ForgotFormData) => {
    clearError();
    try {
      await resetPassword(data.email);
      setSuccessEmail(data.email);
    } catch {
      // error is stored in authError
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 self-start text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
        aria-label="Giriş ekranına dön">
        <ArrowLeft size={16} />
        Geri dön
      </button>

      <div>
        <h2 className="text-xl font-bold text-gray-900">Şifre Sıfırlama</h2>
        <p className="mt-1 text-sm text-gray-500">
          E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.
        </p>
      </div>

      {successEmail ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-green-50 p-6 text-center">
          <CheckCircle
            size={40}
            className="text-green-500"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-green-700">
            <strong>{successEmail}</strong> adresine sıfırlama bağlantısı
            gönderildi. E-postanızı kontrol edin.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-1 text-sm font-semibold text-blue-600 hover:underline">
            Giriş sayfasına dön
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4">
          <FormField
            id="forgot-email"
            label="E-posta adresi"
            type="email"
            placeholder="ornek@eposta.com"
            autoComplete="email"
            error={errors.email?.message}
            registration={register('email')}
          />

          {authError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {authError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-1 w-full rounded-2xl py-3.5 text-base font-semibold shadow-sm"
            isPending={isLoading}>
            Bağlantı Gönder
          </Button>
        </form>
      )}
    </div>
  );
};

// ─── Login Form ───────────────────────────────────────────────────────────────

interface LoginFormProps {
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword }) => {
  const { loginWithEmail, loginWithGoogle, isLoading, authError, clearError } =
    useAuthStore();
  const pw = usePasswordToggle();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await loginWithEmail(data.email, data.password);
    } catch {
      // error is stored in authError
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4">
      <FormField
        id="login-email"
        label="E-posta"
        type="email"
        placeholder="ornek@eposta.com"
        autoComplete="email"
        error={errors.email?.message}
        registration={register('email')}
      />

      <FormField
        id="login-password"
        label="Şifre"
        type={pw.show ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        registration={register('password')}
        rightElement={
          <button
            type="button"
            onClick={pw.toggle}
            aria-label={pw.show ? 'Şifreyi gizle' : 'Şifreyi göster'}
            className="text-gray-400 transition-colors hover:text-gray-600">
            <pw.Icon size={18} />
          </button>
        }
      />

      <div className="flex justify-end">
        <button
          type="button"
          id="forgot-password-btn"
          onClick={onForgotPassword}
          className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline">
          Şifremi Unuttum
        </button>
      </div>

      {authError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {authError}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        id="login-submit-btn"
        className="w-full rounded-2xl py-3.5 text-base font-semibold shadow-sm"
        isPending={isLoading}>
        Giriş Yap
      </Button>

      <GoogleDivider />

      <Button
        type="button"
        variant="outline"
        size="lg"
        id="google-login-btn"
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-gray-200 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        onPress={loginWithGoogle}
        isPending={isLoading}>
        {!isLoading && <GoogleIcon />}
        Google ile Giriş Yap
      </Button>
    </form>
  );
};

// ─── Register Form ────────────────────────────────────────────────────────────

const RegisterForm: React.FC = () => {
  const {
    registerWithEmail,
    loginWithGoogle,
    isLoading,
    authError,
    clearError
  } = useAuthStore();
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const pw = usePasswordToggle();
  const confirmPw = usePasswordToggle();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    try {
      await registerWithEmail(data.email, data.password);
      setEmailSent(data.email);
    } catch {
      // error is stored in authError
    }
  };

  if (emailSent) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-blue-50 p-6 text-center">
        <CheckCircle size={44} className="text-blue-500" aria-hidden="true" />
        <div>
          <p className="font-semibold text-blue-800">Hesabınız oluşturuldu!</p>
          <p className="mt-1 text-sm text-blue-600">
            <strong>{emailSent}</strong> adresine doğrulama e-postası gönderdik.
            Lütfen e-postanızı doğrulayın ve giriş yapın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4">
      <FormField
        id="register-email"
        label="E-posta"
        type="email"
        placeholder="ornek@eposta.com"
        autoComplete="email"
        error={errors.email?.message}
        registration={register('email')}
      />

      <FormField
        id="register-password"
        label="Şifre"
        type={pw.show ? 'text' : 'password'}
        placeholder="En az 6 karakter"
        autoComplete="new-password"
        error={errors.password?.message}
        registration={register('password')}
        rightElement={
          <button
            type="button"
            onClick={pw.toggle}
            aria-label={pw.show ? 'Şifreyi gizle' : 'Şifreyi göster'}
            className="text-gray-400 transition-colors hover:text-gray-600">
            <pw.Icon size={18} />
          </button>
        }
      />

      <FormField
        id="register-confirm-password"
        label="Şifre Tekrar"
        type={confirmPw.show ? 'text' : 'password'}
        placeholder="Şifreyi tekrar girin"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        registration={register('confirmPassword')}
        rightElement={
          <button
            type="button"
            onClick={confirmPw.toggle}
            aria-label={confirmPw.show ? 'Şifreyi gizle' : 'Şifreyi göster'}
            className="text-gray-400 transition-colors hover:text-gray-600">
            <confirmPw.Icon size={18} />
          </button>
        }
      />

      {authError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {authError}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        id="register-submit-btn"
        className="w-full rounded-2xl py-3.5 text-base font-semibold shadow-sm"
        isPending={isLoading}>
        Kayıt Ol
      </Button>

      <GoogleDivider />

      <Button
        type="button"
        variant="outline"
        size="lg"
        id="google-register-btn"
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-gray-200 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        onPress={loginWithGoogle}
        isPending={isLoading}>
        {!isLoading && <GoogleIcon />}
        Google ile Kayıt Ol
      </Button>
    </form>
  );
};

// ─── Main LoginView ───────────────────────────────────────────────────────────

export const LoginView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('login');
  const [showForgot, setShowForgot] = useState(false);
  const { clearError } = useAuthStore();

  const handleTabChange = (tab: ActiveTab) => {
    clearError();
    setActiveTab(tab);
    setShowForgot(false);
  };

  const handleForgotPassword = () => {
    clearError();
    setShowForgot(true);
  };

  const handleBackFromForgot = () => {
    clearError();
    setShowForgot(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="animate-appearance-in flex w-full max-w-md flex-col rounded-[32px] bg-white p-8 shadow-xl ring-1 ring-gray-100">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="bg-primary/10 text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-3xl shadow-inner">
            <Package size={32} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Dijital Stok
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Bulut tabanlı modern stok ve satış yönetimi.
          </p>
        </div>

        {/* Content */}
        {showForgot ? (
          <ForgotPasswordScreen onBack={handleBackFromForgot} />
        ) : (
          <>
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Giriş yöntemi seçimi"
              className="mb-6 flex rounded-2xl bg-gray-100 p-1">
              <button
                type="button"
                role="tab"
                id="tab-login"
                aria-selected={activeTab === 'login'}
                aria-controls="panel-login"
                onClick={() => handleTabChange('login')}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  activeTab === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                Giriş Yap
              </button>
              <button
                type="button"
                role="tab"
                id="tab-register"
                aria-selected={activeTab === 'register'}
                aria-controls="panel-register"
                onClick={() => handleTabChange('register')}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  activeTab === 'register'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                Kayıt Ol
              </button>
            </div>

            {/* Panels */}
            <div
              id="panel-login"
              role="tabpanel"
              aria-labelledby="tab-login"
              hidden={activeTab !== 'login'}>
              <LoginForm onForgotPassword={handleForgotPassword} />
            </div>

            <div
              id="panel-register"
              role="tabpanel"
              aria-labelledby="tab-register"
              hidden={activeTab !== 'register'}>
              <RegisterForm />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
