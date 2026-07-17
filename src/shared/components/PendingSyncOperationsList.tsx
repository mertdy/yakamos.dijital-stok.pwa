import { Package, ReceiptText, UserRound, WalletCards } from 'lucide-react';
import type { PendingSyncOperation } from '@/shared/utils/pendingSyncOperations';

interface PendingSyncOperationsListProps {
  operations: PendingSyncOperation[];
  onOperationPress?: (operation: PendingSyncOperation) => void;
}

const icons = {
  sale: ReceiptText,
  inventory: Package,
  customer: UserRound,
  payment: WalletCards
};

const operationHints = {
  sale: 'SATIŞ İŞLEMİ',
  inventory: 'ÜRÜN DEĞİŞİKLİĞİ',
  customer: 'MÜŞTERİ DEĞİŞİKLİĞİ',
  payment: 'TAHSİLAT İŞLEMİ'
};

export const PendingSyncOperationsList = ({
  operations,
  onOperationPress
}: PendingSyncOperationsListProps) => {
  if (operations.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
        Sırada bekleyen işlem yok.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {operations.map(operation => {
        const Icon = icons[operation.kind];
        const clickable = Boolean(operation.target && onOperationPress);
        const content = (
          <>
            <span className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700">
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="mb-0.5 block text-[8px] font-bold tracking-wider text-amber-700">
                {operationHints[operation.kind]}
              </span>
              <span className="block truncate text-sm font-semibold text-gray-900">
                {operation.title}
              </span>
              {operation.details.length > 0 && (
                <span className="mt-1 block space-y-0.5 text-xs leading-5 text-gray-600">
                  {operation.details.map(detail => (
                    <span key={detail} className="block">
                      {detail}
                    </span>
                  ))}
                </span>
              )}
            </span>
            {clickable && (
              <span className="text-primary self-center text-xs font-medium">
                {operation.kind === 'sale' ? 'Satış geçmişi' : 'Görüntüle'}
              </span>
            )}
          </>
        );

        return (
          <li key={operation.id}>
            {clickable ? (
              <button
                type="button"
                onClick={() => onOperationPress(operation)}
                className="focus:ring-primary/40 flex w-full items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 transition-colors hover:bg-amber-100 focus:ring-2 focus:outline-none">
                {content}
              </button>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
