import { useEffect, useState, lazy, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Button,
  Card,
  Checkbox,
  Description,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  toast
} from '@heroui/react';
import { useAuthStore } from '@/features/auth';
import { db } from '@/core/firebase/config';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc
} from 'firebase/firestore';
import type {
  Membership,
  Invitation,
  PermissionKey
} from '@/core/types/tenant';
import {
  AVAILABLE_PERMISSIONS,
  PERMISSION_META
} from '@/core/types/permissions';
import {
  Building2,
  Users,
  Mail,
  Trash2,
  Loader2,
  CheckCircle2,
  UserPlus,
  Pencil
} from 'lucide-react';
import { Download } from 'lucide-react';
const DataExportWizard = lazy(() =>
  import('../components/DataExportWizard').then(module => ({
    default: module.DataExportWizard
  }))
);
const DataImportWizard = lazy(() =>
  import('../components/DataImportWizard').then(module => ({
    default: module.DataImportWizard
  }))
);
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import { FormInput } from '@/shared/components/FormInput';
import { PhoneInput } from '@/shared/components/PhoneInput';
import { SettingsCard } from '@/shared/components/SettingsCard';
import {
  normalizePhoneNumber,
  optionalPhoneNumberSchema
} from '@/shared/utils/phoneNumber';

// Company Profile Schema
const companyProfileSchema = z.object({
  name: z
    .string()
    .min(3, 'İşletme adı en az 3 karakter olmalıdır')
    .max(50, 'İşletme adı en fazla 50 karakter olmalıdır'),
  receiptHeader: z.string().optional(),
  phone: optionalPhoneNumberSchema,
  address: z.string().optional(),
  defaultLowStockThreshold: z.number().int().min(0)
});

type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

// Invitation Schema
const inviteSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi'),
  employeeName: z
    .string()
    .trim()
    .min(2, 'Çalışanın adı en az 2 karakter olmalıdır')
    .max(80, 'Çalışanın adı en fazla 80 karakter olabilir')
});

type InviteFormData = z.infer<typeof inviteSchema>;
type EmployeeMembership = Membership & { email: string };
type JobTitleOption = 'EMPLOYEE' | 'CASHIER' | 'MANAGER' | 'OTHER';

const JOB_TITLE_OPTIONS: {
  id: Exclude<JobTitleOption, 'OTHER'>;
  label: string;
}[] = [
  { id: 'EMPLOYEE', label: 'Çalışan' },
  { id: 'CASHIER', label: 'Kasiyer' },
  { id: 'MANAGER', label: 'Müdür' }
];

const getJobTitle = (option: JobTitleOption, customTitle: string): string =>
  option === 'OTHER'
    ? customTitle.trim()
    : JOB_TITLE_OPTIONS.find(item => item.id === option)?.label || '';

