import { useRef } from 'react';
import { Button } from '@heroui/react';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { ReceiptTemplate } from './ReceiptTemplate';
import type { SaleTransaction } from '@/features/sales-history/store/useSalesHistoryStore';
import { useAuthStore } from '@/features/auth';

interface ReceiptPrintButtonProps {
  sale: SaleTransaction;
}

const ReceiptPrintButton = ({ sale }: ReceiptPrintButtonProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const companyName = useAuthStore(
    state =>
      state.activeCompany?.receiptHeader?.trim() ||
      state.activeCompany?.name ||
      'Dijital Stok'
  );
  const printReceipt = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: 'Satis_Fisi'
  });

  return (
    <>
      <div className="hidden">
        <ReceiptTemplate
          ref={receiptRef}
          sale={sale}
          companyName={companyName}
        />
      </div>
      <Button
        variant="secondary"
        className="mt-1 h-10 w-full rounded-xl text-sm"
        onPress={() => printReceipt()}>
        <Printer className="mr-1.5" size={16} />
        Son Fişi Yazdır
      </Button>
    </>
  );
};

export default ReceiptPrintButton;
