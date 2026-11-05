import { summaryColumns, SUMMARY_VALUE_NOTE } from './labels';
import { aggregateRows, headerMetadata } from './renderData';
import type { DocumentColumn, DocumentSnapshot } from './types';

/** Único escape usado em conteúdo e atributos do documento HTML de impressão. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!)
  );
}

function htmlTable(
  columns: readonly DocumentColumn[],
  rows: readonly (readonly string[])[],
  ids?: readonly string[]
): string {
  const width = columns.reduce((total, column) => total + column.width, 0);
  return `<table class="report-table"><colgroup>${columns
    .map((column) => `<col style="width:${((column.width / width) * 100).toFixed(3)}%">`)
    .join('')}</colgroup><thead><tr>${columns
    .map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map(
      (row, index) =>
        `<tr${ids ? ` data-record-id="${escapeHtml(ids[index])}"` : ''}>${row
          .map(
            (cell, cellIndex) =>
              `<td${columns[cellIndex].numeric ? ' class="numeric"' : ''}>${escapeHtml(cell)}</td>`
          )
          .join('')}</tr>`
    )
    .join('')}</tbody></table>`;
}

/** HTML autônomo para imprimir a seleção completa com estilos próprios. */
export function buildPrintHtml(snapshot: DocumentSnapshot): string {
  const tables =
    snapshot.mode === 'detailed'
      ? htmlTable(
          snapshot.selectedFields,
          snapshot.rows,
          snapshot.records.map((record) => record.ref.kind + ':' + record.ref.id)
        )
      : `<section><h2>Distribuição por domínio e estado</h2>${htmlTable(
          summaryColumns,
          aggregateRows(snapshot.aggregates.byStatus)
        )}<p class="report-meta">${escapeHtml(SUMMARY_VALUE_NOTE)}</p></section>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(
    snapshot.title
  )} | NegociaFácil</title><style>
@page { size: A4 landscape; margin: 12mm 12mm 17mm; @bottom-left { content: "Dados demonstrativos; sem conexão com o SISCAF."; font-family: Arial, sans-serif; font-size: 7pt; color: #7e8c98; } @bottom-right { content: "Página " counter(page) " / " counter(pages); font-family: Arial, sans-serif; font-size: 7pt; color: #7e8c98; } }
* { box-sizing: border-box; } html,body { margin: 0; padding: 0; color: #354c5f; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 8pt; line-height: 1.45; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.report-header { margin: 0 0 6mm; } .report-brand { font-size: 9pt; font-weight: 700; color: #4c6a80; margin: 0 0 3mm; } h1 { font-size: 16pt; line-height: 1.25; margin: 0 0 3mm; color: #1e3a4e; overflow-wrap: anywhere; } .report-meta { color: #687987; margin: 0 0 1mm; overflow-wrap: anywhere; } .report-totals { border: .2mm solid #dfe7ec; border-radius: 2mm; padding: 3mm 4mm; margin: 4mm 0; font-weight: 700; background: #f4f8fb; } section { margin: 0 0 7mm; } h2 { font-size: 10pt; color: #25475e; margin: 0 0 3mm; }
.report-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 4mm; } .report-table thead { display: table-header-group; } .report-table th { background: #25475e; color: #fff; font-size: 7.4pt; font-weight: 700; padding: 2.3mm 2mm; text-align: left; } .report-table td { padding: 2.1mm 2mm; border: .15mm solid #e0e7ec; font-size: 7.6pt; vertical-align: top; } .report-table th,.report-table td { white-space: pre-line; overflow-wrap: anywhere; word-break: normal; } .report-table tr { break-inside: avoid; page-break-inside: avoid; } .report-table tbody tr:nth-child(even) { background: #f7fafc; } .report-table .numeric { text-align: right; font-variant-numeric: tabular-nums; } .report-footer { font-size: 7pt; color: #808b95; margin-top: 4mm; } @media print { .report-footer { display: none; } }
</style></head><body><header class="report-header"><p class="report-brand">CREFITO-11 | NegociaFácil</p><h1>${escapeHtml(
    snapshot.title
  )}</h1>${headerMetadata(snapshot)
    .slice(0, 4)
    .map((line) => `<p class="report-meta">${escapeHtml(line)}</p>`)
    .join('')}<p class="report-totals">${escapeHtml(
    headerMetadata(snapshot)[4]
  )}</p><p class="report-meta">${escapeHtml(
    snapshot.sourceNotice
  )}</p></header>${tables}<footer class="report-footer">${escapeHtml(
    snapshot.sourceNotice
  )}</footer></body></html>`;
}
