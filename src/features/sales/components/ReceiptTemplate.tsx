import React from 'react';
import dayjs from 'dayjs';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(val);
};

interface ReceiptTemplateProps {
  sale: any; // We'll pass the completed sale object
  companyName?: string;
}

// ForwardRef is needed for react-to-print
export const ReceiptTemplate = React.forwardRef<
  HTMLDivElement,
  ReceiptTemplateProps
>(({ sale, companyName = 'Dijital Stok' }, ref) => {
  if (!sale) return null;

  return (
    <div
      ref={ref}
      className="w-[300px] bg-white p-4 font-mono text-sm leading-tight text-black">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="mb-1 text-xl font-bold">{companyName}</h1>
        <p className="text-xs text-gray-600">
          Tarih: {dayjs(sale.createdAt).format('DD/MM/YYYY HH:mm')}
        </p>
        {sale.id && (
          <p className="text-xs text-gray-600">
            Fiş No: {sale.id.slice(0, 8).toUpperCase()}
          </p>
        )}
      </div>

      <div className="mb-2 border-b border-dashed border-gray-400"></div>

      {/* Items (If Sale) */}
      {sale?.items && (
        <div className="mb-2 w-full">
          <div className="mb-1 flex justify-between text-xs font-bold">
            <span>Ürün</span>
            <span>Tutar</span>
          </div>
          {sale.items.map((item: any, index: number) => (
            <div key={index} className="mb-1 flex justify-between text-xs">
              <span className="w-2/3 truncate">
                {item.quantity}x {item.name}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Payment Detail (If Payment) */}
      {!sale?.items && (
        <div className="mt-2 mb-2 flex justify-between text-xs">
          <span>Tahsilat / Ödeme</span>
          <span>{formatCurrency(sale?.totalAmount || sale?.amount || 0)}</span>
        </div>
      )}

      <div className="mb-2 border-b border-dashed border-gray-400"></div>

      {/* Totals */}
      <div className="mb-4 flex justify-between text-sm font-bold">
        <span>TOPLAM</span>
        <span>{formatCurrency(sale?.totalAmount || sale?.amount || 0)}</span>
      </div>

      {/* Footer */}
      <div className="mt-6 mb-2 text-center text-xs">
        <p className="font-semibold">BİZİ TERCİH ETTİĞİNİZ</p>
        <p className="font-semibold">İÇİN TEŞEKKÜRLER</p>
      </div>
    </div>
  );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';
