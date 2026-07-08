import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, CreditCard, Banknote, History, ReceiptText, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { Button } from '@heroui/react';
import { useCustomerStore, type CustomerTransaction } from '../store/useCustomerStore';
import { PaymentModal } from '../components/PaymentModal';

export const CustomerDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, getCustomerTransactions, loadCustomers, isLoading } = useCustomerStore();
  
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const toggleExpand = (txId: string) => {
    setExpandedTxId(prev => prev === txId ? null : txId);
  };

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const customer = customers.find(c => c.id === id);

  useEffect(() => {
    if (id) {
      loadTransactions();
    }
  }, [id, getCustomerTransactions]);

  const loadTransactions = async () => {
    setIsLoadingTx(true);
    if (id) {
      const txs = await getCustomerTransactions(id);
      setTransactions(txs);
    }
    setIsLoadingTx(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-white rounded-3xl m-6 p-12">
        <User className="text-6xl mb-4 opacity-30" />
        <p className="text-lg font-medium text-gray-700">Müşteri bulunamadı.</p>
        <Button onPress={() => navigate('/customers')} className="mt-4" variant="secondary">
          Listeye Dön
        </Button>
      </div>
    );
  }

  const debt = customer.totalDebt || 0;
  const limit = customer.creditLimit || 0;
  const isExceeded = limit > 0 && debt >= limit;
  const percentage = limit > 0 ? Math.min((debt / limit) * 100, 100) : 0;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/customers')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {customer.name} {customer.surname}
          </h1>
          <p className="text-sm text-gray-500">Müşteri Detayları ve Hesap Özeti</p>
        </div>
      </div>

      {/* Top Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <User size={32} />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {!customer.phone && !customer.email && (
                <p className="text-sm text-gray-400 italic">İletişim bilgisi yok</p>
              )}
            </div>
          </div>
        </div>

        {/* Debt Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <div className="text-gray-500 text-sm font-medium flex items-center gap-1.5">
              <Banknote size={18} />
              {debt < 0 ? 'Mevcut Alacak (Artı Bakiye)' : 'Mevcut Borç Bakiye'}
            </div>
          </div>
          <div className={`text-4xl font-black ${debt > 0 ? 'text-orange-600' : debt < 0 ? 'text-blue-600' : 'text-gray-900'}`}>
            {debt < 0 ? '+' : ''}₺{Math.abs(debt).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Credit Limit Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <div className="text-gray-500 text-sm font-medium flex items-center gap-1.5">
              <CreditCard size={18} />
              Veresiye Limiti
            </div>
            {limit > 0 ? (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isExceeded ? 'bg-danger/10 text-danger' : 'text-gray-500 bg-gray-100'}`}>
                %{percentage.toFixed(0)} Dolu
              </span>
            ) : (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md">Limitsiz</span>
            )}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-3">
            {limit > 0 ? `₺${limit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : 'Sınırsız'}
          </div>
          {limit > 0 && (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isExceeded ? 'bg-danger' : percentage > 80 ? 'bg-orange-500' : 'bg-success'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          variant="primary" 
          className="flex-1 py-4 text-lg bg-[#2E7D32] hover:bg-[#1B5E20] border-none shadow-md"
          
          onClick={() => setIsPaymentModalOpen(true)}
        >
          Tahsilat Al
        </Button>
      </div>

      {/* Transactions History */}
      <div className="bg-white rounded-[28px] shadow-sm border-none overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <History className="text-gray-400" size={20} />
          <h2 className="font-semibold text-gray-900">Hesap Hareketleri (Ekstre)</h2>
        </div>
        
        <div className="overflow-x-auto flex-1 p-2">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Tarih</th>
                <th className="px-6 py-4 font-semibold">İşlem Tipi</th>
                <th className="px-6 py-4 font-semibold">Açıklama</th>
                <th className="px-6 py-4 font-semibold text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingTx ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                    <ReceiptText className="mx-auto text-4xl mb-3 opacity-20" />
                    <p>Henüz hesap hareketi bulunmuyor.</p>
                  </td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <React.Fragment key={tx.id}>
                    <tr 
                      className={`border-b border-gray-50 hover:bg-gray-50/30 transition-colors ${tx.type === 'SALE' ? 'cursor-pointer' : ''}`}
                      onClick={() => tx.type === 'SALE' && toggleExpand(tx.id)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(tx.date).toLocaleDateString('tr-TR', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {tx.type === 'SALE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700">
                              Satış (Borç)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-success/10 text-success">
                              Tahsilat (Ödeme)
                            </span>
                          )}
                          {tx.type === 'SALE' && (
                            <div className="text-gray-400">
                              {expandedTxId === tx.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {tx.description}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold text-right ${tx.type === 'SALE' ? 'text-orange-600' : 'text-success'}`}>
                        {tx.type === 'SALE' ? '-' : '+'}₺{tx.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    
                    {/* Expanded Sale Details */}
                    {tx.type === 'SALE' && expandedTxId === tx.id && (
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <td colSpan={4} className="px-6 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Package size={16} className="text-primary" />
                              Satış Detayları
                            </h4>
                            {tx.cart && tx.cart.length > 0 ? (
                              <div className="overflow-hidden rounded-lg border border-gray-100 mb-4">
                                <table className="w-full text-left text-sm">
                                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <tr>
                                      <th className="px-4 py-2 font-medium">Ürün</th>
                                      <th className="px-4 py-2 font-medium text-center">Adet</th>
                                      <th className="px-4 py-2 font-medium text-right">Birim Fiyat</th>
                                      <th className="px-4 py-2 font-medium text-right">Toplam</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {tx.cart.map((item: any, idx: number) => (
                                      <tr key={idx}>
                                        <td className="px-4 py-2 text-gray-900">{item.name}</td>
                                        <td className="px-4 py-2 text-gray-600 text-center">{item.quantity}</td>
                                        <td className="px-4 py-2 text-gray-600 text-right">₺{item.price?.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-gray-900 font-medium text-right">₺{(item.price * item.quantity).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 mb-4">Detaylı ürün bilgisi bulunmuyor.</p>
                            )}

                            {/* Summary */}
                            <div className="flex justify-end">
                              <div className="w-64 space-y-2 text-sm">
                                {tx.subtotal !== undefined && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>Ara Toplam:</span>
                                    <span>₺{tx.subtotal.toFixed(2)}</span>
                                  </div>
                                )}
                                {tx.discountValue !== undefined && tx.discountValue > 0 && (
                                  <div className="flex justify-between text-orange-600">
                                    <span>İndirim ({tx.discountType === 'percentage' ? `%${tx.discountValue}` : 'Tutar'}):</span>
                                    <span>-₺{tx.discountType === 'percentage' && tx.subtotal ? (tx.subtotal * tx.discountValue / 100).toFixed(2) : tx.discountValue.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-gray-900 font-bold border-t border-gray-100 pt-2">
                                  <span>Genel Toplam:</span>
                                  <span>₺{tx.amount.toFixed(2)}</span>
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
      </div>

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        customerId={customer.id} 
        currentDebt={debt} 
        onPaymentSuccess={loadTransactions}
      />
    </div>
  );
};
