import React, { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/core/config/routes';
import { useCustomerStore } from '../store/useCustomerStore';
import { Plus, Search, User, Phone, Edit2, Eye } from 'lucide-react';
import { Button, Input, Pagination } from '@heroui/react';
import posthog from 'posthog-js';

import { useAuthStore } from '@/features/auth/store/useAuthStore';

const CUSTOMER_PAGE_SIZE = 25;

const getPageItems = (pageCount: number, currentPage: number) => {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(pageCount - 1, currentPage + 1);

  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < pageCount - 1) pages.push('ellipsis');
  pages.push(pageCount);

  return pages;
};

export const CustomerListView: React.FC = () => {
  const { customers, isLoading } = useCustomerStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { activeMembership } = useAuthStore();
  const isOwner = activeMembership?.role === 'OWNER';
  const hasCustomerPermission =
    isOwner || activeMembership?.permissions.includes('MANAGE_CUSTOMERS');

  useEffect(() => {
    posthog.capture('customers_viewed', {
      view_source: 'navigation'
    });
  }, []);

  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        customer =>
          customer.name.toLowerCase().includes(search.toLowerCase()) ||
          (customer.surname &&
            customer.surname.toLowerCase().includes(search.toLowerCase())) ||
          (customer.phone && customer.phone.includes(search))
      ),
    [customers, search]
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredCustomers.length / CUSTOMER_PAGE_SIZE)
  );
  const currentPage = Math.min(page, pageCount);
  const pageStart = filteredCustomers.length
    ? (currentPage - 1) * CUSTOMER_PAGE_SIZE + 1
    : 0;
  const pageEnd = Math.min(
    currentPage * CUSTOMER_PAGE_SIZE,
    filteredCustomers.length
  );
  const pageItems = useMemo(
    () => getPageItems(pageCount, currentPage),
    [currentPage, pageCount]
  );
  const paginatedCustomers = useMemo(
    () =>
      filteredCustomers.slice(
        (currentPage - 1) * CUSTOMER_PAGE_SIZE,
        currentPage * CUSTOMER_PAGE_SIZE
      ),
    [currentPage, filteredCustomers]
  );

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

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
          <Button
            onPress={() => navigate(ROUTES.CUSTOMERS.NEW)}
            variant="primary">
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
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
                  paginatedCustomers.map(customer => {
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
                          navigate(ROUTES.CUSTOMERS.DETAILS(customer.id))
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
                                navigate(ROUTES.CUSTOMERS.DETAILS(customer.id))
                              }
                              aria-label="Hesap Detayı">
                              <Eye className="text-lg" />
                            </Button>
                            {hasCustomerPermission && (
                              <Button
                                variant="tertiary"
                                isIconOnly
                                onPress={() =>
                                  navigate(ROUTES.CUSTOMERS.EDIT(customer.id))
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
          {filteredCustomers.length > CUSTOMER_PAGE_SIZE && (
            <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
              <Pagination className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Pagination.Summary>
                  {pageStart}–{pageEnd} / {filteredCustomers.length} müşteri
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={currentPage === 1}
                      onPress={() =>
                        setPage(current => Math.max(1, current - 1))
                      }>
                      <Pagination.PreviousIcon />
                      <span>Önceki</span>
                    </Pagination.Previous>
                  </Pagination.Item>
                  {pageItems.map((item, index) =>
                    item === 'ellipsis' ? (
                      <Pagination.Item key={`ellipsis-${index}`}>
                        <Pagination.Ellipsis />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={item}>
                        <Pagination.Link
                          isActive={item === currentPage}
                          onPress={() => setPage(item)}>
                          {item}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={currentPage === pageCount}
                      onPress={() =>
                        setPage(current => Math.min(pageCount, current + 1))
                      }>
                      <span>Sonraki</span>
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
