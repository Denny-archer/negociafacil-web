import { useState } from 'react';
import { CalendarDays, ChevronDown, ListFilter, RefreshCw, Search, X } from 'lucide-react';
import { defaultFilters } from '../domain';
import type { Catalogs, DashboardFilters, EntityKind, ViewId } from '../domain';

interface FiltersProps {
  filters: DashboardFilters;
  catalogs: Catalogs;
  view: ViewId;
  dataBase: string;
  loading: boolean;
  filter: (key: keyof DashboardFilters, value: string) => void;
  refresh: () => void;
  onClear: () => void;
}

const kinds: Partial<Record<ViewId, EntityKind>> = {
  delinquency: 'debt',
  collection: 'collection',
  negotiation: 'agreement',
  'active-debt': 'activeDebt',
  protest: 'protest',
  payments: 'payment',
  demands: 'demand',
};
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});

export default function DashboardFilterBar({
  filters,
  catalogs,
  view,
  dataBase,
  loading,
  filter,
  refresh,
  onClear,
}: FiltersProps) {
  const [advanced, setAdvanced] = useState(false);
  const kind = kinds[view];
  function selectFilter(
    key: keyof DashboardFilters,
    label: string,
    options = catalogs[key] || [],
    pending = false
  ) {
    return (
      <label className="filter-control" key={key}>
        <div>
          <span>{label}</span>
          <select
            aria-label={label}
            value={filters[key]}
            onChange={(e) => filter(key, e.target.value)}
            disabled={pending}
          >
            <option value="all">{pending ? 'A homologar' : 'Todos'}</option>
            {options
              .filter((option) => option.value !== 'all')
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </div>
        <ChevronDown size={13} />
      </label>
    );
  }
  const hasFilters = Object.entries(filters).some(
    ([key, value]) => value !== defaultFilters[key as keyof DashboardFilters]
  );
  return (
    <>
      <div className="filters-bar workspace-filters" aria-label="Filtros globais">
        <label className="filter-control date-filter">
          <CalendarDays size={17} />
          <div>
            <span>Período · início</span>
            <input
              type="date"
              aria-label="Início do período"
              value={filters.from}
              onChange={(e) => filter('from', e.target.value)}
            />
          </div>
        </label>
        <label className="filter-control date-filter">
          <div>
            <span>Período · fim</span>
            <input
              type="date"
              aria-label="Fim do período"
              value={filters.to}
              onChange={(e) => filter('to', e.target.value)}
            />
          </div>
        </label>
        {selectFilter('exercise', 'Exercício')}
        {selectFilter('personType', 'Tipo de pessoa')}
        <button
          className={`advanced-filter-button ${advanced ? 'is-active' : ''}`}
          onClick={() => setAdvanced((value) => !value)}
          aria-expanded={advanced}
        >
          <ListFilter size={15} />
          Filtros avançados
        </button>
        <button className="refresh-button" onClick={refresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          {loading ? 'Carregando' : 'Atualizar'}
        </button>
        <div className="update-status">
          <span>Data-base demonstrativa</span>
          <strong>{dateTime.format(new Date(dataBase))}</strong>
          <small>
            <span className="status-dot amber" />
            SISCAF · integração pendente
          </small>
        </div>
      </div>
      {advanced && (
        <section className="advanced-filters" aria-label="Filtros avançados">
          {selectFilter('debtType', 'Tipo de débito')}
          {kind && selectFilter('status', 'Status do processo', catalogs[`status_${kind}`])}
          {(view === 'delinquency' || view === 'collection') &&
            selectFilter('stage', 'Estágio da cobrança')}
          {selectFilter('owner', 'Responsável')}
          {selectFilter('sector', 'Setor')}
          {selectFilter('campaign', 'Campanha')}
          {selectFilter('agreement', 'Situação de acordo')}
          {selectFilter('activeDebt', 'Dívida Ativa')}
          {selectFilter('protest', 'Protesto')}
          {view === 'demands' && (
            <>
              {selectFilter('priority', 'Prioridade')}
              {selectFilter('category', 'Categoria da demanda')}
            </>
          )}
          {selectFilter('amountBand', 'Faixa de valor', [], true)}
          {selectFilter('ageBand', 'Faixa de antiguidade', [], true)}
          {selectFilter('region', 'Regional/UF · a validar')}
          <p>
            Período filtra a data de referência do processo; exercício identifica o débito de origem.
            Status e estágio são específicos da aba. Faixas definitivas e UF dependem de homologação.
          </p>
        </section>
      )}
      {hasFilters && (
        <div className="active-filter-bar">
          <span>
            <Search size={12} />
            Recorte aplicado aos indicadores, listas e documentos
          </span>
          <button onClick={() => onClear()}>
            <X size={12} />
            Limpar filtros
          </button>
        </div>
      )}
    </>
  );
}
