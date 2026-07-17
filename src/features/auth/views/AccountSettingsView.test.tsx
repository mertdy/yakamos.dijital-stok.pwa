import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccountSettingsView } from './AccountSettingsView';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

const mockAcceptInvitation = vi.fn();
const mockDeclineInvitation = vi.fn();
const mockUpdateDisplayName = vi.fn();

const storeState = {
  user: {
    uid: 'test-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    providerData: [{ providerId: 'password' }],
    metadata: {
      creationTime: '2025-01-15T10:30:00.000Z',
      lastSignInTime: '2025-02-20T12:45:00.000Z'
    }
  },
  activeMembership: {
    role: 'OWNER'
  },
  activeCompany: {
    id: 'test-company-id',
    name: 'Test Company'
  },
  acceptInvitation: mockAcceptInvitation,
  declineInvitation: mockDeclineInvitation,
  updateDisplayName: mockUpdateDisplayName
};

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: () => storeState
}));

vi.mock('@/core/firebase/config', () => ({
  db: {}
}));

// Mock firestore onSnapshot and query dynamically
let mockInvitesData: any[] = [];
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn((_q, callback) => {
    callback({
      forEach: (cb: any) => {
        mockInvitesData.forEach(invite =>
          cb({ id: invite.id, data: () => invite })
        );
      }
    });
    return vi.fn(); // unsubscribe
  })
}));

describe('AccountSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvitesData = [];
    storeState.activeMembership = { role: 'OWNER' } as any;
  });

  it('renders profile details and owner permissions correctly', () => {
    render(<AccountSettingsView />);

    // Check title
    expect(screen.getByText('Hesap Ayarları')).toBeInTheDocument();

    // Check Profile info
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Şirket Sahibi')).toBeInTheDocument();
    expect(screen.getByText('Üyelik Tarihi')).toBeInTheDocument();
    expect(screen.getByText('Son Giriş Zamanı')).toBeInTheDocument();
    expect(screen.getByLabelText('İsim Soyisim')).toHaveValue('Test User');

    // Check Permissions info for OWNER
    expect(
      screen.getByText(
        /şirket sahibi olarak tüm sistem yetkilerine sınırsız erişim/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Dashboard Görünümü')).toBeInTheDocument();
    expect(screen.getByText('Envanter Yönetimi')).toBeInTheDocument();
  });

  it('updates the display name for email-password users', async () => {
    render(<AccountSettingsView />);

    fireEvent.change(screen.getByLabelText('İsim Soyisim'), {
      target: { value: 'Yeni İsim' }
    });
    fireEvent.click(screen.getByRole('button', { name: /kaydet/i }));

    await waitFor(() => {
      expect(mockUpdateDisplayName).toHaveBeenCalledWith('Yeni İsim');
    });
  });

  it('renders employee permissions correctly', () => {
    storeState.activeMembership = {
      role: 'EMPLOYEE',
      permissions: [
        'TAKE_PAYMENT',
        'MANAGE_CUSTOMERS',
        'SHARE_CUSTOMER_STATEMENT'
      ]
    } as any;
    render(<AccountSettingsView />);

    expect(screen.getByText('Çalışan')).toBeInTheDocument();
    expect(screen.getByText('Atanmış Yetkileriniz')).toBeInTheDocument();
    expect(screen.getByText('Ödeme Alıcı')).toBeInTheDocument();
    expect(screen.getByText('Müşteri Yönetimi')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp Ekstresi Paylaş')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Görünümü')).not.toBeInTheDocument();
  });

  it('displays empty state when there are no invitations', () => {
    mockInvitesData = [];
    render(<AccountSettingsView />);

    expect(
      screen.getByText('Bekleyen davetiyeniz bulunmamaktadır.')
    ).toBeInTheDocument();
  });

  it('displays invitations and allows accepting them', async () => {
    storeState.activeMembership = { role: 'EMPLOYEE', permissions: [] } as any;
    mockInvitesData = [
      {
        id: 'invite-123',
        companyId: 'company-xyz',
        companyName: 'Inviting Company',
        permissions: ['VIEW_DASHBOARD', 'MANAGE_INVENTORY']
      }
    ];

    render(<AccountSettingsView />);

    expect(screen.getByText('Inviting Company')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Görünümü')).toBeInTheDocument();
    expect(screen.getByText('Envanter Yönetimi')).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: /kabul et/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(mockAcceptInvitation).toHaveBeenCalledWith('invite-123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('allows declining invitations', async () => {
    storeState.activeMembership = { role: 'EMPLOYEE', permissions: [] } as any;
    mockInvitesData = [
      {
        id: 'invite-123',
        companyId: 'company-xyz',
        companyName: 'Inviting Company',
        permissions: ['VIEW_DASHBOARD']
      }
    ];

    render(<AccountSettingsView />);

    const declineBtn = screen.getByRole('button', { name: /reddet/i });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(mockDeclineInvitation).toHaveBeenCalledWith('invite-123');
    });
  });
});
