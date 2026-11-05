import type { EntityKind, EntityRow } from '../../domain';
import { amount, dateTime, displayDate, integer, text } from './formatting';
import { AMOUNT_LABELS, KIND_LABELS } from './labels';
import type { RowColumn } from './types';

function identity(row: EntityRow): string {
  return text(
    [
      row.title,
      row.subtitle,
      'ID: ' + row.ref.id,
      row.provenance
        ? 'Origem: ' + row.provenance.system + ' / ' + row.provenance.sourceId
        : 'Origem não informada',
    ]
      .filter(Boolean)
      .join('\n')
  );
}
function state(row: EntityRow): string {
  return text(
    [
      row.status,
      row.stage ? 'Etapa: ' + row.stage : '',
      row.statusRaw ? 'Código original: ' + row.statusRaw : '',
    ]
      .filter(Boolean)
      .join('\n')
  );
}
function action(row: EntityRow): string {
  return text(
    [
      row.owner || 'Sem responsável',
      row.sector || '',
      row.nextAction ? 'Próxima ação: ' + row.nextAction : 'Sem próxima ação',
    ]
      .filter(Boolean)
      .join('\n')
  );
}
const VALUE_LABELS: Record<string, string> = {
  ownerId: 'ID do responsável',
  region: 'Regional/UF (pendente de validação)',
  registrationStatus: 'Situação cadastral',
  deadlineSource: 'Origem do prazo',
  closedAt: 'Encerrado em',
  exercises: 'Exercícios dos débitos',
  debtType: 'Tipo de débito',
  debtIds: 'IDs dos débitos',
  dueDate: 'Vencimento financeiro',
  originalAmountCents: 'Valor original',
  openAmountCents: 'Saldo em aberto',
  agreementStatuses: 'Estados dos acordos vinculados',
  activeDebtStatuses: 'Estados de DA vinculada',
  protestStatuses: 'Estados dos títulos vinculados',
  registrationCount: 'Quantidade de registros',
  registrations: 'Registros',
  campaignId: 'ID da campanha',
  campaignName: 'Campanha',
  noticeSentAt: 'Notificação enviada em',
  noticeDeadline: 'Prazo da notificação',
  suspendedReason: 'Motivo da suspensão',
  initialPeople: 'Pessoas na população inicial',
  initialAmountCents: 'Valor inicial',
  reachedPeople: 'Pessoas alcançadas',
  negotiatedPeople: 'Pessoas que negociaram',
  paidPeople: 'Pessoas que pagaram',
  remainingPeople: 'Pessoas ainda inadimplentes',
  recoveredCents: 'Valor recuperado',
  remainingCents: 'Saldo remanescente',
  conversionRate: 'Conversão',
  startedAt: 'Início',
  endedAt: 'Fim',
  initialPopulationSource: 'Origem da população inicial',
  attributionRule: 'Regra de atribuição',
  negotiatedAmountCents: 'Valor negociado',
  outstandingCents: 'Saldo das parcelas',
  formalizedAt: 'Formalizado em',
  firstInstallmentDue: 'Vencimento da primeira parcela',
  firstInstallmentStatus: 'Situação da primeira parcela',
  firstInstallmentPaid: 'Primeira parcela paga',
  firstInstallmentOverdue: 'Primeira parcela vencida sem pagamento',
  installmentCount: 'Quantidade de parcelas',
  installmentSchedule: 'Parcelas: vencimento, valor e pagamento',
  installmentsPaid: 'Parcelas pagas',
  installmentsOverdue: 'Parcelas vencidas',
  previousAgreementId: 'ID do acordo anterior',
  renegotiationCount: 'Renegociações',
  eligibleAmountCents: 'Valor elegível',
  inscriptionBatchId: 'Lote de inscrição',
  termNumber: 'Número do termo',
  termGeneratedAt: 'Termo gerado em',
  termSentAt: 'Termo enviado em',
  cdaNumber: 'Número da CDA',
  cdaGeneratedAt: 'CDA gerada em',
  cdaSentAt: 'CDA enviada em',
  cdaUpdatedAt: 'CDA atualizada em',
  cancelledAt: 'Cancelado em',
  notifiedAt: 'Notificado em',
  subsequentMeasures: 'Medidas posteriores',
  impediment: 'Impedimento',
  documentEvidence: 'Evidências dos documentos',
  titleNumber: 'Número do título',
  cartorio: 'Cartório',
  protocol: 'Protocolo',
  remittanceStatus: 'Estado da remessa',
  returnStatus: 'Resultado do retorno',
  remittanceDate: 'Remessa em',
  confirmationDate: 'Confirmação em',
  movementCode: 'Código do andamento',
  movementDescription: 'Andamento',
  movementDate: 'Data do andamento',
  returnDate: 'Retorno em',
  returnReason: 'Motivo do retorno',
  cartorialDeadline: 'Prazo cartorial oficial/demo',
  cartorialDeadlineSource: 'Origem do prazo cartorial',
  daysRemaining: 'Dias restantes do prazo fornecido',
  financialRegularized: 'Regularização financeira concluída',
  cartorialRegularized: 'Regularização cartorial concluída',
  consentIssuedAt: 'Anuência emitida em',
  consentSentAt: 'Anuência enviada em',
  informedAt: 'Pagamento informado em',
  recognizedAt: 'Reconhecido em',
  settlementAt: 'Compensado em',
  postingAt: 'Baixa em',
  financialStatus: 'Estado financeiro',
  postingStatus: 'Estado da baixa',
  paymentMethod: 'Meio de pagamento',
  exception: 'Exceção de conciliação',
  strategy: 'Origem da recuperação (quando rastreável)',
  attributionReliable: 'Atribuição rastreável',
  seriesMonth: 'Mês de referência do evento',
  proofIsConfirmation: 'Comprovante confirma pagamento',
  agreementId: 'ID do acordo',
  installmentId: 'ID da parcela',
  activeDebtId: 'ID da inscrição em DA',
  protestId: 'ID do título de protesto',
  subject: 'Assunto',
  description: 'Descrição',
  actionPerformed: 'Ação realizada',
  result: 'Resultado',
  closureReason: 'Motivo do encerramento',
  waitReason: 'Justificativa de espera',
  evidence: 'Evidência/protocolo',
};
const BOOLEAN_VALUES = new Set([
  'firstInstallmentPaid',
  'firstInstallmentOverdue',
  'financialRegularized',
  'cartorialRegularized',
  'attributionReliable',
  'proofIsConfirmation',
]);
const DETAIL_FIELDS: Record<EntityKind, string[]> = {
  person: ['registrations', 'registrationCount', 'registrationStatus'],
  debt: ['debtType', 'dueDate', 'originalAmountCents', 'openAmountCents', 'deadlineSource'],
  collection: ['campaignName', 'noticeSentAt', 'noticeDeadline', 'suspendedReason', 'deadlineSource'],
  campaign: [
    'initialPeople',
    'initialAmountCents',
    'reachedPeople',
    'negotiatedPeople',
    'paidPeople',
    'remainingPeople',
    'recoveredCents',
    'remainingCents',
    'conversionRate',
    'startedAt',
    'endedAt',
    'initialPopulationSource',
    'attributionRule',
  ],
  agreement: [
    'negotiatedAmountCents',
    'outstandingCents',
    'formalizedAt',
    'firstInstallmentStatus',
    'firstInstallmentDue',
    'firstInstallmentPaid',
    'firstInstallmentOverdue',
    'installmentCount',
    'installmentsPaid',
    'installmentsOverdue',
    'renegotiationCount',
    'installmentSchedule',
  ],
  activeDebt: [
    'eligibleAmountCents',
    'inscriptionBatchId',
    'termNumber',
    'termGeneratedAt',
    'termSentAt',
    'cdaNumber',
    'cdaGeneratedAt',
    'cdaSentAt',
    'cdaUpdatedAt',
    'cancelledAt',
    'notifiedAt',
    'subsequentMeasures',
    'impediment',
    'documentEvidence',
    'deadlineSource',
  ],
  protest: [
    'titleNumber',
    'cdaNumber',
    'cartorio',
    'protocol',
    'remittanceStatus',
    'returnStatus',
    'remittanceDate',
    'confirmationDate',
    'movementCode',
    'movementDescription',
    'movementDate',
    'returnDate',
    'returnReason',
    'cartorialDeadline',
    'cartorialDeadlineSource',
    'financialRegularized',
    'cartorialRegularized',
    'consentIssuedAt',
    'consentSentAt',
  ],
  payment: [
    'informedAt',
    'recognizedAt',
    'settlementAt',
    'postingAt',
    'financialStatus',
    'postingStatus',
    'paymentMethod',
    'exception',
    'strategy',
    'attributionReliable',
  ],
  demand: [
    'subject',
    'description',
    'actionPerformed',
    'result',
    'waitReason',
    'closedAt',
    'closureReason',
    'evidence',
    'deadlineSource',
  ],
};
/** Templates documentais próprios; não despeja os campos internos da base. */
function details(row: EntityRow): string {
  const introduction =
    row.ref.kind === 'person'
      ? 'Tipo: ' +
        (row.personType || 'Não informado') +
        '\nCategoria: ' +
        (row.category || 'Não informada') +
        '\n'
      : row.ref.kind === 'demand'
      ? 'Categoria: ' + (row.category || 'Não informada') + '\n'
      : '';
  return (
    introduction +
      DETAIL_FIELDS[row.ref.kind]
        .filter((key) => key in row.values)
        .map((key) => {
          const value = row.values[key];
          const label =
            VALUE_LABELS[key] ||
            key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
          let displayed = value === null || value === '' ? 'Não informado' : String(value);
          if (typeof value === 'number')
            displayed = /Cents$/i.test(key)
              ? amount(value)
              : BOOLEAN_VALUES.has(key)
              ? value === 1
                ? 'Sim'
                : 'Não'
              : key === 'conversionRate'
              ? value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
              : integer(value);
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) {
            const parsed = new Date(value);
            displayed =
              value.length === 10
                ? displayDate(value)
                : Number.isNaN(parsed.getTime())
                ? value
                : dateTime.format(parsed);
          }
          return text(label + ': ' + displayed);
        })
        .join('\n') || 'Sem informação adicional'
  );
}
function links(row: EntityRow): string {
  if (row.ref.kind === 'campaign') {
    const groups = new Map<EntityKind, Set<string>>();
    row.links.forEach((ref) => {
      const group = groups.get(ref.kind) || new Set<string>();
      group.add(ref.id);
      groups.set(ref.kind, group);
    });
    return (
      [...groups]
        .map(([kind, identifiers]) => KIND_LABELS[kind] + ': ' + integer(identifiers.size))
        .join('\n') || 'Sem vínculo autorizado'
    );
  }
  return (
    row.links.map((ref) => KIND_LABELS[ref.kind] + ': ' + ref.id).join('\n') || 'Sem vínculo informado'
  );
}
function dateFields(row: EntityRow): string {
  return (
    'Prazo/evento: ' + displayDate(row.deadline) + '\nÚltimo movimento: ' + displayDate(row.lastMovement)
  );
}
export function domainColumns(kind: EntityKind): readonly RowColumn[] {
  if (kind === 'demand')
    return [
      { label: 'Demanda / pessoa / ID', width: 39, value: identity },
      {
        label: 'Estado / etapa / prioridade',
        width: 34,
        value: (row) => state(row) + '\nPrioridade: ' + (row.priority || 'Não informada'),
      },
      {
        label: 'Responsável / setor',
        width: 26,
        value: (row) =>
          text((row.owner || 'Sem responsável') + '\n' + (row.sector || 'Setor não informado')),
      },
      {
        label: 'Próxima ação',
        width: 36,
        value: (row) => text(row.nextAction || 'Não informada; conferir justificativa de espera'),
      },
      {
        label: 'Prazo / alertas',
        width: 34,
        value: (row) => dateFields(row) + '\nAlertas: ' + (row.alerts.join('; ') || 'Sem alertas'),
      },
      { label: 'Ação / resultado / espera / encerramento', width: 72, value: details },
      { label: 'Vínculos oficiais (demo)', width: 32, value: links },
    ];
  if (kind === 'person')
    return [
      { label: 'Pessoa / empresa / identificadores', width: 58, value: identity },
      { label: 'Estado cadastral', width: 38, value: state },
      { label: 'Tipo / categoria / registros', width: 77, value: details },
      { label: 'Vínculos da consulta', width: 65, value: links },
      { label: 'Último movimento', width: 35, value: (row) => displayDate(row.lastMovement) },
    ];
  const specific: Record<Exclude<EntityKind, 'person' | 'demand'>, string> = {
    debt: 'Exercício / tipo / vencimento / vínculos',
    collection: 'Campanha / notificação / envio / andamento',
    campaign: 'População / alcance / conversão / resultados',
    agreement: 'Formalização / primeira parcela / parcelas',
    activeDebt: 'Inscrição / termo / CDA / geração / envio',
    protest: 'Título / protocolo / cartório / remessa / retorno',
    payment: 'Origem / meio / conciliação / baixa',
  };
  return [
    { label: KIND_LABELS[kind] + ' / pessoa / ID', width: 40, value: identity },
    { label: 'Estado / etapa', width: 29, value: state },
    {
      label: AMOUNT_LABELS[kind] + ' (R$)',
      width: 25,
      numeric: true,
      value: (row) => amount(row.amountCents),
    },
    {
      label: kind === 'payment' ? 'Valor confirmado (R$)' : 'Recebido confirmado (R$)',
      width: 25,
      numeric: true,
      value: (row) => amount(row.receivedCents),
    },
    { label: 'Responsável / próxima ação', width: 39, value: action },
    { label: 'Prazo / última movimentação', width: 29, value: dateFields },
    { label: specific[kind], width: 62, value: details },
    {
      label: kind === 'campaign' ? 'Vínculos autorizados (quantidade)' : 'Vínculos',
      width: 24,
      value: links,
    },
  ];
}
