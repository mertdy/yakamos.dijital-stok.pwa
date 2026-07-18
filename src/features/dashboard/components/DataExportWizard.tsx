import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  Checkbox,
  Button,
  Modal,
  Radio,
  RadioGroup,
  toast
} from '@heroui/react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import type { Company } from '@/core/types/tenant';
import {
  EXPORT_OPTIONS,
  exportDatasets,
  loadExportDatasets,
  type ExportDataKey,
  type ExportDelivery,
  type ExportFormat
} from '../utils/dataExport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
}

export const DataExportWizard = ({ isOpen, onClose, company }: Props) => {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<ExportDataKey[]>(
    EXPORT_OPTIONS.map(option => option.key)
  );
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [delivery, setDelivery] = useState<ExportDelivery>('combined');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);
  useEffect(() => {
    setDelivery('combined');
  }, [format]);

  const selectedLabels = useMemo(
    () =>
      EXPORT_OPTIONS.filter(option => selected.includes(option.key)).map(
        option => option.label
      ),
    [selected]
  );
  const toggle = (key: ExportDataKey) =>
    setSelected(current =>
      current.includes(key)
        ? current.filter(item => item !== key)
        : [...current, key]
    );
  const handleExport = async () => {
    if (selected.length === 0) return;
    setIsExporting(true);
    try {
      const datasets = await loadExportDatasets(company, selected);
      await exportDatasets(
        datasets,
        format,
        delivery,
        `${
          company.name
            .toLowerCase()
            .replaceAll(/[^a-z0-9]+/gi, '-')
            .replace(/(^-|-$)/g, '') || 'isletme'
        }-veri-disari-aktarma`
      );
      toast.success('Dışa aktarma hazırlandı ve indirme başlatıldı.');
      onClose();
    } catch (error) {
      console.error('Data export failed', error);
      toast.danger('Dışa aktarma hazırlanırken hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl outline-none">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div>
                <Modal.Heading className="text-xl">
                  Verileri Dışa Aktar
                </Modal.Heading>
                <p className="mt-1 text-sm font-normal text-gray-500">
                  {company.name} işletmesinin verilerini seçin ve indirin.
                </p>
              </div>
            </Modal.Header>
            <Modal.Body className="space-y-5">
              <div className="grid grid-cols-[minmax(0,1fr)_1fr_minmax(0,1fr)_1fr_minmax(0,1fr)] items-center gap-2 text-xs font-semibold">
                <div
                  className={clsx(
                    'flex min-w-0 items-center gap-2',
                    step >= 1 ? 'text-primary' : 'text-gray-400'
                  )}>
                  <span className="bg-primary flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white">
                    1
                  </span>
                  <span className="truncate">Veriler</span>
                </div>
                <span className="h-px flex-1 bg-gray-200" />
                <div
                  className={clsx(
                    'flex min-w-0 items-center gap-2',
                    step >= 2 ? 'text-primary' : 'text-gray-400'
                  )}>
                  <span
                    className={clsx(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                      step >= 2
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-400'
                    )}>
                    2
                  </span>
                  <span className="truncate">Dosya biçimi</span>
                </div>
                <span className="h-px flex-1 bg-gray-200" />
                <div
                  className={clsx(
                    'flex min-w-0 items-center gap-2',
                    step >= 3 ? 'text-primary' : 'text-gray-400'
                  )}>
                  <span
                    className={clsx(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                      step >= 3
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-400'
                    )}>
                    3
                  </span>
                  <span className="truncate">Özet</span>
                </div>
              </div>
              {step === 1 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      Aktarılacak verileri seçin
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() =>
                          setSelected(EXPORT_OPTIONS.map(option => option.key))
                        }>
                        Tümünü seç
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => setSelected([])}>
                        Seçimi temizle
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EXPORT_OPTIONS.map(option => (
                      <Checkbox
                        key={option.key}
                        isSelected={selected.includes(option.key)}
                        onChange={() => toggle(option.key)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <span>
                            <span className="block text-sm font-semibold text-gray-800">
                              {option.label}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {option.description}
                            </span>
                          </span>
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-sm font-medium text-gray-700">
                    Dosya biçimini ve teslim şeklini belirleyin
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setFormat('xlsx')}
                      className={`rounded-2xl border p-4 text-left ${format === 'xlsx' ? 'border-primary bg-primary/5 ring-primary/20 ring-1' : 'border-gray-200'}`}>
                      <FileSpreadsheet
                        className="text-primary mb-2"
                        size={22}
                      />
                      <p className="font-semibold">Excel</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Biçimli çalışma sayfaları
                      </p>
                    </button>
                    <button
                      onClick={() => setFormat('csv')}
                      className={`rounded-2xl border p-4 text-left ${format === 'csv' ? 'border-primary bg-primary/5 ring-primary/20 ring-1' : 'border-gray-200'}`}>
                      <FileText className="text-primary mb-2" size={22} />
                      <p className="font-semibold">CSV</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Hızlı ve sade veri dosyaları
                      </p>
                    </button>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="mb-3 text-sm font-medium text-gray-700">
                      Teslim şekli
                    </p>
                    <RadioGroup
                      name="export-delivery"
                      value={delivery}
                      onChange={value => setDelivery(value as ExportDelivery)}>
                      <Radio value="combined">
                        <Radio.Content>
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          {format === 'xlsx'
                            ? 'Tek Excel çalışma kitabı (Önerilen)'
                            : 'Tek ZIP dosyası (Önerilen)'}
                        </Radio.Content>
                      </Radio>
                      <Radio value="separate">
                        <Radio.Content>
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          {format === 'xlsx'
                            ? 'Her veri grubu için ayrı Excel dosyası'
                            : 'Her veri grubu için ayrı CSV dosyası'}
                        </Radio.Content>
                      </Radio>
                    </RadioGroup>
                  </div>
                </>
              )}
              {step === 3 && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
                  <p className="text-sm font-semibold text-gray-900">
                    Dışa aktarma özeti
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedLabels.join(', ')}
                  </p>
                  <p className="mt-3 text-xs text-gray-500">
                    {format === 'xlsx' ? 'Excel' : 'CSV'} ·{' '}
                    {delivery === 'combined'
                      ? format === 'xlsx'
                        ? 'Tek çalışma kitabı'
                        : 'Tek ZIP dosyası'
                      : 'Ayrı dosyalar'}
                  </p>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="ghost"
                onPress={() => (step === 1 ? onClose() : setStep(step - 1))}
                isDisabled={isExporting}>
                {step === 1 ? 'İptal' : 'Geri'}
              </Button>
              {step < 3 ? (
                <Button
                  variant="primary"
                  onPress={() => setStep(step + 1)}
                  isDisabled={step === 1 && selected.length === 0}>
                  Devam Et
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onPress={handleExport}
                  isDisabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 animate-spin" size={16} />
                  ) : (
                    <Download className="mr-2" size={16} />
                  )}
                  Dışa Aktar
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
