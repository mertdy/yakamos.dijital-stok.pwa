import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  AlertDialog,
  Button,
  Input,
  Label,
  ListBox,
  Modal,
  Pagination,
  ProgressBar,
  Radio,
  RadioGroup,
  Separator,
  Select,
  toast
} from '@heroui/react';
import { CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { useInventoryStore } from '@/features/inventory';
import { useCustomerStore } from '@/features/customers';
import {
  IMPORT_FIELDS,
  MAX_IMPORT_DATA_ROWS,
  buildImportRows,
  inspectImportFile,
  importRows,
  parseImportFile,
  suggestMapping,
  type DuplicateMode,
  type ImportResult,
  type ImportType,
  type StockMode
} from '../utils/dataImport';

const PREVIEW_PAGE_SIZE = 25;

export const DataImportWizard = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { activeCompany, user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<ImportType>('inventory');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string | null>(
    null
  );
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('update');
  const [stockMode, setStockMode] = useState<StockMode>('replace');
  const [busy, setBusy] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<
    'parsing' | 'importing' | null
  >(null);
  const [importProgress, setImportProgress] = useState<{
    completed: number;
    total: number;
    phase: 'preparing' | 'writing';
  } | null>(null);
  const [isCloseWarningOpen, setIsCloseWarningOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const rows = useMemo(
    () => (step >= 3 ? buildImportRows(rawRows, headers, mapping) : []),
    [rawRows, headers, mapping, step]
  );
  const previewPageCount = Math.max(
    1,
    Math.ceil(rows.length / PREVIEW_PAGE_SIZE)
  );
  const previewStart = (previewPage - 1) * PREVIEW_PAGE_SIZE;
  const previewRows = rows.slice(
    previewStart,
    previewStart + PREVIEW_PAGE_SIZE
  );
  const previewEnd = Math.min(previewStart + PREVIEW_PAGE_SIZE, rows.length);
  const previewPageItems = useMemo(() => {
    const pages: Array<number | 'ellipsis'> = [];

    if (previewPageCount <= 7) {
      for (let page = 1; page <= previewPageCount; page++) pages.push(page);
      return pages;
    }

    pages.push(1);
    if (previewPage > 3) pages.push('ellipsis');
    for (
      let page = Math.max(2, previewPage - 1);
      page <= Math.min(previewPageCount - 1, previewPage + 1);
      page++
    ) {
      pages.push(page);
    }
    if (previewPage < previewPageCount - 2) pages.push('ellipsis');
    pages.push(previewPageCount);
    return pages;
  }, [previewPage, previewPageCount]);

  useEffect(() => {
    if (!busy) return;

    const preventPageExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', preventPageExit);
    return () => window.removeEventListener('beforeunload', preventPageExit);
  }, [busy]);

  const applyParsedFile = (
    parsed: Awaited<ReturnType<typeof parseImportFile>>
  ) => {
    setHeaders(parsed.headers);
    setRawRows(parsed.rows);
    setMapping(suggestMapping(parsed.headers, type));
    setSelectedSheetName(parsed.sheetName);
    setPendingFile(null);
    setSheetNames([]);
    setStep(2);
    if (parsed.isTruncated) {
      toast.warning(
        `Dosya ${MAX_IMPORT_DATA_ROWS.toLocaleString('tr-TR')} satır sınırını aşıyor. İlk ${MAX_IMPORT_DATA_ROWS.toLocaleString('tr-TR')} dolu satır içe aktarılacak.`
      );
    }
  };

  const chooseSheet = async (file: File, sheetName: string) => {
    setBusy(true);
    setLoadingPhase('parsing');
    setSelectedSheetName(sheetName);
    try {
      await new Promise<void>(resolve =>
        window.requestAnimationFrame(() => resolve())
      );
      applyParsedFile(await parseImportFile(file, sheetName));
    } catch {
      toast.danger('Seçilen Excel sekmesi okunamadı.');
    } finally {
      setBusy(false);
      setLoadingPhase(null);
      setIsCloseWarningOpen(false);
    }
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      toast.danger('CSV, XLSX veya XLS dosyası seçin.');
      return;
    }
    setBusy(true);
    setLoadingPhase('parsing');
    try {
      await new Promise<void>(resolve =>
        window.requestAnimationFrame(() => resolve())
      );
      const inspection = await inspectImportFile(file);
      if (inspection.sheetNames.length === 0) {
        throw new Error('Çalışma sayfası bulunamadı');
      }
      if (inspection.sheetNames.length > 1) {
        setPendingFile(file);
        setSheetNames(inspection.sheetNames);
        return;
      }
      await chooseSheet(file, inspection.sheetNames[0]);
    } catch {
      toast.danger('Dosya okunamadı. Lütfen biçimini kontrol edin.');
    } finally {
      setBusy(false);
      setLoadingPhase(null);
      setIsCloseWarningOpen(false);
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
    setPendingFile(null);
    setSheetNames([]);
    setSelectedSheetName(null);
    setMapping({});
    setPreviewPage(1);
    setLoadingPhase(null);
    setImportProgress(null);
    setIsCloseWarningOpen(false);
    setImportResult(null);
    onClose();
  };
  const requestClose = () => {
    if (busy) {
      setIsCloseWarningOpen(true);
      return;
    }
    closeWizard();
  };
  const runImport = async () => {
    if (!activeCompany || !user) return;
    setBusy(true);
    setLoadingPhase('importing');
    setImportProgress({
      completed: 0,
      total: rows.length,
      phase: 'preparing'
    });
    try {
      await new Promise<void>(resolve =>
        window.requestAnimationFrame(() => resolve())
      );
      const result = await importRows({
        type,
        rows,
        companyId: activeCompany.id,
        userId: user.uid,
        inventory: useInventoryStore.getState().items,
        customers: useCustomerStore.getState().customers,
        duplicateMode,
        stockMode,
        onProgress: setImportProgress
      });
      setImportResult(result);
    } catch {
      toast.danger('İçe aktarma sırasında hata oluştu.');
    } finally {
      setBusy(false);
      setLoadingPhase(null);
      setImportProgress(null);
      setIsCloseWarningOpen(false);
    }
  };
  const fields = IMPORT_FIELDS[type];
  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={open => !open && requestClose()}>
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
                ) : loadingPhase === 'importing' && importProgress ? (
                  <section className="flex min-h-80 flex-col items-center justify-center space-y-5 py-8 text-center">
                    <span className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-full">
                      <Loader2 className="animate-spin" size={28} />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {importProgress.phase === 'preparing'
                          ? 'İçe aktarma hazırlanıyor'
                          : 'Veriler içe aktarılıyor'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {importProgress.phase === 'preparing'
                          ? 'Kayıtlar kontrol ediliyor ve aktarım için hazırlanıyor.'
                          : `${type === 'inventory' ? 'Ürünler' : 'Müşteriler'} güvenle kaydediliyor.`}
                      </p>
                    </div>
                    <div className="border-primary/15 bg-primary/5 w-full max-w-md rounded-2xl border p-4 text-left">
                      {importProgress.phase === 'preparing' ? (
                        <ProgressBar
                          isIndeterminate
                          aria-label="İçe aktarma hazırlanıyor">
                          <Label>Aktarıma hazırlanıyor</Label>
                          <ProgressBar.Track>
                            <ProgressBar.Fill />
                          </ProgressBar.Track>
                        </ProgressBar>
                      ) : (
                        <ProgressBar
                          value={importProgress.completed}
                          maxValue={Math.max(importProgress.total, 1)}>
                          <Label>Kaydedilen kayıtlar</Label>
                          <ProgressBar.Output />
                          <ProgressBar.Track>
                            <ProgressBar.Fill />
                          </ProgressBar.Track>
                        </ProgressBar>
                      )}
                      <p className="mt-3 text-xs text-gray-500">
                        {importProgress.phase === 'preparing'
                          ? 'Bu işlem sırasında pencereyi kapatmayın.'
                          : `${importProgress.completed.toLocaleString('tr-TR')} / ${importProgress.total.toLocaleString('tr-TR')} kayıt kaydedildi.`}
                      </p>
                    </div>
                  </section>
                ) : step === 1 && pendingFile ? (
                  <section className="space-y-5 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Excel sekmesini seçin
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        <span className="font-medium text-gray-700">
                          {pendingFile.name}
                        </span>{' '}
                        dosyasında birden fazla sekme var. İçe aktarmak
                        istediğiniz sekmeyi seçin.
                      </p>
                    </div>
                    <Select
                      fullWidth
                      placeholder="Sekme seçin"
                      selectedKey={selectedSheetName}
                      onSelectionChange={value => {
                        const sheetName = value ? String(value) : null;
                        if (sheetName) void chooseSheet(pendingFile, sheetName);
                      }}>
                      <Label>Excel sekmesi</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {sheetNames.map(sheetName => (
                            <ListBox.Item key={sheetName} id={sheetName}>
                              {sheetName}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Button
                      variant="ghost"
                      onPress={() => {
                        setPendingFile(null);
                        setSheetNames([]);
                        setSelectedSheetName(null);
                      }}
                      isDisabled={busy}>
                      Farklı bir dosya seç
                    </Button>
                    {busy && loadingPhase === 'parsing' && (
                      <div
                        role="status"
                        className="border-primary/15 bg-primary/5 flex items-center gap-3 rounded-2xl border p-4 text-sm">
                        <Loader2
                          className="text-primary animate-spin"
                          size={22}
                        />
                        <div>
                          <p className="font-semibold text-gray-800">
                            Seçilen sekme hazırlanıyor…
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Yalnızca seçtiğiniz Excel sekmesindeki veriler
                            işlenecek.
                          </p>
                        </div>
                      </div>
                    )}
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
                      <Input
                        className="hidden"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        disabled={busy}
                        onChange={event => chooseFile(event.target.files?.[0])}
                      />
                    </label>
                    {busy && loadingPhase === 'parsing' && (
                      <div
                        role="status"
                        className="border-primary/15 bg-primary/5 flex items-center gap-3 rounded-2xl border p-4 text-sm">
                        <Loader2
                          className="text-primary animate-spin"
                          size={22}
                        />
                        <div>
                          <p className="font-semibold text-gray-800">
                            Dosya hazırlanıyor…
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Büyük dosyalarda bu işlem biraz sürebilir; ekran bu
                            sırada yanıt vermeye devam eder.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : step === 2 ? (
                  <>
                    <p className="text-sm text-gray-600">
                      {rawRows.length} satır bulundu. Dosya sütunlarını
                      alanlarla eşleştirin.
                    </p>
                    {selectedSheetName && (
                      <p className="text-primary text-xs font-medium">
                        Seçilen Excel sekmesi: {selectedSheetName}
                      </p>
                    )}
                    <div className="space-y-3">
                      {fields.map(([field, fieldLabel, required]) => (
                        <div
                          key={field}
                          className="grid grid-cols-2 items-center gap-3 text-sm">
                          <span>
                            {fieldLabel}
                            {required && <b className="text-danger"> *</b>}
                          </span>
                          <Select
                            fullWidth
                            placeholder="Eşleştirme yok"
                            selectedKey={mapping[field] || 'unmapped'}
                            onSelectionChange={value =>
                              setMapping({
                                ...mapping,
                                [field]:
                                  value === 'unmapped' ? '' : String(value)
                              })
                            }>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="unmapped">
                                  Eşleştirme yok
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                                {headers.map(header => (
                                  <ListBox.Item key={header} id={header}>
                                    {header}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      ))}
                    </div>
                    {type === 'inventory' && (
                      <div className="rounded-xl bg-gray-50 p-4 text-sm">
                        <b>Stok kuralı</b>
                        <RadioGroup
                          className="mt-2"
                          name="import-stock-mode"
                          value={stockMode}
                          onChange={value => setStockMode(value as StockMode)}>
                          <Radio value="replace">
                            <Radio.Content>
                              <Radio.Control>
                                <Radio.Indicator />
                              </Radio.Control>
                              Dosyadaki stok mevcut stoğun yerine yazılsın
                            </Radio.Content>
                          </Radio>
                          <Radio value="add">
                            <Radio.Content>
                              <Radio.Control>
                                <Radio.Indicator />
                              </Radio.Control>
                              Dosyadaki stok mevcut stoğa eklensin
                            </Radio.Content>
                          </Radio>
                        </RadioGroup>
                      </div>
                    )}
                    <div className="rounded-xl bg-gray-50 p-4 text-sm">
                      <b>Çakışan kayıtlar</b>
                      <RadioGroup
                        className="mt-2"
                        name="import-duplicate-mode"
                        value={duplicateMode}
                        onChange={value =>
                          setDuplicateMode(value as DuplicateMode)
                        }>
                        {[
                          ['update', 'Mevcut kaydı güncelle (Önerilen)'],
                          ['skip', 'Satırı atla'],
                          ['create', 'Yeni kayıt oluştur']
                        ].map(([value, radioLabel]) => (
                          <Radio key={value} value={value}>
                            <Radio.Content>
                              <Radio.Control>
                                <Radio.Indicator />
                              </Radio.Control>
                              {radioLabel}
                            </Radio.Content>
                          </Radio>
                        ))}
                      </RadioGroup>
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
                    <div className="flex flex-col gap-1 px-1">
                      <p className="text-sm font-semibold text-gray-800">
                        Önizleme
                      </p>
                      <p className="text-xs text-gray-500">
                        {rows.length.toLocaleString('tr-TR')} kaydın{' '}
                        {rows.length ? previewStart + 1 : 0}–
                        {previewEnd.toLocaleString('tr-TR')} arası gösteriliyor.
                        İçe aktarma onaylandığında tüm kayıtlar işlenecek.
                      </p>
                    </div>
                    <Separator variant="tertiary" />
                    {rows.length > PREVIEW_PAGE_SIZE && (
                      <Pagination className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Pagination.Summary>
                          Sayfa {previewPage} / {previewPageCount}
                        </Pagination.Summary>
                        <Pagination.Content>
                          <Pagination.Item>
                            <Pagination.Previous
                              isDisabled={previewPage === 1}
                              onPress={() =>
                                setPreviewPage(page => Math.max(1, page - 1))
                              }>
                              <Pagination.PreviousIcon />
                              <span>Önceki</span>
                            </Pagination.Previous>
                          </Pagination.Item>
                          {previewPageItems.map((page, index) =>
                            page === 'ellipsis' ? (
                              <Pagination.Item key={`ellipsis-${index}`}>
                                <Pagination.Ellipsis />
                              </Pagination.Item>
                            ) : (
                              <Pagination.Item key={page}>
                                <Pagination.Link
                                  isActive={page === previewPage}
                                  onPress={() => setPreviewPage(page)}>
                                  {page}
                                </Pagination.Link>
                              </Pagination.Item>
                            )
                          )}
                          <Pagination.Item>
                            <Pagination.Next
                              isDisabled={previewPage === previewPageCount}
                              onPress={() =>
                                setPreviewPage(page =>
                                  Math.min(previewPageCount, page + 1)
                                )
                              }>
                              <span>Sonraki</span>
                              <Pagination.NextIcon />
                            </Pagination.Next>
                          </Pagination.Item>
                        </Pagination.Content>
                      </Pagination>
                    )}
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
                          {previewRows.map((row, index) => (
                            <tr key={previewStart + index} className="border-t">
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
                ) : !busy ? (
                  <Button
                    variant="ghost"
                    onPress={() =>
                      step === 1 ? requestClose() : setStep(step - 1)
                    }>
                    {step === 1 ? 'İptal' : 'Geri'}
                  </Button>
                ) : null}
                {!importResult &&
                  (step < 3 ? (
                    <Button
                      variant="primary"
                      onPress={() => {
                        setPreviewPage(1);
                        setStep(step + 1);
                      }}
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
      <AlertDialog.Backdrop
        isOpen={isCloseWarningOpen}
        onOpenChange={setIsCloseWarningOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="w-full max-w-md rounded-2xl bg-white shadow-xl outline-none">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>
                İçe aktarma devam ediyor
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              Dosya{' '}
              {loadingPhase === 'parsing' ? 'okunuyor' : 'içe aktarılıyor'}.
              İşlem tamamlanana kadar bu pencereyi kapatamazsınız.
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                variant="primary"
                onPress={() => setIsCloseWarningOpen(false)}>
                İşleme dön
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
};
