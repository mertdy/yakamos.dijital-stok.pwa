import React, { useEffect, useState, Suspense } from 'react';
import { ProductList } from '../components/ProductList';
import { OrderDetailsPanel } from '../components/OrderDetailsPanel';
import { InvoicePanel } from '../components/InvoicePanel';
import { CustomerDrawer } from '@/features/customers';
import { HeldSalesDrawer } from '../components/HeldSalesDrawer';
import { GlobalProductSearch } from '../components/GlobalProductSearch';
import { preloadBarcodeFeedback } from '@/shared/utils/barcodeFeedback';

// Lazy load Scanner Modal
const ScannerModal = React.lazy(() => import('../components/ScannerModal'));

export const SalesView: React.FC = () => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [isHeldSalesDrawerOpen, setIsHeldSalesDrawerOpen] = useState(false);

  useEffect(() => {
    preloadBarcodeFeedback();
  }, []);

  return (
    <div className="flex h-auto flex-col gap-4 overflow-y-auto p-4 lg:h-full lg:flex-row lg:overflow-hidden">
      {/* 1. Kolon: Arama ve Sepet */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:h-full">
        <GlobalProductSearch onOpenScanner={() => setIsScannerOpen(true)} />
        <div className="min-h-0 flex-1">
          <OrderDetailsPanel />
        </div>
      </div>

      {/* 2. Kolon: Hızlı Ekle */}
      <div className="flex min-h-0 w-full shrink-0 flex-col lg:h-full lg:w-[240px]">
        <ProductList />
      </div>

      {/* 3. Kolon: Fatura ve Ödeme */}
      <div className="flex min-h-0 w-full shrink-0 flex-col lg:h-full lg:w-[320px] xl:w-[340px]">
        <InvoicePanel
          onOpenCustomerDrawer={() => setIsCustomerDrawerOpen(true)}
          onOpenHeldSalesDrawer={() => setIsHeldSalesDrawerOpen(true)}
        />
      </div>

      {/* Modals & Drawers */}
      <CustomerDrawer
        isOpen={isCustomerDrawerOpen}
        onClose={() => setIsCustomerDrawerOpen(false)}
      />

      <HeldSalesDrawer
        isOpen={isHeldSalesDrawerOpen}
        onClose={() => setIsHeldSalesDrawerOpen(false)}
      />

      <Suspense fallback={null}>
        {isScannerOpen && (
          <ScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
};
