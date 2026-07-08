import React, { useMemo, useEffect, useState } from 'react';
import { Package, Settings2 } from 'lucide-react';
import { useInventoryStore } from '../../inventory/store/useInventoryStore';
import { useSalesStore } from '../store/useSalesStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { QuickAddEditModal } from './QuickAddEditModal';

export const ProductList: React.FC = () => {
  const { items, loadItems } = useInventoryStore();
  const { addToCart } = useSalesStore();
  const { quickAddItems, loadPreferences } = usePreferencesStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadItems();
    loadPreferences();
  }, [loadItems, loadPreferences]);

  const shortcutItems = useMemo(() => {
    return quickAddItems
      .map(id => items.find(i => i.id === id))
      .filter(Boolean);
  }, [items, quickAddItems]);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Package className="text-primary" size={18} />
          Hızlı Ekle
        </h2>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
        >
          <Settings2 size={14} />
          Düzenle
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {shortcutItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
            <Package className="text-5xl opacity-20" />
            <p className="text-sm font-medium">Kısayol bulunmuyor</p>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs text-primary font-semibold hover:underline mt-1"
            >
              Hemen ürün eklemek için tıklayın
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {shortcutItems.map((item: any) => (
              <button
                key={item.id}
                onClick={() => addToCart({ inventoryId: item.id, name: item.name, price: item.price, quantity: 1, barcode: item.barcode, imageUrl: item.imageUrl })}
                className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-1.5 hover:shadow-md hover:border-primary/30 transition-all active:scale-95 text-center group cursor-pointer h-full"
              >
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-5 h-5 opacity-50 group-hover:opacity-80 transition-opacity" />
                  )}
                </div>
                <h3 className="font-semibold text-[10px] text-gray-700 line-clamp-2 leading-tight w-full flex-1 flex items-center justify-center">{item.name}</h3>
                <div className="mt-auto w-full flex flex-col items-center pt-1 border-t border-gray-50">
                  <span className="text-primary font-bold text-xs">₺{item.price.toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <QuickAddEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  );
};
