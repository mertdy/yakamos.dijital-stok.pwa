import React from 'react';
import { useSalesStore } from '../store/useSalesStore';
import { toast } from '@heroui/react';
import { ShoppingCart, Trash2, ShoppingBasket, Minus, Plus, Banknote } from 'lucide-react';
import { Button } from '@heroui/react';

export const CartPanel: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, checkout, isProcessing } = useSalesStore();

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    const success = await checkout();
    if (success) {
      toast.success('Satış başarıyla tamamlandı!');
    } else {
      toast.danger('Satış işlemi sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[28px] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <ShoppingCart className="text-primary" size={18} />
          Sepet
        </h2>
        {cart.length > 0 && (
          <Button variant="danger" isIconOnly onPress={clearCart}>
            <Trash2 className="text-xl" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
            <ShoppingBasket className="text-6xl opacity-30" />
            <p>Sepetiniz boş</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.inventoryId} className="flex flex-col gap-2 p-4 bg-background rounded-[20px]">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-[15px] text-gray-900 line-clamp-2 pr-2">{item.name}</span>
                <span className="font-bold text-primary whitespace-nowrap">₺{(item.price * item.quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-500">Birim: ₺{item.price.toFixed(2)}</span>
                <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-full shadow-sm">
                  <Button 
                    variant="ghost"
                    isIconOnly
                    className="w-8 h-8 rounded-full text-gray-500 hover:text-danger"
                    onPress={() => item.quantity > 1 ? updateQuantity(item.inventoryId, item.quantity - 1) : removeFromCart(item.inventoryId)}
                  >
                    <Minus size={18} />
                  </Button>
                  <span className="font-bold w-4 text-center text-gray-900">{item.quantity}</span>
                  <Button 
                    variant="ghost"
                    isIconOnly
                    className="w-8 h-8 rounded-full text-gray-500 hover:text-primary"
                    onPress={() => updateQuantity(item.inventoryId, item.quantity + 1)}
                  >
                    <Plus size={18} />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-600 font-medium">Genel Toplam</span>
          <span className="text-3xl font-bold tracking-tight text-gray-900">₺{totalAmount.toFixed(2)}</span>
        </div>
        <Button 
          variant="primary"
          size="lg"
          className="w-full rounded-full"
          isDisabled={cart.length === 0 || isProcessing}
          onPress={handleCheckout}
        >
          {!isProcessing && <Banknote className="mr-2" />}
          {isProcessing ? 'İşleniyor...' : 'Ödemeyi Al'}
        </Button>
      </div>
    </div>
  );
};
