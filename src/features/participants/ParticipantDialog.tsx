import { Link } from 'react-router-dom';
import { describeCharacter, generateCharacter } from '../../domain/characters';
import { levelProgress } from '../../domain/leveling';
import type { Participant, ParticipantStatus } from '../../domain/types';
import { Avatar } from '../../components/avatar/AvatarSvg';
import { Dialog } from '../../components/ui/Dialog';
import { KeyValue, ProgressBar } from '../../components/ui/Misc';
import { formatDate, formatNumber, timeAgo } from '../../lib/format';
import { StatusPill } from './status';

export function ParticipantDialog({
  participant,
  status,
  now,
  onClose,
}: {
  participant: Participant | null;
  status: ParticipantStatus;
  now: number;
  onClose: () => void;
}) {
  const p = participant;
  const spec = p ? generateCharacter(p.characterSeed) : null;
  const lvl = p ? levelProgress(p.xp) : null;
  return (
    <Dialog
      open={!!p}
      onClose={onClose}
      title={p ? `@${p.username}` : ''}
      description={p ? (p.origin === 'simulador' ? 'Criado pelo simulador nesta sessão.' : 'Participante de demonstração (dado sintético).') : undefined}
      footer={
        p ? (
          <Link className="btn btn--secondary" to={`/personagens?id=${p.id}`} onClick={onClose}>
            Ver personagem em 3D
          </Link>
        ) : null
      }
    >
      {p && spec && lvl ? (
        <div className="pdlg">
          <div className="pdlg__avatar">
            <Avatar seed={p.characterSeed} size={110} variant="full" />
            <StatusPill status={status} />
          </div>
          <div className="pdlg__info">
            <div>
              <p className="pdlg__level">
                <span className="score">Nível {lvl.level}</span>
                <span className="panel__sub num">
                  {formatNumber(lvl.current)} / {formatNumber(lvl.needed)} XP para o próximo
                </span>
              </p>
              <ProgressBar value={lvl.ratio} label="Progresso para o próximo nível" thick />
            </div>
            <KeyValue
              items={[
                { label: 'XP total', value: formatNumber(p.xp) },
                { label: 'Vitórias', value: formatNumber(p.wins) },
                { label: 'Partidas', value: formatNumber(p.matches), sub: p.matches ? `${Math.round((p.wins / p.matches) * 100)}% de vitórias` : undefined },
                { label: 'Pontos', value: formatNumber(p.points) },
                { label: 'Entrada', value: formatDate(p.joinedAt) },
                { label: 'Última atividade', value: timeAgo(now, p.lastSeenAt) },
              ]}
            />
            <ul className="chip-row" aria-label="Itens equipados">
              {describeCharacter(spec).map((item) => (
                <li key={item.slot} className="gear">
                  <span className="gear__swatch" style={{ background: item.swatch }} aria-hidden />
                  <span>
                    <small>{item.slot}</small> {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
