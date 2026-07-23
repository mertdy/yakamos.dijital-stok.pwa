import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DashboardView } from './DashboardView';
import { useDashboardStats } from '../hooks/useDashboardStats';

vi.mock('../hooks/useDashboardStats');
vi.mock('@/features/onboarding', () => ({
  GettingStartedCard: () => null
}));

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />
}));

const mockUseDashboardStats = useDashboardStats as unknown as ReturnType<
  typeof vi.fn
>;

describe('DashboardView', () => {
  const setPeriodMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDashboardStats.mockReturnValue({
      todaySales: 1500,
      todayOrderCount: 10,
      aov: 150,
      totalDebt: 4500,
      topSellingProducts: [{ name: 'Water', value: 25 }],
      topDebtCustomers: [{ name: 'John Doe', value: 1200 }],
      topRevenueCustomers: [{ name: 'Jane Smith', value: 800 }],
      paymentMethods: [{ name: 'Nakit', value: 900 }],
      lowStockProducts: [
        { id: '1', name: 'Cola', barcode: '123', price: 10, stock: 2 }
      ],
      chartData: [{ date: '01 Jul', Ciro: 500 }],
      period: '7D',
      setPeriod: setPeriodMock
    });
  });

  it('renders stats metrics cards correctly', () => {
    render(<DashboardView />);

    expect(screen.getByText('Bugünkü Ciro')).toBeInTheDocument();
    expect(screen.getByText('₺ 1.500')).toBeInTheDocument();

    expect(screen.getByText('Bugünkü Satış Adedi')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    expect(screen.getByText('Ortalama Sepet (AOV)')).toBeInTheDocument();
    expect(screen.getByText('₺ 150')).toBeInTheDocument();

    expect(screen.getByText('Toplam Müşteri Alacağı')).toBeInTheDocument();
    expect(screen.getByText('₺ 4.500')).toBeInTheDocument();
  });

  it('renders charts and tables correctly', () => {
    render(<DashboardView />);

    // Check chart mock triggers
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();

    // Check top selling product
    expect(screen.getByText('Water')).toBeInTheDocument();
  });
});
