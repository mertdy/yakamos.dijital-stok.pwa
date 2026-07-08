/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';
import { CartPanel } from './CartPanel';
import { useSalesStore } from '../store/useSalesStore';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../store/useSalesStore', async () => {
  const actual = await vi.importActual<any>('../store/useSalesStore');
  return {
    ...actual,
    useSalesStore: Object.assign(
      vi.fn(),
      actual.useSalesStore
    )
  };
});

// Mock Iconify
vi.mock('lucide-react', () => ({
  Trash2: () => null,
  ShoppingCart: () => null,
  ShoppingBasket: () => null,
  Plus: () => null,
  Minus: () => null,
  Banknote: () => null
}));

describe('CartPanel', () => {
  beforeEach(() => {
    // We mock the return value of the store hook instead of just state
    vi.mocked(useSalesStore).mockReturnValue({
      cart: [],
      removeFromCart: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      checkout: vi.fn(),
      totalAmount: 0,
      isProcessing: false,
    });
  });

  it('disables checkout button when cart is empty', () => {
    render(<CartPanel />);
    const checkoutBtn = screen.getByText('Ödemeyi Al');
    expect(checkoutBtn).toBeDisabled();
  });

  it('enables checkout button when cart has items', () => {
    vi.mocked(useSalesStore).mockReturnValue({
      cart: [{ inventoryId: '1', name: 'Elma', price: 10, quantity: 2 }],
      totalAmount: 20,
      removeFromCart: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      checkout: vi.fn(),
      isProcessing: false,
    });

    render(<CartPanel />);
    const checkoutBtn = screen.getByText('Ödemeyi Al');
    expect(checkoutBtn).not.toBeDisabled();
    const prices = screen.getAllByText('₺20.00');
    expect(prices.length).toBeGreaterThan(0);
  });
});
