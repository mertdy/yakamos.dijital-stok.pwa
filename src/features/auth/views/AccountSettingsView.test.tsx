import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccountSettingsView } from './AccountSettingsView';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

const mockAcceptInvitation = vi.fn();
const mockDeclineInvitation = vi.fn();

const storeState = {
  user: {
    uid: 'test-user-id',
    displayName: 'Test User',
    email: 'test@example.com'
  },
  activeMembership: {
    role: 'OWNER'
  },
  activeCompany: {
    id: 'test-company-id',
    name: 'Test Company'
  },
  acceptInvitation: mockAcceptInvitation,
  declineInvitation: mockDeclineInvitation
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

    // Check Permissions info for OWNER
    expect(
      screen.getByText(
        /şirket sahibi olarak tüm sistem yetkilerine sınırsız erişim/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Dashboard Görünümü')).toBeInTheDocument();
    expect(screen.getByText('Envanter Yönetimi')).toBeInTheDocument();
  });

  it('renders employee permissions correctly', () => {
    storeState.activeMembership = {
      role: 'EMPLOYEE',
      permissions: ['TAKE_PAYMENT', 'MANAGE_CUSTOMERS']
    } as any;
    render(<AccountSettingsView />);

    expect(screen.getByText('Çalışan')).toBeInTheDocument();
    expect(screen.getByText('Atanmış Yetkileriniz')).toBeInTheDocument();
    expect(screen.getByText('Ödeme Alıcı')).toBeInTheDocument();
    expect(screen.getByText('Müşteri Yönetimi')).toBeInTheDocument();
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
