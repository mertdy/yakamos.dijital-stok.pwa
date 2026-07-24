import React, { useState } from 'react';
import { useSalesStore } from '../store/useSalesStore';
import type { HeldSale } from '../store/useSalesStore';
import { useCustomerStore } from '@/features/customers';
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import { Button, toast, Modal } from '@heroui/react';
import { X, Clock, Trash2, ListRestart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';
import { clsx } from 'clsx';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HeldSalesDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { heldSales, cart, restoreSale, removeHeldSale, clearHeldSales } =
    useSalesStore();
  const { customers } = useCustomerStore();
  const { confirm } = useConfirm();
  const isMobile = useMediaQuery('(max-width: 639px)');

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
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={isMobile ? { y: '100%' } : { x: '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '100%' }}
              transition={{
                type: 'tween',
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1]
              }}
              className={clsx(
                'fixed z-50 flex w-full flex-col bg-white shadow-2xl',
                isMobile
                  ? 'right-0 bottom-0 left-0 max-h-[min(44rem,calc(100dvh-0.75rem))] rounded-t-3xl'
                  : 'top-0 right-0 bottom-0 max-w-md'
              )}>
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-5">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <Clock size={20} className="text-primary" />
                    Bekleyen Satışlar
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {heldSales.length} adet bekleyen satış bulunuyor
                  </p>
                </div>
                <Button variant="ghost" isIconOnly onPress={onClose}>
                  <X size={20} />
                </Button>
              </div>

              <div className="flex justify-end border-b border-gray-100 p-3">
                <Button
                  variant="ghost"
                  className="text-danger hover:bg-danger/10 h-8 text-xs"
                  onPress={async () => {
                    const confirmed = await confirm({
                      title: 'Tümünü Temizle',
                      description:
                        'Tüm bekleme listesini temizlemek istediğinize emin misiniz?',
                      confirmText: 'Temizle',
                      variant: 'danger'
                    });
                    if (confirmed) {
                      posthog.capture('held_sales_cleared', {
                        held_sale_count: heldSales.length,
                        clear_source: 'held_sales_drawer'
                      });
                      clearHeldSales();
                    }
                  }}
                  isDisabled={heldSales.length === 0}>
                  <Trash2 size={14} className="mr-1.5" />
                  Tümünü Temizle
                </Button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {heldSales.length === 0 ? (
                  <div className="mt-10 flex flex-col items-center text-center text-gray-500">
                    <Clock size={40} className="mb-3 text-gray-300" />
                    <p>Bekleyen satış bulunmamaktadır</p>
                  </div>
                ) : (
                  heldSales.map((sale: HeldSale) => {
                    const customer = customers.find(
                      c => c.id === sale.customerId
                    );
                    const customerName = customer
                      ? `${customer.name} ${customer.surname || ''}`.trim()
                      : 'Müşteri Seçilmedi';

                    const subtotal = sale.cart.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0
                    );

                    let discountAmount = 0;
                    if (sale.discountType === 'percentage') {
                      discountAmount =
                        subtotal * ((sale.discountValue || 0) / 100);
                    } else {
                      // To handle backward compatibility with old local storage objects
                      discountAmount =
                        sale.discountValue !== undefined
                          ? sale.discountValue
                          : (sale as any).discount || 0;
                    }

                    const totalAmount = subtotal - discountAmount;

                    const totalItems = sale.cart.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    );
                    const timeString = new Date(
                      sale.timestamp
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={sale.id}
                        className="group hover:border-primary/50 relative rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md">
                        <button
                          className="hover:text-danger hover:bg-danger/10 absolute top-3 right-3 rounded-md p-1 text-gray-400 transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            posthog.capture('held_sale_removed', {
                              held_sale_id: sale.id,
                              item_count: totalItems,
                              total_amount: totalAmount,
                              has_customer: Boolean(sale.customerId)
                            });
                            removeHeldSale(sale.id);
                          }}
                          title="Bu satışı sil">
                          <X size={16} />
                        </button>

                        <div
                          className="cursor-pointer"
                          onClick={() => handleRestoreClick(sale.id)}>
                          <div className="mb-2 flex items-start justify-between pr-6">
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">
                                {customerName}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {timeString} • {totalItems} Ürün
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-primary text-lg leading-none font-black">
                                ₺{totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg bg-gray-50 p-2">
                            <p className="line-clamp-2 text-xs text-gray-600">
                              {sale.cart
                                .map(i => `${i.quantity}x ${i.name}`)
                                .join(', ')}
                            </p>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <span className="text-primary flex items-center gap-1 text-xs font-semibold group-hover:underline">
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

      <Modal
        isOpen={isAlertOpen}
        onOpenChange={open => {
          if (!open) onAlertClose();
        }}>
        <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl outline-none">
              <Modal.Header>
                <Modal.Heading className="text-xl">
                  Sepet Üzerine Yazılacak
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="mb-6 text-sm text-gray-600">
                  Mevcut sepetinizde ürünler bulunuyor. Bekleyen satışı
                  yüklediğinizde{' '}
                  <strong>aktif sepetinizdeki tüm ürünler silinecek</strong> ve
                  yerini bu satış alacaktır.
                  <br />
                  <br />
                  Onaylıyor musunuz?
                </p>
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-3 p-0">
                <Button variant="ghost" onPress={onAlertClose}>
                  İptal
                </Button>
                <Button variant="danger" onPress={confirmRestore}>
                  Evet, Üzerine Yaz
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
};
