import { useEffect, useState } from 'react';
import { AlertDialog, Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/core/config/routes';
import {
  getPendingSyncOperations,
  type PendingSyncOperation
} from '@/shared/utils/pendingSyncOperations';
import { PendingSyncOperationsList } from './PendingSyncOperationsList';

interface PendingSyncOperationsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const PendingSyncOperationsDialog = ({
  isOpen,
  onOpenChange,
  title = 'Sırada bekleyen işlemler'
}: PendingSyncOperationsDialogProps) => {
  const navigate = useNavigate();
  const [operations, setOperations] = useState(getPendingSyncOperations);

  useEffect(() => {
    if (isOpen) setOperations(getPendingSyncOperations());
  }, [isOpen]);

  const handleOperationPress = (operation: PendingSyncOperation) => {
    if (!operation.target) return;
    const path =
      operation.target.type === 'sale'
        ? ROUTES.SALES_HISTORY
        : operation.target.type === 'inventory'
          ? ROUTES.INVENTORY.EDIT(operation.target.id)
          : ROUTES.CUSTOMERS.DETAILS(operation.target.id);
    onOpenChange(false);
    navigate(path);
  };

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="mb-4 text-sm text-gray-600">
                Bu işlemler internet bağlantısı sağlandığında buluta kaydedilir.
              </p>
              <PendingSyncOperationsList
                operations={operations}
                onOperationPress={handleOperationPress}
              />
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)}>
                Kapat
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
};
