import { useState } from 'react';
import {
  Description,
  Dropdown,
  FieldError,
  InputGroup,
  Label,
  TextField
} from '@heroui/react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  type CountryCode
} from 'libphonenumber-js';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues
} from 'react-hook-form';
import { DEFAULT_PHONE_COUNTRY } from '../utils/phoneNumber';

interface PhoneInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  hint?: string;
  placeholder?: string;
  isRequired?: boolean;
  defaultCountry?: CountryCode;
}

interface CountryOption {
  code: CountryCode;
  callingCode: string;
  flag: string;
  name: string;
}

const countryNames = new Intl.DisplayNames(['tr'], { type: 'region' });

const getFlag = (country: CountryCode): string =>
  String.fromCodePoint(
    ...country
      .toUpperCase()
      .split('')
      .map(character => 127397 + character.charCodeAt(0))
  );

const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map(code => ({
    code,
    callingCode: getCountryCallingCode(code),
    flag: getFlag(code),
    name: countryNames.of(code) || code
  }))
  .sort((first, second) => {
    if (first.code === DEFAULT_PHONE_COUNTRY) return -1;
    if (second.code === DEFAULT_PHONE_COUNTRY) return 1;
    return first.name.localeCompare(second.name, 'tr');
  });

const detectCountry = (value: string): CountryCode | undefined => {
  if (!value.startsWith('+')) return undefined;
  const formatter = new AsYouType();
  formatter.input(value);
  return formatter.getCountry();
};

const getNationalDigits = (value: string, country: CountryCode): string => {
  if (!value) return '';

  const formatter = new AsYouType(country);
  formatter.input(value);
  const nationalNumber = formatter.getNationalNumber();
  if (nationalNumber) return nationalNumber;

  const digits = value.replace(/\D/g, '');
  return country === 'TR' && digits.startsWith('0') ? digits.slice(1) : digits;
};

const formatNationalInput = (digits: string, country: CountryCode): string =>
  digits ? new AsYouType(country).input(digits) : '';

export const PhoneInput = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  placeholder,
  isRequired,
  defaultCountry = DEFAULT_PHONE_COUNTRY
}: PhoneInputProps<TFieldValues>) => {
  const [countryChoice, setCountryChoice] = useState(defaultCountry);
  const {
    field: {
      name: fieldName,
      value: fieldValue,
      onChange: updateField,
      onBlur: markFieldTouched
    },
    fieldState: { error }
  } = useController({ control, name });

  const rawValue = typeof fieldValue === 'string' ? fieldValue : '';
  const selectedCountry = detectCountry(rawValue) || countryChoice;
  const nationalDigits = getNationalDigits(rawValue, selectedCountry);
  const displayValue = formatNationalInput(nationalDigits, selectedCountry);
  const callingCode = getCountryCallingCode(selectedCountry);

  const handlePhoneChange = (nextValue: string) => {
    let nextDigits = nextValue.replace(/\D/g, '');
    if (selectedCountry === 'TR' && nextDigits.startsWith('0')) {
      nextDigits = nextDigits.slice(1);
    }

    if (!nextDigits) {
      updateField('');
      return;
    }

    const formatter = new AsYouType(selectedCountry);
    formatter.input(nextDigits);
    updateField(formatter.getNumberValue() || `+${callingCode}${nextDigits}`);
  };

  const handleCountryChange = (country: CountryCode) => {
    setCountryChoice(country);
    if (!nationalDigits) return;
    updateField(`+${getCountryCallingCode(country)}${nationalDigits}`);
  };

  return (
    <TextField
      fullWidth
      name={fieldName}
      value={displayValue}
      onChange={handlePhoneChange}
      onBlur={markFieldTouched}
      isInvalid={Boolean(error)}
      isRequired={isRequired}>
      <Label>{label}</Label>
      <InputGroup fullWidth className="overflow-hidden">
        <InputGroup.Prefix className="p-0">
          <Dropdown>
            <Dropdown.Trigger
              aria-label="Ülke telefon kodunu seç"
              className="flex h-full items-center gap-1.5 border-r border-gray-200 px-3 text-sm font-medium outline-none">
              <span aria-hidden="true" className="text-base">
                {getFlag(selectedCountry)}
              </span>
              <span>+{callingCode}</span>
              <span aria-hidden="true" className="text-xs">
                ▾
              </span>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom start"
              className="max-h-72 min-w-72 overflow-y-auto">
              <Dropdown.Menu
                aria-label="Ülke telefon kodları"
                selectionMode="single"
                selectedKeys={new Set([selectedCountry])}
                onAction={key =>
                  handleCountryChange(String(key) as CountryCode)
                }>
                {COUNTRY_OPTIONS.map(country => (
                  <Dropdown.Item
                    key={country.code}
                    id={country.code}
                    textValue={`${country.name} +${country.callingCode}`}>
                    <span className="flex w-full items-center gap-3">
                      <span aria-hidden="true" className="text-lg">
                        {country.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {country.name}
                      </span>
                      <span className="text-muted">+{country.callingCode}</span>
                    </span>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </InputGroup.Prefix>
        <InputGroup.Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="pl-2 focus:shadow-none focus:ring-0"
          placeholder={placeholder}
          aria-label={label}
        />
      </InputGroup>
      {hint && !error && <Description>{hint}</Description>}
      <FieldError>{error?.message}</FieldError>
    </TextField>
  );
};
