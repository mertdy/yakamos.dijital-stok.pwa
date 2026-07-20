import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomerListView } from './CustomerListView';
import { useCustomerStore } from '../store/useCustomerStore';

vi.mock('../store/useCustomerStore', () => ({
  useCustomerStore: vi.fn()
}));

vi.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({
    activeMembership: { role: 'OWNER', permissions: [] }
  })
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('posthog-js', () => ({
  default: { capture: vi.fn() }
}));

const mockUseCustomerStore = useCustomerStore as unknown as ReturnType<
  typeof vi.fn
>;

describe('CustomerListView', () => {
  beforeEach(() => {
    mockUseCustomerStore.mockReturnValue({
      customers: [],
      isLoading: true
    });
  });

  it('shows skeleton rows during the initial customer load', () => {
    render(<CustomerListView />);

    expect(screen.getAllByTestId('customer-loading-skeleton')).toHaveLength(5);
    expect(screen.queryByText('Müşteri bulunamadı.')).not.toBeInTheDocument();
  });
});
