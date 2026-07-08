import React from 'react';
import { useSalesStore } from '../store/useSalesStore';
import { Trash2, ShoppingBasket, Minus, Plus, Package, ShoppingCart } from 'lucide-react';

export const OrderDetailsPanel: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useSalesStore();

  return (
    <div className="flex flex-col h-full bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShoppingCart className="text-primary" size={18} />
            Sipariş Detayları
          </h2>
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Ürün: {cart.length}
          </span>
        </div>
        {cart.length > 0 && (
          <button 
            onClick={clearCart}
            className="text-danger flex items-center gap-1 text-sm font-semibold hover:bg-danger/10 px-3 py-1.5 rounded-full transition-colors"
          >
            Tümünü Sil <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
            <ShoppingBasket className="text-6xl opacity-30" />
            <p className="font-medium text-gray-500">Sepetiniz boş</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
              <div className="col-span-5">Ürün</div>
              <div className="col-span-2 text-center">Fiyat</div>
              <div className="col-span-3 text-center">Miktar</div>
              <div className="col-span-2 text-right">Alt Toplam</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-50">
              {cart.map((item) => (
                <div key={item.inventoryId} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50/50 transition-colors group">
                  {/* Product Column */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-gray-400">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package size={24} />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-semibold text-sm text-gray-900 truncate" title={item.name}>{item.name}</span>
                      {item.barcode && <span className="text-[11px] text-gray-500 truncate">SKU: {item.barcode}</span>}
                    </div>
                  </div>

                  {/* Price Column */}
                  <div className="col-span-2 text-center font-medium text-gray-700 text-sm">
                    ₺{item.price.toFixed(2)}
                  </div>

                  {/* Quantity Column */}
                  <div className="col-span-3 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-1 py-1">
                      <button 
                        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-white hover:shadow-sm transition-all hover:text-danger disabled:opacity-50"
                        onClick={() => item.quantity > 1 ? updateQuantity(item.inventoryId, item.quantity - 1) : removeFromCart(item.inventoryId)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-semibold w-6 text-center text-sm text-gray-900">{item.quantity}</span>
                      <button 
                        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-white hover:shadow-sm transition-all hover:text-primary"
                        onClick={() => updateQuantity(item.inventoryId, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal & Action Column */}
                  <div className="col-span-2 flex items-center justify-end gap-3">
                    <span className="font-bold text-sm text-gray-900">
                      ₺{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.inventoryId)}
                      className="text-gray-300 hover:text-danger transition-colors p-1"
                      title="Ürünü Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
