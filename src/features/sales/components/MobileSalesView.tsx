import { Suspense, useState } from 'react';
import { Menu, Package, ShoppingCart } from 'lucide-react';
import { Button, Drawer } from '@heroui/react';
import { useAuthStore } from '@/features/auth';
import { useMobileNavigation } from '@/shared/contexts/MobileNavigationContext';
import { useSalesStore } from '../store/useSalesStore';
import { GlobalProductSearch } from './GlobalProductSearch';
import { OrderDetailsPanel } from './OrderDetailsPanel';
import { ProductList } from './ProductList';
import { InvoicePanel } from './InvoicePanel';
import { CustomerDrawer } from '@/features/customers';
import { HeldSalesDrawer } from './HeldSalesDrawer';
import { ScannerModal } from '../routes';

export const MobileSalesView: React.FC = () => {
  const { openMobileNavigation } = useMobileNavigation();
  const activeCompany = useAuthStore(state => state.activeCompany);
  const { cart } = useSalesStore();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [isHeldSalesDrawerOpen, setIsHeldSalesDrawerOpen] = useState(false);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="bg-background flex h-full min-h-0 flex-col lg:hidden">
      <header className="bg-background sticky top-0 z-10 flex items-center justify-between border-b border-gray-200/50 p-3">
        <Button
          variant="ghost"
          isIconOnly
          aria-label="Menüyü aç"
          className="h-11 !w-11 !min-w-11 rounded-xl"
          onPress={openMobileNavigation}>
          <Menu size={22} />
        </Button>
        <div className="min-w-0 text-center">
          <p className="text-xs font-medium text-gray-500">Satış</p>
          <p className="max-w-48 truncate text-sm font-bold text-gray-900">
            {activeCompany?.name || 'İşletmeniz'}
          </p>
        </div>
        <Button
          variant="secondary"
          aria-label="Hızlı ekleme menüsünü aç"
          className="h-10 min-w-11 rounded-xl px-3 text-xs"
          onPress={() => setIsQuickAddOpen(true)}>
          <Package size={18} />
          <span className="hidden min-[390px]:inline">Hızlı Ekle</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
        <GlobalProductSearch onOpenScanner={() => setIsScannerOpen(true)} />
        <div className="min-h-0 flex-1">
          <OrderDetailsPanel />
        </div>
      </div>

      <footer className="border-t border-gray-200/50 bg-white px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button
          variant="primary"
          className="h-14 w-full justify-between rounded-2xl px-4 text-base shadow-md"
          isDisabled={cart.length === 0}
          onPress={() => setIsCheckoutOpen(true)}>
          <span className="flex items-center gap-2">
            <ShoppingCart size={20} />
            {itemCount} ürün
          </span>
          <span className="flex items-center gap-3 font-bold">
            <span>₺{cartTotal.toFixed(2)}</span>
            <span>Ödemeye geç</span>
          </span>
        </Button>
      </footer>

      <Drawer isOpen={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog className="flex h-[min(48rem,calc(100dvh-0.75rem))] w-full flex-col rounded-t-3xl bg-white shadow-2xl outline-none">
              <Drawer.Header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <Drawer.Heading className="text-lg font-bold">
                  Ödeme
                </Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body className="min-h-0 flex-1 p-0">
                <InvoicePanel
                  isCompact
                  onOpenCustomerDrawer={() => setIsCustomerDrawerOpen(true)}
                  onOpenHeldSalesDrawer={() => setIsHeldSalesDrawerOpen(true)}
                  onCheckoutComplete={() => setIsCheckoutOpen(false)}
                />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <Drawer isOpen={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog className="flex h-[min(42rem,calc(100dvh-0.75rem))] w-full flex-col rounded-t-3xl bg-white shadow-2xl outline-none">
              <Drawer.Header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <Drawer.Heading className="text-lg font-bold">
                  Hızlı Ekle
                </Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body className="min-h-0 flex-1 p-0">
                <ProductList isCompact />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

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
