import { useState } from 'react';
import { Filter, Info } from 'lucide-react';
import { number, SOURCE_DATE } from '../../domain';
import type { EntityRow, QueryContext } from '../../domain';
import { EntityTable } from '../records/EntityTable';
import { closed } from '../workspace/recordsMath';
import type { RecordsViewProps } from '../workspace/contracts';

const demandQueues = [
  ['all', 'Todas'],
  ['mine', 'Minhas'],
  ['sector', 'Por setor'],
  ['today', 'Hoje'],
  ['late', 'Vencidas'],
  ['future', 'Futuras'],
  ['noOwner', 'Sem responsável'],
  ['noAction', 'Sem próxima ação'],
  ['inactive', 'Sem movimentação'],
  ['status', 'Por status'],
  ['category', 'Por categoria'],
  ['priority', 'Por prioridade'],
] as const;
type DemandQueue = typeof demandQueues[number][0];

function demandMatch(row: EntityRow, queue: DemandQueue, context: QueryContext, option: string) {
  if (queue === 'all') return true;
  if (queue === 'status') return option === 'all' || row.status === option;
  if (queue === 'category') return option === 'all' || row.category === option;
  if (queue === 'priority') return option === 'all' || row.priority === option;
  if (queue === 'mine') return row.values.ownerId === context.session.userId;
  if (queue === 'sector')
    return option === 'all' ? row.sector === context.session.sector : row.sector === option;
  if (closed(row)) return false;
  if (queue === 'today') return row.alerts.includes('Hoje');
  if (queue === 'late') return row.alerts.includes('Vencido');
  if (queue === 'future') return !!row.deadline && row.deadline.slice(0, 10) > SOURCE_DATE.slice(0, 10);
  if (queue === 'noOwner') return row.alerts.includes('Sem responsável');
  if (queue === 'noAction') return row.alerts.includes('Sem próxima ação');
  if (queue === 'inactive') return row.alerts.includes('Sem movimentação');
  return true;
}

export default function Demands({ rows, context, onOpen }: RecordsViewProps) {
  const [queue, setQueue] = useState<DemandQueue>('all');
  const [option, setOption] = useState('all');
  const [showClosed, setShowClosed] = useState(false);
  const closedStatusSelected =
    context.filters.status !== 'all' &&
    rows.some((row) => row.status === context.filters.status && closed(row));
  const includeClosed = showClosed || closedStatusSelected;
  const candidates = includeClosed ? rows : rows.filter((row) => !closed(row));
  const selected = candidates.filter((row) => demandMatch(row, queue, context, option));
  const options =
    queue === 'status'
      ? [...new Set(candidates.map((row) => row.status))]
      : queue === 'category'
      ? [...new Set(candidates.map((row) => row.category).filter((item): item is string => !!item))]
      : queue === 'priority'
      ? [...new Set(candidates.map((row) => row.priority).filter((item): item is string => !!item))]
      : queue === 'sector'
      ? [...new Set(candidates.map((row) => row.sector).filter((item): item is string => !!item))]
      : [];
  return (
    <section className="ws-panel ws-table-panel">
      <div className="ws-section-heading">
        <div>
          <h2>Fila de acompanhamento</h2>
          <p>Uma demanda mantém seu histórico mesmo após a conclusão.</p>
        </div>
        <label className="ws-checkbox">
          <input
            type="checkbox"
            checked={includeClosed}
            disabled={closedStatusSelected}
            onChange={(event) => setShowClosed(event.target.checked)}
          />
          {closedStatusSelected ? 'Encerradas incluídas pelo status' : 'Incluir encerradas'}
        </label>
      </div>
      {closedStatusSelected && (
        <div className="ws-note ws-queue-note" role="status">
          <Info size={15} />
          <p>
            O status selecionado corresponde a demandas encerradas. Esses registros foram incluídos
            automaticamente; limpe o filtro de status para voltar à fila ativa.
          </p>
        </div>
      )}
      <div className="ws-tabs ws-demand-tabs">
        {demandQueues.map(([id, label]) => (
          <button
            key={id}
            className={queue === id ? 'active' : ''}
            onClick={() => {
              setQueue(id);
              setOption('all');
            }}
          >
            {label}
            <span>
              {number(candidates.filter((row) => demandMatch(row, id, context, 'all')).length)}
            </span>
          </button>
        ))}
      </div>
      {options.length > 0 && (
        <div className="ws-local-filter">
          <Filter size={14} />
          <label>
            {queue === 'status'
              ? 'Status da demanda'
              : queue === 'category'
              ? 'Categoria'
              : queue === 'priority'
              ? 'Prioridade'
              : 'Setor'}
            <select value={option} onChange={(event) => setOption(event.target.value)}>
              <option value="all">
                {queue === 'sector' ? `Meu setor · ${context.session.sector}` : 'Todos'}
              </option>
              {options.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <EntityTable
        key={`${queue}-${option}-${includeClosed}`}
        rows={selected}
        title="Demandas"
        context={context}
        onOpen={onOpen}
        scope={`${demandQueues.find(([id]) => id === queue)?.[1]}${
          option !== 'all' ? ` · ${option}` : ''
        }${includeClosed ? ' · incluindo encerradas' : ' · fila ativa'}`}
      />
    </section>
  );
}