export const CompanySettingsView = () => {
  const {
    activeCompany,
    updateCompanyProfile,
    inviteEmployee,
    updateEmployeePermissions,
    updateEmployeeDetails,
    removeEmployee,
    user
  } = useAuthStore();

  const { confirm } = useConfirm();
  const [employees, setEmployees] = useState<EmployeeMembership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isExportWizardOpen, setIsExportWizardOpen] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedInvitePerms, setSelectedInvitePerms] = useState<
    PermissionKey[]
  >([]);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteJobTitleOption, setInviteJobTitleOption] =
    useState<JobTitleOption>('EMPLOYEE');
  const [inviteCustomJobTitle, setInviteCustomJobTitle] = useState('');

  // Edit Permissions Modal State
  const [editPermsModalOpen, setEditPermsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<EmployeeMembership | null>(null);
  const [selectedEditPerms, setSelectedEditPerms] = useState<PermissionKey[]>(
    []
  );
  const [isSavingPerms, setIsSavingPerms] = useState(false);
  const [editingEmployeeName, setEditingEmployeeName] = useState('');
  const [editingJobTitleOption, setEditingJobTitleOption] =
    useState<JobTitleOption>('CASHIER');
  const [editingCustomJobTitle, setEditingCustomJobTitle] = useState('');

  const {
    control: controlProfile,
    handleSubmit: handleSubmitProfile,
    setValue: setProfileValue
  } = useForm<CompanyProfileFormData>({
    resolver: zodResolver(companyProfileSchema),
    mode: 'onChange'
  });

  const {
    control: controlInvite,
    handleSubmit: handleSubmitInvite,
    reset: resetInvite
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema)
  });

  // Set Profile initial values
  useEffect(() => {
    if (activeCompany) {
      setProfileValue('name', activeCompany.name);
      setProfileValue('receiptHeader', activeCompany.receiptHeader || '');
      setProfileValue('phone', activeCompany.phone || '');
      setProfileValue('address', activeCompany.address || '');
      setProfileValue(
        'defaultLowStockThreshold',
        activeCompany.defaultLowStockThreshold ?? 10
      );
    }
  }, [activeCompany, setProfileValue]);

  // Listen to active company's employees
  useEffect(() => {
    if (!activeCompany?.id) return;
    const q = query(
      collection(db, 'memberships'),
      where('companyId', '==', activeCompany.id)
    );
    const unsubscribe = onSnapshot(q, snap => {
      const list: Membership[] = [];
      snap.forEach(doc => {
        const mem = doc.data() as Membership;
        if (mem.userId !== user?.uid) {
          list.push(mem);
        }
      });
      const employeesWithEmail: EmployeeMembership[] = list.map(membership => ({
        ...membership,
        email: membership.email || 'E-posta bilgisi bulunamadı'
      }));
      setEmployees(employeesWithEmail);
    });
    return () => unsubscribe();
  }, [activeCompany?.id, user?.uid]);

  // Listen to active company's pending invitations
  useEffect(() => {
    if (!activeCompany?.id) return;
    const q = query(
      collection(db, 'invitations'),
      where('companyId', '==', activeCompany.id),
      where('status', '==', 'PENDING')
    );
    const unsubscribe = onSnapshot(q, snap => {
      const list: Invitation[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Invitation);
      });
      setInvitations(list);
    });
    return () => unsubscribe();
  }, [activeCompany?.id]);

  const handleUpdateProfile = async (data: CompanyProfileFormData) => {
    setIsSavingProfile(true);
    try {
      await updateCompanyProfile({
        name: data.name,
        phone: normalizePhoneNumber(data.phone),
        address: data.address || null,
        receiptHeader: data.receiptHeader || null,
        defaultLowStockThreshold: data.defaultLowStockThreshold
      });
      toast.success('Şirket profili güncellendi!');
    } catch (err) {
      console.error(err);
      toast.danger('Profil güncellenirken bir hata oluştu');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleInviteSubmit = async (data: InviteFormData) => {
    const jobTitle = getJobTitle(inviteJobTitleOption, inviteCustomJobTitle);
    if (!jobTitle) {
      toast.danger('Lütfen çalışanın ünvanını girin');
      return;
    }

    setIsSendingInvite(true);
    try {
      await inviteEmployee(
        data.email,
        selectedInvitePerms,
        data.employeeName,
        jobTitle
      );
      toast.success(`${data.email} adresine davet gönderildi!`);
      setInviteModalOpen(false);
      resetInvite();
      setSelectedInvitePerms([]);
      setInviteJobTitleOption('EMPLOYEE');
      setInviteCustomJobTitle('');
    } catch (err) {
      console.error(err);
      toast.danger('Davet gönderilirken bir hata oluştu');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleToggleInvitePerm = (perm: PermissionKey) => {
    setSelectedInvitePerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleToggleEditPerm = (perm: PermissionKey) => {
    setSelectedEditPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    const confirmed = await confirm({
      title: 'Davetiyeyi İptal Et',
      description: `${email} e-posta adresine gönderilen davetiyeyi iptal etmek istediğinize emin misiniz?`,
      confirmText: 'İptal Et',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'invitations', inviteId));
      toast.success('Davetiye iptal edildi');
    } catch (err) {
      console.error(err);
      toast.danger('Davetiye silinirken hata oluştu');
    }
  };

  const handleRemoveEmployee = async (userId: string, email: string) => {
    const confirmed = await confirm({
      title: 'Çalışanı Çıkar',
      description: `${email} kullanıcısının bu işletmedeki görevine son vermek ve yetkilerini iptal etmek istediğinize emin misiniz?`,
      confirmText: 'İşletmeden Çıkar',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await removeEmployee(userId);
      toast.success('Çalışan başarıyla çıkarıldı');
    } catch (err) {
      console.error(err);
      toast.danger('Çalışan çıkarılırken hata oluştu');
    }
  };

  const handleOpenEditPerms = (emp: EmployeeMembership) => {
    setEditingEmployee(emp);
    setSelectedEditPerms(emp.permissions);
    setEditingEmployeeName(emp.employeeName || '');
    const titleOption = JOB_TITLE_OPTIONS.find(
      item => item.label === emp.jobTitle
    );
    setEditingJobTitleOption(titleOption?.id || 'OTHER');
    setEditingCustomJobTitle(titleOption ? '' : emp.jobTitle || '');
    setEditPermsModalOpen(true);
  };

  const handleSavePermsSubmit = async () => {
    if (!editingEmployee) return;
    const jobTitle = getJobTitle(editingJobTitleOption, editingCustomJobTitle);
    const employeeName = editingEmployeeName.trim();
    if (employeeName.length < 2 || !jobTitle) {
      toast.danger('Çalışan adı ve ünvanı gereklidir');
      return;
    }

    setIsSavingPerms(true);
    try {
      await Promise.all([
        updateEmployeePermissions(editingEmployee.userId, selectedEditPerms),
        updateEmployeeDetails(editingEmployee.userId, {
          employeeName,
          jobTitle
        })
      ]);
      toast.success('Çalışan bilgileri ve yetkileri güncellendi!');
      setEditPermsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.danger('Yetkiler güncellenirken hata oluştu');
    } finally {
      setIsSavingPerms(false);
    }
  };

  return (
    <div className="flex h-full max-w-4xl flex-col p-4 md:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Şirket Ayarları
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            İşletmenizin profil detaylarını ve çalışan izinlerini buradan
            yönetin.
          </p>
        </div>
      </div>

      <div className="space-y-6 pb-6">
        {/* Company Profile Card */}
        <SettingsCard
          title="İşletme Profili"
          icon={<Building2 size={20} className="text-primary" />}>
          <form
            onSubmit={handleSubmitProfile(handleUpdateProfile)}
            className="space-y-5">
            <FormInput
              control={controlProfile}
              name="name"
              label="İşletme Adı"
              isRequired
              type="text"
              placeholder="Örn: Yakamos Süpermarket"
            />

            <FormInput
              control={controlProfile}
              name="receiptHeader"
              label="Fiş Başlığı (Receipt Header)"
              type="text"
              placeholder="Örn: YAKAMOS GIDA VE GEREÇLERİ PAZ. SAN. LTD. ŞTİ."
              hint="Fiş yazdırırken en üst satırda görünecek şirket ibaresi."
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <PhoneInput
                control={controlProfile}
                name="phone"
                label="Telefon Numarası"
                placeholder="555 555 55 55"
              />

              <FormInput
                control={controlProfile}
                name="address"
                label="Adres Bilgisi"
                type="text"
                placeholder="Örn: Kadıköy, İstanbul"
              />
              <FormInput
                control={controlProfile}
                name="defaultLowStockThreshold"
                label="Varsayılan Kritik Stok Seviyesi"
                hint="Üründe özel bir değer seçilmediyse bu eşik kullanılır."
                type="number"
                valueAsNumber
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="primary"
                isDisabled={isSavingProfile}>
                {isSavingProfile ? (
                  <Loader2 className="mr-2 animate-spin" size={18} />
                ) : (
                  <CheckCircle2 className="mr-2" size={18} />
                )}
                Değişiklikleri Kaydet
              </Button>
            </div>
          </form>
        </SettingsCard>

        {/* Employees Card */}
        <SettingsCard
          title="Çalışan Yönetimi"
          icon={<Users size={20} className="text-primary" />}>
          <p className="mt-3 mb-5 text-sm text-gray-500">
            Çalışanlarınızı, yetkilerini ve bekleyen davetleri buradan yönetin.
          </p>

          {/* Pending Invitations list */}
          {invitations.length > 0 && (
            <div className="mb-5 space-y-3">
              <h4 className="text-xs font-bold tracking-wider text-orange-600 uppercase">
                Bekleyen Davetiyeler ({invitations.length})
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {invitations.map(invite => (
                  <Card
                    key={invite.id}
                    className="relative flex flex-col items-start rounded-2xl border border-orange-200/50 bg-orange-50/30 p-4 text-left">
                    <div className="min-w-0 space-y-2 pr-8">
                      <div>
                        <p className="truncate text-sm font-bold text-gray-800">
                          {invite.employeeName || 'Çalışan adı belirtilmedi'}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-600">
                          <Mail size={14} className="text-orange-500" />
                          {invite.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {invite.jobTitle || 'Çalışan'}
                        </span>
                        <span className="rounded-full bg-orange-100/60 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                          Davet Edildi
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {invite.permissions.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">
                            Yetki seçilmedi
                          </span>
                        ) : (
                          invite.permissions.map(permission => (
                            <span
                              key={permission}
                              className="rounded border border-orange-200/70 bg-white/70 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                              {PERMISSION_META[permission].shortLabel}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <Button
                      isIconOnly
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/10 absolute top-3 right-3"
                      onPress={() =>
                        handleCancelInvite(invite.id, invite.email)
                      }
                      aria-label="Davetiye Sil">
                      <Trash2 size={16} />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Active Employee Memberships List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              Personel Listesi
            </h4>
            {employees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <Users className="mx-auto mb-3 text-gray-300" size={40} />
                <p className="text-sm font-medium text-gray-400">
                  Henüz eklenmiş personel bulunmuyor
                </p>
                <p className="mt-1 px-8 text-xs text-gray-400">
                  İşletmenize çalışan eklemek için yukarıdaki personeli davet et
                  butonunu kullanın.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {employees.map(emp => (
                  <Card
                    key={emp.id}
                    className="flex flex-col justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {emp.employeeName || emp.email}
                          </p>
                          <span className="text-xs text-gray-500">
                            {emp.email}
                          </span>
                        </div>
                        <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-semibold">
                          {emp.jobTitle || 'Çalışan'}
                        </span>
                      </div>

                      {/* Display permissions badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {emp.permissions.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">
                            Hiçbir yetki atanmadı
                          </span>
                        ) : (
                          emp.permissions.map(perm => (
                            <span
                              key={perm}
                              className="rounded border border-gray-200/50 bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                              {PERMISSION_META[perm].shortLabel}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10"
                        onPress={() =>
                          handleRemoveEmployee(emp.userId, emp.email)
                        }>
                        <Trash2 size={15} className="mr-1" /> Çıkar
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="font-bold"
                        onPress={() => handleOpenEditPerms(emp)}>
                        <Pencil size={15} className="mr-1" /> Düzenle
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end pt-4">
            <Button variant="primary" onPress={() => setInviteModalOpen(true)}>
              <UserPlus size={16} className="mr-1.5" /> Personel Davet Et
            </Button>
          </div>
        </SettingsCard>
        <SettingsCard
          title="Veri Yönetimi"
          icon={<Download size={20} className="text-primary" />}>
          <p className="mb-5 text-sm text-gray-500">
            İşletmenizin envanter ve müşteri verilerini güvenle içe veya dışa
            aktarın.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="font-semibold text-gray-800">Verileri İçe Aktar</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                CSV, XLSX veya XLS dosyasından envanter ve müşteri ekleyin.
              </p>
              <Button
                className="mt-4"
                variant="secondary"
                onPress={() => setIsImportWizardOpen(true)}>
                Dosyadan İçe Aktar
              </Button>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="font-semibold text-gray-800">Verileri Dışa Aktar</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                İşletme verilerini CSV veya Excel biçiminde indirin.
              </p>
              <Button
                className="mt-4"
                variant="secondary"
                onPress={() => setIsExportWizardOpen(true)}>
                Dışa Aktarma Seçenekleri
              </Button>
            </div>
          </div>
        </SettingsCard>
      </div>

      <Suspense fallback={null}>
        {activeCompany && (
          <DataExportWizard
            isOpen={isExportWizardOpen}
            onClose={() => setIsExportWizardOpen(false)}
            company={activeCompany}
          />
        )}
        <DataImportWizard
          isOpen={isImportWizardOpen}
          onClose={() => setIsImportWizardOpen(false)}
        />
      </Suspense>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onOpenChange={open => {
          if (!open) {
            setInviteModalOpen(false);
            resetInvite();
            setSelectedInvitePerms([]);
            setInviteJobTitleOption('EMPLOYEE');
            setInviteCustomJobTitle('');
          }
        }}>
        <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
        <Modal.Backdrop>
          <Modal.Container scroll="inside">
            <Modal.Dialog className="flex h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl outline-none">
              <Modal.CloseTrigger />
              <form
                onSubmit={handleSubmitInvite(handleInviteSubmit)}
                className="flex h-full min-h-0 flex-col">
                <Modal.Header>
                  <Modal.Heading className="text-xl">
                    Yeni Çalışan Davet Et
                  </Modal.Heading>
                </Modal.Header>

                <Modal.Body className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6">
                  <FormInput
                    control={controlInvite}
                    name="email"
                    label="E-posta Adresi"
                    isRequired
                    type="email"
                    placeholder="calisan@firma.com"
                  />
                  <FormInput
                    control={controlInvite}
                    name="employeeName"
                    label="Çalışanın Adı"
                    isRequired
                    placeholder="Örn: Ayşe Yılmaz"
                  />

                  <div>
                    <Select
                      fullWidth
                      selectedKey={inviteJobTitleOption}
                      onSelectionChange={value =>
                        setInviteJobTitleOption(value as JobTitleOption)
                      }>
                      <Label>Ünvan</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {JOB_TITLE_OPTIONS.map(option => (
                            <ListBox.Item key={option.id} id={option.id}>
                              {option.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                          <ListBox.Item id="OTHER">
                            Diğer
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <p className="bg-warning/10 text-warning-700 mt-2 rounded-lg px-3 py-2 text-xs font-medium">
                      Çalışanınız bu ünvanı profil rozetinde görecektir.
                    </p>
                    {inviteJobTitleOption === 'OTHER' && (
                      <TextField
                        className="mt-2"
                        fullWidth
                        value={inviteCustomJobTitle}
                        onChange={setInviteCustomJobTitle}>
                        <Label>Özel ünvan</Label>
                        <Input placeholder="Ünvanı yazın" />
                      </TextField>
                    )}
                  </div>

                  {/* Permissions Selection Checklist */}
                  <div className="space-y-2.5">
                    <label className="block border-b border-gray-100 pb-1 text-sm font-semibold text-gray-700">
                      Kullanıcı İzinleri
                    </label>
                    <div className="space-y-2">
                      {AVAILABLE_PERMISSIONS.map(perm => (
                        <Checkbox
                          key={perm.key}
                          isSelected={selectedInvitePerms.includes(perm.key)}
                          onChange={() => handleToggleInvitePerm(perm.key)}>
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Label>{perm.label}</Label>
                          </Checkbox.Content>
                          <Description>{perm.description}</Description>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex flex-none gap-3 border-t border-gray-100 p-4 pb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onPress={() => {
                      setInviteModalOpen(false);
                      resetInvite();
                      setSelectedInvitePerms([]);
                      setInviteJobTitleOption('EMPLOYEE');
                      setInviteCustomJobTitle('');
                    }}
                    isDisabled={isSendingInvite}>
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 font-bold"
                    isDisabled={isSendingInvite}>
                    {isSendingInvite ? (
                      <Loader2 className="mr-2 animate-spin" size={16} />
                    ) : (
                      <UserPlus className="mr-2" size={16} />
                    )}
                    Davet Gönder
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal
        isOpen={editPermsModalOpen}
        onOpenChange={open => {
          if (!open) {
            setEditPermsModalOpen(false);
            setEditingEmployee(null);
            setSelectedEditPerms([]);
            setEditingEmployeeName('');
            setEditingJobTitleOption('CASHIER');
            setEditingCustomJobTitle('');
          }
        }}>
        <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-xl outline-none">
              <Modal.CloseTrigger />
              <div>
                <Modal.Header>
                  <Modal.Heading className="text-xl">
                    Çalışanı Düzenle
                  </Modal.Heading>
                </Modal.Header>

                <Modal.Body className="space-y-4">
                  {editingEmployee && (
                    <div className="mb-2 rounded-2xl border border-gray-100 bg-gray-50 p-3.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        Çalışan Bilgisi
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-800">
                        {editingEmployee.employeeName || editingEmployee.email}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {editingEmployee.email}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      fullWidth
                      value={editingEmployeeName}
                      onChange={setEditingEmployeeName}>
                      <Label>Çalışanın Adı</Label>
                      <Input />
                    </TextField>
                    <Select
                      fullWidth
                      selectedKey={editingJobTitleOption}
                      onSelectionChange={value =>
                        setEditingJobTitleOption(value as JobTitleOption)
                      }>
                      <Label>Ünvan</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {JOB_TITLE_OPTIONS.map(option => (
                            <ListBox.Item key={option.id} id={option.id}>
                              {option.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                          <ListBox.Item id="OTHER">
                            Diğer
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                  {editingJobTitleOption === 'OTHER' && (
                    <TextField
                      fullWidth
                      value={editingCustomJobTitle}
                      onChange={setEditingCustomJobTitle}>
                      <Label>Özel Ünvan</Label>
                      <Input placeholder="Ünvanı yazın" />
                    </TextField>
                  )}

                  {/* Permissions Selection Checklist */}
                  <div className="space-y-2.5">
                    <label className="block border-b border-gray-100 pb-1 text-sm font-semibold text-gray-700">
                      Dinamik İzin Listesi
                    </label>
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {AVAILABLE_PERMISSIONS.map(perm => (
                        <Checkbox
                          key={perm.key}
                          isSelected={selectedEditPerms.includes(perm.key)}
                          onChange={() => handleToggleEditPerm(perm.key)}>
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Label>{perm.label}</Label>
                          </Checkbox.Content>
                          <Description>{perm.description}</Description>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onPress={() => {
                      setEditPermsModalOpen(false);
                      setEditingEmployee(null);
                      setSelectedEditPerms([]);
                      setEditingEmployeeName('');
                      setEditingJobTitleOption('CASHIER');
                      setEditingCustomJobTitle('');
                    }}
                    isDisabled={isSavingPerms}>
                    İptal
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1 font-bold"
                    onPress={handleSavePermsSubmit}
                    isDisabled={isSavingPerms}>
                    {isSavingPerms ? (
                      <Loader2 className="mr-2 animate-spin" size={16} />
                    ) : (
                      <CheckCircle2 className="mr-2" size={16} />
                    )}
                    Kaydet
                  </Button>
                </Modal.Footer>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};
