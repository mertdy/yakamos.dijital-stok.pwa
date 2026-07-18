import * as XLSX from 'xlsx';
import { MAX_IMPORT_DATA_ROWS } from './dataImport.constants';

type ImportWorkerMessage =
  | { type: 'inspect'; buffer: ArrayBuffer }
  | { type: 'parse'; buffer: ArrayBuffer; sheetName: string };

interface ParseImportFileMessage {
  buffer: ArrayBuffer;
  sheetName: string;
}

const inspectFile = (buffer: ArrayBuffer) => {
  const workbook = XLSX.read(buffer, { type: 'array', bookSheets: true });
  return { sheetNames: workbook.SheetNames };
};

const parseFile = ({ buffer, sheetName }: ParseImportFileMessage) => {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    sheetRows: MAX_IMPORT_DATA_ROWS + 2,
    codepage: 65001
  });
  if (!workbook.Sheets[sheetName])
    throw new Error('Çalışma sayfası bulunamadı');
  const values = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: ''
  }) as unknown[][];
  const headers = (values[0] || []).map(value => String(value).trim());

  const populatedRows = values
    .slice(1)
    .filter(row => row.some(value => String(value).trim()));

  return {
    headers,
    rows: populatedRows.slice(0, MAX_IMPORT_DATA_ROWS),
    sheetName,
    totalRows: Math.min(populatedRows.length, MAX_IMPORT_DATA_ROWS),
    isTruncated: populatedRows.length > MAX_IMPORT_DATA_ROWS
  };
};

self.onmessage = (event: MessageEvent<ImportWorkerMessage>) => {
  try {
    const data =
      event.data.type === 'inspect'
        ? inspectFile(event.data.buffer)
        : parseFile(event.data);
    self.postMessage({ type: 'success', data });
  } catch {
    self.postMessage({ type: 'error' });
  }
};
