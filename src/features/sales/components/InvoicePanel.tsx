import React, { useState } from 'react';
import { useSalesStore, type PaymentMethod } from '../store/useSalesStore';
import { useCustomerStore } from '@/features/customers';
import { toast } from '@heroui/react';
import {
  UserPlus,
  Tag,
  Banknote,
  CreditCard,
  QrCode,
  Loader2,
  Pause,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { Button } from '@heroui/react';
import { Tooltip } from '@heroui/react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { ReceiptTemplate } from './ReceiptTemplate';
import { useRef } from 'react';

interface Props {
  onOpenCustomerDrawer: () => void;
  onOpenHeldSalesDrawer: () => void;
}

export const InvoicePanel: React.FC<Props> = ({
  onOpenCustomerDrawer,
  onOpenHeldSalesDrawer
}) => {
  const {
    cart,
    isProcessing,
    checkout,
    holdSale,
    customerId,
    discountType,
    discountValue,
    paymentMethod,
    setDiscount,
    setPaymentMethod
  } = useSalesStore();
  const { customers } = useCustomerStore();

  const [invoiceRef] = useState(
    () => `INV-${Math.floor(10000 + Math.random() * 90000)}`
  ); // UI Mock
  const [givenAmount, setGivenAmount] = useState<number | ''>('');
  const [isCustomAmountFocused, setIsCustomAmountFocused] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: 'Satis_Fisi'
  });

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = subtotal * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }

  const totalPayable = subtotal - discountAmount;

  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerDisplayName = selectedCustomer
    ? `${selectedCustomer.name} ${selectedCustomer.surname || ''}`.trim()
    : customerId;
  const currentDebt = selectedCustomer?.totalDebt || 0;
  const creditLimit = selectedCustomer?.creditLimit || 0;
  const isCreditLimitExceeded = customerId
    ? currentDebt + totalPayable > creditLimit
    : true;

  const handleCheckout = async () => {
    // Save current state for receipt before checkout clears it
    const saleData = {
      id: invoiceRef,
      createdAt: new Date().toISOString(),
      items: [...cart],
      totalAmount: totalPayable
    };

    const success = await checkout();
    if (success) {
      setGivenAmount('');
      setLastSale(saleData);

      toast.success('Satış başarıyla tamamlandı!');
    } else {
      toast.danger('Satış işlemi başarısız oldu.');
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '' || rawValue === '-') {
      // Allow user to clear the input or type a negative sign
      setDiscount(discountType, rawValue as unknown as number);
      return;
    }

    let val = parseFloat(rawValue);
    if (isNaN(val)) val = 0;

    if (discountType === 'percentage') {
      if (val > 100) val = 100;
      if (val < -100) val = -100;
    }
    setDiscount(discountType, val);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      {/* Hidden Receipt for Printing */}
      <div className="hidden">
        <ReceiptTemplate ref={receiptRef} sale={lastSale} />
      </div>

      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-gray-900">
          <Receipt className="text-primary" size={18} />
          Ödeme
        </h2>
        <span className="font-mono text-sm text-gray-500">#{invoiceRef}</span>
      </div>

      <div className="space-y-3 p-4">
        {/* Customer Selection */}
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
            {customerId ? `Müşteri: ${customerDisplayName}` : 'Müşteri Seçin'}
          </div>
          <Button
            variant="secondary"
            onPress={onOpenCustomerDrawer}
            className="h-auto rounded-xl px-3 py-2 text-sm">
            <UserPlus size={16} className="mr-1.5" />
            Müşteri
          </Button>
        </div>

        {customerId && (
          <div className="flex items-center justify-between px-2 text-xs text-gray-500">
            <span>Mevcut Borç: ₺{currentDebt.toFixed(2)}</span>
            <span>Limit: ₺{creditLimit.toFixed(2)}</span>
          </div>
        )}

        {/* Payment Summary */}
        <div className="space-y-2">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Ara Toplam</span>
              <span className="font-semibold text-gray-900">
                ₺{subtotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <div className="flex h-8 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <button
                onClick={() =>
                  setDiscount('amount', Number(discountValue) || 0)
                }
                className={`px-3 text-xs font-bold transition-colors ${discountType === 'amount' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                ₺ Tutar
              </button>
              <button
                onClick={() => {
                  let newVal = Number(discountValue) || 0;
                  if (newVal > 100) newVal = 100;
                  if (newVal < -100) newVal = -100;
                  setDiscount('percentage', newVal);
                }}
                className={`px-3 text-xs font-bold transition-colors ${discountType === 'percentage' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                % Yüzde
              </button>
            </div>
            <div className="relative flex-1">
              <Tag
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                type="number"
                placeholder="İndirim Miktarı"
                value={discountValue === 0 ? '' : discountValue}
                onChange={handleDiscountChange}
                className="focus:ring-primary h-8 w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pr-2 pl-8 text-xs outline-none focus:ring-2"
              />
            </div>
          </div>

          <div className="space-y-1.5 border-t border-gray-100 pt-1 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <span>{discountAmount < 0 ? 'Fiyat Artırımı' : 'İndirim'}</span>
              <div className="flex items-center gap-1">
                <span
                  className={`font-semibold ${discountAmount < 0 ? 'text-primary' : 'text-danger'}`}>
                  {discountAmount < 0 ? '+' : '-'}₺
                  {Math.abs(discountAmount).toFixed(2)}
                </span>
                {Number(discountValue) !== 0 && (
                  <button
                    onClick={() => setDiscount('amount', 0)}
                    className="hover:text-danger ml-1 text-gray-400">
                    x
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between border-t border-gray-200 pt-2">
            <span className="text-sm font-bold text-gray-900">
              Genel Toplam
            </span>
            <span className="text-2xl leading-none font-black text-gray-900">
              ₺{totalPayable.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="pt-1">
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'Cash', icon: Banknote, label: 'Nakit' },
              { id: 'Card', icon: CreditCard, label: 'Kart' },
              { id: 'Scan', icon: QrCode, label: 'QR Kod' },
              { id: 'Credit', icon: UserPlus, label: 'Veresiye' }
            ].map(method => {
              const isDisabled =
                method.id === 'Credit' && isCreditLimitExceeded;

              const btn = (
                <button
                  disabled={isDisabled}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`flex h-full w-full flex-col items-center justify-center rounded-xl border py-2 transition-all ${
                    isDisabled
                      ? 'pointer-events-none cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                      : paymentMethod === method.id
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}>
                  <method.icon size={18} className="mb-1" />
                  <span className="text-[10px] font-semibold">
                    {method.label}
                  </span>
                </button>
              );

              if (isDisabled) {
                const tooltipMsg = !customerId
                  ? 'Veresiye için müşteri seçin'
                  : creditLimit === 0
                    ? 'Müşterinin borç limiti yoktur'
                    : 'Müşteri borç limitini aşmıştır';

                return (
                  <Tooltip key={method.id} delay={0} closeDelay={0}>
                    <Tooltip.Trigger>
                      <div className="flex h-full w-full cursor-not-allowed">
                        {btn}
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content placement="top" showArrow={true}>
                      {tooltipMsg}
                    </Tooltip.Content>
                  </Tooltip>
                );
              }

              return <React.Fragment key={method.id}>{btn}</React.Fragment>;
            })}
          </div>
        </div>

        {/* Cash Change Calculator */}
        {paymentMethod === 'Cash' && (
          <div className="border-t border-gray-100 pt-3">
            <span className="mb-2 block text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Para Üstü Hesaplayıcı
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200].map(amt => (
                <button
                  key={amt}
                  onClick={() => setGivenAmount(amt)}
                  className={`flex h-full w-full flex-col items-center justify-center rounded-xl border py-2 transition-all ${
                    givenAmount === amt
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}>
                  <span className="text-sm font-black">₺{amt}</span>
                </button>
              ))}

              <div
                className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl border py-0 transition-all ${
                  isCustomAmountFocused ||
                  (givenAmount !== '' && ![50, 100, 200].includes(givenAmount))
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}>
                <span className="pointer-events-none absolute left-2 z-10 text-xs font-bold opacity-50">
                  ₺
                </span>
                <input
                  type="number"
                  placeholder="Diğer"
                  className="absolute inset-0 h-full w-full appearance-none bg-transparent pr-1 pl-4 text-center text-sm font-black outline-none focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={givenAmount === '' ? '' : givenAmount}
                  onFocus={() => {
                    setIsCustomAmountFocused(true);
                    setGivenAmount('');
                  }}
                  onBlur={() => setIsCustomAmountFocused(false)}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setGivenAmount(isNaN(val) ? '' : val);
                  }}
                />
              </div>
            </div>

            {givenAmount !== '' && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                <span className="text-sm font-semibold text-gray-600">
                  Para Üstü
                </span>
                <span
                  className={`text-xl font-black tracking-tight ${givenAmount < totalPayable ? 'text-danger' : 'text-[#2E7D32]'}`}>
                  {givenAmount < totalPayable
                    ? 'Yetersiz Bakiye'
                    : `₺${(givenAmount - totalPayable).toFixed(2)}`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant="primary"
            className="h-12 w-full rounded-xl border-none bg-[#2E7D32] text-base shadow-md hover:bg-[#1B5E20]"
            isDisabled={cart.length === 0 || isProcessing}
            onPress={handleCheckout}>
            {isProcessing ? (
              <Loader2 className="mr-2 animate-spin" size={18} />
            ) : (
              <CheckCircle2 className="mr-2" size={18} />
            )}
            Ödemeyi Al
          </Button>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="h-10 flex-1 rounded-xl border-none bg-orange-500 text-sm text-white shadow-sm hover:bg-orange-600"
              onPress={() => {
                holdSale();
                setGivenAmount('');
                toast.success('Satış beklemeye alındı');
              }}
              isDisabled={cart.length === 0 || isProcessing}>
              <Pause className="mr-1.5" size={16} />
              Beklet
            </Button>
            <Button
              variant="danger"
              className="h-10 flex-1 rounded-xl text-sm shadow-sm"
              onPress={() => {
                useSalesStore.getState().clearCart();
                setGivenAmount('');
              }}
              isDisabled={cart.length === 0 || isProcessing}>
              Sepeti Temizle
            </Button>
          </div>

          {lastSale && (
            <Button
              variant="secondary"
              className="mt-1 h-10 w-full rounded-xl text-sm"
              onPress={() => handlePrint()}>
              <Printer className="mr-1.5" size={16} />
              Son Fişi Yazdır
            </Button>
          )}

          {useSalesStore.getState().heldSales.length > 0 && (
            <Button
              variant="tertiary"
              className="mt-1 h-10 w-full rounded-xl border-dashed text-sm text-orange-600 hover:border-orange-200 hover:bg-orange-50"
              onPress={onOpenHeldSalesDrawer}>
              Bekleme Listesini Aç ({useSalesStore.getState().heldSales.length})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
