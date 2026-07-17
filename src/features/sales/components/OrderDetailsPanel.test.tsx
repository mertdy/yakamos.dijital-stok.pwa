import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OrderDetailsPanel } from './OrderDetailsPanel';
import { ROUTES } from '@/core/config/routes';

const navigateMock = vi.fn();

vi.mock('../store/useSalesStore', () => ({
  useSalesStore: () => ({
    cart: [
      {
        inventoryId: 'product-1',
        name: 'Deneme Ürünü',
        price: 125,
        quantity: 1
      }
    ],
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn()
  })
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: () => ({
    activeMembership: { role: 'EMPLOYEE', permissions: ['MANAGE_INVENTORY'] }
  })
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock
}));

describe('OrderDetailsPanel', () => {
  it('shows an edit shortcut to users with inventory permission', () => {
    render(<OrderDetailsPanel />);

    fireEvent.click(screen.getByRole('button', { name: /ürünü düzenle/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      ROUTES.INVENTORY.EDIT('product-1')
    );
  });
});
