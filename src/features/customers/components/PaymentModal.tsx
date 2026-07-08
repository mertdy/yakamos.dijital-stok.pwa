import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Banknote, Loader2, Info } from 'lucide-react';
import { Button } from '@heroui/react';
import { useCustomerStore } from '../store/useCustomerStore';
import { toast } from '@heroui/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  currentDebt: number;
  onPaymentSuccess?: () => void;
}

export const PaymentModal: React.FC<Props> = ({ isOpen, onClose, customerId, currentDebt, onPaymentSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalDebt, setModalDebt] = useState(currentDebt);
  const { addPayment } = useCustomerStore();

  useEffect(() => {
    if (isOpen) {
      setModalDebt(currentDebt);
      setAmount('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      await addPayment(customerId, payAmount);
      toast.success('Tahsilat başarıyla kaydedildi');
      onPaymentSuccess?.();
      onClose();
    } catch (error) {
      toast.danger('Tahsilat kaydedilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayAll = () => {
    setAmount(modalDebt.toString());
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Banknote size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tahsilat Al</h2>
                <p className="text-sm text-gray-500">Müşteri borcundan düşülecek tutar</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6 flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <span className="text-gray-600 font-medium">Mevcut Borç:</span>
              <span className="text-2xl font-bold text-orange-600">
                ₺{modalDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ödenen Tutar (₺)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-lg">₺</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="0.00"
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <button
                      type="button"
                      onClick={handlePayAll}
                      className="text-xs font-bold text-primary hover:text-primary-600 bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors"
                    >
                      TÜMÜ
                    </button>
                  </div>
                </div>
              </div>
              
              {parseFloat(amount) > modalDebt && modalDebt >= 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                  <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
                  <p className="text-sm text-blue-700 leading-snug">
                    Girdiğiniz tutar mevcut borçtan fazla. Fazla olan <strong>₺{(parseFloat(amount) - modalDebt).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong> tutar, müşterinin alacağı (artı bakiye) olarak kaydedilecek ve sonraki alışverişlerinden otomatik düşülecektir.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onPress={onClose}>
                İptal
              </Button>
              <Button 
                type="submit" 
                variant="primary" 
                className="flex-1"
                isDisabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : (
                  <CheckCircle2 className="mr-2" size={20} />
                )}
                Kaydet
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
