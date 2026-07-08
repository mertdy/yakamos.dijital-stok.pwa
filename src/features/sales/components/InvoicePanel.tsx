import React, { useState } from 'react';
import { useSalesStore, type PaymentMethod } from '../store/useSalesStore';
import { useCustomerStore } from '../../customers/store/useCustomerStore';
import { toast } from '@heroui/react';
import { UserPlus, Tag, Banknote, CreditCard, QrCode, Loader2, Pause, CheckCircle2, Receipt } from 'lucide-react';
import { Button } from '@heroui/react';
import { Tooltip } from '@heroui/react';

interface Props {
  onOpenCustomerDrawer: () => void;
  onOpenHeldSalesDrawer: () => void;
}

export const InvoicePanel: React.FC<Props> = ({ onOpenCustomerDrawer, onOpenHeldSalesDrawer }) => {
  const { 
    cart, isProcessing, checkout, holdSale, 
    customerId, discountType, discountValue, paymentMethod,
    setDiscount, setPaymentMethod
  } = useSalesStore();
  const { customers } = useCustomerStore();

  const [invoiceRef] = useState(`INV-${Math.floor(10000 + Math.random() * 90000)}`); // UI Mock
  const [givenAmount, setGivenAmount] = useState<number | ''>('');
  const [isCustomAmountFocused, setIsCustomAmountFocused] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = subtotal * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }

  const totalPayable = subtotal - discountAmount;

  const selectedCustomer = customers.find(c => c.id === customerId);
  const customerDisplayName = selectedCustomer ? `${selectedCustomer.name} ${selectedCustomer.surname || ''}`.trim() : customerId;
  const currentDebt = selectedCustomer?.totalDebt || 0;
  const creditLimit = selectedCustomer?.creditLimit || 0;
  const isCreditLimitExceeded = customerId ? (currentDebt + totalPayable > creditLimit) : true;

  const handleCheckout = async () => {
    const success = await checkout();
    if (success) {
      toast.success('Satış başarıyla tamamlandı!');
      setGivenAmount('');
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
    <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Receipt className="text-primary" size={18} />
          Ödeme
        </h2>
        <span className="text-gray-500 font-mono text-sm">#{invoiceRef}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Customer Selection */}
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center text-gray-500 text-sm">
            {customerId ? `Müşteri: ${customerDisplayName}` : 'Müşteri Seçin'}
          </div>
          <Button variant="secondary" onPress={onOpenCustomerDrawer} className="rounded-xl px-3 py-2 text-sm h-auto">
            <UserPlus size={16} className="mr-1.5" />
            Müşteri
          </Button>
        </div>

        {customerId && (
          <div className="flex justify-between items-center text-xs px-2 text-gray-500">
            <span>Mevcut Borç: ₺{currentDebt.toFixed(2)}</span>
            <span>Limit: ₺{creditLimit.toFixed(2)}</span>
          </div>
        )}

        {/* Payment Summary */}
        <div className="space-y-2">
          
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Ara Toplam</span>
              <span className="font-semibold text-gray-900">₺{subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 py-1 items-center">
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden h-8">
              <button 
                onClick={() => setDiscount('amount', Number(discountValue) || 0)}
                className={`px-3 text-xs font-bold transition-colors ${discountType === 'amount' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                ₺ Tutar
              </button>
              <button 
                onClick={() => {
                  let newVal = Number(discountValue) || 0;
                  if (newVal > 100) newVal = 100;
                  if (newVal < -100) newVal = -100;
                  setDiscount('percentage', newVal);
                }}
                className={`px-3 text-xs font-bold transition-colors ${discountType === 'percentage' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                % Yüzde
              </button>
            </div>
            <div className="relative flex-1">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="number" 
                placeholder="İndirim Miktarı" 
                value={discountValue === 0 ? '' : discountValue}
                onChange={handleDiscountChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 pl-8 pr-2 text-xs focus:ring-2 focus:ring-primary outline-none h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-sm pt-1 border-t border-gray-100">
            <div className="flex justify-between text-gray-600 items-center">
              <span>{discountAmount < 0 ? 'Fiyat Artırımı' : 'İndirim'}</span>
              <div className="flex items-center gap-1">
                <span className={`font-semibold ${discountAmount < 0 ? 'text-primary' : 'text-danger'}`}>
                  {discountAmount < 0 ? '+' : '-'}₺{Math.abs(discountAmount).toFixed(2)}
                </span>
                {Number(discountValue) !== 0 && (
                   <button onClick={() => setDiscount('amount', 0)} className="text-gray-400 hover:text-danger ml-1">x</button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-2 border-t border-gray-200">
            <span className="text-gray-900 font-bold text-sm">Genel Toplam</span>
            <span className="text-2xl font-black text-gray-900 leading-none">₺{totalPayable.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="pt-1">
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'Cash', icon: Banknote, label: 'Nakit' },
              { id: 'Card', icon: CreditCard, label: 'Kart' },
              { id: 'Scan', icon: QrCode, label: 'QR Kod' },
              { id: 'Credit', icon: UserPlus, label: 'Veresiye' },
            ].map((method) => {
              const isDisabled = method.id === 'Credit' && isCreditLimitExceeded;
              
              const btn = (
                <button
                  disabled={isDisabled}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`flex flex-col w-full h-full items-center justify-center py-2 rounded-xl border transition-all ${
                    isDisabled 
                      ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed pointer-events-none'
                      : paymentMethod === method.id 
                      ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <method.icon size={18} className="mb-1" />
                  <span className="text-[10px] font-semibold">{method.label}</span>
                </button>
              );

              if (isDisabled) {
                const tooltipMsg = !customerId 
                  ? 'Veresiye için müşteri seçin' 
                  : (creditLimit === 0 ? 'Müşterinin borç limiti yoktur' : 'Müşteri borç limitini aşmıştır');
                  
                return (
                  <Tooltip key={method.id} delay={0} closeDelay={0}>
                    <Tooltip.Trigger>
                      <div className="flex w-full h-full cursor-not-allowed">
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
          <div className="pt-3 border-t border-gray-100">
            <span className="text-[11px] uppercase font-bold text-gray-500 mb-2 block tracking-wider">Para Üstü Hesaplayıcı</span>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setGivenAmount(amt)}
                  className={`flex flex-col w-full h-full items-center justify-center py-2 rounded-xl border transition-all ${
                    givenAmount === amt 
                      ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-black">₺{amt}</span>
                </button>
              ))}
              
              <div className={`relative flex flex-col items-center justify-center py-0 rounded-xl border transition-all overflow-hidden ${
                isCustomAmountFocused || (givenAmount !== '' && ![50, 100, 200].includes(givenAmount))
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}>
                <span className="absolute left-2 text-xs font-bold opacity-50 z-10 pointer-events-none">₺</span>
                <input
                  type="number"
                  placeholder="Diğer"
                  className="w-full h-full absolute inset-0 bg-transparent text-center text-sm font-black outline-none pl-4 pr-1 focus:ring-0 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={givenAmount === '' ? '' : givenAmount}
                  onFocus={() => {
                    setIsCustomAmountFocused(true);
                    setGivenAmount('');
                  }}
                  onBlur={() => setIsCustomAmountFocused(false)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setGivenAmount(isNaN(val) ? '' : val);
                  }}
                />
              </div>
            </div>

            {givenAmount !== '' && (
              <div className="mt-3 flex justify-between items-center bg-gray-50 rounded-xl p-3 border border-gray-100">
                <span className="text-sm font-semibold text-gray-600">Para Üstü</span>
                <span className={`text-xl font-black tracking-tight ${givenAmount < totalPayable ? 'text-danger' : 'text-[#2E7D32]'}`}>
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
            className="w-full rounded-xl h-12 text-base bg-[#2E7D32] hover:bg-[#1B5E20] border-none shadow-md"
            isDisabled={cart.length === 0 || isProcessing}
            onPress={handleCheckout}
          >
            {isProcessing ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 className="mr-2" size={18} />}
            Ödemeyi Al
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              className="flex-1 rounded-xl h-10 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm text-sm"
              onPress={() => {
                holdSale();
                setGivenAmount('');
                toast.success('Satış beklemeye alındı');
              }}
              isDisabled={cart.length === 0 || isProcessing}
            >
              <Pause className="mr-1.5" size={16} />
              Beklet
            </Button>
            <Button 
              variant="danger" 
              className="flex-1 rounded-xl h-10 shadow-sm text-sm"
              onPress={() => {
                useSalesStore.getState().clearCart();
                setGivenAmount('');
              }}
              isDisabled={cart.length === 0 || isProcessing}
            >
              Sepeti Temizle
            </Button>
          </div>

          {useSalesStore.getState().heldSales.length > 0 && (
            <Button 
              variant="tertiary"
              className="w-full rounded-xl h-10 text-sm mt-1 border-dashed text-orange-600 hover:bg-orange-50 hover:border-orange-200"
              onPress={onOpenHeldSalesDrawer}
            >
              Bekleme Listesini Aç ({useSalesStore.getState().heldSales.length})
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};
