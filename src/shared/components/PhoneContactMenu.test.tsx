import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PhoneContactMenu } from './PhoneContactMenu';

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastDanger: vi.fn()
}));

vi.mock('@heroui/react', async () => {
  const actual =
    await vi.importActual<typeof import('@heroui/react')>('@heroui/react');
  return {
    ...actual,
    toast: { success: mocks.toastSuccess, danger: mocks.toastDanger }
  };
});

describe('PhoneContactMenu', () => {
  it('copies the normalized phone number and confirms the action', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    });

    render(<PhoneContactMenu phone="0555 123 45 67" />);

    fireEvent.click(
      screen.getByRole('button', {
        name: '+90 555 123 45 67 için iletişim seçeneklerini aç'
      })
    );
    fireEvent.click(await screen.findByText('Numarayı kopyala'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '+905551234567'
      );
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        'Telefon numarası kopyalandı.'
      );
    });
  });
});
