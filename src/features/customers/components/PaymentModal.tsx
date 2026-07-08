import React, { useState, useEffect } from 'react';
import { CheckCircle2, Banknote, Loader2, Info } from 'lucide-react';
import { Button, Modal, toast } from '@heroui/react';
import { useCustomerStore } from '../store/useCustomerStore';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { ReceiptTemplate } from '@/features/sales';
import { useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  currentDebt: number;
  onPaymentSuccess?: () => void;
}

export const PaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customerId,
  currentDebt,
  onPaymentSuccess
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalDebt, setModalDebt] = useState(currentDebt);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: 'Tahsilat_Makbuzu'
  });
  const { addPayment } = useCustomerStore();

  useEffect(() => {
    if (isOpen) {
      setModalDebt(currentDebt);
      setAmount('');
      setPaymentId(null);
    }
  }, [isOpen, currentDebt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);

    if (isNaN(payAmount) || payAmount <= 0) {
      toast.danger('Lütfen geçerli bir tutar girin');
      return;
    }

    // Overpayment is allowed, it will result in a negative totalDebt (customer credit)

    setIsSubmitting(true);
    try {
      const newId = await addPayment(customerId, payAmount);
      setPaymentId(newId || Date.now().toString());

      toast.success('Tahsilat başarıyla kaydedildi');

      onPaymentSuccess?.();
      onClose(); // Automatically close it now
    } catch {
      toast.danger('Tahsilat kaydedilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayAll = () => {
    setAmount(modalDebt.toString());
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
          <Modal.Dialog className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl outline-none">
            <Modal.CloseTrigger />
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Icon className="bg-primary/10 text-primary">
                  <Banknote className="size-5" />
                </Modal.Icon>
                <div>
                  <Modal.Heading className="text-xl">Tahsilat Al</Modal.Heading>
                  <p className="text-sm font-normal text-gray-500">
                    Müşteri borcundan düşülecek tutar
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body>
                {/* Hidden Receipt for Printing */}
                <div className="hidden">
                  <ReceiptTemplate
                    ref={receiptRef}
                    sale={{
                      id: paymentId || 'new-payment',
                      createdAt: new Date().toISOString(),
                      amount: parseFloat(amount || '0')
                    }}
                  />
                </div>

                <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <span className="font-medium text-gray-600">
                    Mevcut Borç:
                  </span>
                  <span className="text-2xl font-bold text-orange-600">
                    ₺
                    {modalDebt.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2
                    })}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Ödenen Tutar (₺)
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <span className="text-gray-500 sm:text-lg">₺</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="focus:ring-primary focus:border-primary block w-full rounded-xl border border-gray-200 bg-white py-3 pr-12 pl-8 text-lg transition-all outline-none focus:ring-2"
                        placeholder="0.00"
                        autoFocus
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center">
                        <button
                          type="button"
                          onClick={handlePayAll}
                          className="text-primary hover:text-primary-600 bg-primary/10 hover:bg-primary/20 rounded-lg px-2 py-1 text-xs font-bold transition-colors">
                          TÜMÜ
                        </button>
                      </div>
                    </div>
                  </div>

                  {parseFloat(amount) > modalDebt && modalDebt >= 0 && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                      <Info
                        className="mt-0.5 flex-shrink-0 text-blue-500"
                        size={18}
                      />
                      <p className="text-sm leading-snug text-blue-700">
                        Girdiğiniz tutar mevcut borçtan fazla. Fazla olan{' '}
                        <strong>
                          ₺
                          {(parseFloat(amount) - modalDebt).toLocaleString(
                            'tr-TR',
                            { minimumFractionDigits: 2 }
                          )}
                        </strong>{' '}
                        tutar, müşterinin alacağı (artı bakiye) olarak
                        kaydedilecek ve sonraki alışverişlerinden otomatik
                        düşülecektir.
                      </p>
                    </div>
                  )}
                </div>

                {paymentId && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="secondary"
                      onPress={() => handlePrint()}
                      size="sm">
                      <Printer size={16} className="mr-2" /> Son Makbuzu Yazdır
                    </Button>
                  </div>
                )}
              </Modal.Body>

              <Modal.Footer className="flex gap-3 border-t border-gray-100 p-6">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onPress={onClose}>
                  İptal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isDisabled={
                    isSubmitting || !amount || parseFloat(amount) <= 0
                  }>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 animate-spin" size={20} />
                  ) : (
                    <CheckCircle2 className="mr-2" size={20} />
                  )}
                  Kaydet
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
