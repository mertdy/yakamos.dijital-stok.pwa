import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, Card, toast } from '@heroui/react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '@/core/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Invitation } from '@/core/types/tenant';
import {
  Loader2,
  Plus,
  LogOut,
  CheckCircle2,
  XCircle,
  Building2
} from 'lucide-react';
import { FormInput } from '@/shared/components/FormInput';
import { PhoneInput } from '@/shared/components/PhoneInput';
import {
  normalizePhoneNumber,
  optionalPhoneNumberSchema
} from '@/shared/utils/phoneNumber';

const onboardingSchema = z.object({
  name: z
    .string()
    .min(3, 'İşletme adı en az 3 karakter olmalıdır')
    .max(50, 'İşletme adı en fazla 50 karakter olmalıdır'),
  receiptHeader: z.string().optional(),
  phone: optionalPhoneNumberSchema,
  address: z.string().optional()
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export const OnboardingView = () => {
  const { user, createCompany, acceptInvitation, declineInvitation, logout } =
    useAuthStore();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isCheckingInvites, setIsCheckingInvites] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema)
  });

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

  const handleCreateCompany = async (data: OnboardingFormData) => {
    setIsSubmitting(true);
    try {
      await createCompany(data.name, {
        phone: normalizePhoneNumber(data.phone) || undefined,
        address: data.address,
        receiptHeader: data.receiptHeader
      });
      toast.success('İşletme başarıyla kuruldu!');
      navigate('/');
    } catch (error) {
      console.error('Failed to create company:', error);
      toast.danger('İşletme kurulurken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          className="hover:text-danger text-gray-500"
          onPress={() => logout()}>
          <LogOut size={16} className="mr-2" /> Çıkış Yap
        </Button>
      </div>

      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Dijital Stok'a Hoş Geldiniz
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Başlamak için yeni bir işletme kurun veya size gönderilen daveti
            kabul edin.
          </p>
        </div>

        {/* Invitations List Section */}
        {!isCheckingInvites && invitations.length > 0 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <Building2 size={20} className="text-primary" /> Bekleyen İşletme
              Davetiyeleri
            </h3>
            {invitations.map(invite => (
              <Card
                key={invite.id}
                className="border-primary/20 bg-primary/5 flex flex-col gap-4 rounded-2xl border p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    {invite.companyName}
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Bu işletmede çalışan (Employee) olarak görev yapmaya davet
                    edildiniz.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {invite.permissions.map(perm => (
                      <span
                        key={perm}
                        className="inline-flex rounded border border-gray-100 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 shadow-sm">
                        {perm === 'VIEW_DASHBOARD' && 'Dashboard Görünümü'}
                        {perm === 'MANAGE_INVENTORY' && 'Envanter Yönetimi'}
                        {perm === 'MANAGE_CUSTOMERS' && 'Müşteri Yönetimi'}
                        {perm === 'TAKE_PAYMENT' && 'Ödeme Alıcı'}
                        {perm === 'VIEW_SALES_HISTORY' && 'Satış Geçmişi'}
                        {perm === 'MANAGE_SALES_HISTORY' && 'Satış İptali'}
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
        )}

        {/* Create Company Form */}
        <Card className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
            <Plus size={22} className="text-primary" /> Yeni Bir İşletme Kur
          </h3>
          <form
            onSubmit={handleSubmit(handleCreateCompany)}
            className="space-y-5">
            <FormInput
              control={control}
              name="name"
              label="İşletme Adı"
              isRequired
              type="text"
              placeholder="Örn: Yakamos Süpermarket"
            />

            <FormInput
              control={control}
              name="receiptHeader"
              label="Fiş Başlığı (Opsiyonel)"
              type="text"
              placeholder="Örn: YAKAMOS GIDA LTD. ŞTİ."
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <PhoneInput
                control={control}
                name="phone"
                label="Telefon (Opsiyonel)"
                placeholder="555 555 55 55"
              />

              <FormInput
                control={control}
                name="address"
                label="Adres (Opsiyonel)"
                type="text"
                placeholder="Örn: Kadıköy, İstanbul"
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                className="h-12 w-full rounded-xl text-sm font-bold"
                isDisabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 animate-spin" size={20} />
                ) : (
                  'Kurulumu Tamamla'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
