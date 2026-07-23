import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextArea,
  TextField,
  toast
} from '@heroui/react';
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { ShieldCheck, UserRoundCheck } from 'lucide-react';
import { db } from '@/core/firebase/config';
import { PLATFORM_SUPPORT_ADMIN_EMAIL } from '@/core/config/support';
import { AVAILABLE_PERMISSIONS } from '@/core/types/permissions';
import type {
  Company,
  Membership,
  PermissionKey,
  SupportSession
} from '@/core/types/tenant';
import { useAuthStore } from '@/features/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_PERMISSIONS = AVAILABLE_PERMISSIONS.map(permission => permission.key);

const displayName = (membership: Membership) =>
  membership.employeeName || membership.email || membership.userId;

export const SupportAccessModal = ({ isOpen, onClose }: Props) => {
  const { user, memberships, switchCompany } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [targetMemberships, setTargetMemberships] = useState<Membership[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [targetMembershipId, setTargetMembershipId] = useState<string | null>(
    null
  );
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('60');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const selectedCompany = companies.find(company => company.id === companyId);
  const target = targetMemberships.find(
    membership => membership.id === targetMembershipId
  );
  const existingMembership = memberships.find(
    membership => membership.companyId === companyId
  );

  useEffect(() => {
    if (!isOpen || user?.email !== PLATFORM_SUPPORT_ADMIN_EMAIL) return;
    setIsLoading(true);
    void (async () => {
      await user.getIdToken(true);
      const snapshot = await getDocs(collection(db, 'companies'));
      setCompanies(
        snapshot.docs
          .map(item => item.data() as Company)
          .sort((first, second) => first.name.localeCompare(second.name, 'tr'))
      );
    })()
      .catch(error => {
        console.error('Support companies could not be loaded:', error);
        toast.danger('İşletmeler yüklenemedi.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, user?.email]);

  useEffect(() => {
    setTargetMembershipId(null);
    setTargetMemberships([]);
    if (!companyId) return;
    void getDocs(
      query(collection(db, 'memberships'), where('companyId', '==', companyId))
    )
      .then(snapshot =>
        setTargetMemberships(
          snapshot.docs
            .map(item => item.data() as Membership)
            .filter(membership => membership.userId !== user?.uid)
        )
      )
      .catch(error => {
        console.error('Support target memberships could not be loaded:', error);
        toast.danger('İşletme kullanıcıları yüklenemedi.');
      });
  }, [companyId, user?.uid]);

  useEffect(() => {
    if (isOpen) return;
    setCompanyId(null);
    setTargetMembershipId(null);
    setReason('');
    setDuration('60');
  }, [isOpen]);

  const permissionSummary = useMemo(() => {
    if (!target) return null;
    const permissions =
      target.role === 'OWNER' ? ALL_PERMISSIONS : target.permissions;
    return permissions.length
      ? `${permissions.length} yetki yansıtılacak`
      : 'Bu kullanıcının ek yetkisi yok';
  }, [target]);

  const startSession = async () => {
    if (!user || !selectedCompany || !target) return;
    if (reason.trim().length < 5) {
      toast.danger('Destek gerekçesini en az 5 karakter yazın.');
      return;
    }
    const hasExpiredSupportMembership = Boolean(
      existingMembership?.supportSessionId &&
      existingMembership.supportExpiresAt &&
      existingMembership.supportExpiresAt.toMillis() <= Date.now()
    );
    if (existingMembership && !hasExpiredSupportMembership) {
      await switchCompany(selectedCompany.id);
      toast.info('Bu işletmeye zaten erişiminiz var.');
      onClose();
      return;
    }

    setIsStarting(true);
    try {
      const sessionId = crypto.randomUUID();
      const expiresAt = Timestamp.fromMillis(
        Date.now() + Number(duration) * 60 * 1000
      );
      const permissions: PermissionKey[] =
        target.role === 'OWNER' ? ALL_PERMISSIONS : target.permissions;
      const membershipId = `${user.uid}_${selectedCompany.id}`;
      const session: SupportSession = {
        id: sessionId,
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        openedBy: user.uid,
        targetUserId: target.userId,
        targetMembershipId: target.id,
        permissionSnapshot: permissions,
        reason: reason.trim(),
        status: 'ACTIVE',
        startedAt: Timestamp.now(),
        expiresAt
      };
      const supportMembership: Membership = {
        id: membershipId,
        userId: user.uid,
        email: user.email || '',
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        role: 'EMPLOYEE',
        permissions,
        supportSessionId: sessionId,
        supportTargetUserId: target.userId,
        supportExpiresAt: expiresAt,
        createdAt: new Date().toISOString()
      };
      if (hasExpiredSupportMembership && existingMembership) {
        const cleanupBatch = writeBatch(db);
        cleanupBatch.delete(doc(db, 'memberships', existingMembership.id));
        await cleanupBatch.commit();
      }
      const batch = writeBatch(db);
      batch.set(doc(db, 'supportSessions', sessionId), session);
      batch.set(doc(db, 'memberships', membershipId), supportMembership);
      await batch.commit();
      await switchCompany(selectedCompany.id);
      toast.success('Geçici destek oturumu açıldı.');
      onClose();
    } catch (error) {
      console.error('Support session could not be opened:', error);
      toast.danger('Destek oturumu açılamadı.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="w-full max-w-xl rounded-3xl bg-white shadow-xl outline-none">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex items-start gap-3">
                <Modal.Icon className="bg-primary/10 text-primary">
                  <ShieldCheck size={20} />
                </Modal.Icon>
                <div>
                  <Modal.Heading>Destek oturumu aç</Modal.Heading>
                  <p className="mt-1 text-sm font-normal text-gray-500">
                    Erişim, seçilen kullanıcının yetkileriyle sınırlı ve
                    geçicidir. İşlemler sizin hesabınızla kaydedilir.
                  </p>
                </div>
              </div>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : (
                <>
                  <Select
                    selectedKey={companyId}
                    onSelectionChange={key => setCompanyId(key as string)}
                    fullWidth>
                    <Label>İşletme</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {companies.map(company => (
                          <ListBox.Item id={company.id} key={company.id}>
                            {company.name}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Select
                    isDisabled={!companyId}
                    selectedKey={targetMembershipId}
                    onSelectionChange={key =>
                      setTargetMembershipId(key as string)
                    }
                    fullWidth>
                    <Label>Yetkileri yansıtılacak kullanıcı</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {targetMemberships.map(membership => (
                          <ListBox.Item id={membership.id} key={membership.id}>
                            {displayName(membership)}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  {permissionSummary && (
                    <div className="bg-primary/5 text-primary flex items-center gap-2 rounded-xl p-3 text-sm">
                      <UserRoundCheck size={17} />
                      {permissionSummary}
                    </div>
                  )}
                  <Select
                    selectedKey={duration}
                    onSelectionChange={key => setDuration(key as string)}
                    fullWidth>
                    <Label>Oturum süresi</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="30">30 dakika</ListBox.Item>
                        <ListBox.Item id="60">1 saat</ListBox.Item>
                        <ListBox.Item id="120">2 saat</ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <TextField>
                    <Label>Destek gerekçesi</Label>
                    <TextArea
                      value={reason}
                      onChange={event => setReason(event.target.value)}
                      placeholder="Örn. bildirilen satış ekranı sorununu inceleme"
                    />
                  </TextField>
                </>
              )}
            </Modal.Body>
            <Modal.Footer className="pt-4">
              <Button variant="ghost" onPress={onClose}>
                Vazgeç
              </Button>
              <Button
                variant="primary"
                isDisabled={!target || !companyId || isLoading}
                isPending={isStarting}
                onPress={() => void startSession()}>
                Oturumu Aç
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
