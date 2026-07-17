import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Button, Modal, toast } from '@heroui/react';
import { CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { useInventoryStore } from '@/features/inventory';
import { useCustomerStore } from '@/features/customers';
import {
  IMPORT_FIELDS,
  buildImportRows,
  importRows,
  parseImportFile,
  suggestMapping,
  type DuplicateMode,
  type ImportResult,
  type ImportType,
  type StockMode
} from '../utils/dataImport';

export const DataImportWizard = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { activeCompany, user } = useAuthStore();
  const { items } = useInventoryStore();
  const { customers } = useCustomerStore();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<ImportType>('inventory');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('update');
  const [stockMode, setStockMode] = useState<StockMode>('replace');
  const [busy, setBusy] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const rows = useMemo(
    () => buildImportRows(rawRows, headers, mapping),
    [rawRows, headers, mapping]
  );
  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      toast.danger('CSV, XLSX veya XLS dosyası seçin.');
      return;
    }
    setBusy(true);
    try {
      const parsed = await parseImportFile(file);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(suggestMapping(parsed.headers, type));
      setStep(2);
    } catch {
      toast.danger('Dosya okunamadı. Lütfen biçimini kontrol edin.');
    } finally {
      setBusy(false);
    }
  };
  const changeType = (next: ImportType) => {
    setType(next);
    if (headers.length) setMapping(suggestMapping(headers, next));
  };
  const closeWizard = () => {
    setStep(1);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setImportResult(null);
    onClose();
  };
  const runImport = async () => {
    if (!activeCompany || !user) return;
    setBusy(true);
    try {
      const result = await importRows({
        type,
        rows,
        companyId: activeCompany.id,
        userId: user.uid,
        inventory: items,
        customers,
        duplicateMode,
        stockMode
      });
      setImportResult(result);
    } catch {
      toast.danger('İçe aktarma sırasında hata oluştu.');
    } finally {
      setBusy(false);
    }
  };
  const fields = IMPORT_FIELDS[type];
  return (
    <Modal isOpen={isOpen} onOpenChange={open => !open && closeWizard()}>
      <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl outline-none">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div>
                <Modal.Heading className="text-xl">
                  Verileri İçe Aktar
                </Modal.Heading>
                <p className="mt-1 text-sm font-normal text-gray-500">
                  {importResult
                    ? 'İçe aktarma sonuçlarını gözden geçirin.'
                    : 'Dosyanızı eşleştirin, sonuçları gözden geçirin ve onaylayın.'}
                </p>
              </div>
            </Modal.Header>
            <Modal.Body className="space-y-5">
              {!importResult && (
                <div className="grid grid-cols-[minmax(0,1fr)_1fr_minmax(0,1fr)_1fr_minmax(0,1fr)] items-center gap-2 text-xs font-semibold">
                  {[
                    ['Dosya', 1],
                    ['Eşleştirme', 2],
                    ['Onay', 3]
                  ].map(([label, index], itemIndex) => (
                    <div key={label} className="contents">
                      {itemIndex > 0 && (
                        <span className="h-px flex-1 bg-gray-200" />
                      )}
                      <div
                        className={clsx(
                          'flex min-w-0 items-center gap-2',
                          step >= Number(index)
                            ? 'text-primary'
                            : 'text-gray-400'
                        )}>
                        <span
                          className={clsx(
                            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                            step >= Number(index)
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-400'
                          )}>
                          {index}
                        </span>
                        <span className="truncate">{label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {importResult ? (
                <section className="space-y-5 py-3">
                  <div className="flex flex-col items-center text-center">
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={26} />
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">
                      İçe aktarma tamamlandı
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {type === 'inventory' ? 'Envanter ' : 'Müşteri '}
                      verileriniz işlendi.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ['Eklenen', importResult.created, 'text-emerald-600'],
                      ['Güncellenen', importResult.updated, 'text-primary'],
                      ['Atlanan', importResult.skipped, 'text-amber-600'],
                      ['Geçersiz', importResult.invalid, 'text-gray-500']
                    ].map(([label, value, color]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                        <p className={clsx('text-2xl font-bold', color)}>
                          {value}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                    Toplam {rows.length} satır değerlendirildi. Geçersiz
                    satırlar zorunlu ad/ürün adı alanı boş olduğu için
                    işlenmedi.
                  </div>
                </section>
              ) : step === 1 ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => changeType('inventory')}
                      className={`rounded-xl border p-4 text-left ${type === 'inventory' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      <b>Envanter</b>
                      <p className="mt-1 text-xs text-gray-500">
                        Ürün, barkod, stok ve fiyat
                      </p>
                    </button>
                    <button
                      onClick={() => changeType('customers')}
                      className={`rounded-xl border p-4 text-left ${type === 'customers' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                      <b>Müşteriler</b>
                      <p className="mt-1 text-xs text-gray-500">
                        İletişim ve kredi limiti
                      </p>
                    </button>
                  </div>
                  <label className="hover:border-primary/40 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                    <FileUp className="text-primary mb-3" size={32} />
                    <b>CSV, XLSX veya XLS dosyası seçin</b>
                    <span className="mt-1 text-xs text-gray-500">
                      Dosyayı buraya sürükleyin veya seçmek için tıklayın
                    </span>
                    <input
                      className="hidden"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={event => chooseFile(event.target.files?.[0])}
                    />
                  </label>
                </>
              ) : step === 2 ? (
                <>
                  <p className="text-sm text-gray-600">
                    {rawRows.length} satır bulundu. Dosya sütunlarını alanlarla
                    eşleştirin.
                  </p>
                  <div className="space-y-3">
                    {fields.map(([field, label, required]) => (
                      <label
                        key={field}
                        className="grid grid-cols-2 items-center gap-3 text-sm">
                        <span>
                          {label}
                          {required && <b className="text-danger"> *</b>}
                        </span>
                        <select
                          value={mapping[field] || ''}
                          onChange={event =>
                            setMapping({
                              ...mapping,
                              [field]: event.target.value
                            })
                          }
                          className="rounded-lg border border-gray-200 p-2">
                          <option value="">Eşleştirme yok</option>
                          {headers.map(header => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {type === 'inventory' && (
                    <div className="rounded-xl bg-gray-50 p-4 text-sm">
                      <b>Stok kuralı</b>
                      <label className="mt-2 block">
                        <input
                          type="radio"
                          checked={stockMode === 'replace'}
                          onChange={() => setStockMode('replace')}
                        />{' '}
                        Dosyadaki stok mevcut stoğun yerine yazılsın
                      </label>
                      <label className="mt-2 block">
                        <input
                          type="radio"
                          checked={stockMode === 'add'}
                          onChange={() => setStockMode('add')}
                        />{' '}
                        Dosyadaki stok mevcut stoğa eklensin
                      </label>
                    </div>
                  )}
                  <div className="rounded-xl bg-gray-50 p-4 text-sm">
                    <b>Çakışan kayıtlar</b>
                    {[
                      ['update', 'Mevcut kaydı güncelle (Önerilen)'],
                      ['skip', 'Satırı atla'],
                      ['create', 'Yeni kayıt oluştur']
                    ].map(([value, label]) => (
                      <label key={value} className="mt-2 block">
                        <input
                          type="radio"
                          checked={duplicateMode === value}
                          onChange={() =>
                            setDuplicateMode(value as DuplicateMode)
                          }
                        />{' '}
                        {label}
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <b>İçe aktarma özeti</b>
                    <p className="mt-2 text-sm text-gray-600">
                      {type === 'inventory' ? 'Envanter' : 'Müşteriler'} ·{' '}
                      {rows.length} satır ·{' '}
                      {duplicateMode === 'update'
                        ? 'Çakışanlar güncellenecek'
                        : duplicateMode === 'skip'
                          ? 'Çakışanlar atlanacak'
                          : 'Çakışanlar yeni kayıt olarak eklenecek'}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr>
                          {fields.map(([, label]) => (
                            <th key={label} className="p-2">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 20).map((row, index) => (
                          <tr key={index} className="border-t">
                            {fields.map(([field]) => (
                              <td key={field} className="p-2">
                                {String(row[field] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              {importResult ? (
                <Button variant="primary" onPress={closeWizard}>
                  Kapat
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onPress={() =>
                    step === 1 ? closeWizard() : setStep(step - 1)
                  }
                  isDisabled={busy}>
                  {step === 1 ? 'İptal' : 'Geri'}
                </Button>
              )}
              {!importResult &&
                (step < 3 ? (
                  <Button
                    variant="primary"
                    onPress={() => setStep(step + 1)}
                    isDisabled={step === 1 || (step === 2 && !mapping.name)}>
                    Devam Et
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onPress={runImport}
                    isDisabled={busy}>
                    {busy && (
                      <Loader2 className="mr-2 animate-spin" size={16} />
                    )}
                    İçe Aktarmayı Onayla
                  </Button>
                ))}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
