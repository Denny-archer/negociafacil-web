import { ArrowRight, Clock3, Layers3, Users, Wallet } from 'lucide-react';
import type { Metric } from '../../domain';
import type { Drill } from './contracts';

export function MetricCards({ metrics, onDrill }: { metrics: Metric[]; onDrill: Drill }) {
  return (
    <div className="ws-metrics">
      {metrics.map((metric, index) => (
        <button
          key={metric.id}
          type="button"
          className={`ws-metric ws-metric-${
            metric.tone || ['blue', 'green', 'purple', 'pink'][index % 4]
          }`}
          disabled={metric.pending}
          onClick={() => onDrill(metric.label, metric.rows, metric.definition)}
          title={metric.pending ? metric.definition : `Ver ${metric.label.toLowerCase()}`}
        >
          <span className="ws-metric-icon">
            {metric.unit.includes('R$') || metric.unit === 'currency' || metric.unit === 'money' ? (
              <Wallet size={22} />
            ) : index % 3 === 0 ? (
              <Users size={22} />
            ) : index % 3 === 1 ? (
              <Layers3 size={22} />
            ) : (
              <Clock3 size={22} />
            )}
          </span>
          <span className="ws-metric-content">
            <span>{metric.label}</span>
            <strong>{metric.pending ? 'A homologar' : metric.value}</strong>
            <small>{metric.caption}</small>
          </span>
          {!metric.pending && <ArrowRight className="ws-metric-arrow" size={14} />}
        </button>
      ))}
    </div>
  );
}
