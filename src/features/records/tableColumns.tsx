import type { ReactNode } from 'react';
import type { EntityKind, EntityRow } from '../../domain';
import { Alerts, Chip, tone } from './StatusIndicators';
import { date, display, money, number, value } from './formatting';

interface TableColumn {
  label: string;
  render: (row: EntityRow) => ReactNode;
  className?: string;
}
const statusColumn: TableColumn = {
  label: 'Status atual',
  render: (row) => (
    <>
      <Chip label={row.status} />
      {row.stage && row.stage !== row.status && <small className="ws-table-muted">{row.stage}</small>}
    </>
  ),
};
const ownerColumn: TableColumn = {
  label: 'Responsável',
  render: (row) => (
    <>
      <span className={!row.owner ? 'ws-missing' : ''}>{row.owner || 'Sem responsável'}</span>
      {row.sector && <small className="ws-table-muted">{row.sector}</small>}
    </>
  ),
};
const actionColumn: TableColumn = {
  label: 'Próxima ação',
  render: (row) => (
    <span className={`ws-cell-text ws-cell-action ${!row.nextAction && !value(row, 'waitReason') ? 'ws-missing' : ''}`}>
      {row.nextAction ||
        (value(row, 'waitReason') ? `Aguardando · ${value(row, 'waitReason')}` : 'Sem próxima ação')}
    </span>
  ),
};
const deadlineColumn: TableColumn = {
  label: 'Prazo / evento',
  render: (row) => (
    <>
      {date(row.deadline)}
      <Alerts alerts={row.alerts} />
    </>
  ),
};
const amountColumn: TableColumn = {
  label: 'Valor em aberto',
  render: (row) => money(row.amountCents),
  className: 'ws-money',
};
function fieldColumn(
  label: string,
  keys: string[],
  kind: 'text' | 'date' | 'money' | 'count' = 'text'
): TableColumn {
  return {
    label,
    render: (row) => {
      const field = value(row, ...keys);
      return kind === 'money' ? (
        typeof field === 'number' ? (
          money(field)
        ) : (
          display(field)
        )
      ) : kind === 'date' ? (
        date(field)
      ) : kind === 'count' && typeof field === 'number' ? (
        number(field)
      ) : (
        <span className="ws-cell-text">{display(field)}</span>
      );
    },
  };
}
export function tableColumns(kind: EntityKind): TableColumn[] {
  if (kind === 'campaign')
    return [
      statusColumn,
      fieldColumn('População inicial', ['initialPeople'], 'count'),
      fieldColumn('Alcançados', ['reachedPeople'], 'count'),
      fieldColumn('Negociaram', ['negotiatedPeople'], 'count'),
      fieldColumn('Pagaram', ['paidPeople'], 'count'),
      fieldColumn('Recuperado', ['recoveredCents'], 'money'),
      fieldColumn('Saldo remanescente', ['remainingCents'], 'money'),
      ownerColumn,
    ];
  if (kind === 'demand')
    return [
      statusColumn,
      {
        label: 'Categoria / prioridade',
        render: (row) => (
          <>
            {row.category || 'Não informada'}
            {row.priority && (
              <small className={`ws-priority ws-priority-${tone(row.priority)}`}>{row.priority}</small>
            )}
          </>
        ),
      },
      ownerColumn,
      actionColumn,
      deadlineColumn,
      { label: 'Última movimentação', render: (row) => date(row.lastMovement) },
    ];
  if (kind === 'protest')
    return [
      statusColumn,
      {
        label: 'CDA / título',
        render: (row) => (
          <>
            <span>{display(value(row, 'cdaNumber'))}</span>
            <small className="ws-table-muted">Título: {display(value(row, 'titleNumber'))}</small>
          </>
        ),
      },
      amountColumn,
      {
        label: 'Cartório / protocolo',
        render: (row) => (
          <>
            <span className="ws-cell-text">{display(value(row, 'cartorio'))}</span>
            <small className="ws-table-muted">Protocolo: {display(value(row, 'protocol'))}</small>
          </>
        ),
      },
      {
        label: 'Andamento atual',
        render: (row) => (
          <>
            <span className="ws-cell-text">{display(value(row, 'movementDescription'))}</span>
            <small className="ws-table-muted">Código: {display(value(row, 'movementCode'))}</small>
          </>
        ),
      },
      fieldColumn('Remessa', ['remittanceDate'], 'date'),
      actionColumn,
      deadlineColumn,
    ];
  if (kind === 'payment')
    return [
      statusColumn,
      { label: 'Valor informado', render: (row) => money(row.amountCents), className: 'ws-money' },
      { label: 'Reconhecido', render: (row) => money(row.receivedCents), className: 'ws-money' },
      fieldColumn('Situação financeira', ['financialStatus']),
      fieldColumn('Baixa', ['postingStatus']),
      fieldColumn('Exceção', ['exception']),
      ownerColumn,
      actionColumn,
    ];
  if (kind === 'agreement')
    return [
      statusColumn,
      {
        label: 'Primeira parcela',
        render: (row) => (
          <>
            <span>{display(value(row, 'firstInstallmentStatus'))}</span>
            <small className="ws-table-muted">
              Vencimento: {date(value(row, 'firstInstallmentDue'))}
            </small>
          </>
        ),
      },
      fieldColumn('Valor negociado', ['negotiatedAmountCents'], 'money'),
      fieldColumn('Saldo das parcelas', ['outstandingCents'], 'money'),
      { label: 'Recuperado', render: (row) => money(row.receivedCents), className: 'ws-money' },
      fieldColumn('Renegociações', ['renegotiationCount'], 'count'),
      ownerColumn,
      actionColumn,
      deadlineColumn,
    ];
  if (kind === 'activeDebt')
    return [
      statusColumn,
      amountColumn,
      fieldColumn('Termo gerado', ['termGeneratedAt', 'generatedAt'], 'date'),
      fieldColumn('Notificação enviada', ['notifiedAt', 'termSentAt'], 'date'),
      fieldColumn('Medida subsequente', ['subsequentMeasures']),
      ownerColumn,
      actionColumn,
      deadlineColumn,
    ];
  if (kind === 'collection')
    return [
      statusColumn,
      fieldColumn('Campanha', ['campaignName', 'campaign']),
      amountColumn,
      fieldColumn('Notificação enviada', ['noticeSentAt'], 'date'),
      ownerColumn,
      actionColumn,
      deadlineColumn,
    ];
  if (kind === 'person')
    return [
      statusColumn,
      { label: 'PF / PJ', render: (row) => row.personType },
      { label: 'Categoria', render: (row) => row.category },
      amountColumn,
    ];
  return [
    statusColumn,
    {
      label: 'Exercício / tipo',
      render: (row) => (
        <>
          {row.exercise || 'Não informado'}
          <small className="ws-table-muted">{display(value(row, 'debtType'))}</small>
        </>
      ),
    },
    fieldColumn('Vencimento do débito', ['dueDate'], 'date'),
    amountColumn,
    ownerColumn,
    actionColumn,
    deadlineColumn,
  ];
}
