export interface TechnicalErrorRecord {
  source: 'window_error' | 'unhandled_rejection';
  message: string;
  stack?: string;
  occurredAt: string;
}

const MAX_ERROR_RECORDS = 10;
const MAX_TEXT_LENGTH = 700;
const errors: TechnicalErrorRecord[] = [];
let isStarted = false;

const redact = (value: unknown) =>
  String(value ?? '')
    .replace(/(bearer\s+)[^\s]+/gi, '$1[redacted]')
    .replace(
      /(token|password|authorization)([=:]\s*)[^\s,;]+/gi,
      '$1$2[redacted]'
    )
    .slice(0, MAX_TEXT_LENGTH);

const add = (record: TechnicalErrorRecord) => {
  errors.unshift(record);
  errors.splice(MAX_ERROR_RECORDS);
};

export const startTechnicalErrorCapture = () => {
  if (isStarted || typeof window === 'undefined') return;
  isStarted = true;
  window.addEventListener('error', event => {
    add({
      source: 'window_error',
      message: redact(
        event.message || event.error?.message || 'Tarayıcı hatası'
      ),
      stack: redact(event.error?.stack),
      occurredAt: new Date().toISOString()
    });
  });
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason instanceof Error ? event.reason : null;
    add({
      source: 'unhandled_rejection',
      message: redact(
        reason?.message || event.reason || 'Yakalanmamış işlem hatası'
      ),
      stack: redact(reason?.stack),
      occurredAt: new Date().toISOString()
    });
  });
};

export const getRecentTechnicalErrors = () =>
  errors.map(error => ({ ...error }));
