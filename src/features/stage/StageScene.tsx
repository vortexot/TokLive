import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Gift, Megaphone } from 'lucide-react';
import { Avatar } from '../../components/avatar/AvatarSvg';
import { getGift } from '../../domain/gifts';
import { beatMs, getHost, speechMs, type Beat, type HostId } from '../../domain/stage';
import { HostArt } from './HostArt';
import './stage.css';

const TICK_MS = 40;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Fala o texto com a voz do navegador. Devolve uma função que cancela. */
function speakAloud(text: string, hostId: HostId, onEnd: () => void): () => void {
  const synth = window.speechSynthesis;
  const host = getHost(hostId);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.pitch = host.pitch;
  utterance.rate = host.rate;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  synth.cancel();
  synth.speak(utterance);
  return () => {
    utterance.onend = null;
    utterance.onerror = null;
    synth.cancel();
  };
}

/**
 * Toca um roteiro em laço: avança de momento em momento e revela a legenda aos poucos.
 * Trocar o roteiro (outra lista de `beats`) recomeça do início.
 */
export function useStagePlayer(beats: Beat[], playing: boolean, voice: boolean) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  /** Muda a cada "recomeçar", para repetir a fala mesmo quando o roteiro já está no início. */
  const [run, setRun] = useState(0);
  const count = beats.length;
  const beat = count ? beats[index % count]! : null;

  useEffect(() => setIndex(0), [beats]);

  useEffect(() => {
    if (!beat) return;
    const isSpeech = beat.kind === 'fala';
    const total = isSpeech ? beat.text.length : 0;
    setShown(isSpeech && (prefersReducedMotion() || !playing) ? total : 0);
    if (!playing) return;

    const advance = () => setIndex((i) => (i + 1) % count);
    let reveal: ReturnType<typeof setInterval> | undefined;
    if (isSpeech && !prefersReducedMotion()) {
      const step = Math.max(1, Math.ceil(total / (speechMs(beat.text) / TICK_MS)));
      reveal = setInterval(() => setShown((n) => Math.min(total, n + step)), TICK_MS);
    }

    // Com a voz ligada, a fala termina quando o navegador termina de falar (com um teto de segurança).
    const useVoice = isSpeech && voice && typeof window !== 'undefined' && 'speechSynthesis' in window;
    let stopVoice: (() => void) | undefined;
    let tail: ReturnType<typeof setTimeout> | undefined;
    if (useVoice && beat.kind === 'fala') {
      stopVoice = speakAloud(beat.text, beat.hostId, () => {
        tail = setTimeout(advance, 700);
      });
    }
    const timer = setTimeout(advance, useVoice ? beatMs(beat) * 3 : beatMs(beat));

    return () => {
      clearTimeout(timer);
      if (tail) clearTimeout(tail);
      if (reveal) clearInterval(reveal);
      stopVoice?.();
    };
  }, [beat, playing, voice, count, run]);

  return {
    index: count ? index % count : 0,
    shown,
    next: () => setIndex((i) => (count ? (i + 1) % count : 0)),
    restart: () => {
      setIndex(0);
      setRun((n) => n + 1);
    },
  };
}

/** O pedido ou o aviso que está valendo neste momento: o mais recente antes da fala atual. */
function contextFor(beats: Beat[], index: number): Extract<Beat, { kind: 'pedido' | 'aviso' }> | null {
  for (let i = index; i >= 0; i--) {
    const b = beats[i]!;
    if (b.kind === 'pedido' || b.kind === 'aviso') return b;
  }
  return null;
}

/** Próximos espectadores da fila: os pedidos que ainda vão aparecer no roteiro. */
function upcoming(beats: Beat[], index: number, current: string | null): string[] {
  const names: string[] = [];
  for (let step = 1; step < beats.length && names.length < 3; step++) {
    const b = beats[(index + step) % beats.length]!;
    if (b.kind === 'pedido' && b.username !== current && !names.includes(b.username)) names.push(b.username);
  }
  return names;
}

function RequestCard({ beat }: { beat: Extract<Beat, { kind: 'pedido' }> }) {
  const space = beat.text.indexOf(' ');
  const command = beat.text.startsWith('!') ? (space === -1 ? beat.text : beat.text.slice(0, space)) : '';
  const rest = command ? beat.text.slice(command.length) : beat.text;
  return (
    <div className="pstage-card" key={`${beat.username}${beat.text}`}>
      <p className="pstage-card__who">
        <Avatar seed={beat.username} size={30} />
        <span>@{beat.username}</span>
        {beat.gift ? (
          <span className="pstage-card__gift">
            <Gift aria-hidden /> {getGift(beat.gift).name}
          </span>
        ) : null}
      </p>
      <p className="pstage-card__text">
        {command ? <b>{command}</b> : null}
        {rest}
      </p>
    </div>
  );
}

