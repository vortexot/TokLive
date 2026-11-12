import { formatCompact, formatNumber } from '../../lib/format';
import { niceScale } from './scale';
import './charts.css';

export interface Point {
  label: string;
  value: number;
}

const PAD = { l: 44, r: 12, t: 10, b: 26 };

interface Size {
  W: number;
  H: number;
}
const NORMAL: Size = { W: 640, H: 230 };
const WIDE: Size = { W: 1180, H: 210 };

function frame(max: number, { W, H }: Size) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;
  return { innerW, innerH, y };
}

function Grid({ ticks, y, size }: { ticks: number[]; y: (v: number) => number; size: Size }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={size.W - PAD.r} y1={y(t)} y2={y(t)} className="chart__grid" />
          <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="chart__tick">
            {formatCompact(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

function XLabels({ data, step, x, size }: { data: Point[]; step: number; x: (i: number) => number; size: Size }) {
  return (
    <g>
      {data.map((d, i) =>
        i % step === 0 || i === data.length - 1 ? (
          <text key={d.label + i} x={x(i)} y={size.H - 6} textAnchor="middle" className="chart__tick">
            {d.label}
          </text>
        ) : null,
      )}
    </g>
  );
}

function DataTable({ caption, data, unit }: { caption: string; data: Point[]; unit: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Período</th>
          <th>{unit}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.label}>
            <td>{d.label}</td>
            <td>{formatNumber(d.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LineChart({ data, label, unit }: { data: Point[]; label: string; unit: string }) {
  const size = NORMAL;
  const scale = niceScale(Math.max(...data.map((d) => d.value), 1));
  const { innerW, y } = frame(scale.max, size);
  const x = (i: number) => PAD.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)}Z`;
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${size.W} ${size.H}`} role="img" aria-label={label}>
        <Grid ticks={scale.ticks} y={y} size={size} />
        <path d={area} className="chart__area" />
        <path d={line} className="chart__line" />
        {data.map((d, i) => (
          <circle key={d.label + i} cx={x(i)} cy={y(d.value)} r={data.length > 16 ? 2 : 3.5} className="chart__dot">
            <title>
              {d.label}: {formatNumber(d.value)} {unit}
            </title>
          </circle>
        ))}
        <XLabels data={data} step={Math.max(1, Math.ceil(data.length / 7))} x={x} size={size} />
      </svg>
      <DataTable caption={label} data={data} unit={unit} />
    </figure>
  );
}

export function BarChart({ data, label, unit, highlightLast = false, wide = false }: { data: Point[]; label: string; unit: string; highlightLast?: boolean; wide?: boolean }) {
  const size = wide ? WIDE : NORMAL;
  const scale = niceScale(Math.max(...data.map((d) => d.value), 1));
  const { innerW, y } = frame(scale.max, size);
  const slot = innerW / data.length;
  const bw = Math.max(3, slot * 0.62);
  const x = (i: number) => PAD.l + slot * i + slot / 2;
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${size.W} ${size.H}`} role="img" aria-label={label}>
        <Grid ticks={scale.ticks} y={y} size={size} />
        {data.map((d, i) => (
          <rect key={d.label + i} x={x(i) - bw / 2} y={y(d.value)} width={bw} height={Math.max(0, y(0) - y(d.value))} rx={1.5} className={highlightLast && i === data.length - 1 ? 'chart__bar chart__bar--now' : 'chart__bar'}>
            <title>
              {d.label}: {formatNumber(d.value)} {unit}
            </title>
          </rect>
        ))}
        <XLabels data={data} step={wide ? 2 : Math.max(1, Math.ceil(data.length / 8))} x={x} size={size} />
      </svg>
      <DataTable caption={label} data={data} unit={unit} />
    </figure>
  );
}

/** Barras horizontais com o valor escrito ao lado: o rótulo carrega a informação, não só a cor. */
export function HorizontalBars({ data, label, unit }: { data: Point[]; label: string; unit: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="hbars" aria-label={label}>
      {data.map((d, i) => (
        <li key={d.label} className="hbars__row">
          <span className="hbars__label">{d.label}</span>
          <span className="hbars__track" aria-hidden>
            <span className={`hbars__fill${i === 0 ? ' hbars__fill--lead' : ''}`} style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="hbars__value num">
            {formatNumber(d.value)}
            <span className="sr-only"> {unit}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
