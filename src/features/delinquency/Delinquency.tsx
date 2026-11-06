import { useState } from 'react';
import { ArrowRight, Filter, Info } from 'lucide-react';
import { filterRows, getCatalogs } from '../../domain';
import type { EntityRow, Metric } from '../../domain';
import { EntityTable } from '../records/EntityTable';
import { money, number } from '../records/formatting';
import { total } from '../workspace/recordsMath';
import type { Drill, RecordsViewProps } from '../workspace/contracts';

const debtDimensions = [
  'exercise',
  'personType',
  'debtType',
  'amountBand',
  'ageBand',
  'status',
  'stage',
  'agreement',
  'activeDebt',
  'protest',
] as const;
type DebtDimension = 'all' | typeof debtDimensions[number];
const dimensionLabels: Record<DebtDimension, string> = {
  all: 'Todos os atributos',
  exercise: 'Exercício',
  personType: 'PF / PJ',
  debtType: 'Tipo de débito',
  amountBand: 'Faixa de valor',
  ageBand: 'Antiguidade',
  status: 'Situação do débito',
  stage: 'Estágio da cobrança',
  agreement: 'Existência de acordo',
  activeDebt: 'Dívida Ativa',
  protest: 'Protesto',
};

const groupColors = [
  'var(--chart-blue)',
  'var(--chart-turquoise)',
  'var(--chart-petrol)',
  'var(--chart-mint)',
];

function Groups({
  rows,
  field,
  title,
  onDrill,
}: {
  rows: EntityRow[];
  field: (row: EntityRow) => string;
  title: string;
  onDrill: Drill;
}) {
  const groups = new Map<string, EntityRow[]>();
  rows.forEach((row) => {
    const label = field(row);
    groups.set(label, [...(groups.get(label) || []), row]);
  });
  const items = [...groups.entries()].sort((a, b) => total(b[1]) - total(a[1]));
  const max = Math.max(1, ...items.map(([, population]) => population.length));
  return (
    <section className="ws-panel ws-groups">
      <div className="ws-section-heading">
        <h2>{title}</h2>
        <span>Quantidade e valor</span>
      </div>
      {items.map(([label, population], index) => (
        <button
          key={label}
          onClick={() =>
            onDrill(
              `${title} · ${label}`,
              population,
              'População do recorte atual; valores somados em centavos.'
            )
          }
        >
          <span className="ws-group-name">{label}</span>
          <span className="ws-group-track">
            <i
              style={{
                width: `${(population.length / max) * 100}%`,
                background: groupColors[index % groupColors.length],
              }}
            />
          </span>
          <span>
            <strong>{number(population.length)}</strong>
            <small>{money(total(population))}</small>
          </span>
          <ArrowRight size={12} />
        </button>
      ))}
      {!items.length && <div className="ws-empty ws-empty-small">Sem registros para segmentar.</div>}
    </section>
  );
}
function PendingSegment({ title, description }: { title: string; description: string }) {
  return (
    <section className="ws-panel ws-pending-segment">
      <div className="ws-section-heading">
        <h2>{title}</h2>
        <span className="ws-pending">A homologar</span>
      </div>
      <Info size={24} />
      <p>{description}</p>
      <small>A classificação será exibida após a definição da regra oficial.</small>
    </section>
  );
}

export default function Delinquency({
  rows,
  context,
  onOpen,
  onDrill,
  metrics,
}: RecordsViewProps & { onDrill: Drill; metrics: Metric[] }) {
  const catalogs = getCatalogs(context);
  const [debtDimension, setDebtDimension] = useState<DebtDimension>('all');
  const [debtOption, setDebtOption] = useState('all');
  const [debtPopulation, setDebtPopulation] = useState<'overdue' | 'suspended'>('overdue');
  const dimensions = (
    debtDimension === 'status' ? catalogs.status_debt || [] : catalogs[debtDimension] || []
  ).filter((option) => option.value !== 'all');
  const overdueRows = metrics.find((metric) => metric.id === 'balance')?.rows || [];
  const suspendedRows = rows.filter((row) => row.status.startsWith('Suspenso'));
  const debtBase = debtPopulation === 'suspended' ? suspendedRows : overdueRows;
  const pendingDimension = ['amountBand', 'ageBand'].includes(debtDimension);
  const debtRows =
    debtDimension === 'all' || debtOption === 'all'
      ? debtBase
      : filterRows(debtBase, {
          ...context,
          filters: { ...context.filters, [debtDimension]: debtOption },
        });
  return (
    <>
      <div className="ws-segment-grid">
        <Groups
          rows={overdueRows}
          field={(row) => String(row.exercise || 'Sem exercício')}
          title="Vencidos por exercício"
          onDrill={onDrill}
        />
        <PendingSegment
          title="Por antiguidade"
          description="O marco de antiguidade e seus intervalos dependem de homologação. Nenhuma faixa foi presumida."
        />
        <PendingSegment
          title="Por faixa de valor"
          description="Os limites monetários de cada faixa ainda precisam ser definidos e aprovados."
        />
      </div>
      <section className="ws-panel ws-table-panel">
        <div className="ws-section-heading">
          <div>
            <h2>População da inadimplência</h2>
            <p>
              O estoque vencido inclui saldo positivo vencido na data-base. Créditos suspensos permanecem
              disponíveis para análise.
            </p>
          </div>
        </div>
        <div className="ws-tabs">
          <button
            className={debtPopulation === 'overdue' ? 'active' : ''}
            onClick={() => setDebtPopulation('overdue')}
          >
            Estoque vencido <span>{overdueRows.length}</span>
          </button>
          <button
            className={debtPopulation === 'suspended' ? 'active' : ''}
            onClick={() => setDebtPopulation('suspended')}
          >
            Créditos em análise <span>{suspendedRows.length}</span>
          </button>
        </div>
        <div className="ws-local-filter">
          <Filter size={15} />
          <label>
            Segmentar por
            <select
              aria-label="Segmentar inadimplência"
              value={debtDimension}
              onChange={(event) => {
                setDebtDimension(event.target.value as DebtDimension);
                setDebtOption('all');
              }}
            >
              <option value="all">Todos os atributos</option>
              {debtDimensions.map((key) => (
                <option key={key} value={key}>
                  {dimensionLabels[key]}
                </option>
              ))}
            </select>
          </label>
          {debtDimension !== 'all' && (
            <label>
              Valor
              <select
                aria-label="Valor da segmentação"
                value={debtOption}
                disabled={pendingDimension}
                onChange={(event) => setDebtOption(event.target.value)}
              >
                <option value="all">{pendingDimension ? 'Pendente de homologação' : 'Todos'}</option>
                {!pendingDimension &&
                  dimensions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
        {pendingDimension && (
          <div className="ws-note">
            <Info size={16} />
            <p>
              A regra de {dimensionLabels[debtDimension].toLowerCase()} ainda não foi homologada. A
              população abaixo permanece sem classificação por esse atributo.
            </p>
          </div>
        )}
        <EntityTable
          key={`${debtPopulation}-${debtDimension}-${debtOption}`}
          rows={debtRows}
          title={debtPopulation === 'suspended' ? 'Créditos em análise' : 'Inadimplência'}
          context={context}
          onOpen={onOpen}
          scope={`${
            debtPopulation === 'suspended' ? 'Créditos suspensos em análise' : 'Estoque vencido'
          }${
            debtDimension === 'all' || pendingDimension
              ? ''
              : ` · ${dimensionLabels[debtDimension]} · ${
                  dimensions.find((option) => option.value === debtOption)?.label || 'Todos'
                }`
          }`}
        />
      </section>
    </>
  );
}
