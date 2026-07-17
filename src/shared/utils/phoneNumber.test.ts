import { describe, expect, it } from 'vitest';
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  optionalPhoneNumberSchema
} from './phoneNumber';

describe('phoneNumber utilities', () => {
  it('normalizes Turkish national numbers to E.164', () => {
    expect(normalizePhoneNumber('0555 123 45 67')).toBe('+905551234567');
  });

  it('keeps valid international numbers in E.164 format', () => {
    expect(normalizePhoneNumber('+1 (202) 555-0123')).toBe('+12025550123');
  });

  it('accepts empty optional values and rejects invalid numbers', () => {
    expect(isValidPhoneNumber('')).toBe(true);
    expect(isValidPhoneNumber('12345')).toBe(false);
    expect(normalizePhoneNumber('12345')).toBeNull();
  });

  it('uses the shared validation message for phone forms', () => {
    const result = optionalPhoneNumberSchema.safeParse('+9055555555552');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Geçerli bir telefon numarası giriniz'
      );
    }
  });
});
