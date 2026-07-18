import { useMemo, useState } from 'react';
import { useSalesHistoryStore } from '@/features/sales-history';
import { useInventoryStore } from '@/features/inventory';
import { useCustomerStore } from '@/features/customers';
import { useAuthStore } from '@/features/auth';
import { isLowStock } from '@/features/inventory/domain/stockRules';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrAfter);

export type ChartPeriod =
  | '7D'
  | '14D'
  | '30D'
  | 'THIS_MONTH'
  | '6M'
  | 'THIS_YEAR';

export const useDashboardStats = () => {
  const { rawSales } = useSalesHistoryStore();
  const { items } = useInventoryStore();
  const { customers } = useCustomerStore();
  const activeCompany = useAuthStore(state => state.activeCompany);

  const [period, setPeriod] = useState<ChartPeriod>('7D');

  const stats = useMemo(() => {
    const today = dayjs().startOf('day');

    let todaySales = 0;
    let todayOrderCount = 0;

    // Revenue by customer
    const customerRevenue: Record<string, number> = {};
    // Top selling products
    const productSales: Record<string, { name: string; quantity: number }> = {};
    // Payment methods
    const paymentMethodsStats: Record<string, number> = {};

    rawSales.forEach(sale => {
      // Exclude cancelled
      if (sale.status === 'cancelled') return;

      const saleDate = dayjs(sale.createdAt);
      if (saleDate.isSameOrAfter(today)) {
        todaySales += sale.totalAmount;
        todayOrderCount++;
      }

      if (sale.customerId) {
        customerRevenue[sale.customerId] =
          (customerRevenue[sale.customerId] || 0) + sale.totalAmount;
      }

      paymentMethodsStats[sale.paymentMethod] =
        (paymentMethodsStats[sale.paymentMethod] || 0) + sale.totalAmount;

      (sale.cart || []).forEach(item => {
        if (!productSales[item.inventoryId]) {
          productSales[item.inventoryId] = { name: item.name, quantity: 0 };
        }
        productSales[item.inventoryId].quantity += item.quantity;
      });
    });

    const aov = todayOrderCount > 0 ? todaySales / todayOrderCount : 0;
    const totalDebt = customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(p => ({ name: p.name, value: p.quantity }));

    const topDebtCustomers = [...customers]
      .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))
      .slice(0, 5)
      .filter(c => (c.totalDebt || 0) > 0)
      .map(c => ({ name: c.name, value: c.totalDebt || 0 }));

    const topRevenueCustomers = Object.entries(customerRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, amount]) => {
        const c = customers.find(c => c.id === id);
        return { name: c ? c.name : 'Bilinmeyen Müşteri', value: amount };
      });

    const paymentMethods = Object.entries(paymentMethodsStats).map(
      ([name, value]) => ({
        name:
          name === 'Cash'
            ? 'Nakit'
            : name === 'Card'
              ? 'Kredi Kartı'
              : name === 'Scan'
                ? 'Karekod'
                : name === 'Credit'
                  ? 'Veresiye'
                  : name === 'undefined' || !name || name === 'null'
                    ? 'Diğer'
                    : name,
        value
      })
    );

    const lowStockProducts = items
      .filter(item => isLowStock(item, activeCompany))
      .sort((a, b) => a.stock - b.stock);

    return {
      todaySales,
      todayOrderCount,
      aov,
      totalDebt,
      topSellingProducts,
      topDebtCustomers,
      topRevenueCustomers,
      paymentMethods,
      lowStockProducts
    };
  }, [rawSales, items, customers, activeCompany]);

  // Chart data based on selected period
  const chartData = useMemo(() => {
    let startDate = dayjs();
    let dateFormat = 'DD MMM';

    switch (period) {
      case '7D':
        startDate = dayjs().subtract(6, 'day').startOf('day');
        break;
      case '14D':
        startDate = dayjs().subtract(13, 'day').startOf('day');
        break;
      case '30D':
        startDate = dayjs().subtract(29, 'day').startOf('day');
        break;
      case 'THIS_MONTH':
        startDate = dayjs().startOf('month');
        break;
      case '6M':
        startDate = dayjs().subtract(5, 'month').startOf('month');
        dateFormat = 'MMM YYYY';
        break;
      case 'THIS_YEAR':
        startDate = dayjs().startOf('year');
        dateFormat = 'MMM YYYY';
        break;
    }

    const groupedData: Record<string, number> = {};

    // Initialize all dates in range with 0
    let currDate = startDate;
    const now = dayjs();

    if (period === '6M' || period === 'THIS_YEAR') {
      while (currDate.isBefore(now) || currDate.isSame(now, 'month')) {
        groupedData[currDate.format(dateFormat)] = 0;
        currDate = currDate.add(1, 'month');
      }
    } else {
      while (currDate.isBefore(now) || currDate.isSame(now, 'day')) {
        groupedData[currDate.format(dateFormat)] = 0;
        currDate = currDate.add(1, 'day');
      }
    }

    rawSales.forEach(sale => {
      if (sale.status === 'cancelled') return;
      const saleDate = dayjs(sale.createdAt);
      if (saleDate.isSameOrAfter(startDate)) {
        const key = saleDate.format(dateFormat);
        if (groupedData[key] !== undefined) {
          groupedData[key] += sale.totalAmount;
        }
      }
    });

    return Object.entries(groupedData).map(([date, amount]) => ({
      date,
      Ciro: amount
    }));
  }, [rawSales, period]);

  return {
    ...stats,
    chartData,
    period,
    setPeriod
  };
};
