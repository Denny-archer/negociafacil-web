import { savePdf } from './features/documents/pdf';
import { printSnapshot } from './features/documents/print';
import { buildDocumentSnapshot } from './features/documents/snapshot';
import type { DocumentRequest } from './features/documents/types';

export { buildPrintHtml, escapeHtml } from './features/documents/printHtml';
export { buildDocumentSnapshot };
export type {
  DocumentAggregate,
  DocumentMode,
  DocumentRequest,
  DocumentSnapshot,
} from './features/documents/types';

let documentOperationActive = false;
async function documentOperation(operation: () => Promise<void>): Promise<void> {
  if (documentOperationActive)
    throw new Error('Há outro documento em preparação. Aguarde a conclusão para tentar novamente.');
  documentOperationActive = true;
  try {
    await operation();
  } finally {
    documentOperationActive = false;
  }
}

async function renderDocument(request: DocumentRequest, render: typeof savePdf): Promise<void> {
  const snapshot = buildDocumentSnapshot(request);
  if (!snapshot.totals.count) throw new Error('Não há registros nesta seleção para gerar o documento.');
  await documentOperation(() => render(snapshot));
}

export function downloadPdf(request: DocumentRequest): Promise<void> {
  return renderDocument(request, savePdf);
}

export function printDocument(request: DocumentRequest): Promise<void> {
  return renderDocument(request, printSnapshot);
}
