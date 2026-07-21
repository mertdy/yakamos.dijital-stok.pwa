import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryManagementView } from './CategoryManagementView';
import { useCategoryStore } from '../store/useCategoryStore';

const authState = vi.hoisted(() => ({ activeCompanyId: 'company-a' }));

vi.mock('../store/useCategoryStore', () => ({
  useCategoryStore: vi.fn()
}));

vi.mock('../store/useInventoryStore', () => ({
  useInventoryStore: () => ({ items: [] })
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: (
    selector: (state: { profile: { activeCompanyId: string } }) => unknown
  ) => selector({ profile: { activeCompanyId: authState.activeCompanyId } })
}));

const mockUseCategoryStore = useCategoryStore as unknown as ReturnType<
  typeof vi.fn
>;

describe('CategoryManagementView', () => {
  const loadCategories = vi.fn();

  beforeEach(() => {
    authState.activeCompanyId = 'company-a';
    mockUseCategoryStore.mockReturnValue({
      categories: [],
      isLoading: true,
      loadCategories,
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      setCategoryActive: vi.fn(),
      deleteCategory: vi.fn()
    });
    loadCategories.mockClear();
  });

  it('shows skeleton rows during the initial category load', () => {
    render(<CategoryManagementView />);

    expect(screen.getAllByTestId('category-loading-skeleton')).toHaveLength(5);
    expect(screen.queryByText(/Henüz kategori yok/)).not.toBeInTheDocument();
    expect(screen.getByTestId('category-list')).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-y-auto'
    );
  });

  it('reloads categories when the active company changes', () => {
    const { rerender } = render(<CategoryManagementView />);

    expect(loadCategories).toHaveBeenCalledTimes(1);

    authState.activeCompanyId = 'company-b';
    rerender(<CategoryManagementView />);

    expect(loadCategories).toHaveBeenCalledTimes(2);
  });
});
