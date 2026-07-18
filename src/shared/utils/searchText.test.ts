import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from './searchText';

describe('normalizeSearchText', () => {
  it('normalizes Turkish casing and characters for text searches', () => {
    expect(normalizeSearchText('ÇİKOLATA')).toBe('cikolata');
    expect(normalizeSearchText('ŞİŞE')).toBe('sise');
    expect(normalizeSearchText('IĞDIR')).toBe('igdir');
  });
});
