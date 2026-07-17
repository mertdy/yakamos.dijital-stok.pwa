import type { ComponentProps, ReactNode } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues
} from 'react-hook-form';
import {
  Description,
  FieldError,
  Input,
  Label,
  TextField
} from '@heroui/react';

interface FormInputProps<TFieldValues extends FieldValues> extends Omit<
  ComponentProps<typeof Input>,
  'name' | 'onBlur' | 'onChange'
> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  hint?: string;
  isRequired?: boolean;
  valueAsNumber?: boolean;
  endContent?: ReactNode;
}

export const FormInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  isRequired,
  valueAsNumber,
  endContent,
  fullWidth = true,
  ...inputProps
}: FormInputProps<TFieldValues>) => {
  const {
    field: {
      name: fieldName,
      value: fieldValue,
      onChange: updateField,
      onBlur: markFieldTouched
    },
    fieldState: { error }
  } = useController({ control, name });
  const value =
    fieldValue === undefined ||
    fieldValue === null ||
    (typeof fieldValue === 'number' && Number.isNaN(fieldValue))
      ? ''
      : String(fieldValue);

  const handleChange = (nextValue: string) => {
    if (!valueAsNumber) {
      updateField(nextValue);
      return;
    }

    updateField(nextValue === '' ? Number.NaN : Number(nextValue));
  };

  return (
    <TextField
      fullWidth={fullWidth}
      name={fieldName}
      value={value}
      onChange={handleChange}
      onBlur={markFieldTouched}
      isInvalid={Boolean(error)}
      isRequired={isRequired}>
      <Label>{label}</Label>
      {endContent ? (
        <div className="flex gap-2">
          <Input fullWidth={fullWidth} {...inputProps} />
          {endContent}
        </div>
      ) : (
        <Input fullWidth={fullWidth} {...inputProps} />
      )}
      {hint && !error && <Description>{hint}</Description>}
      <FieldError>{error?.message}</FieldError>
    </TextField>
  );
};
