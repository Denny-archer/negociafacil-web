import { getMetrics, queryRows, SOURCE_DATE } from '../../domain';
import type { EntityKind, EntityRow, Metric, QueryContext } from '../../domain';
import { date, entityLabels, money, number } from '../records/formatting';
import { closed, total } from '../workspace/recordsMath';

interface ReportChoice {
  id: string;
  label: string;
  kind: EntityKind;
  subtitle: string;
  matches?: (row: EntityRow) => boolean;
}

export const reportChoices: readonly ReportChoice[] = [
  { id: 'delinquency', label: 'Inadimplência', kind: 'debt', subtitle: 'Estoque e composição' },
  {
    id: 'recovery',
    label: 'Recuperação',
    kind: 'payment',
    subtitle: 'Recebimento líquido reconhecido',
    matches: (row) => row.values.recognizedAt != null,
  },
  {
    id: 'collection',
    label: 'Cobrança / campanhas',
    kind: 'campaign',
    subtitle: 'Populações e conversão',
  },
  { id: 'agreements', label: 'Acordos', kind: 'agreement', subtitle: 'Vigência e parcelas' },
  { id: 'activeDebt', label: 'Dívida Ativa', kind: 'activeDebt', subtitle: 'Inscrições e desfechos' },
  { id: 'protest', label: 'Protesto', kind: 'protest', subtitle: 'Títulos e providências' },
  { id: 'payments', label: 'Pagamentos', kind: 'payment', subtitle: 'Compensação e baixa' },
  { id: 'demands', label: 'Demandas', kind: 'demand', subtitle: 'Pendências e prazos' },
  {
    id: 'productivity',
    label: 'Fluxo operacional',
    kind: 'demand',
    subtitle: 'Movimentação e conclusão',
  },
];
function rowsForReport(report: ReportChoice, context: QueryContext) {
  if (report.id === 'delinquency')
    return getMetrics('delinquency', context).find((metric) => metric.id === 'balance')?.rows || [];
  return queryRows(report.kind, context).filter(report.matches || (() => true));
}

const dayMs = 86_400_000;

export function comparisonPeriod(rows: EntityRow[], context: QueryContext) {
  const baseDay = SOURCE_DATE.slice(0, 10);
  const start =
    context.filters.from ||
    rows.map((row) => row.eventDate.slice(0, 10)).sort()[0] ||
    baseDay.slice(0, 4) + '-01-01';
  const end = context.filters.to || baseDay;
  const invalidComparison = start > end;
  let from = '';
  let to = '';
  if (!invalidComparison) {
    const startMs = Date.parse(start);
    const duration = Math.max(1, Math.round((Date.parse(end) - startMs) / dayMs) + 1);
    from = new Date(startMs - duration * dayMs).toISOString().slice(0, 10);
    to = new Date(startMs - dayMs).toISOString().slice(0, 10);
  }
  const previousContext: QueryContext = { ...context, filters: { ...context.filters, from, to } };
  return { start, end, invalidComparison, previousContext };
}

export function getReportData(report: ReportChoice, context: QueryContext) {
  const allRows = rowsForReport(report, context);
  const { start, end, invalidComparison, previousContext } = comparisonPeriod(allRows, context);
  const { from: previousStart, to: previousEnd } = previousContext.filters;
  const periodLabel = invalidComparison
    ? 'A partir de ' + date(start) + ' · data-base ' + date(end)
    : date(start) + ' – ' + date(end);
  const previousRows = invalidComparison ? [] : rowsForReport(report, previousContext);

  const currentReceived = total(allRows, 'receivedCents');
  const previousReceived = total(previousRows, 'receivedCents');
  const operational = report.kind === 'demand';
  const compareReceived = ['payment', 'campaign'].includes(report.kind);
  const currentMeasure = operational
    ? allRows.length
    : compareReceived
    ? currentReceived
    : total(allRows);
  const previousMeasure = operational
    ? previousRows.length
    : compareReceived
    ? previousReceived
    : total(previousRows);
  const measureLabel = operational
    ? 'registros'
    : compareReceived
    ? 'recebido líquido'
    : report.kind === 'agreement'
    ? 'negociado'
    : report.kind === 'protest'
    ? 'em títulos'
    : 'em aberto';
  const formatMeasure = (measure: number) => (operational ? number(measure) : money(measure));
  const delta = previousMeasure
    ? ((currentMeasure - previousMeasure) / Math.abs(previousMeasure)) * 100
    : null;
  const active = allRows.filter((row) => !closed(row));
  const concluded = allRows.filter(closed);
  const reportMetrics: Metric[] = operational
    ? [
        {
          id: 'report-population',
          label: 'Demandas movimentadas',
          value: number(allRows.length),
          caption: 'Última movimentação dentro do período',
          tone: 'blue',
          rows: allRows,
          unit: 'count',
          definition:
            'Contagem de demandas cuja última movimentação pertence ao período selecionado. Uma pessoa pode ter várias demandas.',
        },
        {
          id: 'report-active',
          label: 'Demandas ativas',
          value: number(active.length),
          caption: 'Sem encerramento explícito',
          tone: 'purple',
          rows: active,
          unit: 'count',
          definition:
            'Demandas do recorte sem closedAt; pagamento ou acordo não encerram automaticamente a demanda.',
        },
        {
          id: 'report-closed',
          label: 'Demandas encerradas',
          value: number(concluded.length),
          caption: 'Com conclusão registrada',
          tone: 'green',
          rows: concluded,
          unit: 'count',
          definition: 'Demandas com registro explícito de encerramento e movimentação no recorte.',
        },
      ]
    : [
        {
          id: 'report-population',
          label: `${entityLabels[report.kind]} · registros`,
          value: number(allRows.length),
          caption: 'População do período atual',
          tone: 'blue',
          rows: allRows,
          unit: 'count',
          definition: `Contagem de ${entityLabels[
            report.kind
          ].toLowerCase()} no recorte; não é contagem de pessoas.`,
        },
        {
          id: 'report-value',
          label:
            report.kind === 'agreement'
              ? 'Valor negociado'
              : report.kind === 'payment'
              ? 'Valor informado'
              : report.kind === 'protest'
              ? 'Valor dos títulos'
              : 'Saldo em aberto',
          value: money(total(allRows)),
          caption: 'Soma em centavos dos registros selecionados',
          tone: 'purple',
          rows: allRows,
          unit: 'currency',
          definition: `Soma de amountCents de ${entityLabels[
            report.kind
          ].toLowerCase()}. Cada relatório mantém sua unidade; os valores de processos diferentes não são somados entre si.`,
        },
        {
          id: 'report-received',
          label: 'Recebido líquido',
          value: money(currentReceived),
          caption: 'Reconhecimentos, incluindo estornos',
          tone: 'green',
          rows: allRows.filter((row) => row.receivedCents !== 0),
          unit: 'currency',
          definition:
            'Soma de receivedCents dos registros selecionados, preservando estornos negativos. Atribuição somente conforme os vínculos disponíveis.',
        },
      ];
  return {
    allRows,
    previousRows,
    previousContext,
    previousStart,
    previousEnd,
    invalidComparison,
    periodLabel,
    currentMeasure,
    previousMeasure,
    measureLabel,
    formatMeasure,
    delta,
    reportMetrics,
  };
}
