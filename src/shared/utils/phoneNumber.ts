import {
  isValidPhoneNumber as isValidLibPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode
} from 'libphonenumber-js';
import * as z from 'zod';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'TR';

export const isValidPhoneNumber = (
  value?: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): boolean =>
  !value?.trim() || isValidLibPhoneNumber(value.trim(), defaultCountry);

export const optionalPhoneNumberSchema = z
  .string()
  .optional()
  .refine(value => isValidPhoneNumber(value), {
    message: 'Geçerli bir telefon numarası giriniz'
  });

export const normalizePhoneNumber = (
  value?: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): string | null => {
  if (!value?.trim()) return null;

  const phoneNumber = parsePhoneNumberFromString(value.trim(), defaultCountry);
  return phoneNumber?.isValid() ? phoneNumber.number : null;
};
