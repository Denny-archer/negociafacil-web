import { useEffect, useId, useRef, useState } from 'react';
import type { Segment, SeriesPoint } from '../types';
import './charts.css';

interface ComboChartProps {
  data: SeriesPoint[];
  mode: 'people' | 'money';
  onSelect?: (point: SeriesPoint) => void;
  firstSeriesLabel?: string;
  singleSeries?: boolean;
}

interface DonutChartProps {
  segments: Segment[];
  centerValue: string;
  centerLabel: string;
  onSelect?: (segment: Segment) => void;
  compact?: boolean;
}

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const moneyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
// Deslocamentos dos rótulos SVG (texto de 12px): centralização vertical no tick e distância da base do viewBox.
const AXIS_LABEL_DY = 4;
const MONTH_LABEL_OFFSET = 4;
const finiteValue = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

function axisValue(value: number, money: boolean) {
  if (!money) return numberFormat.format(value);
  if (value === 0) return 'R$ 0';
  if (value >= 1_000_000) return `R$ ${decimalFormat.format(value / 1_000_000)} mi`;
  if (value >= 1_000) return `R$ ${decimalFormat.format(value / 1_000)} mil`;
  return `R$ ${decimalFormat.format(value)}`;
}

function scaleFor(value: number, divisions = 5) {
  const maximum = Math.max(1, finiteValue(value));
  const rawStep = maximum / divisions;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const step = ([1, 2, 2.5, 5, 10].find((candidate) => candidate >= fraction) ?? 10) * magnitude;
  const max = Math.ceil(maximum / step) * step;
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
}

function smoothPath(points: { x: number; y: number }[], minimumY: number, maximumY: number) {
  if (!points.length) return '';
  const limit = (y: number) => Math.min(maximumY, Math.max(minimumY, y));
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const before = points[Math.max(0, index - 2)];
    const after = points[Math.min(points.length - 1, index + 1)];
    return `${path} C ${previous.x + (point.x - before.x) / 6} ${limit(previous.y + (point.y - before.y) / 6)}, ${point.x - (after.x - previous.x) / 6} ${limit(point.y - (after.y - previous.y) / 6)}, ${point.x} ${point.y}`;
  }, '');
}

