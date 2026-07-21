import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Modal,
  ProgressBar,
  Spinner,
  Tabs,
  TextField,
  toast
} from '@heroui/react';
import {
  CheckCircle2,
  Download,
  FileUp,
  Package,
  ShieldCheck
} from 'lucide-react';
import type { Company } from '@/core/types/tenant';
import {
  COMPANY_TRANSFER_PROFILE_FIELDS,
  createCompanyTransferPackage,
  importCompanyTransferPackage,
  parseCompanyTransferPackage,
  type CompanyTransferPreview,
  type CompanyTransferProfileField
} from '../utils/companyTransferPackage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  userId: string;
}

type TransferTab = 'create' | 'import';

const defaultProfileFields: CompanyTransferProfileField[] = [
  'receiptHeader',
  'phone',
  'address',
  'defaultLowStockThreshold'
];

const downloadPackage = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const formatPackageFileName = (name: string) =>
  `${
    name
      .toLocaleLowerCase('tr-TR')
      .replaceAll(/[^a-z0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '') || 'isletme'
  }-aktarim-paketi.zip`;

const countLabels: Record<string, string> = {
  inventory: 'Ürün',
  productCategories: 'Kategori',
  customers: 'Müşteri',
  sales: 'Satış',
  saleItems: 'Satış kalemi',
  payments: 'Tahsilat',
  statementShares: 'Ekstre paylaşımı',
  pricingRules: 'Kampanya',
  companyPreferences: 'Ortak hızlı ekle menüsü'
};

