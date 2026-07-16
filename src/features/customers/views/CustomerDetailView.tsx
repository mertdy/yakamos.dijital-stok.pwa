import { useEffect, useState, useCallback, Fragment } from 'react';
import { clsx } from 'clsx';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  CreditCard,
  Banknote,
  History,
  ReceiptText,
  ChevronDown,
  ChevronUp,
  Package,
  MessageCircle,
  PhoneCall
} from 'lucide-react';
import { Button } from '@heroui/react';
import {
  useCustomerStore,
  type CustomerTransaction
} from '../store/useCustomerStore';
import { PaymentModal } from '../components/PaymentModal';
import { ShareStatementModal } from '../components/ShareStatementModal';
import { useAuthStore } from '@/features/auth';
import posthog from 'posthog-js';
import { normalizeWhatsAppPhone } from '../domain/customerStatement';

export const CustomerDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, getCustomerTransactions, isLoading, hasLoadedCustomers } =
    useCustomerStore();
  const { activeMembership } = useAuthStore();
  const isOwner = activeMembership?.role === 'OWNER';
  const hasPaymentPermission =
    isOwner || activeMembership?.permissions.includes('TAKE_PAYMENT');
  const hasStatementSharePermission =
    isOwner ||
    activeMembership?.permissions.includes('SHARE_CUSTOMER_STATEMENT');

  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const toggleExpand = (txId: string) => {
    setExpandedTxId(prev => (prev === txId ? null : txId));
  };

  const customer = customers.find(c => c.id === id);

  useEffect(() => {
    if (!customer) {
      return;
    }

    posthog.capture('customer_detail_viewed', {
      customer_id: customer.id,
      has_phone: Boolean(customer.phone),
      has_email: Boolean(customer.email),
      credit_limit: customer.creditLimit ?? 0,
      total_debt: customer.totalDebt ?? 0
    });
  }, [customer]);

  const loadTransactions = useCallback(async () => {
    setIsLoadingTx(true);
    if (id) {
      const txs = await getCustomerTransactions(id);
      setTransactions(txs);
    }
    setIsLoadingTx(false);
  }, [id, getCustomerTransactions]);

  useEffect(() => {
    if (id) {
      loadTransactions();
    }
  }, [id, loadTransactions]);

  if (isLoading || hasLoadedCustomers === false) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="flex animate-pulse flex-col items-center">
          <div className="mb-4 h-12 w-12 rounded-full bg-gray-200"></div>
          <div className="h-4 w-32 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="m-6 flex h-full flex-col items-center justify-center rounded-3xl bg-white p-12 text-gray-500">
        <User className="mb-4 text-6xl opacity-30" />
        <p className="text-lg font-medium text-gray-700">Müşteri bulunamadı.</p>
        <Button
          onPress={() => navigate('/customers')}
          className="mt-4"
          variant="secondary">
          Listeye Dön
        </Button>
      </div>
    );
  }

  const debt = customer.totalDebt || 0;
  const limit = customer.creditLimit || 0;
  const isExceeded = limit > 0 && debt >= limit;
  const percentage = limit > 0 ? Math.min((debt / limit) * 100, 100) : 0;
  const hasValidWhatsAppPhone = Boolean(normalizeWhatsAppPhone(customer.phone));

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-200">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            {customer.name} {customer.surname}
          </h1>
          <p className="text-sm text-gray-500">
            Müşteri Detayları ve Hesap Özeti
          </p>
        </div>
      </div>

      {/* Top Info Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="flex flex-col justify-center rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full">
              <User size={32} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={16} className="flex-shrink-0 text-gray-400" />
                  <span className="truncate">{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={16} className="flex-shrink-0 text-gray-400" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {!customer.phone && !customer.email && (
                <p className="text-sm text-gray-400 italic">
                  İletişim bilgisi yok
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Debt Card */}
        <div className="flex flex-col justify-center rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
              <Banknote size={18} />
              {debt < 0 ? 'Mevcut Alacak (Artı Bakiye)' : 'Mevcut Borç Bakiye'}
            </div>
          </div>
          <div
            className={clsx(
              'text-4xl font-black',
              debt > 0
                ? 'text-orange-600'
                : debt < 0
                  ? 'text-blue-600'
                  : 'text-gray-900'
            )}>
            {debt < 0 ? '+' : ''}₺
            {Math.abs(debt).toLocaleString('tr-TR', {
              minimumFractionDigits: 2
            })}
          </div>
        </div>

        {/* Credit Limit Card */}
        <div className="flex flex-col justify-center rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
              <CreditCard size={18} />
              Veresiye Limiti
            </div>
            {limit > 0 ? (
              <span
                className={clsx(
                  'rounded-md px-2 py-0.5 text-[10px] font-bold',
                  isExceeded
                    ? 'bg-danger/10 text-danger'
                    : 'bg-gray-100 text-gray-500'
                )}>
                %{percentage.toFixed(0)} Dolu
              </span>
            ) : (
              <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
                Limitsiz
              </span>
            )}
          </div>
          <div className="mb-3 text-3xl font-bold text-gray-900">
            {limit > 0
              ? `₺${limit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
              : 'Sınırsız'}
          </div>
          {limit > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  isExceeded
                    ? 'bg-danger'
                    : percentage > 80
                      ? 'bg-orange-500'
                      : 'bg-success'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {(hasPaymentPermission || hasStatementSharePermission) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {hasPaymentPermission && (
            <Button
              variant="primary"
              className="flex-1 border-none bg-[#2E7D32] py-4 text-lg shadow-md hover:bg-[#1B5E20]"
              onClick={() => setIsPaymentModalOpen(true)}>
              Tahsilat Al
            </Button>
          )}
          {hasStatementSharePermission &&
            (hasValidWhatsAppPhone ? (
              <Button
                variant="primary"
                className="flex-1 border-none bg-[#25D366] py-4 text-lg text-white shadow-md hover:bg-[#1DB954]"
                onPress={() => setIsStatementModalOpen(true)}>
                <MessageCircle className="mr-2" size={20} />
                WhatsApp Ekstresi
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="flex-1 border border-amber-200 bg-amber-50 py-4 text-amber-800"
                onPress={() => navigate(`/customers/edit/${customer.id}`)}>
                <PhoneCall className="mr-2" size={20} />
                Telefon Ekle / Düzelt
              </Button>
            ))}
        </div>
      )}

      {/* Transactions History */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border-none bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 p-5">
          <History className="text-gray-400" size={20} />
          <h2 className="font-semibold text-gray-900">
            Hesap Hareketleri (Ekstre)
          </h2>
        </div>

        <div className="flex-1 overflow-x-auto p-2">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="text-xs tracking-wider text-gray-400 uppercase">
                <th className="px-6 py-4 font-semibold">Tarih</th>
                <th className="px-6 py-4 font-semibold">İşlem Tipi</th>
                <th className="px-6 py-4 font-semibold">Açıklama</th>
                <th className="px-6 py-4 font-semibold">Tahsilatı Alan</th>
                <th className="px-6 py-4 text-right font-semibold">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingTx ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500">
                    <div className="flex animate-pulse flex-col items-center">
                      <div className="mb-4 h-8 w-8 rounded-full bg-gray-200"></div>
                      <div className="h-4 w-32 rounded bg-gray-200"></div>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-16 text-center text-gray-500">
                    <ReceiptText className="mx-auto mb-3 text-4xl opacity-20" />
                    <p>Henüz hesap hareketi bulunmuyor.</p>
                  </td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <Fragment key={tx.id}>
                    <tr
                      className={clsx(
                        'border-b border-gray-50 transition-colors hover:bg-gray-50/30',
                        tx.type === 'SALE' && 'cursor-pointer'
                      )}
                      onClick={() => tx.type === 'SALE' && toggleExpand(tx.id)}>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(tx.date).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {tx.type === 'SALE' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                              Satış (Borç)
                            </span>
                          ) : (
                            <span className="bg-success/10 text-success inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold">
                              Tahsilat (Ödeme)
                            </span>
                          )}
                          {tx.type === 'SALE' && (
                            <div className="text-gray-400">
                              {expandedTxId === tx.id ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {tx.description}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {tx.type === 'PAYMENT' ? (
                          tx.collectedBy ? (
                            <div className="flex min-w-[150px] items-center gap-2">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                <User size={14} />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-gray-700">
                                  {tx.collectedBy.displayName}
                                </span>
                                {tx.collectedBy.email && (
                                  <span className="block truncate text-xs text-gray-400">
                                    {tx.collectedBy.email}
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Kullanıcı bilgisi yok
                            </span>
                          )
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td
                        className={clsx(
                          'px-6 py-4 text-right text-sm font-bold',
                          tx.type === 'SALE'
                            ? 'text-orange-600'
                            : 'text-success'
                        )}>
                        {tx.type === 'SALE' ? '-' : '+'}₺
                        {tx.amount.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2
                        })}
                      </td>
                    </tr>

                    {/* Expanded Sale Details */}
                    {tx.type === 'SALE' && expandedTxId === tx.id && (
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                              <Package size={16} className="text-primary" />
                              Satış Detayları
                            </h4>
                            {tx.cart && tx.cart.length > 0 ? (
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
                                    {tx.cart.map((item: any, idx: number) => (
                                      <tr key={idx}>
                                        <td className="px-4 py-2 text-gray-900">
                                          {item.name}
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-600">
                                          {item.quantity}
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-600">
                                          ₺{item.price?.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium text-gray-900">
                                          ₺
                                          {(item.price * item.quantity).toFixed(
                                            2
                                          )}
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
                                {tx.subtotal !== undefined && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>Ara Toplam:</span>
                                    <span>₺{tx.subtotal.toFixed(2)}</span>
                                  </div>
                                )}
                                {tx.discountValue !== undefined &&
                                  tx.discountValue > 0 && (
                                    <div className="flex justify-between text-orange-600">
                                      <span>
                                        İndirim (
                                        {tx.discountType === 'percentage'
                                          ? `%${tx.discountValue}`
                                          : 'Tutar'}
                                        ):
                                      </span>
                                      <span>
                                        -₺
                                        {tx.discountType === 'percentage' &&
                                        tx.subtotal
                                          ? (
                                              (tx.subtotal * tx.discountValue) /
                                              100
                                            ).toFixed(2)
                                          : tx.discountValue.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900">
                                  <span>Genel Toplam:</span>
                                  <span>₺{tx.amount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
      <ShareStatementModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        customer={customer}
        transactions={transactions}
      />
    </div>
  );
};
