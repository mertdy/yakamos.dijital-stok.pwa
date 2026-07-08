import React, { useState, Suspense } from 'react';
import { ProductList } from '../components/ProductList';
import { OrderDetailsPanel } from '../components/OrderDetailsPanel';
import { InvoicePanel } from '../components/InvoicePanel';
import { CustomerDrawer } from '../../customers/components/CustomerDrawer';
import { HeldSalesDrawer } from '../components/HeldSalesDrawer';
import { GlobalProductSearch } from '../components/GlobalProductSearch';

// Lazy load Scanner Modal
const ScannerModal = React.lazy(() => import('../components/ScannerModal'));

export const SalesView: React.FC = () => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [isHeldSalesDrawerOpen, setIsHeldSalesDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 lg:h-full h-auto overflow-y-auto lg:overflow-hidden">
      
      {/* 1. Kolon: Arama ve Sepet */}
      <div className="flex-1 flex flex-col lg:h-full min-h-0 gap-4">
        <GlobalProductSearch onOpenScanner={() => setIsScannerOpen(true)} />
        <div className="flex-1 min-h-0">
          <OrderDetailsPanel />
        </div>
      </div>

      {/* 2. Kolon: Hızlı Ekle */}
      <div className="w-full lg:w-[240px] flex flex-col lg:h-full min-h-0 shrink-0">
        <ProductList />
      </div>

      {/* 3. Kolon: Fatura ve Ödeme */}
      <div className="w-full lg:w-[320px] xl:w-[340px] flex flex-col lg:h-full min-h-0 shrink-0">
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
          <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
        )}
      </Suspense>
    </div>
  );
};
