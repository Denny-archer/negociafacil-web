import { money, number } from '../../domain';
import type { EntityKind, EntityRow } from '../../domain';

export { money, number };

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
export function date(value: string | number | null | undefined) {
  if (!value) return 'Não informado';
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : dateFormatter.format(parsed);
}
export function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
export function value(row: EntityRow, ...keys: string[]): string | number | null {
  for (const key of keys) {
    if (row.values[key] != null && row.values[key] !== '') return row.values[key];
  }
  return null;
}
export function display(valueToShow: string | number | null | undefined) {
  return valueToShow == null || valueToShow === '' ? 'Não informado' : String(valueToShow);
}
export const entityLabels: Record<EntityKind, string> = {
  person: 'Pessoa',
  debt: 'Débito',
  collection: 'Cobrança',
  campaign: 'Campanha',
  agreement: 'Acordo',
  activeDebt: 'Dívida Ativa',
  protest: 'Título de protesto',
  payment: 'Pagamento',
  demand: 'Demanda',
};

const booleanFields = new Set([
  'firstInstallmentPaid',
  'firstInstallmentOverdue',
  'financialRegularized',
  'cartorialRegularized',
  'attributionReliable',
  'proofIsConfirmation',
]);
export function detailValue(key: string, field: string | number | null) {
  if (field == null) return 'Não informado';
  if (booleanFields.has(key)) return field === 1 ? 'Sim' : field === 0 ? 'Não' : display(field);
  if (typeof field === 'number' && /Cents$/.test(key)) return money(field);
  if (typeof field === 'string' && /^\d{4}-\d{2}-\d{2}/.test(field)) return date(field);
  if (key === 'conversionRate' && typeof field === 'number')
    return `${field.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return display(field);
}
