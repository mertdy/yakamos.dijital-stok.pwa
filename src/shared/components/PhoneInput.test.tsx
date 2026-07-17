import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@heroui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import { isValidPhoneNumber } from '../utils/phoneNumber';
import { PhoneInput } from './PhoneInput';

const schema = z.object({
  phone: z.string().refine(isValidPhoneNumber, 'Geçersiz telefon numarası')
});

type FormData = z.infer<typeof schema>;

const TestForm = ({ onSubmit }: { onSubmit: (data: FormData) => void }) => {
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <PhoneInput
        control={control}
        name="phone"
        label="Telefon Numarası"
        placeholder="555 555 55 55"
      />
      <Button type="submit">Kaydet</Button>
    </form>
  );
};

describe('PhoneInput', () => {
  it('uses Turkey by default and formats while typing', async () => {
    const user = userEvent.setup();
    render(<TestForm onSubmit={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Ülke telefon kodunu seç' })
    ).toHaveTextContent('+90');

    const input = screen.getByLabelText('Telefon Numarası');
    await user.type(input, '5551234567');

    expect(input).toHaveValue('555 123 45 67');
  });

  it('submits the normalized E.164 value through React Hook Form', async () => {
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Telefon Numarası'), {
      target: { value: '5551234567' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { phone: '+905551234567' },
        expect.anything()
      );
    });
  });

  it('allows selecting a different country code', async () => {
    const user = userEvent.setup();
    render(<TestForm onSubmit={vi.fn()} />);

    await user.click(
      screen.getByRole('button', { name: 'Ülke telefon kodunu seç' })
    );
    await user.click(await screen.findByText('Amerika Birleşik Devletleri'));

    expect(
      screen.getByRole('button', { name: 'Ülke telefon kodunu seç' })
    ).toHaveTextContent('+1');
  });

  it('removes the focus ring when the field is invalid', async () => {
    render(<TestForm onSubmit={vi.fn()} />);
    const input = screen.getByLabelText('Telefon Numarası');

    fireEvent.change(input, { target: { value: '55555555552' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => {
      expect(screen.getByText('Geçersiz telefon numarası')).toBeInTheDocument();
      expect(input.parentElement).toHaveAttribute('data-invalid', 'true');
      expect(input).toHaveClass('focus:ring-0', 'focus:shadow-none');
    });
  });
});
