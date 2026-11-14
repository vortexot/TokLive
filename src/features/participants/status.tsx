import type { ParticipantStatus } from '../../domain/types';
import { Pill, type PillTone } from '../../components/ui/Misc';

export const STATUS_LABEL: Record<ParticipantStatus, string> = {
  'em-partida': 'Em partida',
  'na-fila': 'Na fila',
  ativo: 'Ativo',
  inativo: 'Inativo',
};

const TONE: Record<ParticipantStatus, PillTone> = {
  'em-partida': 'live',
  'na-fila': 'warn',
  ativo: 'ok',
  inativo: 'outline',
};

export function StatusPill({ status }: { status: ParticipantStatus }) {
  return <Pill tone={TONE[status]}>{STATUS_LABEL[status]}</Pill>;
}