export function ComboChart({ data, mode, onSelect, firstSeriesLabel, singleSeries = false }: ComboChartProps) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(520);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipId = useId();
  const paintId = useId().replace(/:/g, '');
  const money = mode === 'money';
  const firstLabel = firstSeriesLabel || (money ? 'Arrecadação' : 'Total de inscritos');
  const secondLabel = money ? 'Valor em aberto' : 'Inadimplentes';
  const firstColor = money ? 'var(--chart-mint)' : 'var(--chart-blue)';
  const secondColor = 'var(--chart-rose)';

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = () => setWidth(Math.max(220, element.getBoundingClientRect().width));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => setActiveIndex(null), [data, mode]);

  const values = data.map((point) => ({
    first: finiteValue(point.first), second: finiteValue(point.second), rate: finiteValue(point.rate),
  }));
  const hasData = values.some((point) => point.first > 0 || point.second > 0 || point.rate > 0);
  const height = money ? 130 : 150;
  const left = money ? 80 : 52;
  const right = 40;
  const top = 12;
  const bottom = 28;
  const plotWidth = Math.max(1, width - left - right);
  const plotHeight = height - top - bottom;
  const scale = scaleFor(Math.max(0, ...values.flatMap((point) => [point.first, point.second])));
  const rateScale = scaleFor(Math.max(40, ...values.map((point) => point.rate * 1.12)), 4);
  const cell = plotWidth / Math.max(1, data.length);
  const barWidth = Math.min(12, cell * 0.25);
  const yValue = (value: number) => top + plotHeight * (1 - value / scale.max);
  const yRate = (value: number) => top + plotHeight * (1 - value / rateScale.max);
  const points = values.map((point, index) => ({ x: left + cell * (index + 0.5), y: yRate(point.rate) }));
  const active = activeIndex === null ? undefined : data[activeIndex];
  const activeValues = activeIndex === null ? undefined : values[activeIndex];
  const format = (value: number) => (money ? moneyFormat.format(value) : numberFormat.format(value));
  const labelEvery = data.length > 0 && cell < 28 ? Math.ceil(28 / cell) : 1;
  const tooltipWidth = 208;
  const tooltipLeft = activeIndex === null ? 0 : Math.max(4, Math.min(width - tooltipWidth - 4, left + cell * (activeIndex + 0.5) - tooltipWidth / 2));

  return (
    <div className={`chart-combo chart-combo-${mode}`} ref={container} aria-label={singleSeries ? `Gráfico de ${firstLabel.toLowerCase()}` : `Gráfico de ${firstLabel.toLowerCase()}, ${secondLabel.toLowerCase()} e percentual de inadimplência`}>
      <div className="chart-legend" aria-hidden="true">
        <span><i style={{ backgroundColor: firstColor }} />{firstLabel}</span>
        {!singleSeries && <><span><i style={{ backgroundColor: secondColor }} />{secondLabel}</span><span><i className="chart-line-key" />% Inadimplência</span></>}
      </div>
      {!hasData ? (
        <div className="chart-empty" role="status"><span className="chart-empty-bars" aria-hidden="true"><i /><i /><i /></span><span>Sem dados no período selecionado</span></div>
      ) : (
        <div className="chart-plot" style={{ height }} onMouseLeave={() => setActiveIndex(null)}>
          <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <defs>
              <linearGradient id={`${paintId}-first`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: firstColor }} stopOpacity="0.75" /><stop offset="100%" style={{ stopColor: firstColor }} /></linearGradient>
              <linearGradient id={`${paintId}-second`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: secondColor }} stopOpacity="0.8" /><stop offset="100%" style={{ stopColor: secondColor }} /></linearGradient>
            </defs>
            {scale.ticks.map((tick) => (
              <g key={tick}>
                <line className="chart-grid" x1={left} x2={width - right} y1={yValue(tick)} y2={yValue(tick)} />
                <text className="chart-axis" x={left - 8} y={yValue(tick) + AXIS_LABEL_DY} textAnchor="end">{axisValue(tick, money)}</text>
              </g>
            ))}
            {!singleSeries && rateScale.ticks.map((tick) => <text className="chart-axis" key={tick} x={width - right + 8} y={yRate(tick) + AXIS_LABEL_DY}>{decimalFormat.format(tick)}%</text>)}
            <line className="chart-baseline" x1={left} x2={width - right} y1={top + plotHeight} y2={top + plotHeight} />
            {values.map((point, index) => {
              const centerX = left + cell * (index + 0.5);
              return (
                <g key={`${data[index].label}-${index}`} className={activeIndex === index ? 'chart-bars chart-bars-active' : 'chart-bars'}>
                  {activeIndex === index && <rect className="chart-active-column" x={left + cell * index} y={top} width={cell} height={plotHeight} rx="3" />}
                  <rect x={singleSeries ? centerX - barWidth : centerX - barWidth - 1.5} y={yValue(point.first)} width={singleSeries ? barWidth * 2 : barWidth} height={Math.max(0, plotHeight * point.first / scale.max)} fill={`url(#${paintId}-first)`} rx="1.4" />
                  {!singleSeries && <rect x={centerX + 1.5} y={yValue(point.second)} width={barWidth} height={Math.max(0, plotHeight * point.second / scale.max)} fill={`url(#${paintId}-second)`} rx="1.4" />}
                  {index % labelEvery === 0 && <text className="chart-axis chart-month" x={centerX} y={height - MONTH_LABEL_OFFSET} textAnchor="middle">{data[index].label}</text>}
                </g>
              );
            })}
            {!singleSeries && <path className="chart-rate-line" d={smoothPath(points, top, top + plotHeight)} />}
            {!singleSeries && points.map((point, index) => <circle className="chart-rate-dot" key={index} cx={point.x} cy={point.y} r={activeIndex === index ? 3.8 : 2.2} />)}
          </svg>
          {data.map((point, index) => (
            <button
              className={`chart-hit-target${onSelect ? ' chart-hit-clickable' : ''}`}
              type="button"
              key={`${point.label}-${index}`}
              style={{ left: left + cell * index, top, width: cell, height: plotHeight }}
              aria-label={`${point.label}: ${firstLabel}, ${format(values[index].first)}${singleSeries ? '' : `; ${secondLabel}, ${format(values[index].second)}; inadimplência, ${decimalFormat.format(values[index].rate)}%`}.${onSelect ? ' Ver registros deste período.' : ''}`}
              aria-describedby={activeIndex === index ? tooltipId : undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => { setActiveIndex(index); onSelect?.(point); }}
            />
          ))}
          {active && activeValues && (
            <div className="chart-tooltip" id={tooltipId} role="tooltip" style={{ left: tooltipLeft, width: tooltipWidth }}>
              <strong>{active.label}</strong>
              <span><i style={{ backgroundColor: firstColor }} />{firstLabel}<b>{format(activeValues.first)}</b></span>
              {!singleSeries && <><span><i style={{ backgroundColor: secondColor }} />{secondLabel}<b>{format(activeValues.second)}</b></span><span><i className="chart-tooltip-line" />Inadimplência<b>{decimalFormat.format(activeValues.rate)}%</b></span></>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DonutChart({ segments, centerValue, centerLabel, onSelect, compact = false }: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipId = useId();
  const values = segments.map((segment) => finiteValue(segment.value));
  const total = values.reduce((sum, value) => sum + value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const active = activeIndex === null ? undefined : segments[activeIndex];

  useEffect(() => setActiveIndex(null), [segments]);

  return (
    <div className={`donut-layout${compact ? ' donut-compact' : ''}`} aria-label={`${centerLabel}: ${centerValue}`}>
      <div className="donut-visual" onMouseLeave={() => setActiveIndex(null)}>
        <svg className="donut-svg" viewBox="0 0 160 160" aria-hidden="true">
          <circle className="donut-track" cx="80" cy="80" r={radius} fill="none" strokeWidth="25" />
          {total > 0 && segments.map((segment, index) => {
            const length = circumference * values[index] / total;
            const gap = values.filter((value) => value > 0).length > 1 ? Math.min(2.2, length * 0.18) : 0;
            const visibleLength = Math.max(0, length - gap);
            const segmentOffset = offset;
            offset += length;
            if (!values[index]) return null;
            return (
              <circle
                className={`donut-segment${onSelect ? ' donut-segment-clickable' : ''}${activeIndex === index ? ' donut-segment-active' : ''}${activeIndex !== null && activeIndex !== index ? ' donut-segment-muted' : ''}`}
                key={`${segment.label}-${index}`}
                cx="80" cy="80" r={radius}
                fill="none" stroke={segment.color} strokeWidth="25"
                strokeDasharray={`${visibleLength} ${circumference - visibleLength}`}
                strokeDashoffset={-segmentOffset - gap / 2}
                transform="rotate(-90 80 80)"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelect?.(segment)}
              />
            );
          })}
        </svg>
        <div className="donut-center"><strong>{centerValue}</strong><span>{centerLabel}</span></div>
        {active && total > 0 && (
          <div className="donut-tooltip" id={tooltipId} role="tooltip"><strong>{active.label}</strong><span>{numberFormat.format(finiteValue(active.value))} · {decimalFormat.format(finiteValue(active.value) / total * 100)}%</span></div>
        )}
      </div>
      {total > 0 ? (
        <div className="donut-legend" aria-label="Distribuição por categoria">
          {segments.map((segment, index) => (
            <button
              className={`donut-legend-item${activeIndex === index ? ' donut-legend-item-active' : ''}${onSelect ? ' donut-legend-clickable' : ''}`}
              key={`${segment.label}-${index}`}
              type="button"
              aria-label={`${segment.label}: ${numberFormat.format(values[index])}, ${decimalFormat.format(values[index] / total * 100)}%.${onSelect ? ' Ver registros.' : ''}`}
              aria-describedby={activeIndex === index ? tooltipId : undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => onSelect?.(segment)}
            >
              <i className="donut-legend-dot" style={{ backgroundColor: segment.color }} />
              <span>{segment.label}</span>
              <b>{decimalFormat.format(values[index] / total * 100)}%</b>
            </button>
          ))}
        </div>
      ) : <p className="donut-empty" role="status">Sem dados para distribuir no período selecionado.</p>}
    </div>
  );
}
