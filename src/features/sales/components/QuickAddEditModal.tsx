import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  Package,
  GripVertical,
  CheckCircle2,
  Loader2,
  Minus,
  Plus
} from 'lucide-react';
import { Button, Input, Modal, toast } from '@heroui/react';
import { useInventoryStore } from '@/features/inventory';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useAuthStore } from '@/features/auth';
import { useDebounce } from '@/shared/hooks/useDebounce';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Sortable Item Component for the Right Panel
const SortableItem = ({
  id,
  item,
  onRemove
}: {
  id: string;
  item: any;
  onRemove: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'mb-2 flex items-center gap-3 rounded-xl border bg-white p-3',
        isDragging ? 'border-primary shadow-md' : 'border-gray-100'
      )}>
      <div
        {...attributes}
        {...listeners}
        className="hover:text-primary cursor-grab p-1 text-gray-400">
        <GripVertical size={18} />
      </div>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
        {item?.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item?.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <Package size={20} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">
          {item?.name || 'Bilinmeyen Ürün'}
        </p>
        <p className="text-xs font-medium text-gray-500">
          ₺{(item?.price || 0).toFixed(2)}
        </p>
      </div>
      <button
        onClick={() => onRemove(id)}
        className="hover:text-danger hover:bg-danger/10 rounded-lg p-2 text-gray-400 transition-colors">
        <Minus size={16} />
      </button>
    </div>
  );
};

export const QuickAddEditModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { items } = useInventoryStore();
  const {
    quickAddItems: savedItems,
    quickAddCompanyId,
    saveQuickAddItems,
    isLoading
  } = usePreferencesStore();
  const { activeCompany } = useAuthStore();

  // Local state for editing before saving
  const [localQuickAddItems, setLocalQuickAddItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalQuickAddItems(
        quickAddCompanyId === activeCompany?.id ? [...savedItems] : []
      );
      setSearchQuery('');
    }
  }, [isOpen, savedItems, quickAddCompanyId, activeCompany?.id]);

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
    } catch {
      toast.danger('Kayıt sırasında bir hata oluştu');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}>
      <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl outline-none">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div>
                <Modal.Heading className="text-xl">
                  Hızlı Ekle Kısayollarını Düzenle
                </Modal.Heading>
                <p className="mt-1 text-sm font-normal text-gray-500">
                  Ürünleri arayın, sağ tarafa ekleyin ve sürükleyerek sıralayın.
                </p>
              </div>
            </Modal.Header>

            <Modal.Body>
              <div className="flex min-h-0 flex-1 flex-row overflow-hidden bg-gray-50/30">
                {/* Left Panel: Search & Add */}
                <div className="flex min-h-0 w-1/2 flex-col border-r border-gray-200 bg-white">
                  <div className="border-b border-gray-100 p-4">
                    <div className="relative">
                      <Search
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <Input
                        type="text"
                        fullWidth
                        placeholder="Envanterde ara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto p-4">
                    {searchResults.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-400">
                        Ürün bulunamadı.
                      </div>
                    ) : (
                      searchResults.map(item => {
                        const isAdded = localQuickAddItems.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-full w-full rounded-lg object-cover"
                                  />
                                ) : (
                                  <Package size={20} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {item.name}
                                </p>
                                <p className="text-xs font-medium text-gray-500">
                                  ₺{item.price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <button
                              disabled={isAdded}
                              onClick={() => handleAddItem(item.id)}
                              className={clsx(
                                'flex-shrink-0 rounded-lg p-2 transition-colors',
                                isAdded
                                  ? 'bg-success/10 text-success'
                                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                              )}>
                              {isAdded ? (
                                <CheckCircle2 size={18} />
                              ) : (
                                <Plus size={18} />
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Panel: Current Shortcuts & Sort */}
                <div className="flex min-h-0 w-1/2 flex-col">
                  <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
                    <h3 className="font-semibold text-gray-700">
                      Seçili Kısayollar ({localQuickAddItems.length})
                    </h3>
                    <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 shadow-sm">
                      Sürükle bırak ile sırala
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4">
                    {localQuickAddItems.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
                        <Package className="text-6xl opacity-20" />
                        <p className="text-sm font-medium">
                          Kısayol eklenmemiş
                        </p>
                        <p className="px-8 text-center text-xs">
                          Soldaki listeden sık kullandığınız ürünleri buraya
                          ekleyin.
                        </p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}>
                        <SortableContext
                          items={localQuickAddItems}
                          strategy={verticalListSortingStrategy}>
                          {localQuickAddItems.map(id => {
                            const item = items.find(i => i.id === id);
                            return (
                              <SortableItem
                                key={id}
                                id={id}
                                item={item}
                                onRemove={handleRemoveItem}
                              />
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-3 border-t border-gray-100 bg-white p-6">
              <Button
                variant="secondary"
                onPress={onClose}
                isDisabled={isLoading}>
                İptal
              </Button>
              <Button
                variant="primary"
                onPress={handleSave}
                isDisabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 animate-spin" size={18} />
                ) : (
                  <CheckCircle2 className="mr-2" size={18} />
                )}
                Değişiklikleri Kaydet
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
