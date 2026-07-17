import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label, toast, Tooltip } from '@heroui/react';
import { useAuthStore } from '../store/useAuthStore';
import { SettingsCard } from '@/shared/components/SettingsCard';
import { db } from '@/core/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Invitation, PermissionKey } from '@/core/types/tenant';
import { PERMISSION_META } from '@/core/types/permissions';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  CalendarDays,
  Clock3,
  User,
  Mail,
  Shield,
  ShieldCheck,
  Save
} from 'lucide-react';

const formatAuthDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(date);
};

export const AccountSettingsView = () => {
  const {
    user,
    activeMembership,
    activeCompany,
    acceptInvitation,
    declineInvitation,
    updateDisplayName
  } = useAuthStore();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isCheckingInvites, setIsCheckingInvites] = useState(true);
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [isSavingName, setIsSavingName] = useState(false);
  const usesEmailPassword = user?.providerData?.some(
    provider => provider.providerId === 'password'
  );

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  useEffect(() => {
    if (!user?.email) return;
    const q = query(
      collection(db, 'invitations'),
      where('email', '==', user.email.toLowerCase()),
      where('status', '==', 'PENDING')
    );
    const unsubscribe = onSnapshot(
      q,
      snap => {
        const invites: Invitation[] = [];
        snap.forEach(doc => {
          invites.push({ id: doc.id, ...doc.data() } as Invitation);
        });
        setInvitations(invites);
        setIsCheckingInvites(false);
      },
      error => {
        console.error('Error fetching invitations:', error);
        setIsCheckingInvites(false);
      }
    );
    return () => unsubscribe();
  }, [user?.email]);

  const handleAcceptInvite = async (inviteId: string) => {
    setActionInviteId(inviteId);
    try {
      await acceptInvitation(inviteId);
      toast.success('Davet kabul edildi, işletmeye geçiş yapılıyor...');
      navigate('/');
    } catch (error) {
      console.error('Accept invite error:', error);
      toast.danger('Davet kabul edilirken bir hata oluştu.');
    } finally {
      setActionInviteId(null);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    setActionInviteId(inviteId);
    try {
      await declineInvitation(inviteId);
      toast.success('Davet reddedildi.');
    } catch (error) {
      console.error('Decline invite error:', error);
      toast.danger('Davet reddedilirken bir hata oluştu.');
    } finally {
      setActionInviteId(null);
    }
  };

  const handleDisplayNameSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      toast.danger('Lütfen adınızı girin.');
      return;
    }

    setIsSavingName(true);
    try {
      await updateDisplayName(name);
      toast.success('Adınız güncellendi.');
    } catch (error) {
      console.error('Display name update error:', error);
      toast.danger('Adınız güncellenirken bir hata oluştu.');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="flex h-full max-w-4xl flex-col p-4 md:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Hesap Ayarları
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kullanıcı profilinizi görüntüleyin ve gelen davetiyeleri yönetin.
          </p>
        </div>
      </div>

      <div className="space-y-6 pb-6">
        {/* User Profile Card */}
        <SettingsCard
          title="Profil Bilgileri"
          icon={<User size={20} className="text-primary" />}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-400">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    İsim Soyisim
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {user?.displayName || 'İsimsiz Kullanıcı'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-400">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    E-posta Adresi
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {user?.email || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-400">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Aktif İşletme
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {activeCompany?.name || 'Seçili değil'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-400">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Rolünüz</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {activeMembership?.role === 'OWNER'
                      ? 'Şirket Sahibi'
                      : 'Çalışan'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-400">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Üyelik Tarihi
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatAuthDate(user?.metadata?.creationTime)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-400">
                  <Clock3 size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Son Giriş Zamanı
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatAuthDate(user?.metadata?.lastSignInTime)}
                  </p>
                </div>
              </div>
            </div>

            {usesEmailPassword && (
              <form
                onSubmit={handleDisplayNameSubmit}
                className="border-t border-gray-100 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="display-name">İsim Soyisim</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={event => setDisplayName(event.target.value)}
                      placeholder="Adınız ve soyadınız"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={isSavingName || !displayName.trim()}>
                    {isSavingName ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} className="mr-1.5" />
                    )}
                    Kaydet
                  </Button>
                </div>
              </form>
            )}
          </div>
        </SettingsCard>

        {/* Permissions Card */}
        <SettingsCard
          title="İşletme Yetkileri"
          icon={<ShieldCheck size={20} className="text-primary" />}>
          {activeMembership?.role === 'OWNER' ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">
                <CheckCircle2
                  size={18}
                  className="flex-shrink-0 text-green-600"
                />
                Şirket Sahibi olarak tüm sistem yetkilerine sınırsız erişim
                hakkınız bulunmaktadır.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(PERMISSION_META) as PermissionKey[]).map(perm => (
                  <Tooltip key={perm} delay={0} closeDelay={0}>
                    <Tooltip.Trigger
                      aria-label={`${PERMISSION_META[perm].label} açıklaması`}>
                      <div className="flex cursor-help items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        <CheckCircle2
                          size={16}
                          className="flex-shrink-0 text-green-500"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          {PERMISSION_META[perm].label}
                        </span>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content showArrow>
                      <Tooltip.Arrow />
                      <span className="px-1 py-0.5 text-xs font-medium">
                        {PERMISSION_META[perm].description}
                      </span>
                    </Tooltip.Content>
                  </Tooltip>
                ))}
              </div>
            </div>
          ) : activeMembership?.permissions &&
            activeMembership.permissions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Atanmış Yetkileriniz
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activeMembership.permissions.map(perm => (
                  <Tooltip key={perm} delay={0} closeDelay={0}>
                    <Tooltip.Trigger
                      aria-label={`${PERMISSION_META[perm].label} açıklaması`}>
                      <div className="bg-primary/5 border-primary/10 flex cursor-help items-center gap-2 rounded-xl border px-3 py-2">
                        <CheckCircle2
                          size={16}
                          className="text-primary flex-shrink-0"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          {PERMISSION_META[perm].label}
                        </span>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content showArrow>
                      <Tooltip.Arrow />
                      <span className="px-1 py-0.5 text-xs font-medium">
                        {PERMISSION_META[perm].description}
                      </span>
                    </Tooltip.Content>
                  </Tooltip>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <Shield size={24} className="mx-auto mb-1 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500">
                Aktif işletmede tarafınıza tanımlanmış herhangi bir yetki
                bulunmamaktadır.
              </p>
            </div>
          )}
        </SettingsCard>

        {/* Invitations Card */}
        <SettingsCard
          title="Gelen İşletme Davetiyeleri"
          icon={<Building2 size={20} className="text-primary" />}>
          {isCheckingInvites ? (
            <div className="flex justify-center p-8">
              <Loader2 className="text-primary animate-spin" size={32} />
            </div>
          ) : invitations.length > 0 ? (
            <div className="grid gap-4">
              {invitations.map(invite => (
                <Card
                  key={invite.id}
                  className="border-primary/20 bg-primary/5 flex flex-col gap-4 rounded-2xl border p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">
                      {invite.companyName}
                    </h4>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Bu işletmede{' '}
                      <span className="font-extrabold text-gray-700">
                        {invite.jobTitle?.trim() || 'çalışan'}
                      </span>{' '}
                      olarak görev yapmaya davet edildiniz.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {invite.permissions.map(perm => (
                        <span
                          key={perm}
                          className="inline-flex rounded border border-gray-100 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 shadow-sm">
                          {PERMISSION_META[perm].label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10"
                      isDisabled={actionInviteId !== null}
                      onPress={() => handleDeclineInvite(invite.id)}>
                      {actionInviteId === invite.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <XCircle size={16} className="mr-1.5" />
                      )}
                      Reddet
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      isDisabled={actionInviteId !== null}
                      onPress={() => handleAcceptInvite(invite.id)}>
                      {actionInviteId === invite.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} className="mr-1.5" />
                      )}
                      Kabul Et
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <Building2 className="mx-auto mb-2 text-gray-300" size={40} />
              <p className="text-sm font-semibold text-gray-500">
                Bekleyen davetiyeniz bulunmamaktadır.
              </p>
            </div>
          )}
        </SettingsCard>
      </div>
    </div>
  );
};
