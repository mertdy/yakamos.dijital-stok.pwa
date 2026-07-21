import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  Spinner,
  Tabs,
  TextArea,
  TextField,
  toast
} from '@heroui/react';
import { FileImage, LifeBuoy, Send, ShieldCheck } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { PLATFORM_SUPPORT_ADMIN_EMAIL } from '@/core/config/support';
import { db } from '@/core/firebase/config';
import { useAuthStore } from '@/features/auth';
import {
  createSupportReport,
  prepareSupportScreenshot,
  type SupportReport,
  type SupportReportType,
  type SupportScreenshot
} from '../utils/supportReports';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const reportTypeLabels: Record<SupportReportType, string> = {
  BUG: 'Hata bildirimi',
  SUPPORT: 'Destek isteği',
  SUGGESTION: 'Öneri'
};

export const SupportModal = ({ isOpen, onClose }: Props) => {
  const { user, activeCompany } = useAuthStore();
  const isAdmin = user?.email === PLATFORM_SUPPORT_ADMIN_EMAIL;
  const [tab, setTab] = useState<'create' | 'inbox'>('create');
  const [type, setType] = useState<SupportReportType>('BUG');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [includeTechnicalContext, setIncludeTechnicalContext] = useState(true);
  const [screenshot, setScreenshot] = useState<SupportScreenshot | null>(null);
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    setIsLoadingReports(true);
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'supportReports'),
        where('recipientEmail', '==', PLATFORM_SUPPORT_ADMIN_EMAIL)
      ),
      snapshot => {
        setReports(
          snapshot.docs
            .map(item => item.data() as SupportReport)
            .sort((first, second) =>
              second.createdAt.localeCompare(first.createdAt)
            )
        );
        setIsLoadingReports(false);
      },
      error => {
        console.error('Support reports could not be loaded', error);
        setIsLoadingReports(false);
      }
    );
    return () => unsubscribe();
  }, [isAdmin, isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setTab('create');
    setType('BUG');
    setTitle('');
    setDescription('');
    setIncludeTechnicalContext(true);
    setScreenshot(null);
  }, [isOpen]);

  const chooseScreenshot = async (file?: File) => {
    if (!file) return;
    try {
      setScreenshot(await prepareSupportScreenshot(file));
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : 'Görsel hazırlanamadı.'
      );
    }
  };

  const submit = async () => {
    if (!activeCompany || !user) return;
    if (title.trim().length < 3 || description.trim().length < 5) {
      toast.danger('Başlık ve açıklamayı biraz daha ayrıntılı yazın.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createSupportReport({
        input: {
          type,
          title,
          description,
          includeTechnicalContext,
          screenshot
        },
        company: activeCompany,
        userId: user.uid,
        userEmail: user.email
      });
      toast.success('Destek kaydınız iletildi.');
      onClose();
    } catch (error) {
      console.error('Support report could not be created', error);
      toast.danger('Destek kaydı oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
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
              <div className="flex items-start gap-3">
                <Modal.Icon className="bg-primary/10 text-primary">
                  <LifeBuoy size={20} />
                </Modal.Icon>
                <div>
                  <Modal.Heading className="text-xl">Destek</Modal.Heading>
                  <p className="mt-1 text-sm font-normal text-gray-500">
                    Yaşadığınız sorunu veya önerinizi doğrudan Dijital Stok
                    ekibine iletin.
                  </p>
                </div>
              </div>
            </Modal.Header>
            <Modal.Body className="min-h-0 flex-1 space-y-5 overflow-y-auto">
              {isAdmin && (
                <Tabs
                  selectedKey={tab}
                  onSelectionChange={key => setTab(key as 'create' | 'inbox')}>
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Destek merkezi" className="w-full">
                      <Tabs.Tab id="create" className="flex-1 justify-center">
                        Yeni kayıt <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="inbox" className="flex-1 justify-center">
                        Gelen kayıtlar
                        {reports.length > 0 ? ` (${reports.length})` : ''}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                </Tabs>
              )}
              {tab === 'inbox' && isAdmin ? (
                isLoadingReports ? (
                  <div className="flex min-h-48 items-center justify-center">
                    <Spinner />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                    <ShieldCheck className="text-gray-300" size={36} />
                    <p className="mt-3 font-medium text-gray-800">
                      Henüz destek kaydı yok
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map(report => (
                      <article
                        key={report.id}
                        className="rounded-2xl border border-gray-100 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {report.title}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {report.companyName} ·{' '}
                              {reportTypeLabels[report.type]} ·{' '}
                              {new Date(report.createdAt).toLocaleString(
                                'tr-TR'
                              )}
                            </p>
                          </div>
                          <span className="bg-warning/10 text-warning rounded-full px-2 py-1 text-xs font-medium">
                            {report.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-gray-700">
                          {report.description}
                        </p>
                        {report.screenshot?.dataUrl && (
                          <img
                            src={report.screenshot.dataUrl}
                            alt="Destek kaydı ekran görüntüsü"
                            className="mt-3 max-h-64 rounded-xl border border-gray-100 object-contain"
                          />
                        )}
                        {report.technicalErrors.length > 0 && (
                          <details className="mt-3 text-xs text-gray-500">
                            <summary className="cursor-pointer">
                              Teknik kayıtlar ({report.technicalErrors.length})
                            </summary>
                            <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-3 text-[11px] whitespace-pre-wrap">
                              {JSON.stringify(report.technicalErrors, null, 2)}
                            </pre>
                          </details>
                        )}
                      </article>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-5">
                  <RadioGroup
                    value={type}
                    onChange={value => setType(value as SupportReportType)}>
                    <Label>Bildirim türü</Label>
                    <Radio value="BUG">
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        Hata bildirimi
                      </Radio.Content>
                    </Radio>
                    <Radio value="SUPPORT">
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        Destek isteği
                      </Radio.Content>
                    </Radio>
                    <Radio value="SUGGESTION">
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        Öneri
                      </Radio.Content>
                    </Radio>
                  </RadioGroup>
                  <TextField
                    className="w-full"
                    value={title}
                    onChange={setTitle}>
                    <Label>Kısa başlık</Label>
                    <Input
                      placeholder="Örn. Satış kaydedilirken ekran kapandı"
                      maxLength={120}
                    />
                  </TextField>
                  <TextField
                    className="w-full"
                    value={description}
                    onChange={setDescription}>
                    <Label>Açıklama</Label>
                    <TextArea
                      placeholder="Ne yaptığınızı, ne beklediğinizi ve ne olduğunu kısaca anlatın."
                      rows={5}
                      maxLength={1500}
                    />
                  </TextField>
                  <Checkbox
                    isSelected={includeTechnicalContext}
                    onChange={setIncludeTechnicalContext}>
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span>
                        <span className="block text-sm font-medium">
                          Son teknik hata kayıtlarını ekle
                        </span>
                        <span className="block text-xs text-gray-500">
                          Yalnızca uygulamanın yakaladığı sınırlı hata kayıtları
                          eklenir.
                        </span>
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                  <div>
                    <TextField className="w-full">
                      <Label>Ekran görüntüsü (isteğe bağlı)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={event =>
                          chooseScreenshot(event.target.files?.[0])
                        }
                      />
                    </TextField>
                    {screenshot && (
                      <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                        <FileImage className="text-primary" size={18} />
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                          {screenshot.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.ceil(screenshot.sizeBytes / 1024)} KB
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => setScreenshot(null)}>
                          Kaldır
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="flex justify-between border-t border-gray-100 pt-4">
              <Button
                variant="ghost"
                onPress={onClose}
                isDisabled={isSubmitting}>
                Kapat
              </Button>
              {tab === 'create' && (
                <Button
                  variant="primary"
                  isPending={isSubmitting}
                  onPress={submit}>
                  <Send size={16} /> Kaydı gönder
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
