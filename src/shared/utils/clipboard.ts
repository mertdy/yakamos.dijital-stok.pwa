import { toast } from '@heroui/react';

export const copyToClipboard = async (
  value: string,
  successMessage: string
): Promise<boolean> => {
  if (!navigator.clipboard) {
    toast.danger('Panoya kopyalama bu cihazda desteklenmiyor.');
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
    return true;
  } catch {
    toast.danger('Panoya kopyalama başarısız oldu.');
    return false;
  }
};
