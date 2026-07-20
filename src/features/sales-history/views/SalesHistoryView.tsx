import React, { useEffect } from 'react';
import { useSalesHistoryStore } from '../store/useSalesHistoryStore';
import { SalesHistoryFilters } from '../components/SalesHistoryFilters';
import { SalesHistoryList } from '../components/SalesHistoryList';
import { Loader2 } from 'lucide-react';
import posthog from 'posthog-js';

export const SalesHistoryView: React.FC = () => {
  const { isLoading } = useSalesHistoryStore();

  useEffect(() => {
    posthog.capture('sales_history_viewed', {
      view_source: 'navigation'
    });
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Satış Geçmişi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Geçmiş satış işlemlerinizi görüntüleyin ve filtreleyin.
          </p>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-white shadow-sm">
        <SalesHistoryFilters />
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          </div>
        )}
        <SalesHistoryList />
      </div>
    </div>
  );
};
