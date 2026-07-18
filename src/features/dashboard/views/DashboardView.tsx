import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import { Card, Tabs, Select, ListBox, Table, Chip } from '@heroui/react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import type { ChartPeriod } from '../hooks/useDashboardStats';
import { Package } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  ArcElement
);

export const DashboardView: React.FC = () => {
  const {
    todaySales,
    todayOrderCount,
    aov,
    totalDebt,
    topSellingProducts,
    topDebtCustomers,
    topRevenueCustomers,
    paymentMethods,
    lowStockProducts,
    chartData,
    period,
    setPeriod
  } = useDashboardStats();

  const valueFormatter = (number: number) =>
    `₺ ${Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(number)}`;
  const numberFormatter = (number: number) =>
    Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(number);

  // Line Chart Config
  const lineChartData = useMemo(
    () => ({
      labels: chartData.map(d => d.date),
      datasets: [
        {
          label: 'Ciro',
          data: chartData.map(d => d['Ciro']),
          fill: true,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4, // Smooth curve
          pointRadius: 4,
          pointBackgroundColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          pointHitRadius: 10
        }
      ]
    }),
    [chartData]
  );

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `Ciro: ${valueFormatter(context.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: {
          callback: (val: any) => valueFormatter(val)
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        border: { display: false },
        grid: { display: false }
      }
    }
  };

  // Doughnut Chart Config
  const donutChartData = useMemo(
    () => ({
      labels: paymentMethods.map(p => p.name),
      datasets: [
        {
          data: paymentMethods.map(p => p.value),
          backgroundColor: [
            '#3b82f6', // blue-500
            '#10b981', // emerald-500
            '#f59e0b', // amber-500
            '#f43f5e', // rose-500
            '#8b5cf6' // violet-500
          ],
          borderWidth: 0
        }
      ]
    }),
    [paymentMethods]
  );

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) =>
            ` ${context.label}: ${valueFormatter(context.raw)}`
        }
      }
    }
  };

  // Custom BarList Renderer
  const renderBarList = (
    data: { name: string; value: number }[],
    color: string,
    isCurrency = false
  ) => {
    if (data.length === 0) {
      return (
        <div className="text-default-400 py-4 text-sm">Veri bulunmuyor</div>
      );
    }

    const maxVal = Math.max(...data.map(d => d.value));

    return (
      <div className="mt-4 flex flex-col gap-3">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-default-700 truncate pr-4">
                {item.name}
              </span>
              <span className="text-default-900 shrink-0 font-medium">
                {isCurrency
                  ? valueFormatter(item.value)
                  : numberFormatter(item.value)}
              </span>
            </div>
            <div className="bg-default-100 h-2 w-full overflow-hidden rounded-full">
              <div
                className={clsx('h-full rounded-full', color)}
                style={{
                  width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto h-full max-w-7xl overflow-y-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Anasayfa
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          İşletmenizin güncel performansını ve önemli özetlerini takip edin.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <Card.Content>
            <p className="text-default-500 text-sm">Bugünkü Ciro</p>
            <p className="text-default-900 mt-1 text-2xl font-bold">
              {valueFormatter(todaySales)}
            </p>
          </Card.Content>
        </Card>
        <Card className="border-t-4 border-t-indigo-500 shadow-sm">
          <Card.Content>
            <p className="text-default-500 text-sm">Bugünkü Satış Adedi</p>
            <p className="text-default-900 mt-1 text-2xl font-bold">
              {numberFormatter(todayOrderCount)}
            </p>
          </Card.Content>
        </Card>
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <Card.Content>
            <p className="text-default-500 text-sm">Ortalama Sepet (AOV)</p>
            <p className="text-default-900 mt-1 text-2xl font-bold">
              {valueFormatter(aov)}
            </p>
          </Card.Content>
        </Card>
        <Card className="border-t-4 border-t-rose-500 shadow-sm">
          <Card.Content>
            <p className="text-default-500 text-sm">Toplam Müşteri Alacağı</p>
            <p className="text-default-900 mt-1 text-2xl font-bold">
              {valueFormatter(totalDebt)}
            </p>
          </Card.Content>
        </Card>
      </div>

      <Tabs>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Dashboard Tabs">
            <Tabs.Tab id="overview">
              Genel Bakış
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="customers">
              Müşteri Analizi
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="inventory">
              <div className="flex items-center gap-2">
                Stok Uyarıları
                {lowStockProducts.length > 0 && (
                  <Chip size="sm" color="danger">
                    {lowStockProducts.length}
                  </Chip>
                )}
              </div>
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* Tab 1: Genel Bakış */}
        <Tabs.Panel id="overview">
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Sales Trend Chart */}
            <Card className="col-span-1 shadow-sm lg:col-span-2">
              <Card.Header className="flex items-center justify-between">
                <h2 className="text-default-900 text-lg font-semibold">
                  Satış Trendi
                </h2>
                <div className="w-40">
                  <Select
                    aria-label="Period Selection"
                    selectedKey={period}
                    onSelectionChange={k => {
                      if (k) setPeriod(k as ChartPeriod);
                    }}>
                    <Select.Trigger className="bg-default-100 hover:bg-default-200 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="7D">Son 7 Gün</ListBox.Item>
                        <ListBox.Item id="14D">Son 14 Gün</ListBox.Item>
                        <ListBox.Item id="30D">Son 30 Gün</ListBox.Item>
                        <ListBox.Item id="THIS_MONTH">Bu Ay</ListBox.Item>
                        <ListBox.Item id="6M">Son 6 Ay</ListBox.Item>
                        <ListBox.Item id="THIS_YEAR">Bu Yıl</ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </Card.Header>
              <Card.Content>
                <div className="mt-4 h-72 w-full">
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
              </Card.Content>
            </Card>

            {/* Payment Methods */}
            <Card className="shadow-sm">
              <Card.Header>
                <h2 className="text-default-900 text-lg font-semibold">
                  Ödeme Yöntemleri Dağılımı
                </h2>
              </Card.Header>
              <Card.Content>
                {paymentMethods.length > 0 ? (
                  <div className="relative mt-4 h-56">
                    <Doughnut data={donutChartData} options={donutOptions} />
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-default-400 text-xs">Toplam</span>
                      <span className="text-default-900 font-semibold">
                        {valueFormatter(
                          paymentMethods.reduce((a, b) => a + b.value, 0)
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-default-400 flex h-56 items-center justify-center text-sm">
                    Veri bulunmuyor
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  {paymentMethods.map((pm, i) => (
                    <div
                      key={pm.name}
                      className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              donutChartData.datasets[0].backgroundColor[i]
                          }}
                        />
                        <span className="text-default-500">{pm.name}</span>
                      </div>
                      <span className="text-default-900 font-medium">
                        {valueFormatter(pm.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>

            {/* Top Selling Products */}
            <Card className="col-span-1 shadow-sm lg:col-span-3">
              <Card.Header className="flex flex-col items-start pb-2">
                <h2 className="text-default-900 text-lg font-semibold">
                  En Çok Satılan Ürünler (Tüm Zamanlar)
                </h2>
                <p className="text-default-500 text-sm">
                  Adet bazında en çok tercih edilen top 5 ürün
                </p>
              </Card.Header>
              <Card.Content>
                {renderBarList(topSellingProducts, 'bg-emerald-500')}
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>

        {/* Tab 2: Müşteri Analizi */}
        <Tabs.Panel id="customers">
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="shadow-sm">
              <Card.Header className="flex flex-col items-start pb-2">
                <h2 className="text-default-900 text-lg font-semibold">
                  En Değerli Müşteriler
                </h2>
                <p className="text-default-500 text-sm">
                  Size en çok ciro getiren top 5 müşteri
                </p>
              </Card.Header>
              <Card.Content>
                {renderBarList(topRevenueCustomers, 'bg-blue-500', true)}
              </Card.Content>
            </Card>

            <Card className="shadow-sm">
              <Card.Header className="flex flex-col items-start pb-2">
                <h2 className="text-default-900 text-lg font-semibold">
                  En Çok Borcu Olanlar
                </h2>
                <p className="text-default-500 text-sm">
                  Tahsilat bekleyen en yüksek borçlu top 5 müşteri
                </p>
              </Card.Header>
              <Card.Content>
                {renderBarList(topDebtCustomers, 'bg-rose-500', true)}
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>

        {/* Tab 3: Stok Uyarıları */}
        <Tabs.Panel id="inventory">
          <div className="mt-4">
            <Card className="shadow-sm">
              <Card.Header className="flex flex-col items-start pb-4">
                <h2 className="text-default-900 text-lg font-semibold">
                  Kritik Stok Seviyesindeki Ürünler
                </h2>
                <p className="text-default-500 text-sm">
                  Stok adedi 10 ve altında olan ürünler listelenmektedir.
                  Sipariş verilmesi önerilir.
                </p>
              </Card.Header>
              <Card.Content className="px-0 pb-0">
                {lowStockProducts.length > 0 ? (
                  <Table>
                    <Table.ScrollContainer>
                      <Table.Content aria-label="Low stock items table">
                        <Table.Header>
                          <Table.Column>ÜRÜN ADI</Table.Column>
                          <Table.Column>BARKOD / SKU</Table.Column>
                          <Table.Column>SATIŞ FİYATI</Table.Column>
                          <Table.Column>STOK DURUMU</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {lowStockProducts.map(item => (
                            <Table.Row key={item.id}>
                              <Table.Cell className="font-medium">
                                {item.name}
                              </Table.Cell>
                              <Table.Cell>
                                {item.barcode || item.sku || '-'}
                              </Table.Cell>
                              <Table.Cell>
                                {valueFormatter(
                                  item.salePrice ?? item.price ?? 0
                                )}
                              </Table.Cell>
                              <Table.Cell>
                                <Chip
                                  color={
                                    item.stock === 0 ? 'danger' : 'warning'
                                  }
                                  variant="soft">
                                  <span className="flex items-center gap-1">
                                    <Package size={14} />
                                    {item.stock} Adet
                                  </span>
                                </Chip>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                ) : (
                  <div className="text-default-400 flex flex-col items-center justify-center px-6 py-16">
                    <Package size={48} className="mb-4 opacity-20" />
                    <p>
                      Şu anda kritik seviyede (10 adetin altında) olan hiçbir
                      ürününüz bulunmuyor.
                    </p>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};
