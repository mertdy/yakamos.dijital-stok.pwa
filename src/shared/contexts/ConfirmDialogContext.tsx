import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode
} from 'react';
import { AlertDialog } from '@heroui/react';
import { Button } from '@heroui/react';

export interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  status?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context;
};

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export const ConfirmDialogProvider: React.FC<ConfirmDialogProviderProps> = ({
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((newOptions: ConfirmOptions) => {
    setOptions(newOptions);
    setIsOpen(true);
    return new Promise<boolean>(resolve => {
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) resolver.resolve(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver.resolve(false);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && resolver) {
      resolver.resolve(false);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {options && (
        <AlertDialog isOpen={isOpen} onOpenChange={handleOpenChange}>
          <button
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog>
                {options.title && (
                  <AlertDialog.Header>
                    <AlertDialog.Icon
                      status={
                        options.status ||
                        (options.variant === 'danger' ? 'danger' : 'default')
                      }
                    />
                    <AlertDialog.Heading>{options.title}</AlertDialog.Heading>
                  </AlertDialog.Header>
                )}
                <AlertDialog.Body>{options.description}</AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button variant="ghost" onPress={handleCancel}>
                    {options.cancelText || 'İptal'}
                  </Button>
                  {/* Notice: Button expects variant="danger"|'primary' etc, not color. ConfirmOptions uses 'variant' now! */}
                  <Button
                    variant={options.variant || 'primary'}
                    onPress={handleConfirm}>
                    {options.confirmText || 'Onayla'}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      )}
    </ConfirmContext.Provider>
  );
};
