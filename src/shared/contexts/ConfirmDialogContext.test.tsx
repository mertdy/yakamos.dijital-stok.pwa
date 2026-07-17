import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialogProvider, useConfirm } from './ConfirmDialogContext';

const ConfirmHarness = ({
  onSecondaryAction
}: {
  onSecondaryAction: () => void;
}) => {
  const { confirm } = useConfirm();
  const [result, setResult] = useState<string>('bekliyor');

  return (
    <>
      <button
        onClick={async () => {
          const confirmed = await confirm({
            description: 'Sepetiniz temizlenecek.',
            secondaryAction: {
              text: 'Sepete Git',
              onPress: onSecondaryAction
            }
          });
          setResult(confirmed ? 'onaylandı' : 'vazgeçildi');
        }}>
        Dialogu Aç
      </button>
      <span>{result}</span>
    </>
  );
};

describe('ConfirmDialogProvider', () => {
  it('runs the secondary action and resolves the confirmation as cancelled', async () => {
    const onSecondaryAction = vi.fn();

    render(
      <ConfirmDialogProvider>
        <ConfirmHarness onSecondaryAction={onSecondaryAction} />
      </ConfirmDialogProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dialogu Aç' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sepete Git' }));

    await waitFor(() => {
      expect(onSecondaryAction).toHaveBeenCalledOnce();
      expect(screen.getByText('vazgeçildi')).toBeInTheDocument();
    });
  });
});
