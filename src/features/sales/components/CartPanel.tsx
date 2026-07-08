import React from 'react';
import { useSalesStore } from '../store/useSalesStore';
import { toast } from '@heroui/react';
import {
  ShoppingCart,
  Trash2,
  ShoppingBasket,
  Minus,
  Plus,
  Banknote
} from 'lucide-react';
import { Button } from '@heroui/react';

export const CartPanel: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout,
    isProcessing
  } = useSalesStore();

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    const success = await checkout();
    if (success) {
      toast.success('Satış başarıyla tamamlandı!');
    } else {
      toast.danger('Satış işlemi sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-gray-900">
          <ShoppingCart className="text-primary" size={18} />
          Sepet
        </h2>
        {cart.length > 0 && (
          <Button variant="danger" isIconOnly onPress={clearCart}>
            <Trash2 className="text-xl" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
            <ShoppingBasket className="text-6xl opacity-30" />
            <p>Sepetiniz boş</p>
          </div>
        ) : (
          cart.map(item => (
            <div
              key={item.inventoryId}
              className="bg-background flex flex-col gap-2 rounded-[20px] p-4">
              <div className="flex items-start justify-between">
                <span className="line-clamp-2 pr-2 text-[15px] font-semibold text-gray-900">
                  {item.name}
                </span>
                <span className="text-primary font-bold whitespace-nowrap">
                  ₺{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Birim: ₺{item.price.toFixed(2)}
                </span>
                <div className="flex items-center gap-4 rounded-full bg-white px-3 py-1.5 shadow-sm">
                  <Button
                    variant="ghost"
                    isIconOnly
                    className="hover:text-danger h-8 w-8 rounded-full text-gray-500"
                    onPress={() =>
                      item.quantity > 1
                        ? updateQuantity(item.inventoryId, item.quantity - 1)
                        : removeFromCart(item.inventoryId)
                    }>
                    <Minus size={18} />
                  </Button>
                  <span className="w-4 text-center font-bold text-gray-900">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    isIconOnly
                    className="hover:text-primary h-8 w-8 rounded-full text-gray-500"
                    onPress={() =>
                      updateQuantity(item.inventoryId, item.quantity + 1)
                    }>
                    <Plus size={18} />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-100 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-medium text-gray-600">Genel Toplam</span>
          <span className="text-3xl font-bold tracking-tight text-gray-900">
            ₺{totalAmount.toFixed(2)}
          </span>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full rounded-full"
          isDisabled={cart.length === 0 || isProcessing}
          onPress={handleCheckout}>
          {!isProcessing && <Banknote className="mr-2" />}
          {isProcessing ? 'İşleniyor...' : 'Ödemeyi Al'}
        </Button>
      </div>
    </div>
  );
};
