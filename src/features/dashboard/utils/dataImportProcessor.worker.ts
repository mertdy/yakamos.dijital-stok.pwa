import {
  prepareImportOperations,
  type PreparedImportResult
} from './dataImportPreparation';

self.onmessage = (
  event: MessageEvent<Parameters<typeof prepareImportOperations>[0]>
) => {
  try {
    self.postMessage({
      type: 'success',
      data: prepareImportOperations(event.data)
    } satisfies { type: 'success'; data: PreparedImportResult });
  } catch {
    self.postMessage({ type: 'error' });
  }
};
