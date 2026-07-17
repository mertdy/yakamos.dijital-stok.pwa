import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import { useAuthStore } from '@/features/auth';
import { waitForLocalWrites } from '@/shared/utils/sessionCleanup';

export const useSecureLogout = () => {
  const { confirm } = useConfirm();
  const logout = useAuthStore(state => state.logout);

  return async () => {
    const synced = await waitForLocalWrites();
    if (!synced) {
      const shouldDiscard = await confirm({
        title: 'Dikkat! Verileriniz kaybolabilir',
        description:
          'İnternet bağlantısı yok veya değişiklikler henüz buluta kaydedilmemiş olabilir. Çıkış yapıp cihaz verilerini silerseniz bu değişiklikler kaybolabilir.',
        confirmText: 'Çıkış yap ve verileri sil',
        cancelText: 'İptal',
        variant: 'danger',
        status: 'warning'
      });
      if (!shouldDiscard) return;
    }
    await logout();
  };
};
