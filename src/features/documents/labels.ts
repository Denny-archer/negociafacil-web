import type { EntityKind } from '../../domain';
import type { DocumentColumn } from './types';

export const DEMO_NOTICE =
  'Dados demonstrativos; sem conexão com SISCAF/CRA21. Não é documento oficial.';
export const SUMMARY_VALUE_NOTE =
  '¹ Débito/cobrança/campanha/DA: saldo; acordo: valor negociado; protesto: título; pagamento: informado. Demandas não têm valor financeiro. Não somar processos vinculados.';
export const KIND_LABELS: Record<EntityKind, string> = {
  person: 'Pessoas / empresas',
  debt: 'Débitos',
  collection: 'Casos de cobrança',
  campaign: 'Campanhas',
  agreement: 'Acordos',
  activeDebt: 'Inscrições em Dívida Ativa',
  protest: 'Títulos de protesto',
  payment: 'Pagamentos',
  demand: 'Demandas',
};
export const UNITS: Record<EntityKind, string> = {
  person: 'pessoas/empresas',
  debt: 'débitos',
  collection: 'casos de cobrança',
  campaign: 'campanhas',
  agreement: 'acordos',
  activeDebt: 'inscrições em DA',
  protest: 'títulos',
  payment: 'pagamentos',
  demand: 'demandas',
};
export const AMOUNT_LABELS: Record<EntityKind, string> = {
  person: 'Saldo vinculado',
  debt: 'Saldo em aberto',
  collection: 'Saldo vinculado',
  campaign: 'Saldo vinculado',
  agreement: 'Valor negociado',
  activeDebt: 'Saldo dos débitos vinculados',
  protest: 'Valor do título',
  payment: 'Valor informado',
  demand: 'Valor vinculado',
};
export const summaryColumns: readonly DocumentColumn[] = Object.freeze(
  [
    { label: 'Domínio / estado', width: 105 },
    { label: 'Quantidade / unidade', width: 48, numeric: true },
    { label: 'Valor da seleção (R$)¹', width: 60, numeric: true },
    { label: 'Recebido / confirmado (R$)¹', width: 60, numeric: true },
  ].map((column) => Object.freeze(column))
);
