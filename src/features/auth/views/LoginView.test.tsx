import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginView } from './LoginView';

// ─── Store mock ───────────────────────────────────────────────────────────────

const mockLoginWithEmail = vi.fn();
const mockRegisterWithEmail = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockResetPassword = vi.fn();
const mockClearError = vi.fn();

const storeState = {
  isLoading: false,
  authError: null as string | null,
  loginWithEmail: mockLoginWithEmail,
  registerWithEmail: mockRegisterWithEmail,
  loginWithGoogle: mockLoginWithGoogle,
  resetPassword: mockResetPassword,
  clearError: mockClearError
};

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: () => storeState
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderLoginView() {
  return render(<LoginView />);
}

/** Returns the visible (non-hidden) login panel */
function getLoginPanel() {
  return screen.getByRole('tabpanel', { name: /giriş yap/i, hidden: false });
}

/** Returns the visible (non-hidden) register panel */
function getRegisterPanel() {
  return screen.getByRole('tabpanel', { name: /kayıt ol/i, hidden: false });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.isLoading = false;
    storeState.authError = null;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  it('renders the app logo and title', () => {
    renderLoginView();
    expect(
      screen.getByRole('heading', { name: /dijital stok/i })
    ).toBeInTheDocument();
  });

  it('renders the login tab as active by default', () => {
    renderLoginView();
    const loginTab = screen.getByRole('tab', { name: /giriş yap/i });
    expect(loginTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders both tab buttons', () => {
    renderLoginView();
    expect(screen.getByRole('tab', { name: /giriş yap/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /kayıt ol/i })).toBeInTheDocument();
  });

  it('renders email and password inputs in login tab', () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    expect(within(loginPanel).getByLabelText(/e-posta/i)).toBeInTheDocument();
    expect(within(loginPanel).getByLabelText(/^şifre$/i)).toBeInTheDocument();
  });

  it('renders "Şifremi Unuttum" button in login tab', () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    expect(
      within(loginPanel).getByRole('button', { name: /şifremi unuttum/i })
    ).toBeInTheDocument();
  });

  it('renders Google login button in login tab', () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    expect(
      within(loginPanel).getByRole('button', { name: /google ile giriş/i })
    ).toBeInTheDocument();
  });

  // ── Tab switching ─────────────────────────────────────────────────────────

  it('switches to register tab when clicked', async () => {
    renderLoginView();
    const registerTab = screen.getByRole('tab', { name: /kayıt ol/i });
    await userEvent.click(registerTab);
    expect(registerTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows register form fields after switching to register tab', async () => {
    renderLoginView();
    await userEvent.click(screen.getByRole('tab', { name: /kayıt ol/i }));
    const registerPanel = getRegisterPanel();
    expect(
      within(registerPanel).getByLabelText(/şifre tekrar/i)
    ).toBeInTheDocument();
  });

  it('calls clearError when switching tabs', async () => {
    renderLoginView();
    await userEvent.click(screen.getByRole('tab', { name: /kayıt ol/i }));
    expect(mockClearError).toHaveBeenCalled();
  });

  // ── Login form validation ─────────────────────────────────────────────────

  it('shows validation error for empty login submission', async () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    fireEvent.click(
      within(loginPanel).getByRole('button', { name: /^giriş yap$/i })
    );
    await waitFor(() => {
      expect(
        screen.getByText(/geçerli bir e-posta girin/i)
      ).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email format', async () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    await userEvent.type(
      within(loginPanel).getByLabelText(/^e-posta$/i),
      'not-an-email'
    );
    fireEvent.click(
      within(loginPanel).getByRole('button', { name: /^giriş yap$/i })
    );
    await waitFor(() => {
      expect(
        screen.getByText(/geçerli bir e-posta girin/i)
      ).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    await userEvent.type(
      within(loginPanel).getByLabelText(/^e-posta$/i),
      'test@test.com'
    );
    await userEvent.type(within(loginPanel).getByLabelText(/^şifre$/i), '123');
    fireEvent.click(
      within(loginPanel).getByRole('button', { name: /^giriş yap$/i })
    );
    await waitFor(() => {
      expect(screen.getByText(/şifre en az 6 karakter/i)).toBeInTheDocument();
    });
  });

  // ── Login form submit ─────────────────────────────────────────────────────

  it('calls loginWithEmail with correct credentials on valid submit', async () => {
    mockLoginWithEmail.mockResolvedValueOnce(undefined);
    renderLoginView();
    const loginPanel = getLoginPanel();
    await userEvent.type(
      within(loginPanel).getByLabelText(/^e-posta$/i),
      'user@test.com'
    );
    await userEvent.type(
      within(loginPanel).getByLabelText(/^şifre$/i),
      'password123'
    );
    fireEvent.click(
      within(loginPanel).getByRole('button', { name: /^giriş yap$/i })
    );
    await waitFor(() => {
      expect(mockLoginWithEmail).toHaveBeenCalledWith(
        'user@test.com',
        'password123'
      );
    });
  });

  it('calls loginWithGoogle when Google button is pressed', async () => {
    mockLoginWithGoogle.mockResolvedValueOnce(undefined);
    renderLoginView();
    const loginPanel = getLoginPanel();
    await userEvent.click(
      within(loginPanel).getByRole('button', { name: /google ile giriş/i })
    );
    expect(mockLoginWithGoogle).toHaveBeenCalled();
  });

  // ── Auth error display ────────────────────────────────────────────────────

  it('displays authError message from store', () => {
    storeState.authError = 'E-posta veya şifre hatalı.';
    renderLoginView();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'E-posta veya şifre hatalı.'
    );
  });

  // ── Password visibility toggle ────────────────────────────────────────────

  it('toggles password visibility when eye icon is clicked', async () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    const passwordInput = within(loginPanel).getByLabelText(/^şifre$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = within(loginPanel).getByRole('button', {
      name: /şifreyi göster/i
    });
    await userEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideBtn = within(loginPanel).getByRole('button', {
      name: /şifreyi gizle/i
    });
    await userEvent.click(hideBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // ── Forgot password ───────────────────────────────────────────────────────

  it('shows forgot password screen when "Şifremi Unuttum" is clicked', async () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    await userEvent.click(
      within(loginPanel).getByRole('button', { name: /şifremi unuttum/i })
    );
    expect(
      screen.getByRole('heading', { name: /şifre sıfırlama/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/e-posta adresi/i)).toBeInTheDocument();
  });

  it('returns to login screen from forgot password view', async () => {
    renderLoginView();
    await userEvent.click(
      within(getLoginPanel()).getByRole('button', { name: /şifremi unuttum/i })
    );
    // The back button has both visible text and an aria-label
    await userEvent.click(
      screen.getByRole('button', { name: /giriş ekranına dön/i })
    );
    expect(screen.getByRole('tab', { name: /giriş yap/i })).toBeInTheDocument();
  });

  it('calls resetPassword on forgot password form submit', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);
    renderLoginView();
    await userEvent.click(
      within(getLoginPanel()).getByRole('button', { name: /şifremi unuttum/i })
    );
    await userEvent.type(
      screen.getByLabelText(/e-posta adresi/i),
      'reset@test.com'
    );
    fireEvent.click(screen.getByRole('button', { name: /bağlantı gönder/i }));
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('reset@test.com');
    });
  });

  it('shows success message after password reset email sent', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);
    renderLoginView();
    await userEvent.click(
      within(getLoginPanel()).getByRole('button', { name: /şifremi unuttum/i })
    );
    await userEvent.type(
      screen.getByLabelText(/e-posta adresi/i),
      'reset@test.com'
    );
    fireEvent.click(screen.getByRole('button', { name: /bağlantı gönder/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/sıfırlama bağlantısı gönderildi/i)
      ).toBeInTheDocument();
    });
  });

  // ── Register form validation ──────────────────────────────────────────────

  it('shows error when passwords do not match in register form', async () => {
    renderLoginView();
    await userEvent.click(screen.getByRole('tab', { name: /kayıt ol/i }));
    const registerPanel = getRegisterPanel();
    await userEvent.type(
      within(registerPanel).getByLabelText(/^e-posta$/i),
      'new@test.com'
    );
    await userEvent.type(
      within(registerPanel).getByLabelText(/^şifre$/i),
      'password123'
    );
    await userEvent.type(
      within(registerPanel).getByLabelText(/şifre tekrar/i),
      'different456'
    );
    fireEvent.click(
      within(registerPanel).getByRole('button', { name: /^kayıt ol$/i })
    );
    await waitFor(() => {
      expect(screen.getByText(/şifreler eşleşmiyor/i)).toBeInTheDocument();
    });
  });

  it('calls registerWithEmail on valid register submit', async () => {
    mockRegisterWithEmail.mockResolvedValueOnce(undefined);
    renderLoginView();
    await userEvent.click(screen.getByRole('tab', { name: /kayıt ol/i }));
    const registerPanel = getRegisterPanel();
    await userEvent.type(
      within(registerPanel).getByLabelText(/^e-posta$/i),
      'new@test.com'
    );
    await userEvent.type(
      within(registerPanel).getByLabelText(/^şifre$/i),
      'password123'
    );
    await userEvent.type(
      within(registerPanel).getByLabelText(/şifre tekrar/i),
      'password123'
    );
    fireEvent.click(
      within(registerPanel).getByRole('button', { name: /^kayıt ol$/i })
    );
    await waitFor(() => {
      expect(mockRegisterWithEmail).toHaveBeenCalledWith(
        'new@test.com',
        'password123'
      );
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('has correct tablist role on tab container', () => {
    renderLoginView();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('each panel has correct tabpanel role', () => {
    renderLoginView();
    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    expect(panels).toHaveLength(2);
  });

  it('password input has aria-invalid true when there is a validation error', async () => {
    renderLoginView();
    const loginPanel = getLoginPanel();
    await userEvent.type(
      within(loginPanel).getByLabelText(/^e-posta$/i),
      'test@test.com'
    );
    await userEvent.type(within(loginPanel).getByLabelText(/^şifre$/i), '123');
    fireEvent.click(
      within(loginPanel).getByRole('button', { name: /^giriş yap$/i })
    );
    await waitFor(() => {
      expect(within(loginPanel).getByLabelText(/^şifre$/i)).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });
  });
});
