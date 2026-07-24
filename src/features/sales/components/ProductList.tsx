import React, { useMemo, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Check, Package, Settings2 } from 'lucide-react';
import { Spinner, Tabs } from '@heroui/react';
import { useInventoryStore } from '@/features/inventory';
import { useSalesStore } from '../store/useSalesStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { QuickAddEditModal } from './QuickAddEditModal';
import { useAuthStore } from '@/features/auth';

interface ProductListProps {
  isCompact?: boolean;
}

export const ProductList: React.FC<ProductListProps> = ({
  isCompact = false
}) => {
  const { items } = useInventoryStore();
  const { addToCart } = useSalesStore();
  const {
    quickAddItems,
    quickAddCompanyId,
    companyQuickAddItems,
    companyQuickAddCompanyId,
    quickAddScope,
    isLoading,
    isCompanyQuickAddLoading,
    loadPreferences,
    loadCompanyQuickAddItems,
    saveQuickAddScope
  } = usePreferencesStore();
  const activeCompanyId = useAuthStore(state => state.profile?.activeCompanyId);
  const activeMembership = useAuthStore(state => state.activeMembership);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recentlyAddedItemId, setRecentlyAddedItemId] = useState<string | null>(
    null
  );
  const recentlyAddedTimer = useRef<number | null>(null);

  useEffect(() => {
    loadPreferences(activeCompanyId);
    loadCompanyQuickAddItems(activeCompanyId);
  }, [activeCompanyId, loadCompanyQuickAddItems, loadPreferences]);

  useEffect(
    () => () => {
      if (recentlyAddedTimer.current !== null) {
        window.clearTimeout(recentlyAddedTimer.current);
      }
    },
    []
  );

  const handleQuickAdd = (item: any) => {
    addToCart({
      inventoryId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      barcode: item.barcode,
      imageUrl: item.imageUrl,
      sku: item.sku,
      categoryId: item.categoryId
    });

    if (recentlyAddedTimer.current !== null) {
      window.clearTimeout(recentlyAddedTimer.current);
    }
    setRecentlyAddedItemId(item.id);
    recentlyAddedTimer.current = window.setTimeout(() => {
      setRecentlyAddedItemId(null);
      recentlyAddedTimer.current = null;
    }, 1_100);
  };

  const shortcutItems = useMemo(() => {
    const activeQuickAddItems =
      quickAddScope === 'company'
        ? companyQuickAddCompanyId === activeCompanyId
          ? companyQuickAddItems
          : []
        : quickAddCompanyId === activeCompanyId
          ? quickAddItems
          : [];

    return activeQuickAddItems
      .map(id => items.find(i => i.id === id))
      .filter(Boolean);
  }, [
    items,
    quickAddItems,
    quickAddCompanyId,
    companyQuickAddItems,
    companyQuickAddCompanyId,
    activeCompanyId,
    quickAddScope
  ]);
  const canManageCompanyQuickAdd =
    activeMembership?.role === 'OWNER' ||
    activeMembership?.permissions.includes('MANAGE_COMPANY_QUICK_ADD');
  const isQuickAddLoading =
    Boolean(activeCompanyId) &&
    (quickAddScope === 'company'
      ? isCompanyQuickAddLoading || companyQuickAddCompanyId !== activeCompanyId
      : isLoading || quickAddCompanyId !== activeCompanyId);

  return (
    <div
      className={clsx(
        'flex h-full flex-col overflow-hidden bg-white',
        isCompact
          ? 'border-0 shadow-none'
          : 'rounded-2xl border border-gray-100 shadow-sm'
      )}>
      {/* Header */}
      <div
        data-onboarding="sales-quick-add"
        className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-gray-900">
          <Package className="text-primary" size={18} />
          Hızlı Ekle
        </h2>
        {(quickAddScope === 'personal' || canManageCompanyQuickAdd) && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-primary bg-primary/10 hover:bg-primary/20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors">
            <Settings2 size={14} />
            Düzenle
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isQuickAddLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
            <Spinner size="sm" />
            <p className="text-sm font-medium">Hızlı menü yükleniyor...</p>
          </div>
        ) : shortcutItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
            <Package className="text-5xl opacity-20" />
            <p className="text-sm font-medium">Kısayol bulunmuyor</p>
            {(quickAddScope === 'personal' || canManageCompanyQuickAdd) && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-primary mt-1 text-xs font-semibold hover:underline">
                Hemen ürün eklemek için tıklayın
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {shortcutItems.map((item: any) => {
              const wasRecentlyAdded = recentlyAddedItemId === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleQuickAdd(item)}
                  className={clsx(
                    'group flex h-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border bg-white p-2 text-center shadow-sm transition-all active:scale-95',
                    wasRecentlyAdded
                      ? 'border-success bg-success/5 ring-success/20 shadow-md ring-1'
                      : 'hover:border-primary/30 border-gray-100 hover:shadow-md'
                  )}>
                  <div
                    className={clsx(
                      'flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg transition-colors',
                      wasRecentlyAdded
                        ? 'bg-success/10 text-success'
                        : 'text-primary group-hover:bg-primary/10 bg-gray-50'
                    )}>
                    {wasRecentlyAdded ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-5 w-5 opacity-50 transition-opacity group-hover:opacity-80" />
                    )}
                  </div>
                  <h3 className="line-clamp-2 flex w-full flex-1 items-center justify-center text-[10px] leading-tight font-semibold text-gray-700">
                    {item.name}
                  </h3>
                  <div className="mt-auto flex w-full flex-col items-center border-t border-gray-50 pt-1">
                    {wasRecentlyAdded ? (
                      <span
                        role="status"
                        className="text-success text-[10px] font-bold">
                        Sepete eklendi
                      </span>
                    ) : (
                      <span className="text-primary text-xs font-bold">
                        ₺{item.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Tabs
        selectedKey={quickAddScope}
        onSelectionChange={key =>
          void saveQuickAddScope(key as 'personal' | 'company')
        }
        className="border-t border-gray-100 bg-gray-50/50 p-2">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Hızlı ekleme menüsü" className="w-full">
            <Tabs.Tab id="personal" className="flex-1 justify-center">
              Kişisel
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="company" className="flex-1 justify-center">
              Ortak
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <QuickAddEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        scope={quickAddScope}
      />
    </div>
  );
};
