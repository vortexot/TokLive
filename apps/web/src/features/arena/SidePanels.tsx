import { MessageCircle, RotateCcw, Users } from 'lucide-react';
import { LaneBoard } from '../../components/board/LaneBoard';
import { Avatar } from '../../components/avatar/AvatarSvg';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';
import { ProgressBar } from '../../components/ui/Misc';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import { participantMap, useStandingRows } from './useArena';

export function StandingsPanel() {
  const rows = useStandingRows(12);
  const ended = useAppState((st) => st.match?.status === 'encerrada', Object.is);
  return (
    <section className="panel" aria-labelledby="stand-title">
      <header className="panel__head">
        <h2 className="panel__title" id="stand-title">
          Classificação
        </h2>
        <span className="panel__sub">{rows.length ? (ended ? 'final' : 'ao vivo') : ''}</span>
      </header>
      {rows.length ? (
        <div className="side__scroll" tabIndex={0} role="region" aria-label="Classificação da corrida (rolável)">
          <LaneBoard rows={rows} label="Classificação da corrida" />
        </div>
      ) : (
        <p className="side__empty">A classificação aparece quando a partida começar.</p>
      )}
    </section>
  );
}

export function LobbyPanel() {
  const { lobby, people, max } = useAppState((s) => ({
    lobby: s.lobby,
    people: s.participants,
    max: s.gameConfigs[s.selectedGameId ?? 'corrida'].maxParticipants,
  }));
  const map = participantMap(people);
  const shown = lobby.slice(0, 14);
  return (
    <section className="panel" aria-labelledby="lobby-title">
      <header className="panel__head">
        <h2 className="panel__title" id="lobby-title">
          Fila da próxima partida
        </h2>
        <span className="panel__sub num">
          {lobby.length}/{max}
        </span>
      </header>
      <div className="panel__body">
        {lobby.length === 0 ? (
          <p className="side__empty side__empty--flush">Ninguém na fila. Espectadores entram comentando <strong>!entrar</strong>.</p>
        ) : (
          <ul className="lobby">
            {shown.map((id) => {
              const p = map.get(id);
              return p ? (
                <li key={id} className="lobby__chip" title={`@${p.username}`}>
                  <Avatar seed={p.characterSeed} size={22} />
                  <span>@{p.username}</span>
                </li>
              ) : null;
            })}
            {lobby.length > shown.length ? <li className="lobby__more">+{lobby.length - shown.length}</li> : null}
          </ul>
        )}
      </div>
    </section>
  );
}

export function PollPanel() {
  const actions = useActions();
  const poll = useAppState((s) => s.poll);
  const total = poll.options.reduce((a, o) => a + o.votes, 0);
  return (
    <section className="panel" aria-labelledby="poll-title">
      <header className="panel__head">
        <h2 className="panel__title" id="poll-title">
          Votação da plateia
        </h2>
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => actions.resetPoll()} disabled={total === 0}>
          Zerar
        </Button>
      </header>
      <div className="panel__body poll">
        <p>{poll.question}</p>
        {poll.options.map((o, i) => (
          <div key={o.label} className="poll__row">
            <div className="poll__label">
              <span>
                <code>!voto {i + 1}</code> {o.label}
              </span>
              <span className="num">{total ? Math.round((o.votes / total) * 100) : 0}% · {o.votes}</span>
            </div>
            <ProgressBar value={total ? o.votes / total : 0} label={`Votos em ${o.label}`} />
          </div>
        ))}
        <p className="panel__sub">{total} {total === 1 ? 'voto' : 'votos'}. Cada espectador vota uma vez.</p>
      </div>
    </section>
  );
}

export function ChatPanel() {
  const chat = useAppState((s) => s.chat.slice(-8), (a, b) => a.length === b.length && a.every((m, i) => m.id === b[i]?.id));
  return (
    <section className="panel" aria-labelledby="chat-title">
      <header className="panel__head">
        <h2 className="panel__title" id="chat-title">
          Comentários
        </h2>
        <MessageCircle size={17} aria-hidden className="goal__icon" />
      </header>
      {chat.length === 0 ? (
        <EmptyState icon={Users} title="Sem comentários" text="Os comentários da LIVE e os comandos aparecem aqui." />
      ) : (
        <ul className="chat" tabIndex={0} aria-label="Últimos comentários (rolável)">
          {chat.map((m) => (
            <li key={m.id} className="chat__msg">
              <strong>@{m.username}</strong>{' '}
              <span className={m.command ? 'chat__cmd' : undefined}>{m.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
