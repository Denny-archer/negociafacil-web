import type { EntityKind, EntityRow, QueryContext } from '../../domain';
import { money, number } from '../records/formatting';
import { total } from '../workspace/recordsMath';
import type { Drill } from '../workspace/contracts';

export default function ReportTrend({
  rows,
  kind,
  context,
  onDrill,
}: {
  rows: EntityRow[];
  kind: EntityKind;
  context: QueryContext;
  onDrill: Drill;
}) {
  const groups = new Map<string, EntityRow[]>();
  rows.forEach((row) => {
    const month = row.eventDate.slice(0, 7);
    groups.set(month, [...(groups.get(month) || []), row]);
  });
  const months = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...months.map(([, records]) => records.length));
  const axes: Record<EntityKind, string> = {
    person: 'cadastro',
    debt: 'vencimento original do débito',
    collection: 'envio da notificação ou início do processo',
    campaign: 'início da campanha',
    agreement: 'formalização ou início do acordo',
    activeDebt: 'primeiro evento da inscrição',
    protest: 'remessa ou primeiro evento do título',
    payment: 'reconhecimento ou ocorrência informada',
    demand: 'última movimentação da demanda',
  };
  const monthFormat = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return (
    <section className="ws-panel ws-trend">
      <div className="ws-section-heading">
        <div>
          <h2>Distribuição dos registros por mês</h2>
          <p>Consulte a população de cada mês e suas entidades.</p>
        </div>
        <span>{months.length} meses no recorte</span>
      </div>
      <div className="ws-trend-list">
        {months.map(([month, population]) => (
          <button
            className="ws-trend-month"
            key={month}
            onClick={() =>
              onDrill(
                `Distribuição mensal · ${monthFormat.format(new Date(`${month}-15T12:00:00Z`))}`,
                population,
                `Agrupamento pela data de ${axes[kind]}; valores na data-base da prévia.`,
                context
              )
            }
          >
            <span>{monthFormat.format(new Date(`${month}-15T12:00:00Z`))}</span>
            <strong>{number(population.length)} registros</strong>
            {kind !== 'demand' && (
              <small>
                {['payment', 'campaign'].includes(kind)
                  ? `${money(total(population, 'receivedCents'))} recebido líquido`
                  : `${money(total(population))} de referência`}
              </small>
            )}
            <div className="ws-trend-track">
              <i style={{ width: `${(population.length / max) * 100}%` }} />
            </div>
          </button>
        ))}
      </div>
      {!months.length && (
        <div className="ws-empty ws-empty-small">Sem registros para distribuir neste período.</div>
      )}
      <p className="ws-trend-note">
        Eixo temporal: {axes[kind]}. Os montantes representam a data-base atual; esta distribuição não
        reconstrói o estoque histórico.
      </p>
    </section>
  );
}