export const CompanyTransferModal = ({
  isOpen,
  onClose,
  company,
  userId
}: Props) => {
  const [selectedTab, setSelectedTab] = useState<TransferTab>('create');
  const [preview, setPreview] = useState<CompanyTransferPreview | null>(null);
  const [profileFields, setProfileFields] =
    useState<CompanyTransferProfileField[]>(defaultProfileFields);
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    setSelectedTab('create');
    setPreview(null);
    setProfileFields(defaultProfileFields);
    setProgress(null);
    setIsCompleted(false);
  }, [isOpen]);

  const previewCounts = useMemo(
    () =>
      preview
        ? Object.entries(preview.counts).filter(([, count]) => count > 0)
        : [],
    [preview]
  );

  const createPackage = async () => {
    setIsBusy(true);
    try {
      const { blob } = await createCompanyTransferPackage(company);
      downloadPackage(blob, formatPackageFileName(company.name));
      toast.success(
        'Aktarım paketi indirildi. Hedef işletme sahibine iletebilirsiniz.'
      );
    } catch (error) {
      console.error('Company transfer package could not be created', error);
      toast.danger('Aktarım paketi hazırlanamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsBusy(false);
    }
  };

  const choosePackage = async (file?: File) => {
    if (!file) return;
    setIsBusy(true);
    setPreview(null);
    try {
      setPreview(await parseCompanyTransferPackage(file));
    } catch (error) {
      console.error('Company transfer package could not be parsed', error);
      toast.danger(
        error instanceof Error ? error.message : 'Aktarım paketi açılamadı.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const toggleProfileField = (field: CompanyTransferProfileField) =>
    setProfileFields(current =>
      current.includes(field)
        ? current.filter(item => item !== field)
        : [...current, field]
    );

  const importPackage = async () => {
    if (!preview) return;
    setIsBusy(true);
    setProgress({ completed: 0, total: 1 });
    try {
      await importCompanyTransferPackage({
        packageData: preview.package,
        targetCompany: company,
        userId,
        profileFields,
        onProgress: setProgress
      });
      setIsCompleted(true);
      toast.success('Şirket verileri başarıyla aktarıldı.');
    } catch (error) {
      console.error('Company transfer package could not be imported', error);
      toast.danger(
        error instanceof Error ? error.message : 'Aktarım tamamlanamadı.'
      );
    } finally {
      setIsBusy(false);
      setProgress(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container scroll="inside">
          <Modal.Dialog className="flex h-[min(92vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl outline-none">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div>
                <Modal.Heading className="text-xl">
                  Şirket Verisi Aktar
                </Modal.Heading>
                <p className="mt-1 text-sm font-normal text-gray-500">
                  Aktarım paketini güvenli bir kanaldan paylaşın; hedef işletme
                  verileri kendi hesabında içe aktarır.
                </p>
              </div>
            </Modal.Header>
            <Modal.Body className="min-h-0 flex-1 space-y-5 overflow-y-auto">
              <Tabs
                selectedKey={selectedTab}
                onSelectionChange={key => setSelectedTab(key as TransferTab)}>
                <Tabs.ListContainer>
                  <Tabs.List
                    aria-label="Şirket verisi aktarımı"
                    className="w-full">
                    <Tabs.Tab id="create" className="flex-1 justify-center">
                      <Download size={15} /> Paket oluştur
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="import" className="flex-1 justify-center">
                      <FileUp size={15} /> Paket içe aktar
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>

              {selectedTab === 'create' ? (
                <section className="space-y-5">
                  <div className="border-primary/20 bg-primary/5 rounded-2xl border p-4 text-sm leading-6 text-gray-700">
                    Bu paket; envanter, kategoriler, müşteriler, satışlar,
                    tahsilatlar, ekstre paylaşım kayıtları, kampanyalar ve ortak
                    hızlı ekle menüsünü içerir. Üyelikler ve kişisel tercihler
                    pakete dahil edilmez.
                  </div>
                  <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                    <Package className="text-primary" size={40} />
                    <p className="mt-4 font-semibold text-gray-900">
                      {company.name} için aktarım paketi
                    </p>
                    <p className="mt-1 max-w-md text-sm text-gray-500">
                      Oluşturduğunuz ZIP dosyasını yalnızca güvenilir bir kanal
                      üzerinden hedef işletme sahibine iletin.
                    </p>
                    <Button
                      className="mt-5"
                      variant="primary"
                      isPending={isBusy}
                      onPress={createPackage}>
                      <Download size={16} /> Paketi indir
                    </Button>
                  </div>
                </section>
              ) : isCompleted ? (
                <section className="flex min-h-64 flex-col items-center justify-center text-center">
                  <CheckCircle2 className="text-success" size={46} />
                  <h3 className="mt-4 text-lg font-bold text-gray-900">
                    Aktarım tamamlandı
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-gray-500">
                    Paket içindeki veriler {company.name} işletmesine aktarıldı.
                  </p>
                </section>
              ) : (
                <section className="space-y-5">
                  <div className="border-warning/25 bg-warning/10 rounded-2xl border p-4 text-sm leading-6 text-gray-700">
                    Paket yalnızca boş bir işletmeye aktarılabilir. İçe aktarma
                    sırasında bu işletmede yeni veri eklemeyin.
                  </div>
                  <TextField className="w-full">
                    <Label>Aktarım paketi</Label>
                    <Input
                      type="file"
                      accept="application/zip,.zip"
                      onChange={event => choosePackage(event.target.files?.[0])}
                    />
                  </TextField>
                  {isBusy && !preview && (
                    <div className="flex justify-center py-4">
                      <Spinner />
                    </div>
                  )}
                  {preview && (
                    <>
                      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <ShieldCheck
                            className="text-success mt-0.5 flex-none"
                            size={20}
                          />
                          <div>
                            <p className="font-semibold text-gray-900">
                              Kaynak işletme:{' '}
                              {preview.package.sourceCompany.name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Paket tarihi:{' '}
                              {new Date(
                                preview.package.exportedAt
                              ).toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {previewCounts.map(([key, count]) => (
                            <div
                              key={key}
                              className="rounded-xl bg-white px-3 py-2">
                              <p className="text-lg font-bold text-gray-900">
                                {count}
                              </p>
                              <p className="text-xs text-gray-500">
                                {countLabels[key]}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Uygulanacak işletme bilgileri
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          İşletme adı varsayılan olarak korunur. İsterseniz
                          aşağıdaki alanları kaynak paketten alabilirsiniz.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {COMPANY_TRANSFER_PROFILE_FIELDS.map(field => (
                            <Checkbox
                              key={field.key}
                              isSelected={profileFields.includes(field.key)}
                              onChange={() => toggleProfileField(field.key)}>
                              <Checkbox.Content>
                                <Checkbox.Control>
                                  <Checkbox.Indicator />
                                </Checkbox.Control>
                                <span className="text-sm">{field.label}</span>
                              </Checkbox.Content>
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {progress && (
                    <ProgressBar
                      value={progress.completed}
                      maxValue={progress.total}>
                      <Label>Veriler aktarılıyor</Label>
                      <ProgressBar.Output />
                      <ProgressBar.Track>
                        <ProgressBar.Fill />
                      </ProgressBar.Track>
                    </ProgressBar>
                  )}
                </section>
              )}
            </Modal.Body>
            <Modal.Footer className="flex justify-between border-t border-gray-100 pt-4">
              <Button variant="ghost" onPress={onClose} isDisabled={isBusy}>
                Kapat
              </Button>
              {selectedTab === 'import' && !isCompleted && (
                <Button
                  variant="primary"
                  isDisabled={!preview}
                  isPending={isBusy && Boolean(preview)}
                  onPress={importPackage}>
                  <FileUp size={16} /> İçe aktarmayı başlat
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
