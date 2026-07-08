import React, { useEffect } from 'react';
import { useSalesHistoryStore } from '../store/useSalesHistoryStore';
import { useCustomerStore } from '../../customers/store/useCustomerStore';
import { SalesHistoryFilters } from '../components/SalesHistoryFilters';
import { SalesHistoryList } from '../components/SalesHistoryList';
import { Loader2 } from 'lucide-react';

export const SalesHistoryView: React.FC = () => {
  const { fetchSales, isLoading } = useSalesHistoryStore();
  const { loadCustomers } = useCustomerStore();

  useEffect(() => {
    fetchSales();
    loadCustomers();
  }, [fetchSales, loadCustomers]);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Satış Geçmişi</h1>
          <p className="text-gray-500 text-sm mt-1">Geçmiş satış işlemlerinizi görüntüleyin ve filtreleyin.</p>
        </div>
      </div>

      <SalesHistoryFilters />

      <div className="flex-1 min-h-0 bg-white rounded-[28px] shadow-sm flex flex-col overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <SalesHistoryList />
      </div>
    </div>
  );
};
