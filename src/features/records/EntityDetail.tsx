import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  FileText,
  History,
  Link2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { defaultFilters, filterRows, getRow } from '../../domain';
import type { EntityRow, QueryContext } from '../../domain';
import { DocumentActions } from '../../components/DocumentActions';
import type { OpenEntity } from '../workspace/contracts';
import { Alerts, Chip } from './StatusIndicators';
import { date, detailValue, display, entityLabels, money } from './formatting';

type DetailTab = 'data' | 'links' | 'history';

const valueLabels: Record<string, string> = {
  dueDate: 'Vencimento original do débito',
  debtType: 'Tipo de débito',
  originalAmountCents: 'Valor original',
  openAmountCents: 'Saldo em aberto',
  amountBand: 'Faixa de valor',
  ageBand: 'Antiguidade',
  campaignName: 'Campanha',
  campaignId: 'Identificador da campanha',
  noticeSentAt: 'Notificação enviada em',
  noticeDeadline: 'Prazo da notificação',
  suspendedReason: 'Motivo da suspensão',
  initialPeople: 'População inicial',
  initialAmountCents: 'Valor inicial',
  reachedPeople: 'Profissionais alcançados',
  negotiatedPeople: 'Profissionais que negociaram',
  paidPeople: 'Profissionais que pagaram',
  remainingPeople: 'Permanecem inadimplentes',
  recoveredCents: 'Valor efetivamente recuperado',
  remainingCents: 'Saldo remanescente',
  conversionRate: 'Taxa de conversão',
  startedAt: 'Início',
  endedAt: 'Encerramento',
  firstInstallmentStatus: 'Situação da primeira parcela',
  firstInstallmentDue: 'Vencimento da primeira parcela',
  renegotiationCount: 'Quantidade de renegociações',
  installments: 'Parcelas do acordo',
  formalizedAt: 'Formalização',
  negotiatedAmountCents: 'Valor negociado',
  eligibleAmountCents: 'Valor elegível',
  inscriptionBatchId: 'Lote de inscrição',
  notifiedAt: 'Envio da notificação',
  termGeneratedAt: 'Termo gerado',
  termSentAt: 'Termo enviado',
  cdaGeneratedAt: 'CDA gerada',
  subsequentMeasures: 'Medidas subsequentes',
  impediment: 'Impedimento',
  titleNumber: 'CDA / título',
  cartorio: 'Cartório',
  protocol: 'Protocolo',
  remittanceDate: 'Data da remessa',
  confirmationDate: 'Data da confirmação',
  remittanceStatus: 'Situação da remessa',
  returnStatus: 'Resultado do retorno',
  movementCode: 'Código do andamento',
  movementDescription: 'Andamento atual',
  movementDate: 'Último andamento',
  returnDate: 'Data do retorno',
  returnReason: 'Motivo da devolução',
  cartorialDeadline: 'Prazo cartorial',
  cartorialDeadlineSource: 'Origem do prazo cartorial',
  financialRegularized: 'Regularização financeira',
  cartorialRegularized: 'Regularização cartorial',
  consentIssuedAt: 'Carta de Anuência emitida',
  consentSentAt: 'Carta de Anuência enviada',
  financialStatus: 'Situação financeira',
  postingStatus: 'Situação da baixa',
  recognizedAt: 'Reconhecido em',
  settlementAt: 'Compensado em',
  postingAt: 'Baixa realizada em',
  method: 'Meio de pagamento',
  exception: 'Exceção',
  strategy: 'Origem / estratégia',
  attributionReliable: 'Atribuição validada',
  actionPerformed: 'Ação realizada',
  result: 'Resultado',
  waitReason: 'Justificativa de espera',
  evidence: 'Evidência / protocolo',
  closedAt: 'Data de encerramento',
  closureReason: 'Motivo do encerramento',
  description: 'Descrição / assunto',
  ownerId: 'Identificador do responsável',
  deadlineSource: 'Origem do prazo',
  originalStatus: 'Status de origem',
  sei: 'Processo SEI',
  source: 'Fonte',
  outstandingCents: 'Saldo das parcelas',
  firstInstallmentPaid: 'Primeira parcela paga',
  firstInstallmentOverdue: 'Primeira parcela vencida sem pagamento',
  installmentCount: 'Quantidade de parcelas',
  installmentSchedule: 'Parcelas do acordo',
  installmentsPaid: 'Parcelas pagas',
  installmentsOverdue: 'Parcelas vencidas',
  previousAgreementId: 'Acordo anterior',
  termNumber: 'Número do termo',
  cdaNumber: 'Número da CDA',
  cdaSentAt: 'CDA enviada',
  cdaUpdatedAt: 'CDA atualizada',
  cancelledAt: 'Cancelamento',
  documentEvidence: 'Documentos e evidências',
  daysRemaining: 'Dias restantes no prazo cartorial',
  paymentMethod: 'Meio de pagamento',
  informedAt: 'Informado em',
  proofIsConfirmation: 'Comprovante confirma o recebimento',
  initialPopulationSource: 'Origem da população inicial',
  attributionRule: 'Regra de atribuição dos resultados',
  agreementId: 'Acordo vinculado',
  installmentId: 'Parcela vinculada',
  activeDebtId: 'Inscrição em Dívida Ativa vinculada',
  protestId: 'Título de protesto vinculado',
  region: 'Regional / UF',
  registrationStatus: 'Situação cadastral',
  seriesMonth: 'Mês de referência',
  agreementStatuses: 'Situações dos acordos vinculados',
  activeDebtStatuses: 'Situações em Dívida Ativa',
  protestStatuses: 'Situações dos protestos vinculados',
  subject: 'Assunto',
  registrations: 'Registros profissionais',
  registrationCount: 'Quantidade de registros profissionais',
};
function valueLabel(key: string) {
  return valueLabels[key];
}
const hiddenDetailFields = new Set([
  'ownerId',
  'campaignId',
  'agreementId',
  'activeDebtId',
  'protestId',
  'previousAgreementId',
  'installmentSchedule',
]);