function PollCard({ beat }: { beat: Extract<Beat, { kind: 'enquete' }> }) {
  const total = beat.votes[0] + beat.votes[1] || 1;
  const lead = beat.votes[0] >= beat.votes[1] ? 0 : 1;
  return (
    <div className="pstage-card pstage-poll">
      <p className="pstage-poll__q">{beat.question}</p>
      {beat.options.map((label, i) => {
        const pct = Math.round((beat.votes[i]! / total) * 100);
        return (
          <div className={`pstage-poll__row${i === lead ? ' is-lead' : ''}`} key={label}>
            <span className="pstage-poll__n">{i + 1}</span>
            <span className="pstage-poll__label">{label}</span>
            <span className="pstage-poll__pct">{pct}%</span>
            <span className="pstage-poll__bar">
              <span style={{ width: `${pct}%` }} />
            </span>
          </div>
        );
      })}
      <p className="pstage-poll__hint">Vote com !voto 1 ou !voto 2</p>
    </div>
  );
}

export interface StageSceneProps {
  title: string;
  command?: string;
  hostIds: HostId[];
  beats: Beat[];
  /** Momento atual do roteiro e quantos caracteres da fala já apareceram (vêm de `useStagePlayer`). */
  index: number;
  shown: number;
  playing: boolean;
  /** Mostrado no lugar do pedido quando o roteiro não tem pedido nem aviso (apresentação do anfitrião). */
  fallback?: ReactNode;
}

export function StageScene({ title, command, hostIds, beats, index, shown, playing, fallback }: StageSceneProps) {
  const player = { index: Math.min(index, Math.max(0, beats.length - 1)), shown };
  const beat = beats[player.index] ?? null;
  const speech = beat?.kind === 'fala' ? beat : null;
  const context = useMemo(() => contextFor(beats, player.index), [beats, player.index]);
  const request = context?.kind === 'pedido' ? context : null;
  const queue = useMemo(() => upcoming(beats, player.index, request?.username ?? null), [beats, player.index, request]);
  const hasRequests = useMemo(() => beats.some((b) => b.kind === 'pedido'), [beats]);
  const speaker = speech ? getHost(speech.hostId) : null;
  const talking = Boolean(speech && playing && player.shown < speech.text.length);

  return (
    <div className="pstage" role="group" aria-label={`Palco: ${title}`}>
      <div className={`pstage__canvas${hostIds.length > 1 ? ' pstage__canvas--duo' : ''}`}>
        <header className="pstage__top">
          <span className="pstage__format">{title}</span>
          {command ? <span className="pstage__cmd">Participe: {command}</span> : null}
          <span className="pstage__demo">Roteiro de demonstração</span>
        </header>

        <div className="pstage__cast">
          {hostIds.map((id) => {
            const host = getHost(id);
            const active = speech?.hostId === id;
            return (
              <figure
                key={id}
                className={`pstage__host${active ? ' is-speaking' : ''}${speech && !active ? ' is-waiting' : ''}`}
                style={{ '--plate': host.backdrop } as CSSProperties}
              >
                <HostArt id={id} speaking={active && talking} />
                <figcaption>{host.short}</figcaption>
              </figure>
            );
          })}
        </div>

        <div className="pstage__side">
          {beat?.kind === 'enquete' ? (
            <PollCard beat={beat} />
          ) : request ? (
            <RequestCard beat={request} />
          ) : context?.kind === 'aviso' ? (
            <div className="pstage-card pstage-notice">
              <Megaphone aria-hidden />
              <p>{context.text}</p>
            </div>
          ) : (
            fallback
          )}
        </div>

        <div className={`pstage__caption${speech ? '' : ' is-empty'}`} aria-hidden>
          {speech && speaker ? (
            <>
              <span className="pstage__speaker">{speaker.short}</span>
              <p>
                {speech.text.slice(0, player.shown)}
                <span className="pstage__ghost">{speech.text.slice(player.shown)}</span>
              </p>
            </>
          ) : (
            <p className="pstage__wait">{beat?.kind === 'enquete' ? 'O chat está votando' : beat?.kind === 'pedido' ? 'Pedido na fila' : 'Aguardando a próxima fala'}</p>
          )}
        </div>

        {hasRequests ? (
          <footer className="pstage__foot">
            <span className="pstage__next-label">Próximos</span>
            {queue.length ? queue.map((name) => <span key={name}>@{name}</span>) : <span className="pstage__next-none">fila vazia</span>}
          </footer>
        ) : null}
      </div>

      {/* Leitores de tela recebem a fala inteira de uma vez, não letra por letra. */}
      <p className="sr-only" role="status">
        {speech && speaker ? `${speaker.short}: ${speech.text}` : ''}
      </p>
    </div>
  );
}
