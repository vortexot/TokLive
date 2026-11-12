import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import './ui.css';

export type PillTone = 'neutral' | 'ok' | 'warn' | 'live' | 'danger' | 'outline';

export function Pill({ tone = 'neutral', dot, children }: { tone?: PillTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`pill${tone === 'neutral' ? '' : ` pill--${tone}`}`}>
      {dot ? <span className="pill__dot" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  thick,
}: {
  /** 0 a 1 */
  value: number;
  label: string;
  thick?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={`progress${thick ? ' progress--thick' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Evolução de posição: sobe (verde), cai (vermelho) ou igual. */
export function Delta({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="delta delta--flat" role="img" aria-label="Sem mudança de posição">
        <Minus size={14} aria-hidden />
      </span>
    );
  }
  const up = value > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`delta ${up ? 'delta--up' : 'delta--down'}`} role="img" aria-label={`${up ? 'Subiu' : 'Caiu'} ${Math.abs(value)} ${Math.abs(value) === 1 ? 'posição' : 'posições'}`}>
      <Icon size={14} aria-hidden />
      {Math.abs(value)}
    </span>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode; sub?: string }[] }) {
  return (
    <dl className="kv">
      {items.map((item) => (
        <div className="kv__row" key={item.label}>
          <dt>{item.label}</dt>
          <dd>
            {item.value}
            {item.sub ? <span className="kv__sub">{item.sub}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