export function EntityDetail({
  row,
  context,
  onOpen,
}: {
  row: EntityRow;
  context: QueryContext;
  onOpen: OpenEntity;
}) {
  const [tab, setTab] = useState<DetailTab>('data');
  const accessible = getRow(row.ref, context) ? row : null;
  if (!accessible)
    return (
      <div className="ws-empty">
        <LockKeyhole size={26} />
        <strong>Registro indisponível neste contexto</strong>
        <span>O perfil e os filtros atuais delimitam a consulta.</span>
      </div>
    );
  const linked = accessible.links
    .map((ref) => getRow(ref, context))
    .filter((item): item is EntityRow => item !== null);
  const tabs = [
    { id: 'data', label: 'Dados', Icon: FileText },
    { id: 'links', label: 'Vínculos (' + linked.length + ')', Icon: Link2 },
    { id: 'history', label: 'Histórico', Icon: History },
  ] as const;
  const inCurrentScope = filterRows([accessible], context).length > 0;
  const fields: Array<[string, string | number | null]> = [
    ['Identificador', accessible.ref.id],
    ['Status atual', accessible.status],
    ['Status de origem', accessible.statusRaw || null],
    ['Etapa', accessible.stage],
    ['Categoria', accessible.category],
    ['Prioridade', accessible.priority],
    ['Responsável', accessible.owner],
    ['Setor', accessible.sector],
    ['Próxima ação', accessible.nextAction],
    ['Prazo / evento', accessible.deadline],
    ['Última movimentação', accessible.lastMovement],
  ];
  return (
    <div className="ws-detail">
      <div className="ws-detail-top">
        <span className="ws-detail-kind">
          {entityLabels[accessible.ref.kind]} · {accessible.ref.id}
        </span>
        <Chip label={accessible.status} />
      </div>
      <p className="ws-detail-subtitle">{accessible.subtitle}</p>
      <Alerts alerts={accessible.alerts} />
      <div
        className={`ws-detail-values ${accessible.ref.kind === 'demand' ? 'ws-detail-operational' : ''}`}
      >
        {accessible.ref.kind === 'demand' ? (
          <>
            <div>
              <span>Status operacional</span>
              <strong>{accessible.status}</strong>
            </div>
            <div>
              <span>Prioridade</span>
              <strong>{accessible.priority || 'Não informada'}</strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>
                {accessible.ref.kind === 'agreement'
                  ? 'Valor negociado'
                  : accessible.ref.kind === 'payment'
                  ? 'Valor informado'
                  : 'Valor de referência'}
              </span>
              <strong>{money(accessible.amountCents)}</strong>
            </div>
            <div>
              <span>Recebido líquido</span>
              <strong>{money(accessible.receivedCents)}</strong>
            </div>
          </>
        )}
        <div>
          <span>Responsável</span>
          <strong className="ws-detail-owner">{accessible.owner || 'Não atribuído'}</strong>
        </div>
      </div>
      <div className="ws-detail-tabs" role="tablist" aria-label="Detalhamento do registro">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      {tab === 'data' && (
        <div role="tabpanel">
          <div className="ws-detail-fields">
            {fields.map(([label, field]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>
                  {label.includes('Prazo') || label === 'Última movimentação'
                    ? date(field)
                    : display(field)}
                </strong>
              </div>
            ))}
            {Object.entries(accessible.values)
              .filter(([key]) => Object.hasOwn(valueLabels, key) && !hiddenDetailFields.has(key))
              .map(([key, field]) => (
                <div key={key}>
                  <span>{valueLabel(key)}</span>
                  <strong>{detailValue(key, field)}</strong>
                </div>
              ))}
          </div>
          {accessible.ref.kind === 'agreement' && (
            <section className="ws-installments">
              <h3>Parcelas do acordo</h3>
              {typeof accessible.values.installmentSchedule === 'string' &&
              accessible.values.installmentSchedule ? (
                <ul>
                  {accessible.values.installmentSchedule
                    .split('\n')
                    .filter(Boolean)
                    .map((installment, index) => (
                      <li key={index}>
                        <CalendarDays size={15} />
                        <span>{installment}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p>Parcelas não disponíveis nesta fonte.</p>
              )}
            </section>
          )}
        </div>
      )}
      {tab === 'links' && (
        <div role="tabpanel" className="ws-link-list">
          {linked.map((item) => (
            <button key={`${item.ref.kind}-${item.ref.id}`} onClick={() => onOpen(item.ref)}>
              <span className="ws-link-icon">
                <Link2 size={17} />
              </span>
              <span>
                <small>
                  {entityLabels[item.ref.kind]} · {item.ref.id}
                </small>
                <strong>{item.title}</strong>
                <small>{item.status}</small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
          {!linked.length && (
            <div className="ws-empty">
              <Link2 size={26} />
              <strong>Nenhum vínculo disponível neste recorte</strong>
            </div>
          )}
        </div>
      )}
      {tab === 'history' && (
        <div role="tabpanel" className="ws-timeline">
          {[...accessible.history]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((event, index) => (
              <div key={`${event.date}-${index}`}>
                <i />
                <small>{date(event.date)}</small>
                <strong>{event.title}</strong>
                <p>{event.description}</p>
              </div>
            ))}
          {!accessible.history.length && (
            <div className="ws-empty">
              <History size={26} />
              <strong>Histórico não disponível</strong>
            </div>
          )}
        </div>
      )}
      <div className="ws-detail-documents">
        <DocumentActions
          records={[accessible]}
          title={`${entityLabels[accessible.ref.kind]} · ${accessible.title}`}
          scope={`Ficha individual autorizada · ${accessible.ref.id} · ${
            inCurrentScope ? 'recorte atual preservado' : 'vínculo fora do filtro visual da lista'
          }`}
          context={
            inCurrentScope ? context : { filters: { ...defaultFilters }, session: context.session }
          }
          mode="detailed"
        />
      </div>
      <div className="ws-note">
        <ShieldCheck size={17} />
        <p>
          {accessible.provenance
            ? `Fonte: ${accessible.provenance.system} · ${
                accessible.provenance.sourceId
              } · atualização ${date(accessible.provenance.updatedAt)}. ${
                accessible.provenance.rule || ''
              }`
            : 'Registro demonstrativo. Origem, documentos e regras oficiais serão homologados no SISCAF.'}
        </p>
      </div>
    </div>
  );
}
