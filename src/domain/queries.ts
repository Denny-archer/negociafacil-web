import { fixtures, owners, sectors } from './fixtures';
import { allRows, dateBase, entityKinds, normalize, present, stagesPerKind, statusByKind, statusesPerKind, sum } from './rows';
import type { Catalogs, EntityKind, EntityRef, EntityRow, QueryContext } from './types';

function compatibleMatch(value: string, actual: string | null | undefined, alternate: string | undefined, kind: EntityKind, catalogs: Record<EntityKind, Set<string>>): boolean {
  if (!present(value)) return true;
  if (catalogs[kind].has(value)) return actual === value || alternate === value;
  // Um status de acordo não substitui o status financeiro do recebimento vinculado.
  return entityKinds.some(otherKind => catalogs[otherKind].has(value));
}

function authorized(row: EntityRow, context: QueryContext): boolean {
  const canonical = allRows[row.ref.kind]?.find(item => item.ref.id === row.ref.id);
  if (!canonical) return false;
  if (context.session.profile === 'Chefia' || context.session.profile === 'Gestão') return true;
  if (context.session.profile !== 'Equipe') return false;
  if (row.ref.kind === 'person') return Object.values(allRows).flat().some(item => item.personId === canonical.personId && item.sector === context.session.sector);
  return canonical.sector === context.session.sector;
}
function relationshipMatches(row: EntityRow, kind: 'agreement' | 'activeDebt' | 'protest', value: string): boolean {
  if (!present(value)) return true;
  const refs = row.ref.kind === kind ? [row.ref] : row.links.filter(ref => ref.kind === kind);
  if (['with', 'yes', 'Sim', 'com'].includes(value)) return refs.length > 0;
  if (['without', 'no', 'Não', 'sem'].includes(value)) return refs.length === 0;
  return refs.some(ref => ref.id === value || allRows[kind].some(item => item.ref.id === ref.id && item.status === value));
}

/** Reaplica escopo de perfil e filtros; nunca confia em uma lista recebida da UI. */
export function filterRows(rows: EntityRow[], context: QueryContext): EntityRow[] {
  const f = context.filters;
  const needle = normalize(context.search?.trim() ?? '');
  return rows.filter(row => {
    if (!authorized(row, context)) return false;
    const day = row.eventDate.slice(0, 10);
    if (f.from && day < f.from || f.to && day > f.to) return false;
    if (present(f.exercise) && String(row.exercise) !== f.exercise && !String(row.values.exercises ?? '').split(', ').includes(f.exercise)) return false;
    if (present(f.personType) && row.personType !== f.personType && !(row.ref.kind === 'campaign' && String(row.values.personTypes ?? '').split(', ').includes(f.personType))) return false;
    if (present(f.debtType) && !String(row.values.debtType ?? '').split(', ').includes(f.debtType)) return false;
    if (!compatibleMatch(f.status, row.status, row.statusRaw, row.ref.kind, statusesPerKind)) return false;
    if (!compatibleMatch(f.stage, row.stage, undefined, row.ref.kind, stagesPerKind)) return false;
    if (present(f.owner) && row.values.ownerId !== f.owner && row.owner !== f.owner) return false;
    if (present(f.sector) && row.sector !== f.sector) return false;
    if (present(f.campaign) && !(row.ref.kind === 'campaign' && row.ref.id === f.campaign) && row.values.campaignId !== f.campaign && !row.links.some(ref => ref.kind === 'campaign' && ref.id === f.campaign)) return false;
    if (!relationshipMatches(row, 'agreement', f.agreement) || !relationshipMatches(row, 'activeDebt', f.activeDebt) || !relationshipMatches(row, 'protest', f.protest)) return false;
    if (present(f.priority) && row.priority !== f.priority) return false;
    if (present(f.category) && row.category !== f.category && !(row.ref.kind === 'campaign' && String(row.values.categories ?? '').split(', ').includes(f.category))) return false;
    if (present(f.region) && !String(row.values.region ?? '').split(', ').includes(f.region)) return false;
    // Faixas permanecem indisponíveis até receber a parametrização homologada.
    if (present(f.amountBand) && row.values.amountBand !== f.amountBand || present(f.ageBand) && row.values.ageBand !== f.ageBand) return false;
    return !needle || normalize([row.ref.id, row.title, row.subtitle, row.status, row.stage, row.owner, row.sector, row.category, row.priority, row.nextAction, ...Object.values(row.values)].join(' ')).includes(needle);
  });
}
function campaignRows(context: QueryContext): EntityRow[] {
  return filterRows(allRows.campaign, context).map(campaign => {
    // Status/etapa/responsável pertencem à campanha. Demografia e débito segmentam sua coorte.
    const cohortContext: QueryContext = { ...context, search: undefined, filters: { ...context.filters, from: '', to: '', status: 'all', stage: 'all', owner: 'all', sector: 'all', priority: 'all', campaign: campaign.ref.id } };
    const selectedDebts = filterRows(allRows.debt, cohortContext);
    const selectedIds = new Set(selectedDebts.map(row => row.ref.id));
    const participants = fixtures.participations.filter(item => item.campaignId === campaign.ref.id && item.debtIds.some(id => selectedIds.has(id)));
    const paymentIds = new Set(participants.flatMap(item => item.paymentIds));
    const paymentContext: QueryContext = { ...cohortContext, filters: { ...cohortContext.filters, from: context.filters.from, to: context.filters.to } };
    const payments = filterRows(allRows.payment, paymentContext).filter(row => paymentIds.has(row.ref.id) && row.values.attributionReliable === 1);
    const initialPeople = new Set(participants.map(item => item.personId)).size;
    const paidPeople = new Set(payments.filter(row => row.receivedCents > 0).map(row => row.personId)).size;
    const remainingPeople = new Set(selectedDebts.filter(row => row.amountCents > 0 && String(row.values.dueDate) < dateBase && !row.status.startsWith('Suspenso')).map(row => row.personId)).size;
    const amountCents = sum(selectedDebts, 'amountCents');
    const receivedCents = sum(payments, 'receivedCents');
    return { ...campaign, amountCents, receivedCents, values: { ...campaign.values, initialPeople, initialAmountCents: selectedDebts.reduce((total, row) => total + Number(row.values.originalAmountCents), 0), reachedPeople: participants.filter(item => item.contacted).length, negotiatedPeople: new Set(participants.filter(item => item.agreementIds.length).map(item => item.personId)).size, paidPeople, remainingPeople, recoveredCents: receivedCents, remainingCents: amountCents, conversionRate: initialPeople ? paidPeople / initialPeople * 100 : 0, cohortScope: 'Coorte segmentada por filtros demográficos/de débito e perfil; período da campanha é início, recebimentos usam reconhecimento.' } };
  });
}
export function queryRows(kind: EntityKind, context: QueryContext): EntityRow[] { return kind === 'campaign' ? campaignRows(context) : filterRows(allRows[kind], context); }
/** Detalhes relacionados respeitam autorização, independentemente do recorte visual da lista de origem. */
export function getRow(ref: EntityRef, context: QueryContext): EntityRow | null { return allRows[ref.kind]?.find(row => row.ref.id === ref.id && authorized(row, context)) ?? null; }

