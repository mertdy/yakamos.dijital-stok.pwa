import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerStore } from '../store/useCustomerStore';
import { Plus, Search, User, Phone, Edit2, Eye } from 'lucide-react';
import { Button } from '@heroui/react';

export const CustomerListView: React.FC = () => {
  const { customers, loadCustomers, isLoading } = useCustomerStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.surname && c.surname.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className="p-4 md:p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Müşteriler</h1>
          <p className="text-gray-500 text-sm mt-1">Müşterilerinizi ve veresiye limitlerini yönetin.</p>
        </div>
        <Button 
          onPress={() => navigate('/customers/new')} 
          variant="primary"
          
        ><Plus className="text-xl mr-2" /> Yeni Müşteri
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <div className="bg-white rounded-[28px] shadow-sm border-none overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="İsim, soyisim veya telefon ile ara..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Müşteri</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 hidden sm:table-cell">İletişim</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Limit</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Mevcut Borç</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Durum</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <User className="text-6xl mb-4 opacity-30" />
                        <p className="text-lg font-medium text-gray-700">Müşteri bulunamadı.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => {
                    const debt = customer.totalDebt || 0;
                    const limit = customer.creditLimit || 0;
                    const isExceeded = limit > 0 && debt >= limit;
                    const percentage = limit > 0 ? Math.min((debt / limit) * 100, 100) : 0;

                    return (
                      <tr 
                        key={customer.id} 
                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/customers/details/${customer.id}`)}
                      >
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                              <User size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{customer.name} {customer.surname || ''}</p>
                              <p className="text-xs text-gray-500 sm:hidden mt-0.5">{customer.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {customer.phone || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className="font-medium text-gray-900">
                            {limit > 0 ? `₺${limit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <span className={`font-semibold ${debt > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                            ₺{debt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            {limit > 0 ? (
                              <>
                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${isExceeded ? 'bg-danger' : percentage > 80 ? 'bg-orange-500' : 'bg-success'}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isExceeded ? 'bg-danger/10 text-danger' : 'text-gray-500 bg-gray-100'}`}>
                                  %{percentage.toFixed(0)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md">Limitsiz</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="tertiary"
                              isIconOnly
                              onPress={() => navigate(`/customers/details/${customer.id}`)}
                              aria-label="Hesap Detayı"
                            >
                              <Eye className="text-lg" />
                            </Button>
                            <Button
                              variant="tertiary"
                              isIconOnly
                              onPress={() => navigate(`/customers/edit/${customer.id}`)}
                              aria-label="Müşteriyi Düzenle"
                            >
                              <Edit2 className="text-lg" />
                            </Button>
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
