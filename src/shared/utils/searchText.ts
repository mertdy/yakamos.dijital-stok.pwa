/**
 * Makes Turkish text search case- and diacritic-insensitive.
 *
 * For example, both "cikolata" and "ÇİKOLATA" normalize to "cikolata".
 */
export const normalizeSearchText = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
