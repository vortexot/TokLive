import { Flag, Gift, Heart, MessageCircle, PersonStanding, Radio, Share2, Target, Trophy, UserPlus, type LucideIcon } from 'lucide-react';
import type { ActivityKind } from '../../domain/types';

const ICONS: Record<ActivityKind, LucideIcon> = {
  participante: UserPlus,
  personagem: PersonStanding,
  presente: Gift,
  curtidas: Heart,
  partida: Flag,
  recorde: Trophy,
  comentario: MessageCircle,
  compartilhamento: Share2,
  meta: Target,
  conexao: Radio,
};

export function ActivityIcon({ kind, size = 16 }: { kind: ActivityKind; size?: number }) {
  const Icon = ICONS[kind];
  return <Icon size={size} aria-hidden />;
}
