import { Flag, Shield, TriangleAlert, Zap } from 'lucide-react';
import { Avatar } from '../avatar/AvatarSvg';
import './board.css';

export type LaneCondition = 'impulso' | 'escudo' | 'atordoado' | 'chegou' | 'correndo';

export interface LaneRow {
  id: string;
  position: number;
  username: string;
  seed: string;
  /** 0 a 1. Sem valor, a raia não mostra a barra. */
  progress?: number;
  value?: string;
  condition?: LaneCondition;
}

const CONDITION: Record<LaneCondition, { label: string; icon: typeof Zap } | null> = {
  impulso: { label: 'Impulso', icon: Zap },
  escudo: { label: 'Escudo', icon: Shield },
  atordoado: { label: 'Tropeçou', icon: TriangleAlert },
  chegou: { label: 'Chegou', icon: Flag },
  correndo: null,
};

/** Quadro de raias: classificação como linhas de raia, com posição em numeral de placar. O líder é marcado em vermelho. */
export function LaneBoard({ rows, label, compact = false }: { rows: LaneRow[]; label: string; compact?: boolean }) {
  return (
    <ol className={`lanes${compact ? ' lanes--compact' : ''}`} aria-label={label}>
      {rows.map((row) => {
        const cond = CONDITION[row.condition ?? 'correndo'];
        const Icon = cond?.icon;
        return (
          <li key={row.id} className={`lane${row.position === 1 ? ' lane--lead' : ''}`}>
            <span className="lane__pos score" aria-label={`${row.position}º lugar`}>
              {row.position}
            </span>
            <Avatar seed={row.seed} size={compact ? 26 : 30} />
            <span className="lane__name">@{row.username}</span>
            {row.progress !== undefined && !compact ? (
              <span className="lane__track" aria-hidden>
                <span className="lane__fill" style={{ width: `${Math.min(100, Math.max(0, row.progress * 100))}%` }} />
              </span>
            ) : null}
            <span className="lane__end">
              {Icon && cond ? (
                <span className={`lane__tag lane__tag--${row.condition}`} title={cond.label}>
                  <Icon size={14} aria-hidden />
                  <span className="sr-only">{cond.label}</span>
                </span>
              ) : null}
              {row.value ? <span className="lane__value num">{row.value}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
