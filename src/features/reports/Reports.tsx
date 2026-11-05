import { useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, FileText, Info } from 'lucide-react';
import type { QueryContext } from '../../domain';
import type { DocumentMode } from '../../documents';
import { EntityTable } from '../records/EntityTable';
import { date, number } from '../records/formatting';
import { MetricCards } from '../workspace/MetricCards';
import type { Drill, OpenEntity } from '../workspace/contracts';
import ReportTrend from './ReportTrend';
import { getReportData, reportChoices } from './reportData';

export default function Reports({
  context,
  onOpen,
  onDrill,
}: {
  context: QueryContext;
  onOpen: OpenEntity;
  onDrill: Drill;
}) {
  const [report, setReport] = useState(reportChoices[0]);
  const [mode, setMode] = useState<DocumentMode>('detailed');
  const [compare, setCompare] = useState(true);
  const {
    allRows,
    previousRows,
    previousContext,
    previousStart,
    previousEnd,
    invalidComparison,
    periodLabel,
    currentMeasure,
    previousMeasure,
    measureLabel,
    formatMeasure,
    delta,
    reportMetrics,
  } = getReportData(report, context);

  return (
    <>
      <div className="ws-report-choices">
        {reportChoices.map((choice) => (
          <button
            key={choice.id}
            className={choice.id === report.id ? 'active' : ''}
            onClick={() => setReport(choice)}
          >
            <FileText size={18} />
            <strong>{choice.label}</strong>
            <span>{choice.subtitle}</span>
            {choice.id === report.id && <CheckCircle2 className="ws-report-check" size={15} />}
          </button>
        ))}
      </div>
      <MetricCards metrics={reportMetrics} onDrill={onDrill} />
      <section className="ws-panel ws-comparison">
        <div className="ws-section-heading">
          <div>
            <h2>Comparação entre períodos</h2>
            <p>
              Intervalos com a mesma duração; os demais filtros e o perfil são preservados. Os valores
              refletem a data-base da prévia, sem reconstruir saldos históricos.
            </p>
          </div>
          <label className="ws-checkbox">
            <input
              type="checkbox"
              checked={compare && !invalidComparison}
              disabled={invalidComparison}
              onChange={(event) => setCompare(event.target.checked)}
            />
            Comparar período anterior
          </label>
        </div>
        {invalidComparison && (
          <div className="ws-note ws-queue-note" role="status">
            <Info size={15} />
            <p>
              O início selecionado é posterior à data-base disponível. A comparação está indisponível;
              ajuste o início ou informe um fim de período válido para consultar outro intervalo.
            </p>
          </div>
        )}
        <div className="ws-comparison-grid">
          <button
            disabled={invalidComparison}
            onClick={() => onDrill(`${report.label} · período atual`, allRows, undefined, context)}
          >
            <span>Período atual</span>
            <strong>{periodLabel}</strong>
            <div>
              <b>{number(allRows.length)} registros</b>
              <b>
                {formatMeasure(currentMeasure)} {measureLabel}
              </b>
            </div>
          </button>
          {compare && !invalidComparison && (
            <button
              onClick={() =>
                onDrill(
                  `${report.label} · período anterior`,
                  previousRows,
                  `De ${date(previousStart)} a ${date(
                    previousEnd
                  )}. Os filtros de período são substituídos pelo intervalo anterior apenas nesta comparação.`,
                  previousContext
                )
              }
            >
              <span>Período anterior</span>
              <strong>
                {date(previousStart)} – {date(previousEnd)}
              </strong>
              <div>
                <b>{number(previousRows.length)} registros</b>
                <b>
                  {formatMeasure(previousMeasure)} {measureLabel}
                </b>
              </div>
            </button>
          )}
          {compare && !invalidComparison && (
            <div className="ws-comparison-change">
              {delta !== null ? (
                <>
                  {delta >= 0 ? <ArrowUp size={23} /> : <ArrowDown size={23} />}
                  <strong>
                    {Math.abs(delta).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                  </strong>
                  <span>
                    {delta >= 0 ? 'aumento' : 'redução'} · {measureLabel}
                  </span>
                </>
              ) : (
                <>
                  <Info size={23} />
                  <strong>Sem base anterior</strong>
                  <span>Variação percentual não calculada</span>
                </>
              )}
            </div>
          )}
        </div>
      </section>
      <ReportTrend rows={allRows} kind={report.kind} context={context} onDrill={onDrill} />
      <section className="ws-panel ws-table-panel">
        <div className="ws-section-heading">
          <div>
            <h2>{report.label}</h2>
            <p>Detalhamento dentro do painel; saída documental somente em PDF ou impressão.</p>
          </div>
          <label className="ws-select-label">
            Conteúdo do documento
            <select
              aria-label="Conteúdo do relatório"
              value={mode}
              onChange={(event) => setMode(event.target.value as DocumentMode)}
            >
              <option value="detailed">Registros detalhados</option>
              <option value="summary">Resumo gerencial</option>
            </select>
          </label>
        </div>
        <EntityTable
          key={report.id}
          rows={allRows}
          title={`Relatório · ${report.label}`}
          context={context}
          onOpen={onOpen}
          scope={`${report.label} · ${periodLabel}`}
          mode={mode}
        />
      </section>
    </>
  );
}
