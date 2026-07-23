import React, { useState, useEffect } from 'react';
import { CheckCircle2, Banknote, Loader2, Info } from 'lucide-react';
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  toast
} from '@heroui/react';
import { useCustomerStore } from '../store/useCustomerStore';
import { useAuthStore } from '@/features/auth';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { ReceiptTemplate } from '@/features/sales';
import { useRef } from 'react';
import posthog from 'posthog-js';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const paymentSchema = z.object({
  amount: z.number().positive('Lütfen geçerli bir tutar girin')
});

type PaymentFormData = z.infer<typeof paymentSchema>;

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
  const companyName = useAuthStore(
    state =>
      state.activeCompany?.receiptHeader?.trim() ||
      state.activeCompany?.name ||
      'Dijital Stok'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalDebt, setModalDebt] = useState(currentDebt);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange'
  });
  const amount = useWatch({ control, name: 'amount' });

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: 'Tahsilat_Makbuzu'
  });
  const { addPayment } = useCustomerStore();

  useEffect(() => {
    if (isOpen) {
      setModalDebt(currentDebt);
      reset();
      setPaymentId(null);
    }
  }, [isOpen, currentDebt, reset]);

  const submitPayment = async ({ amount: payAmount }: PaymentFormData) => {
    // Overpayment is allowed, it will result in a negative totalDebt (customer credit)

    setIsSubmitting(true);
    try {
      posthog.capture('customer_payment_modal_submitted', {
        customer_id: customerId,
        amount: payAmount,
        current_debt: modalDebt,
        is_overpayment: payAmount > modalDebt,
        payment_source: 'customer_detail_view'
      });

      const newId = await addPayment(customerId, payAmount);
      setPaymentId(newId || `payment-${customerId}`);

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
    setValue('amount', modalDebt, {
      shouldDirty: true,
      shouldValidate: true
    });
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
            <form onSubmit={handleSubmit(submitPayment)}>
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
                    companyName={companyName}
                    sale={{
                      id: paymentId || 'new-payment',
                      createdAt: new Date().toISOString(),
                      amount: amount || 0
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
                  <TextField
                    fullWidth
                    name="amount"
                    value={Number.isFinite(amount) ? String(amount) : ''}
                    onChange={value =>
                      setValue(
                        'amount',
                        value === '' ? Number.NaN : Number(value),
                        { shouldDirty: true, shouldValidate: true }
                      )
                    }
                    isInvalid={Boolean(errors.amount)}
                    isRequired>
                    <Label>Ödenen Tutar (₺)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        fullWidth
                        step="0.01"
                        className="pr-14"
                        placeholder="0.00"
                        autoFocus
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onPress={handlePayAll}>
                          TÜMÜ
                        </Button>
                      </div>
                    </div>
                    <FieldError>{errors.amount?.message}</FieldError>
                  </TextField>

                  {amount > modalDebt && modalDebt >= 0 && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                      <Info
                        className="mt-0.5 flex-shrink-0 text-blue-500"
                        size={18}
                      />
                      <p className="text-sm leading-snug text-blue-700">
                        Girdiğiniz tutar mevcut borçtan fazla. Fazla olan{' '}
                        <strong>
                          ₺
                          {(amount - modalDebt).toLocaleString('tr-TR', {
                            minimumFractionDigits: 2
                          })}
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

              <Modal.Footer className="flex gap-3 border-t border-gray-100 pt-4">
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
                  isDisabled={isSubmitting}>
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
