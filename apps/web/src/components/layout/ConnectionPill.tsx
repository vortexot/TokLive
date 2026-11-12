import { AlertTriangle, Hourglass, Loader2, Plug, Radio, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../../domain/types';
import { Pill } from '../ui/Misc';
import { useAppState } from '../../state/store';

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  desconectado: 'Desconectado',
  aguardando: 'Aguardando LIVE',
  conectando: 'Conectando',
  'ao-vivo': 'Ao vivo',
  reconectando: 'Reconectando',
  erro: 'Erro de conexão',
};

export const STATUS_TONE: Record<ConnectionStatus, 'neutral' | 'warn' | 'live' | 'danger'> = {
  desconectado: 'neutral',
  aguardando: 'warn',
  conectando: 'warn',
  'ao-vivo': 'live',
  reconectando: 'warn',
  erro: 'danger',
};

export function StatusIcon({ status, size = 14 }: { status: ConnectionStatus; size?: number }) {
  switch (status) {
    case 'ao-vivo':
      return <Radio size={size} aria-hidden />;
    case 'aguardando':
      return <Hourglass size={size} aria-hidden />;
    case 'conectando':
      return <Loader2 size={size} className="spin" aria-hidden />;
    case 'reconectando':
      return <RefreshCw size={size} className="spin" aria-hidden />;
    case 'erro':
      return <AlertTriangle size={size} aria-hidden />;
    default:
      return <Plug size={size} aria-hidden />;
  }
}

/** Estado da conexão em uma linha. É simulado, e o rótulo acessível diz isso. */
export function ConnectionPill({ showHandle = true }: { showHandle?: boolean }) {
  const { status, handle } = useAppState((s) => ({ status: s.connection.status, handle: s.connection.handle }));
  const live = status === 'ao-vivo';
  return (
    <span className={`conn-pill${live ? ' conn-pill--live' : ''}`} role="status" aria-label={`Conexão simulada: ${STATUS_LABEL[status]}${handle ? ` em @${handle}` : ''}`}>
      <Pill tone={STATUS_TONE[status]}>
        {live ? <span className="live-dot" aria-hidden /> : <StatusIcon status={status} />}
        {STATUS_LABEL[status]}
      </Pill>
      {showHandle && handle ? <span className="conn-pill__handle">@{handle}</span> : null}
    </span>
  );
}
