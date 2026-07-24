import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { FormInput } from './FormInput';

interface TestFormData {
  quantity?: number;
}

const NumberFieldHarness = () => {
  const { control, getValues } = useForm<TestFormData>({
    defaultValues: { quantity: 4 }
  });
  const [submittedValue, setSubmittedValue] = useState<string>('');

  return (
    <>
      <FormInput
        control={control}
        name="quantity"
        label="Miktar"
        type="number"
        valueAsNumber
      />
      <button onClick={() => setSubmittedValue(String(getValues().quantity))}>
        Değeri kontrol et
      </button>
      <output>{submittedValue}</output>
    </>
  );
};

describe('FormInput', () => {
  it('keeps an empty number field undefined instead of NaN', async () => {
    const user = userEvent.setup();
    render(<NumberFieldHarness />);

    await user.clear(screen.getByLabelText('Miktar'));
    await user.click(screen.getByRole('button', { name: 'Değeri kontrol et' }));

    expect(screen.getByRole('status')).toHaveTextContent('undefined');
  });
});
