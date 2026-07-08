import React, { useState } from 'react';
import { useSalesStore } from '../store/useSalesStore';
import type { HeldSale } from '../store/useSalesStore';
import { useCustomerStore } from '../../customers/store/useCustomerStore';
import { useConfirm } from '../../../shared/contexts/ConfirmDialogContext';
import { Button } from '@heroui/react';
import { X, Clock, Trash2, ListRestart } from 'lucide-react';
import { toast } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HeldSalesDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { heldSales, cart, restoreSale, removeHeldSale, clearHeldSales } = useSalesStore();
  const { customers } = useCustomerStore();
  const { confirm } = useConfirm();
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const onAlertOpen = () => setIsAlertOpen(true);
  const onAlertClose = () => setIsAlertOpen(false);

  const handleRestoreClick = (saleId: string) => {
    if (cart.length > 0) {
      setSelectedSaleId(saleId);
      onAlertOpen();
    } else {
      restoreSale(saleId);
      toast.success('Bekleyen satış yüklendi');
      onClose();
    }
  };

  const confirmRestore = () => {
    if (selectedSaleId) {
      restoreSale(selectedSaleId);
      toast.success('Bekleyen satış yüklendi');
      onAlertClose();
      onClose();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" 
              onClick={onClose} 
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={20} className="text-primary" />
                    Bekleyen Satışlar
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">{heldSales.length} adet bekleyen satış bulunuyor</p>
                </div>
                <Button variant="ghost" isIconOnly onPress={onClose}><X size={20} /></Button>
              </div>

              <div className="p-3 border-b border-gray-100 flex justify-end">
                 <Button 
                   variant="ghost" 
                   className="text-danger hover:bg-danger/10 text-xs h-8"
                   onPress={async () => {
                     const confirmed = await confirm({
                       title: 'Tümünü Temizle',
                       description: 'Tüm bekleme listesini temizlemek istediğinize emin misiniz?',
                       confirmText: 'Temizle',
                       variant: 'danger'
                     });
                     if (confirmed) {
                       clearHeldSales();
                     }
                   }}
                   isDisabled={heldSales.length === 0}
                 >
                   <Trash2 size={14} className="mr-1.5" />
                   Tümünü Temizle
                 </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {heldSales.length === 0 ? (
                   <div className="text-center text-gray-500 mt-10 flex flex-col items-center">
                     <Clock size={40} className="text-gray-300 mb-3" />
                     <p>Bekleyen satış bulunmamaktadır</p>
                   </div>
                ) : (
                  heldSales.map((sale: HeldSale) => {
                    const customer = customers.find(c => c.id === sale.customerId);
                    const customerName = customer ? `${customer.name} ${customer.surname || ''}`.trim() : 'Müşteri Seçilmedi';
                    
                    const subtotal = sale.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

                    let discountAmount = 0;
                    if (sale.discountType === 'percentage') {
                      discountAmount = subtotal * ((sale.discountValue || 0) / 100);
                    } else {
                      // To handle backward compatibility with old local storage objects
                      discountAmount = sale.discountValue !== undefined ? sale.discountValue : ((sale as any).discount || 0);
                    }

                    const totalAmount = subtotal - discountAmount;

                    const totalItems = sale.cart.reduce((sum, item) => sum + item.quantity, 0);
                    const timeString = new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={sale.id} className="relative group bg-white border border-gray-200 rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all">
                        <button 
                          className="absolute top-3 right-3 text-gray-400 hover:text-danger p-1 rounded-md hover:bg-danger/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHeldSale(sale.id);
                          }}
                          title="Bu satışı sil"
                        >
                          <X size={16} />
                        </button>
                        
                        <div className="cursor-pointer" onClick={() => handleRestoreClick(sale.id)}>
                          <div className="flex justify-between items-start mb-2 pr-6">
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">{customerName}</h4>
                              <span className="text-xs text-gray-500">{timeString} • {totalItems} Ürün</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-primary text-lg leading-none">₺{totalAmount.toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <div className="mt-3 bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {sale.cart.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                            </p>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:underline">
                              <ListRestart size={14} />
                              Sepete Aktar
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAlertOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sepet Üzerine Yazılacak</h3>
              <p className="text-gray-600 text-sm mb-6">
                Mevcut sepetinizde ürünler bulunuyor. Bekleyen satışı yüklediğinizde <strong>aktif sepetinizdeki tüm ürünler silinecek</strong> ve yerini bu satış alacaktır.
                <br/><br/>Onaylıyor musunuz?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onPress={onAlertClose}>İptal</Button>
                <Button variant="danger" onPress={confirmRestore}>Evet, Üzerine Yaz</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
