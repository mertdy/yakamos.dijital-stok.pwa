import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Package, GripVertical, CheckCircle2, Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@heroui/react';
import { useInventoryStore } from '../../inventory/store/useInventoryStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '@heroui/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Sortable Item Component for the Right Panel
const SortableItem = ({ id, item, onRemove }: { id: string, item: any, onRemove: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-3 bg-white border rounded-xl mb-2 ${isDragging ? 'border-primary shadow-md' : 'border-gray-100'}`}>
      <div {...attributes} {...listeners} className="cursor-grab hover:text-primary text-gray-400 p-1">
        <GripVertical size={18} />
      </div>
      <div className="w-10 h-10 bg-gray-50 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">
        {item?.imageUrl ? (
          <img src={item.imageUrl} alt={item?.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <Package size={20} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{item?.name || 'Bilinmeyen Ürün'}</p>
        <p className="text-xs text-gray-500 font-medium">₺{(item?.price || 0).toFixed(2)}</p>
      </div>
      <button 
        onClick={() => onRemove(id)}
        className="p-2 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
      >
        <Minus size={16} />
      </button>
    </div>
  );
};

export const QuickAddEditModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { items } = useInventoryStore();
  const { quickAddItems: savedItems, saveQuickAddItems, isLoading } = usePreferencesStore();
  
  // Local state for editing before saving
  const [localQuickAddItems, setLocalQuickAddItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Initialize local state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalQuickAddItems([...savedItems]);
      setSearchQuery('');
    }
  }, [isOpen, savedItems]);

  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return items.slice(0, 50); // Default show 50 items
    
    const query = debouncedSearch.toLowerCase();
    return items.filter(
      (item: any) =>
        item.name.toLowerCase().includes(query) ||
        (item.barcode && String(item.barcode).toLowerCase().includes(query)) ||
        (item.sku && String(item.sku).toLowerCase().includes(query))
    );
  }, [items, debouncedSearch]);

  const handleAddItem = (id: string) => {
    if (!localQuickAddItems.includes(id)) {
      setLocalQuickAddItems([...localQuickAddItems, id]);
    } else {
      toast.info('Ürün zaten kısayollarda ekli.');
    }
  };

  const handleRemoveItem = (id: string) => {
    setLocalQuickAddItems(localQuickAddItems.filter(itemId => itemId !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localQuickAddItems.indexOf(active.id as string);
      const newIndex = localQuickAddItems.indexOf(over.id as string);
      setLocalQuickAddItems(arrayMove(localQuickAddItems, oldIndex, newIndex));
    }
  };

  const handleSave = async () => {
    try {
      await saveQuickAddItems(localQuickAddItems);
      toast.success('Kısayollar başarıyla kaydedildi.');
      onClose();
    } catch (error) {
      // Error is handled in store
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl h-[80vh] flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Hızlı Ekle Kısayollarını Düzenle</h2>
              <p className="text-sm text-gray-500 mt-1">Ürünleri arayın, sağ tarafa ekleyin ve sürükleyerek sıralayın.</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden bg-gray-50/30">
            
            {/* Left Panel: Search & Add */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col min-h-0 bg-white">
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Envanterde ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {searchResults.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-sm">Ürün bulunamadı.</div>
                ) : (
                  searchResults.map(item => {
                    const isAdded = localQuickAddItems.includes(item.id);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Package size={20} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500 font-medium">₺{item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <button
                          disabled={isAdded}
                          onClick={() => handleAddItem(item.id)}
                          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isAdded ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                        >
                          {isAdded ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Current Shortcuts & Sort */}
            <div className="w-1/2 flex flex-col min-h-0">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Seçili Kısayollar ({localQuickAddItems.length})</h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                  Sürükle bırak ile sırala
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                {localQuickAddItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Package className="text-6xl opacity-20" />
                    <p className="text-sm font-medium">Kısayol eklenmemiş</p>
                    <p className="text-xs text-center px-8">Soldaki listeden sık kullandığınız ürünleri buraya ekleyin.</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={localQuickAddItems} strategy={verticalListSortingStrategy}>
                      {localQuickAddItems.map(id => {
                        const item = items.find(i => i.id === id);
                        return <SortableItem key={id} id={id} item={item} onRemove={handleRemoveItem} />;
                      })}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

          </div>

          <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
            <Button variant="secondary" onPress={onClose} isDisabled={isLoading}>
              İptal
            </Button>
            <Button variant="primary" onPress={handleSave} isDisabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 className="mr-2" size={18} />}
              Değişiklikleri Kaydet
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