export function getCatalogs(context: QueryContext): Catalogs {
  const visible = Object.values(allRows).flat().filter(row => authorized(row, context));
  const options = (values: (string | number | null)[]) => [{ value: 'all', label: 'Todos' }, ...[...new Set(values.filter(value => value !== null && value !== '').map(String))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(value => ({ value, label: value }))];
  const catalogs: Catalogs = { personType: options(['PF', 'PJ']), exercise: options(visible.map(row => row.exercise)), debtType: options(fixtures.debts.map(debt => debt.debtType)), status: options(visible.map(row => row.status)), stage: options(visible.map(row => row.stage)), owner: [{ value: 'all', label: 'Todos' }, ...owners.filter(owner => visible.some(row => row.values.ownerId === owner.id)).map(owner => ({ value: owner.id, label: owner.name }))], sector: options(context.session.profile === 'Equipe' ? [context.session.sector] : sectors), campaign: [{ value: 'all', label: 'Todas' }, ...allRows.campaign.filter(row => authorized(row, context)).map(row => ({ value: row.ref.id, label: row.title }))], agreement: [{ value: 'all', label: 'Todos' }, { value: 'with', label: 'Com acordo' }, { value: 'without', label: 'Sem acordo' }, ...statusByKind.agreement], activeDebt: [{ value: 'all', label: 'Todas' }, { value: 'with', label: 'Com Dívida Ativa' }, { value: 'without', label: 'Sem Dívida Ativa' }, ...statusByKind.activeDebt], protest: [{ value: 'all', label: 'Todos' }, { value: 'with', label: 'Com protesto' }, { value: 'without', label: 'Sem protesto' }, ...statusByKind.protest], priority: options(['Normal', 'Alta', 'Urgente-Crítica']), category: options(visible.map(row => row.category)), region: options(visible.map(row => row.values.region ?? null)), amountBand: [{ value: 'all', label: 'Pendente de homologação' }], ageBand: [{ value: 'all', label: 'Pendente de homologação' }] };
  entityKinds.forEach(kind => { catalogs[`status_${kind}`] = options(allRows[kind].filter(row => authorized(row, context)).map(row => row.status)); });
  return catalogs;
}
