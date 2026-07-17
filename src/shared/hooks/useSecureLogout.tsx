import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import { useAuthStore } from '@/features/auth';
import { useNavigate } from 'react-router-dom';
import { waitForLocalWrites } from '@/shared/utils/sessionCleanup';
import { getPendingSyncOperations } from '@/shared/utils/pendingSyncOperations';
import type { PendingSyncOperation } from '@/shared/utils/pendingSyncOperations';
import { PendingSyncOperationsList } from '@/shared/components/PendingSyncOperationsList';
import { ROUTES } from '@/core/config/routes';

export const useSecureLogout = () => {
  const { confirm } = useConfirm();
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  return async () => {
    const synced = await waitForLocalWrites();
    if (!synced) {
      const pendingOperations = getPendingSyncOperations();
      const shouldDiscard = await confirm({
        title: 'Dikkat! Verileriniz kaybolabilir',
        description: close => (
          <div className="space-y-3">
            <p>
              İnternet bağlantısı yok veya değişiklikler henüz buluta
              kaydedilmemiş olabilir. Çıkış yapıp cihaz verilerini silerseniz bu
              değişiklikler kaybolabilir.
            </p>
            {pendingOperations.length > 0 && (
              <div>
                <p className="mb-1 font-medium">Bekleyen işlemler:</p>
                <PendingSyncOperationsList
                  operations={pendingOperations}
                  onOperationPress={(operation: PendingSyncOperation) => {
                    if (!operation.target) return;
                    const path =
                      operation.target.type === 'sale'
                        ? ROUTES.SALES_HISTORY
                        : operation.target.type === 'inventory'
                          ? ROUTES.INVENTORY.EDIT(operation.target.id)
                          : ROUTES.CUSTOMERS.DETAILS(operation.target.id);
                    close();
                    navigate(path);
                  }}
                />
              </div>
            )}
          </div>
        ),
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
