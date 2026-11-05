import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import { SUMMARY_VALUE_NOTE } from './labels';
import { aggregateRows, headerMetadata } from './renderData';
import type { DocumentSnapshot } from './types';

function filename(snapshot: DocumentSnapshot): string {
  const slug = snapshot.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return `negociafacil-${slug || 'relatorio'}-${
    snapshot.mode === 'summary' ? 'resumo' : 'detalhado'
  }-${new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(snapshot.generatedAt))}.pdf`;
}
function lineText(value: string): string {
  return value.normalize('NFC').replace(/\u202f|\u00a0/g, ' ');
}

/** Gera um PDF nativo, sem capturar a tela nem limitar os registros à página atual. */
export async function savePdf(snapshot: DocumentSnapshot): Promise<void> {
  const [{ jsPDF: Pdf }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  const doc = new Pdf({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });
  doc.setProperties({
    title: snapshot.title,
    subject: snapshot.scope,
    author: 'CREFITO-11 | NegociaFácil',
    creator: 'NegociaFácil - dados demonstrativos',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const usableWidth = pageWidth - margin * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(lineText(snapshot.title), usableWidth) as string[];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const metadataLines = headerMetadata(snapshot).map(
    (line) => doc.splitTextToSize(lineText(line), usableWidth) as string[]
  );
  const headerEnd =
    19 +
    titleLines.length * 5.2 +
    metadataLines.reduce((total, lines) => total + lines.length * 3.6, 0) +
    5;
  if (headerEnd > pageHeight - 45)
    throw new Error(
      'O título ou os filtros são extensos demais para o cabeçalho A4. Reduza o texto da busca ou do título para gerar o PDF.'
    );
  const columnStyles: NonNullable<UserOptions['columnStyles']> = {};
  snapshot.selectedFields.forEach((column, index) => {
    columnStyles[index] = {
      cellWidth: column.width,
      ...(column.numeric ? { halign: 'right' as const } : {}),
      ...(snapshot.mode === 'summary' && index > 0 ? { halign: 'right' as const } : {}),
    };
  });
  const options: UserOptions = {
    margin: { left: margin, right: margin, top: headerEnd, bottom: 16 },
    tableWidth: usableWidth,
    theme: 'grid',
    head: [snapshot.selectedFields.map((column) => column.label)],
    styles: {
      font: 'helvetica',
      fontSize: snapshot.mode === 'summary' ? 9 : 7.6,
      cellPadding: 2.1,
      overflow: 'linebreak',
      lineWidth: 0.15,
      lineColor: [224, 231, 236],
      textColor: [53, 76, 95],
      valign: 'top',
    },
    headStyles: {
      fillColor: [37, 71, 94],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: snapshot.mode === 'summary' ? 9 : 7.4,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [247, 250, 252] },
    columnStyles,
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    horizontalPageBreak: false,
  };
  if (snapshot.mode === 'detailed') {
    autoTable(doc, { ...options, startY: headerEnd, body: snapshot.rows.map((row) => [...row]) });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(37, 71, 94);
    doc.text('Distribuição por domínio e estado', margin, headerEnd + 4);
    autoTable(doc, {
      ...options,
      startY: headerEnd + 7,
      body: aggregateRows(snapshot.aggregates.byStatus),
    });
    const previousEnd =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? headerEnd;
    const note = SUMMARY_VALUE_NOTE;
    const lines = doc.splitTextToSize(note, usableWidth) as string[];
    let noteY = previousEnd + 7;
    if (noteY + lines.length * 3.4 > pageHeight - 17) {
      doc.addPage();
      noteY = headerEnd + 4;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(104, 121, 135);
    doc.text(lines, margin, noteY);
  }
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(76, 106, 128);
    doc.text('CREFITO-11 | NegociaFácil', margin, 10);
    doc.setFontSize(13);
    doc.setTextColor(30, 58, 78);
    doc.text(titleLines, margin, 17);
    let y = 19 + titleLines.length * 5.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(104, 121, 135);
    metadataLines.forEach((lines) => {
      doc.text(lines, margin, y);
      y += lines.length * 3.6;
    });
    doc.setDrawColor(225, 232, 236);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(7);
    doc.setTextColor(128, 139, 149);
    doc.text(snapshot.sourceNotice, margin, pageHeight - 7);
    doc.text(`Página ${page} / ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }
  await doc.save(filename(snapshot), { returnPromise: true });
}
