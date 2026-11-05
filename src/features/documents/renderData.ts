import { amount, dateTime, integer } from './formatting';
import { AMOUNT_LABELS, KIND_LABELS } from './labels';
import type { DocumentAggregate, DocumentSnapshot } from './types';

export function headerMetadata(snapshot: DocumentSnapshot): string[] {
  const kind = snapshot.kinds.length === 1 ? snapshot.kinds[0] : null;
  const totals =
    integer(snapshot.totals.count) +
    ' ' +
    snapshot.unit +
    (kind === 'demand'
      ? ' | Unidade operacional; valores financeiros não se aplicam'
      : kind
      ? ' | ' +
        AMOUNT_LABELS[kind] +
        ': ' +
        amount(snapshot.totals.amountCents) +
        ' | Recebido/confirmado: ' +
        amount(snapshot.totals.receivedCents)
      : ' | Valores discriminados por domínio; sem soma entre processos');
  return [
    (snapshot.mode === 'summary' ? 'Resumo gerencial' : 'Documento de consulta') +
      ' | Recorte: ' +
      snapshot.scope,
    'Filtros: ' +
      (snapshot.filterLabels.join(' | ') || 'Sem filtros adicionais') +
      ' | Busca: ' +
      (snapshot.search || 'Sem busca adicional'),
    'Data-base da demonstração: ' +
      dateTime.format(new Date(snapshot.dataBase)) +
      ' | Gerado em: ' +
      dateTime.format(new Date(snapshot.generatedAt)) +
      ' (Brasília)',
    snapshot.authorizationNotice + ' | Fonte: Demonstração local (regras oficiais pendentes)',
    totals,
  ];
}
export function aggregateRows(groups: readonly DocumentAggregate[]): string[][] {
  return groups.map((group) => [
    KIND_LABELS[group.kind] + '\n' + group.label,
    integer(group.count) + ' ' + group.unit,
    group.kind === 'demand' ? 'Não se aplica' : amount(group.amountCents),
    group.kind === 'demand' ? 'Não se aplica' : amount(group.receivedCents),
  ]);
}
