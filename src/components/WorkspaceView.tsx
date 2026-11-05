import { ArrowRight, CalendarDays, FileText } from 'lucide-react';
import { getMetrics, queryRows } from '../domain';
import type { QueryContext, ViewId } from '../domain';
import Delinquency from '../features/delinquency/Delinquency';
import Demands from '../features/demands/Demands';
import ProcessTable from '../features/processes/ProcessTable';
import Reports from '../features/reports/Reports';
import Settings from '../features/settings/Settings';
import { MetricCards } from '../features/workspace/MetricCards';
import type { Drill, Navigate, OpenEntity } from '../features/workspace/contracts';
import { referenceDateLabels, views } from '../features/workspace/viewMetadata';
import './workspace.css';

interface WorkspaceViewProps {
  view: Exclude<ViewId, 'overview'>;
  context: QueryContext;
  onOpen: OpenEntity;
  onDrill: Drill;
  onNavigate: Navigate;
}

function WorkspaceContent({ view, context, onOpen, onDrill, onNavigate }: WorkspaceViewProps) {
  if (view === 'settings') return <Settings context={context} onNavigate={onNavigate} />;
  if (view === 'reports') return <Reports context={context} onOpen={onOpen} onDrill={onDrill} />;

  const rows = queryRows(views[view].kind, context);
  const metrics = getMetrics(view, context);
  return (
    <>
      <MetricCards metrics={metrics} onDrill={onDrill} />
      {view === 'delinquency' ? (
        <Delinquency rows={rows} context={context} onOpen={onOpen} onDrill={onDrill} metrics={metrics} />
      ) : view === 'demands' ? (
        <Demands rows={rows} context={context} onOpen={onOpen} />
      ) : (
        <ProcessTable view={view} rows={rows} context={context} onOpen={onOpen} />
      )}
    </>
  );
}

export default function WorkspaceView(props: WorkspaceViewProps) {
  const { view, onNavigate } = props;
  const meta = views[view];
  return (
    <div className="ws-view">
      <div className="ws-page-heading">
        <div>
          <span className="ws-eyebrow">{meta.eyebrow}</span>
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
          <p className="ws-reference-date">
            <CalendarDays size={12} />
            <span>Referência do período: {referenceDateLabels[view]}</span>
          </p>
        </div>
        {!['reports', 'settings'].includes(view) && (
          <button className="ws-outline-button" onClick={() => onNavigate('reports')}>
            <FileText size={15} />
            Ver relatórios <ArrowRight size={13} />
          </button>
        )}
      </div>
      <WorkspaceContent {...props} />
    </div>
  );
}
