import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useCustomerStore } from '../store/useCustomerStore';
import { Plus, Search, User, Phone, Edit2, Eye } from 'lucide-react';
import { Button, Input } from '@heroui/react';
import posthog from 'posthog-js';

import { useAuthStore } from '@/features/auth/store/useAuthStore';

export const CustomerListView: React.FC = () => {
  const { customers, isLoading } = useCustomerStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { activeMembership } = useAuthStore();
  const isOwner = activeMembership?.role === 'OWNER';
  const hasCustomerPermission =
    isOwner || activeMembership?.permissions.includes('MANAGE_CUSTOMERS');

  useEffect(() => {
    posthog.capture('customers_viewed', {
      view_source: 'navigation'
    });
  }, []);

  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.surname && c.surname.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search))
  );

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col p-4 md:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Müşteriler
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Müşterilerinizi ve veresiye limitlerini yönetin.
          </p>
        </div>
        {hasCustomerPermission && (
          <Button onPress={() => navigate('/customers/new')} variant="primary">
            <Plus className="mr-2 text-xl" /> Yeni Müşteri
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <div className="flex h-full flex-col overflow-hidden rounded-[28px] border-none bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/50 p-4">
            <div className="relative max-w-md">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <Input
                type="text"
                fullWidth
                placeholder="İsim, soyisim veya telefon ile ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Müşteri
                  </th>
                  <th className="hidden px-6 py-4 text-sm font-semibold text-gray-600 sm:table-cell">
                    İletişim
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                    Limit
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                    Mevcut Borç
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500">
                      <div className="flex animate-pulse flex-col items-center">
                        <div className="mb-4 h-8 w-8 rounded-full bg-gray-200"></div>
                        <div className="h-4 w-32 rounded bg-gray-200"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-24 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <User className="mb-4 text-6xl opacity-30" />
                        <p className="text-lg font-medium text-gray-700">
                          Müşteri bulunamadı.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => {
                    const debt = customer.totalDebt || 0;
                    const limit = customer.creditLimit || 0;
                    const isExceeded = limit > 0 && debt >= limit;
                    const percentage =
                      limit > 0 ? Math.min((debt / limit) * 100, 100) : 0;

                    return (
                      <tr
                        key={customer.id}
                        className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50/50"
                        onClick={() =>
                          navigate(`/customers/details/${customer.id}`)
                        }>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
                              <User size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {customer.name} {customer.surname || ''}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500 sm:hidden">
                                {customer.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-6 py-4 text-sm sm:table-cell">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {customer.phone || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <span className="font-medium text-gray-900">
                            {limit > 0
                              ? `₺${limit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <span
                            className={clsx(
                              'font-semibold',
                              debt > 0 ? 'text-orange-600' : 'text-gray-600'
                            )}>
                            ₺
                            {debt.toLocaleString('tr-TR', {
                              minimumFractionDigits: 2
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            {limit > 0 ? (
                              <>
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                                  <div
                                    className={clsx(
                                      'h-full rounded-full',
                                      isExceeded
                                        ? 'bg-danger'
                                        : percentage > 80
                                          ? 'bg-orange-500'
                                          : 'bg-success'
                                    )}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span
                                  className={clsx(
                                    'rounded-md px-2 py-0.5 text-[10px] font-bold',
                                    isExceeded
                                      ? 'bg-danger/10 text-danger'
                                      : 'bg-gray-100 text-gray-500'
                                  )}>
                                  %{percentage.toFixed(0)}
                                </span>
                              </>
                            ) : (
                              <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
                                Limitsiz
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <div
                            className="flex justify-end gap-2"
                            onClick={e => e.stopPropagation()}>
                            <Button
                              variant="tertiary"
                              isIconOnly
                              onPress={() =>
                                navigate(`/customers/details/${customer.id}`)
                              }
                              aria-label="Hesap Detayı">
                              <Eye className="text-lg" />
                            </Button>
                            {hasCustomerPermission && (
                              <Button
                                variant="tertiary"
                                isIconOnly
                                onPress={() =>
                                  navigate(`/customers/edit/${customer.id}`)
                                }
                                aria-label="Müşteriyi Düzenle">
                                <Edit2 className="text-lg" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
