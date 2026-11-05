import { filterRows, getRow } from '../../domain';
import type { EntityRow, QueryContext } from '../../domain';
import { domainColumns } from './columns';
import { sumCents, text } from './formatting';
import { DEMO_NOTICE, KIND_LABELS, summaryColumns, UNITS } from './labels';
import type { DocumentAggregate, DocumentRequest, DocumentSnapshot } from './types';

function groupRecords(records: readonly Readonly<EntityRow>[]): readonly DocumentAggregate[] {
  const groups = new Map<string, DocumentAggregate>();
  records.forEach((row) => {
    const key = row.ref.kind + ':' + row.status;
    const previous = groups.get(key) || {
      kind: row.ref.kind,
      label: row.status,
      unit: UNITS[row.ref.kind],
      count: 0,
      amountCents: 0,
      receivedCents: 0,
    };
    groups.set(key, {
      ...previous,
      count: previous.count + 1,
      amountCents: sumCents(previous.amountCents, row.amountCents),
      receivedCents: sumCents(previous.receivedCents, row.receivedCents),
    });
  });
  return Object.freeze(
    [...groups.values()]
      .sort((a, b) =>
        (KIND_LABELS[a.kind] + a.label).localeCompare(KIND_LABELS[b.kind] + b.label, 'pt-BR')
      )
      .map((group) => Object.freeze(group))
  );
}
function freezeRow(row: EntityRow, context: QueryContext): Readonly<EntityRow> {
  const copy = structuredClone(row);
  copy.links = copy.links.filter((ref) => getRow(ref, context) !== null);
  Object.freeze(copy.ref);
  Object.freeze(copy.values);
  Object.freeze(copy.alerts);
  copy.links.forEach(Object.freeze);
  Object.freeze(copy.links);
  copy.history.forEach(Object.freeze);
  Object.freeze(copy.history);
  if (copy.provenance) Object.freeze(copy.provenance);
  return Object.freeze(copy);
}
const FILTER_LABELS: Record<keyof QueryContext['filters'], string> = {
  from: 'Início',
  to: 'Fim',
  exercise: 'Exercício',
  personType: 'Tipo de pessoa',
  debtType: 'Tipo de débito',
  status: 'Estado do domínio',
  stage: 'Etapa',
  owner: 'Responsável',
  sector: 'Setor',
  campaign: 'Campanha',
  agreement: 'Acordo',
  activeDebt: 'Dívida Ativa',
  protest: 'Protesto',
  amountBand: 'Faixa de valor',
  ageBand: 'Antiguidade',
  priority: 'Prioridade',
  category: 'Categoria',
  region: 'Regional/UF (pendente)',
};
/** Reaplica o mesmo contexto sem ampliar o recorte recebido nem usar a página visual. */
export function buildDocumentSnapshot(request: DocumentRequest): DocumentSnapshot {
  const parsedBase = new Date(request.dataBase);
  if (Number.isNaN(parsedBase.getTime())) throw new Error('A data-base da fonte não é válida.');
  const requestedContext: QueryContext = {
    filters: { ...request.context.filters },
    session: { ...request.context.session },
    search: request.search === undefined ? request.context.search : request.search.trim(),
  };
  const authorized = filterRows(request.records, requestedContext);
  const unique = new Map<string, EntityRow>();
  authorized.forEach((row) => {
    unique.set(row.ref.kind + ':' + row.ref.id, row);
  });
  const records = Object.freeze([...unique.values()].map((row) => freezeRow(row, requestedContext)));
  const kinds = Object.freeze([...new Set(records.map((row) => row.ref.kind))]);
  if (request.mode === 'detailed' && kinds.length > 1)
    throw new Error(
      'Seleções de domínios diferentes permitem somente resumo gerencial. Escolha um relatório específico para detalhar.'
    );
  const context = Object.freeze({
    ...requestedContext,
    filters: Object.freeze(requestedContext.filters),
    session: Object.freeze(requestedContext.session),
  });
  const filterLabels = Object.freeze(
    Object.entries(context.filters)
      .filter(([, value]) => !!value && value !== 'all')
      .map(([key, value]) => FILTER_LABELS[key as keyof QueryContext['filters']] + ': ' + value)
  );
  // Não soma domínios diferentes: os mesmos débitos podem estar vinculados a vários processos.
  const totals = Object.freeze(
    records.reduce(
      (result, row) => ({
        count: result.count + 1,
        amountCents: kinds.length === 1 ? sumCents(result.amountCents, row.amountCents) : 0,
        receivedCents: kinds.length === 1 ? sumCents(result.receivedCents, row.receivedCents) : 0,
      }),
      { count: 0, amountCents: 0, receivedCents: 0 }
    )
  );
  const columns = kinds.length === 1 ? domainColumns(kinds[0]) : [];
  const rows = Object.freeze(
    records.map((row) => Object.freeze(columns.map((column) => text(column.value(row)))))
  );
  return Object.freeze({
    title: text(request.title.trim() || 'Relatório de consulta'),
    mode: request.mode,
    scope: text(request.scope?.trim() || 'Recorte autorizado da consulta'),
    search: text(context.search || ''),
    generatedAt: new Date().toISOString(),
    dataBase: parsedBase.toISOString(),
    context,
    filterLabels,
    records,
    kinds,
    unit: kinds.length === 1 ? UNITS[kinds[0]] : 'registros por domínio',
    selectedFields:
      request.mode === 'summary'
        ? summaryColumns
        : Object.freeze(
            columns.map(({ label, width, numeric }) => Object.freeze({ label, width, numeric }))
          ),
    rows,
    totals,
    aggregates: Object.freeze({ byStatus: groupRecords(records) }),
    sourceNotice: DEMO_NOTICE,
    authorizationNotice:
      'Perfil demonstrativo: ' +
      context.session.profile +
      ' | Setor: ' +
      context.session.sector +
      ' | Usuário: ' +
      context.session.userId,
  });
}
