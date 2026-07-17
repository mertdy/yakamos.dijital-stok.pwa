type ValueFormatter = (value: unknown) => string;

const defaultFormatValue: ValueFormatter = value => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  return String(value);
};

export const getFieldChangeDetails = (
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
  labels: Record<string, string>,
  formatters: Record<string, ValueFormatter> = {}
) =>
  Object.entries(next).flatMap(([key, nextValue]) => {
    const previousValue = previous[key];
    if (Object.is(previousValue, nextValue) || key === 'updatedAt') return [];

    const formatValue = formatters[key] ?? defaultFormatValue;
    return [
      `${labels[key] ?? key}: ${formatValue(previousValue)} → ${formatValue(nextValue)}`
    ];
  });
