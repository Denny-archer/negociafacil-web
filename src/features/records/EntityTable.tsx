import { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, FolderOpen, Search, X } from 'lucide-react';
import { filterRows } from '../../domain';
import { DocumentActions } from '../../components/DocumentActions';
import type { DocumentMode } from '../../documents';
import type { RecordsViewProps } from '../workspace/contracts';
import { entityLabels, normalize, number } from './formatting';
import { tableColumns } from './tableColumns';

function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
}

export interface EntityTableProps extends RecordsViewProps {
  title: string;
  scope?: string;
  mode?: DocumentMode;
}
export function EntityTable({
  rows,
  title,
  context,
  onOpen,
  scope,
  mode = 'detailed',
}: EntityTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const filtered = useMemo(() => {
    const needle = normalize(search.trim());
    return filterRows(rows, context).filter((row) =>
      normalize(
        [
          row.ref.id,
          row.title,
          row.subtitle,
          row.status,
          row.stage,
          row.owner,
          row.sector,
          row.category,
          row.priority,
          row.nextAction,
          ...Object.values(row.values),
        ].join(' ')
      ).includes(needle)
    );
  }, [rows, context, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const pageRows = filtered.slice(current * pageSize, (current + 1) * pageSize);
  const kind = rows[0]?.ref.kind ?? 'demand';
  const columns = tableColumns(kind);
  return (
    <div className="ws-table-container">
      <div className="ws-table-toolbar">
        <label className="ws-search">
          <Search size={15} />
          <input
            aria-label={`Pesquisar ${title}`}
            placeholder="Pesquisar registros, responsáveis ou status..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
          {search && (
            <button
              aria-label="Limpar pesquisa"
              onClick={() => {
                setSearch('');
                setPage(0);
              }}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <span className="ws-results">{number(filtered.length)} registros</span>
        <DocumentActions
          records={filtered}
          title={title}
          scope={scope}
          search={search.trim()}
          mode={mode}
          context={context}
        />
      </div>
      <div className="ws-table-scroll">
        <table className={`ws-table ws-table-${kind}`}>
          <thead>
            <tr>
              <th>{entityLabels[kind]} / identificação</th>
              {columns.map((column) => (
                <th key={column.label}>{column.label}</th>
              ))}
              <th>
                <span className="ws-sr-only">Abrir detalhes</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={`${row.ref.kind}-${row.ref.id}`} onClick={() => onOpen(row.ref)}>
                <td>
                  <button
                    className="ws-entity-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(row.ref);
                    }}
                  >
                    <span className="ws-avatar">{initials(row.title)}</span>
                    <span>
                      <strong>{row.title}</strong>
                      <small>{row.subtitle}</small>
                      <small className="ws-row-id">{row.ref.id}</small>
                    </span>
                  </button>
                </td>
                {columns.map((column) => (
                  <td key={column.label} className={column.className || ''}>
                    {column.render(row)}
                  </td>
                ))}
                <td>
                  <button
                    className="ws-open"
                    aria-label={`Abrir ${row.ref.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(row.ref);
                    }}
                  >
                    <ArrowRight size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="ws-empty">
          <FolderOpen size={30} />
          <strong>Nenhum registro neste recorte</strong>
          <span>Revise os filtros ou a pesquisa para consultar outra população.</span>
          {search && (
            <button
              className="ws-outline-button"
              onClick={() => {
                setSearch('');
                setPage(0);
              }}
            >
              Limpar pesquisa
            </button>
          )}
        </div>
      )}
      <div className="ws-pagination">
        <span>
          {filtered.length
            ? `${current * pageSize + 1}–${Math.min(
                (current + 1) * pageSize,
                filtered.length
              )} de ${number(filtered.length)}`
            : '0 registros'}
        </span>
        <div>
          <label>
            Por página
            <select
              aria-label="Registros por página"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
            </select>
          </label>
          <button
            aria-label="Página anterior"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {current + 1} / {pages}
          </span>
          <button
            aria-label="Próxima página"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
