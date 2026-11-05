import { useState } from 'react';
import { ArrowRight, Info, Layers3, Users } from 'lucide-react';
import { getMetrics, queryRows } from '../../domain';
import { EntityTable } from '../records/EntityTable';
import { Chip } from '../records/StatusIndicators';
import { detailValue, display, money, number, value } from '../records/formatting';
import type { RecordsViewProps } from '../workspace/contracts';
import { views } from '../workspace/viewMetadata';

type ProcessView = 'collection' | 'negotiation' | 'active-debt' | 'protest' | 'payments';

const processNotes: Record<ProcessView, string> = {
  collection:
    'A régua definitiva aguarda homologação. Protesto, CADIN, negativação e medida judicial são encaminhamentos possíveis, conforme o caso.',
  negotiation:
    'Formalização e vigência são distintas. Consulte a primeira parcela, as parcelas seguintes e o histórico de cada acordo.',
  protest:
    'Confirmado não significa protestado. Baixa financeira e regularização cartorial são verificações distintas; prazos sem fonte homologada permanecem indisponíveis.',
  payments:
    'Comprovante ou pagamento informado não equivalem a recebimento confirmado. Uma baixa não encerra automaticamente as demais pendências.',
  'active-debt':
    'Elegibilidade, inscrição, documentos gerados e notificação enviada são eventos diferentes. Encaminhamentos posteriores dependem da medida aplicável.',
};

export default function ProcessTable({
  view,
  rows,
  context,
  onOpen,
}: RecordsViewProps & { view: ProcessView }) {
  const [tab, setTab] = useState('all');
  const [campaignMode, setCampaignMode] = useState(false);
  const campaigns = view === 'collection' ? queryRows('campaign', context) : [];
  const currentRows = campaignMode ? campaigns : rows;
  const statuses = [...new Set(currentRows.map((row) => row.status))];
  const choices =
    view === 'protest'
      ? [
          { id: 'all', label: 'Todos os títulos', rows: currentRows },
          ...getMetrics('protest', context).map((metric) => ({
            id: metric.id,
            label: metric.label,
            rows: metric.rows,
          })),
        ]
      : [
          { id: 'all', label: 'Todos', rows: currentRows },
          ...statuses.map((status) => ({
            id: status,
            label: status,
            rows: currentRows.filter((row) => row.status === status),
          })),
        ];
  const currentTab = choices.find((item) => item.id === tab) || choices[0];
  return (
    <>
      <div className="ws-note ws-process-note">
        <Info size={16} />
        <p>{processNotes[view]}</p>
      </div>
      {view === 'collection' && (
        <div className="ws-switch">
          <button
            className={!campaignMode ? 'active' : ''}
            onClick={() => {
              setCampaignMode(false);
              setTab('all');
            }}
          >
            <Layers3 size={15} />
            Carteiras em cobrança <span>{rows.length}</span>
          </button>
          <button
            className={campaignMode ? 'active' : ''}
            onClick={() => {
              setCampaignMode(true);
              setTab('all');
            }}
          >
            <Users size={15} />
            Campanhas <span>{campaigns.length}</span>
          </button>
        </div>
      )}
      {view === 'collection' && campaignMode && (
        <div className="ws-campaign-grid">
          {campaigns.map((campaign) => (
            <button
              key={campaign.ref.id}
              className="ws-panel ws-campaign"
              onClick={() => onOpen(campaign.ref)}
            >
              <div>
                <span className="ws-eyebrow">{campaign.ref.id}</span>
                <Chip label={campaign.status} />
              </div>
              <h2>{campaign.title}</h2>
              <p>{campaign.subtitle}</p>
              <dl>
                <div>
                  <dt>População inicial</dt>
                  <dd>{display(value(campaign, 'initialPeople'))}</dd>
                </div>
                <div>
                  <dt>Efetivamente recuperado</dt>
                  <dd>{money(Number(value(campaign, 'recoveredCents') || 0))}</dd>
                </div>
                <div>
                  <dt>Conversão / regularização</dt>
                  <dd>{detailValue('conversionRate', value(campaign, 'conversionRate'))}</dd>
                </div>
              </dl>
              <span className="ws-campaign-open">
                Abrir campanha <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </div>
      )}
      <section className="ws-panel ws-table-panel">
        <div className="ws-section-heading">
          <div>
            <h2>
              {campaignMode
                ? 'Campanhas e resultados'
                : view === 'payments'
                ? 'Pagamentos e exceções'
                : view === 'negotiation'
                ? 'Acordos e parcelas'
                : view === 'protest'
                ? 'Filas dos títulos'
                : 'Registros da carteira'}
            </h2>
            <p>
              Status e medidas coexistem; uma situação financeira não encerra automaticamente o processo.
            </p>
          </div>
          <span className="ws-count-badge">{number(currentTab.rows.length)} registros</span>
        </div>
        <div className="ws-tabs">
          {choices.map((choice) => (
            <button
              key={choice.id}
              className={currentTab.id === choice.id ? 'active' : ''}
              onClick={() => setTab(choice.id)}
            >
              {choice.label}
              <span>{choice.rows.length}</span>
            </button>
          ))}
        </div>
        <EntityTable
          key={`${view}-${campaignMode}-${currentTab.id}`}
          rows={currentTab.rows}
          title={campaignMode ? 'Campanhas de cobrança' : views[view].title}
          context={context}
          onOpen={onOpen}
          scope={currentTab.label}
        />
      </section>
    </>
  );
}
