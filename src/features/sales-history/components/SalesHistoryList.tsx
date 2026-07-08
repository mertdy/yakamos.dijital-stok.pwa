import React, { useState } from 'react';
import { useSalesHistoryStore } from '../store/useSalesHistoryStore';
import { useCustomerStore } from '../../customers/store/useCustomerStore';
import {
  ReceiptText,
  ChevronDown,
  ChevronUp,
  Package,
  AlertCircle
} from 'lucide-react';
import { Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../../shared/contexts/ConfirmDialogContext';

export const SalesHistoryList: React.FC = () => {
  const { sales, cancelSale } = useSalesHistoryStore();
  const { confirm } = useConfirm();
  const { customers } = useCustomerStore();
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleExpand = (id: string) => {
    setExpandedSaleId(prev => (prev === id ? null : id));
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Genel Müşteri';
    const customer = customers.find(c => c.id === customerId);
    return customer
      ? `${customer.name} ${customer.surname || ''}`.trim()
      : 'Bilinmeyen Müşteri';
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'Cash':
        return 'Nakit';
      case 'Card':
        return 'Kart';
      case 'Credit':
        return 'Veresiye';
      case 'Scan':
        return 'QR Kod';
      default:
        return method;
    }
  };

  const handleCancelSale = async (saleId: string) => {
    const confirmed = await confirm({
      title: 'Satışı İptal Et',
      description:
        'Bu satışı iptal etmek istediğinize emin misiniz? Bu işlem stokları geri yükler ve varsa borcu düşer.',
      confirmText: 'İptal Et',
      variant: 'danger'
    });

    if (confirmed) {
      setCancellingId(saleId);
      await cancelSale(saleId);
      setCancellingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-x-auto p-2">
      <table className="w-full min-w-[800px] border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-100 text-xs tracking-wider text-gray-400 uppercase">
            <th className="px-6 py-4 font-semibold">Tarih</th>
            <th className="px-6 py-4 font-semibold">Fatura No</th>
            <th className="px-6 py-4 font-semibold">Müşteri</th>
            <th className="px-6 py-4 font-semibold">Ödeme Yöntemi</th>
            <th className="px-6 py-4 font-semibold">Durum</th>
            <th className="px-6 py-4 text-right font-semibold">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                <ReceiptText className="mx-auto mb-3 text-4xl opacity-20" />
                <p>Belirlenen kriterlere uygun satış bulunamadı.</p>
              </td>
            </tr>
          ) : (
            sales.map(sale => (
              <React.Fragment key={sale.id}>
                <tr
                  className={`cursor-pointer border-b border-gray-50 transition-colors ${sale.status === 'cancelled' ? 'bg-danger/5 hover:bg-danger/10 text-gray-400' : 'hover:bg-gray-50/30'}`}
                  onClick={() => toggleExpand(sale.id)}>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(sale.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {sale.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {getCustomerName(sale.customerId)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                      {getPaymentMethodLabel(sale.paymentMethod)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {sale.status === 'cancelled' ? (
                      <span className="bg-danger/10 text-danger inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold">
                        <AlertCircle size={12} /> İptal Edildi
                      </span>
                    ) : (
                      <span className="bg-success/10 text-success inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold">
                        Tamamlandı
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                    {sale.status === 'cancelled' ? (
                      <span className="text-gray-400 line-through">
                        ₺
                        {sale.totalAmount.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2
                        })}
                      </span>
                    ) : (
                      <span>
                        ₺
                        {sale.totalAmount.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2
                        })}
                      </span>
                    )}
                    <div className="ml-3 inline-block align-middle text-gray-400">
                      {expandedSaleId === sale.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded Sale Details */}
                {expandedSaleId === sale.id && (
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-start justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <Package size={16} className="text-primary" />
                            Satış Detayları
                          </h4>
                          {sale.status !== 'cancelled' && (
                            <Button
                              variant="danger"
                              onPress={() => handleCancelSale(sale.id)}
                              isDisabled={cancellingId === sale.id}
                              className="h-8 rounded-lg px-3 text-xs">
                              {cancellingId === sale.id
                                ? 'İptal Ediliyor...'
                                : 'Satışı İptal Et'}
                            </Button>
                          )}
                        </div>

                        {sale.cart && sale.cart.length > 0 ? (
                          <div className="mb-4 overflow-hidden rounded-lg border border-gray-100">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                  <th className="px-4 py-2 font-medium">
                                    Ürün
                                  </th>
                                  <th className="px-4 py-2 text-center font-medium">
                                    Adet
                                  </th>
                                  <th className="px-4 py-2 text-right font-medium">
                                    Birim Fiyat
                                  </th>
                                  <th className="px-4 py-2 text-right font-medium">
                                    Toplam
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {sale.cart.map((item: any, idx: number) => (
                                  <tr
                                    key={idx}
                                    className={
                                      sale.status === 'cancelled'
                                        ? 'text-gray-400'
                                        : ''
                                    }>
                                    <td
                                      className={`px-4 py-2 ${sale.status === 'cancelled' ? '' : 'text-gray-900'}`}>
                                      <span
                                        className="hover:text-primary cursor-pointer transition-colors hover:underline"
                                        onClick={e => {
                                          e.stopPropagation();
                                          navigate(
                                            `/inventory/edit/${item.inventoryId}`
                                          );
                                        }}>
                                        {item.name}
                                      </span>
                                    </td>
                                    <td
                                      className={`px-4 py-2 text-center ${sale.status === 'cancelled' ? '' : 'text-gray-600'}`}>
                                      {item.quantity}
                                    </td>
                                    <td
                                      className={`px-4 py-2 text-right ${sale.status === 'cancelled' ? '' : 'text-gray-600'}`}>
                                      ₺{item.price?.toFixed(2)}
                                    </td>
                                    <td
                                      className={`px-4 py-2 text-right font-medium ${sale.status === 'cancelled' ? '' : 'text-gray-900'}`}>
                                      ₺{(item.price * item.quantity).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="mb-4 text-xs text-gray-500">
                            Detaylı ürün bilgisi bulunmuyor.
                          </p>
                        )}

                        {/* Summary */}
                        <div className="flex justify-end">
                          <div className="w-64 space-y-2 text-sm">
                            {sale.subtotal !== undefined && (
                              <div className="flex justify-between text-gray-600">
                                <span>Ara Toplam:</span>
                                <span>₺{sale.subtotal.toFixed(2)}</span>
                              </div>
                            )}
                            {sale.discountValue !== undefined &&
                              sale.discountValue > 0 && (
                                <div className="flex justify-between text-orange-600">
                                  <span>
                                    İndirim (
                                    {sale.discountType === 'percentage'
                                      ? `%${sale.discountValue}`
                                      : 'Tutar'}
                                    ):
                                  </span>
                                  <span>
                                    -₺
                                    {sale.discountType === 'percentage' &&
                                    sale.subtotal
                                      ? (
                                          (sale.subtotal * sale.discountValue) /
                                          100
                                        ).toFixed(2)
                                      : sale.discountValue.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900">
                              <span>Genel Toplam:</span>
                              <span
                                className={
                                  sale.status === 'cancelled'
                                    ? 'text-gray-400 line-through'
                                    : ''
                                }>
                                ₺{sale.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
