import React from 'react';
import { useSalesStore } from '../store/useSalesStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/core/config/routes';
import { useAuthStore } from '@/features/auth';
import {
  Trash2,
  ShoppingBasket,
  Minus,
  Plus,
  Package,
  ShoppingCart,
  Pencil
} from 'lucide-react';
import { Button } from '@heroui/react';

export const OrderDetailsPanel: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useSalesStore();
  const { activeMembership } = useAuthStore();
  const navigate = useNavigate();
  const hasInventoryPermission =
    activeMembership?.role === 'OWNER' ||
    activeMembership?.permissions.includes('MANAGE_INVENTORY');

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-gray-900">
            <ShoppingCart className="text-primary" size={18} />
            Sipariş Detayları
          </h2>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            Ürün: {cart.length}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-danger hover:bg-danger/10 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors">
            Tümünü Sil <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
            <ShoppingBasket className="text-6xl opacity-30" />
            <p className="font-medium text-gray-500">Sepetiniz boş</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 border-b border-gray-100 bg-gray-50/50 p-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
              <div className="col-span-5">Ürün</div>
              <div className="col-span-2 text-center">Fiyat</div>
              <div className="col-span-3 text-center">Miktar</div>
              <div className="col-span-2 text-right">Alt Toplam</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-50">
              {cart.map(item => (
                <div
                  key={item.inventoryId}
                  className="group grid grid-cols-12 items-center gap-4 p-4 transition-colors hover:bg-gray-50/50">
                  {/* Product Column */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        <Package size={24} />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span
                        className="truncate text-sm font-semibold text-gray-900"
                        title={item.name}>
                        {item.name}
                      </span>
                      {hasInventoryPermission && (
                        <Button
                          variant="ghost"
                          className="text-primary hover:bg-primary/5 mt-0.5 -ml-1 h-6 w-fit gap-1 rounded-md px-2 text-xs font-medium"
                          onPress={() =>
                            navigate(ROUTES.INVENTORY.EDIT(item.inventoryId))
                          }>
                          <Pencil size={13} /> Ürünü düzenle
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Price Column */}
                  <div className="col-span-2 text-center text-sm font-medium text-gray-700">
                    ₺{item.price.toFixed(2)}
                  </div>

                  {/* Quantity Column */}
                  <div className="col-span-3 flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-1 py-1">
                      <button
                        className="hover:text-danger flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition-all hover:bg-white hover:shadow-sm disabled:opacity-50"
                        onClick={() =>
                          item.quantity > 1
                            ? updateQuantity(
                                item.inventoryId,
                                item.quantity - 1
                              )
                            : removeFromCart(item.inventoryId)
                        }>
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        className="hover:text-primary flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition-all hover:bg-white hover:shadow-sm"
                        onClick={() =>
                          updateQuantity(item.inventoryId, item.quantity + 1)
                        }>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal & Action Column */}
                  <div className="col-span-2 flex items-center justify-end gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      ₺{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.inventoryId)}
                      className="text-danger hover:bg-danger/10 rounded-lg p-1 transition-colors"
                      title="Ürünü Sil">
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
