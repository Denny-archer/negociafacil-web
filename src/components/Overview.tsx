import { ArrowRight, Bell, Info, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

import { getMetrics, queryRows, SOURCE_DATE, money, number } from '../domain';
import type { EntityRow, QueryContext, ViewId } from '../domain';

import { ComboChart, DonutChart } from './Charts';
import { MetricCards } from '../features/workspace/MetricCards';
import { DocumentActions } from './DocumentActions';

interface Props {
  context: QueryContext;
  onDrill(title: string, rows: EntityRow[], definition?: string): void;
  onNavigate(view: ViewId): void;
}

const compositionColors = [
  'var(--chart-blue-deep)',
  'var(--chart-turquoise)',
  'var(--chart-blue)',
  'var(--chart-mint)',
  'var(--chart-gold)',
  'var(--chart-slate)',
];

const norm = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Pending({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="pending-component">
      <Info size={22} />
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

function grouped(rows: EntityRow[], key: (row: EntityRow) => string) {
  const map = new Map<string, EntityRow[]>();

  rows.forEach(row => {
    const label = key(row);
    map.set(label, [...(map.get(label) || []), row]);
  });

  return [...map.entries()].map(([label, records]) => ({
    label,
    records,
    value: records.length,
  }));
}

export default function Overview({ context, onDrill, onNavigate }: Props) {
  // Registros utilizados pelos indicadores e gráficos.
  const debts = queryRows('debt', context);
  const openDebts = debts.filter(
    row =>
      row.amountCents > 0 &&
      String(row.values.dueDate) < SOURCE_DATE.slice(0, 10) &&
      !row.status.startsWith('Suspenso'),
  );

  const agreements = queryRows('agreement', context);
  const protests = queryRows('protest', context);
  const demands = queryRows('demand', context);

  const payments = queryRows('payment', context).filter(
    row => row.values.recognizedAt != null,
  );

  const protestMetrics = getMetrics('protest', context);

  // Agrupamentos para os gráficos de distribuição.
  const categoryGroups = grouped(openDebts, row =>
    row.personType === 'PJ'
      ? 'Pessoa Jurídica'
      : row.category || 'Pessoa Física',
  );

  const exerciseGroups = grouped(openDebts, row =>
    String(row.exercise || 'Não informado'),
  ).sort((a, b) => a.label.localeCompare(b.label));

  const stageGroups = grouped(openDebts, row => row.stage || 'Não informado');
  const agreementGroups = grouped(agreements, row => row.status);

  const measureGroups = [
    { label: 'Dívida Ativa', records: queryRows('activeDebt', context) },
    { label: 'Protesto', records: protests },
  ];

  // Recebimentos reconhecidos por mês.
  const monthLabels = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  const year = context.filters.to
    ? Number(context.filters.to.slice(0, 4))
    : Number(SOURCE_DATE.slice(0, 4));

  const monthRows = monthLabels.map((_, index) =>
    payments.filter(
      row =>
        String(row.values.recognizedAt || row.eventDate).slice(0, 7) ===
        `${year}-${String(index + 1).padStart(2, '0')}`,
    ),
  );

  const series = monthLabels.map((label, index) => ({
    label,
    first:
      monthRows[index].reduce(
        (total, row) => total + row.receivedCents,
        0,
      ) / 100,
    second: 0,
    rate: 0,
  }));

  // Filas de atenção conforme os alertas e status existentes.
  const attention = [
    {
      label: 'Demandas vencidas',
      records: demands.filter(row =>
        row.alerts.some(alert => norm(alert) === 'vencido'),
      ),
      urgent: true,
    },
    {
      label: 'Para hoje',
      records: demands.filter(row =>
        row.alerts.some(alert => norm(alert) === 'hoje'),
      ),
    },
    {
      label: 'Sem responsável',
      records: demands.filter(row =>
        row.alerts.some(alert => norm(alert).includes('sem responsavel')),
      ),
    },
    {
      label: 'Sem próxima ação',
      records: demands.filter(row =>
        row.alerts.some(alert => norm(alert).includes('sem proxima acao')),
      ),
    },
    {
      label: 'Sem movimentação',
      records: demands.filter(row =>
        row.alerts.some(alert => norm(alert).includes('sem movimentacao')),
      ),
    },
    {
      label: 'Primeira parcela não paga',
      records: agreements.filter(
        row =>
          norm(row.status).includes('primeira parcela') &&
          !norm(row.status).includes('primeira parcela paga'),
      ),
      urgent: true,
    },
    {
      label: 'Retornos de protesto pendentes',
      records: protestMetrics.find(metric => metric.id === 'awaiting')?.rows || [],
    },
    {
      label: 'Providências pós-protesto',
      records: protestMetrics.find(metric => metric.id === 'post')?.rows || [],
    },
  ];

  const Attention = (
    <Panel
      title="Ações que exigem atenção"
      action={
        <button
          className="text-link"
          onClick={() => onNavigate('demands')}
        >
          Abrir Demandas <ArrowRight size={12} />
        </button>
      }
    >
      <div className="attention-grid">
        {attention.map(item => (
          <button
            key={item.label}
            className={`attention-item ${item.urgent ? 'urgent' : ''}`}
            onClick={() =>
              onDrill(
                item.label,
                item.records,
                'População do alerta no recorte atual. Alertas coexistem com o status do processo; pagamento não encerra pendências automaticamente.',
              )
            }
          >
            <Bell size={16} />
            <span>{item.label}</span>
            <strong>{number(item.records.length)}</strong>
          </button>
        ))}
      </div>

      <p className="attention-note">
        Um registro pode aparecer em mais de um alerta. Os números das filas não devem ser somados como se fossem pessoas distintas.
      </p>
    </Panel>
  );

  // Barras reutilizadas nas diferentes distribuições.
  function bars(
    groups: { label: string; records: EntityRow[] }[],
    monetary = false,
  ) {
    const values = groups.map(group =>
      monetary
        ? group.records.reduce((total, row) => total + row.amountCents, 0)
        : group.records.length,
    );

    const max = Math.max(1, ...values);

    return groups.length ? (
      <div className="overview-bar-list">
        {groups.map((group, index) => (
          <button
            key={group.label}
            className="overview-bar-item"
            onClick={() =>
              onDrill(
                group.label,
                group.records,
                monetary
                  ? 'Soma dos saldos dos débitos desta população.'
                  : 'Quantidade de registros do processo, respeitando os filtros e o perfil demonstrativo.',
              )
            }
          >
            <span>{group.label}</span>
            <span>
              <i
                style={{
                  width: `${values[index] / max * 100}%`,
                }}
              />
            </span>
            <strong>
              {monetary ? money(values[index]) : number(values[index])}
            </strong>
          </button>
        ))}
      </div>
    ) : (
      <div className="overview-chart-empty">
        Nenhum registro neste recorte.
      </div>
    );
  }

  return (
    <div className="overview overview-v2">
      {/* Título e ações de documento */}
      <div className="overview-title">
        <div>
          <span className="overview-kicker">CARTEIRA E ACOMPANHAMENTO</span>
          <h2>Visão Geral</h2>
          <p>
            Resultados e pendências do ciclo de recuperação · {context.session.profile}
          </p>
        </div>

        <DocumentActions
          records={debts}
          title="Resumo da carteira de débitos"
          scope="Débitos contemplados pelos filtros globais"
          mode="summary"
        />
      </div>

      {context.session.profile === 'Equipe' && Attention}

      <MetricCards metrics={getMetrics('overview', context)} onDrill={onDrill} />

      <p className="overview-metric-source">
        <ShieldCheck size={12} /> Indicadores demonstrativos. A definição e a população de cada indicador estão disponíveis no detalhamento.
      </p>

      {/* Recuperação, vencimentos e composição da carteira */}
      <div className="overview-row">
        <Panel title={`Recuperação por mês · ${year}`}>
          <p className="overview-subtitle">
            Recebimentos reconhecidos por data de confirmação, incluindo estornos. Clique para consultar os pagamentos do mês.
          </p>

          {series.some(point => point.first < 0) ? (
            <div className="signed-month-list">
              {series.map((point, index) => (
                <button
                  key={point.label}
                  className={point.first < 0 ? 'negative' : ''}
                  onClick={() =>
                    onDrill(
                      `Recebimentos reconhecidos · ${point.label}/${year}`,
                      monthRows[index],
                      'Saldo líquido dos pagamentos reconhecidos, incluindo estornos.',
                    )
                  }
                >
                  <span>{point.label}</span>
                  <strong>{money(Math.round(point.first * 100))}</strong>
                </button>
              ))}
            </div>
          ) : (
            <ComboChart
              data={series}
              mode="money"
              singleSeries
              firstSeriesLabel="Valor reconhecido"
              onSelect={point =>
                onDrill(
                  `Recebimentos reconhecidos · ${point.label}/${year}`,
                  monthRows[monthLabels.indexOf(point.label)],
                  'Pagamentos reconhecidos no mês de referência. Unidade: pagamentos; soma em centavos. Dados fictícios.',
                )
              }
            />
          )}
        </Panel>

        <Panel title="Vencidos por exercício">
          <p className="overview-subtitle">
            Saldo vencido por exercício de origem, excluindo créditos suspensos em análise.
          </p>
          {bars(exerciseGroups, true)}
        </Panel>

        <Panel title="Composição da inadimplência">
          <p className="overview-subtitle">
            Unidade: débitos em aberto, sem duplicar o saldo entre processos.
          </p>

          <DonutChart
            segments={categoryGroups.map((group, index) => ({
              label: group.label,
              value: group.records.length,
              color: compositionColors[index % compositionColors.length],
            }))}
            centerValue={number(openDebts.length)}
            centerLabel="débitos"
            onSelect={segment =>
              onDrill(
                `Débitos · ${segment.label}`,
                categoryGroups.find(group => group.label === segment.label)?.records || [],
                'Contagem de débitos em aberto; uma pessoa pode possuir mais de um débito.',
              )
            }
          />
        </Panel>
      </div>

      {context.session.profile !== 'Equipe' && Attention}

      {/* Estágios e medidas de recuperação */}
      <div className="overview-row overview-two">
        <Panel title="Distribuição por estágio de cobrança">
          {bars(stageGroups)}
        </Panel>

        <Panel title="Medidas de recuperação">
          <p className="overview-subtitle">
            Medidas independentes, aplicáveis conforme o caso. Não representam sequência obrigatória.
          </p>
          {bars(measureGroups)}
          <p className="attention-note">
            CADIN, negativação e medida judicial: estrutura prevista; campos e status aguardam validação dos setores responsáveis.
          </p>
        </Panel>
      </div>

      {/* Negociações e componentes pendentes de homologação */}
      <div className="overview-row">
        <Panel title="Resumo das negociações">
          {bars(agreementGroups)}
        </Panel>

        <Panel title="Evolução da inadimplência">
          <Pending title="Histórico por posição em homologação">
            O estoque atual não permite reconstruir posições históricas. O componente receberá a série oficial após a confirmação da fonte e da regra.
          </Pending>
        </Panel>

        <Panel title="Antiguidade e metas">
          <Pending title="Critérios em homologação">
            Vencimentos dos débitos estão disponíveis nos detalhes. Faixas de antiguidade, definição de débito antigo, metas e comparações oficiais serão parametrizadas após validação.
          </Pending>
        </Panel>
      </div>

      {/* Componentes em revisão */}
      <div className="overview-row overview-two">
        <Panel title="Etapas da régua de cobrança">
          <Pending title="Desenho atualizado em validação">
            A visualização anterior foi reservada para revisão. O novo desenho distinguirá notificação, envio e prazos, com ramificações para as medidas posteriores à Dívida Ativa.
          </Pending>
        </Panel>

        <Panel title="Forma de cobrança">
          <Pending title="Componente aguardando revisão">
            Meios de pagamento e medidas de recuperação serão apresentados separadamente. Negociação, Dívida Ativa e protesto não serão tratados como meios de pagamento.
          </Pending>
        </Panel>
      </div>
    </div>
  );
}
