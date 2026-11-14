import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Gift, Heart, LogIn, Megaphone, Share2, Sparkles, UserPlus, type LucideIcon } from 'lucide-react';
import { Avatar } from '../../components/avatar/AvatarSvg';
import { DEFAULT_COLOR, DEFAULT_VOICE, type Boneco, type BonecoVoice } from '../../domain/bonecos';
import { getGift } from '../../domain/gifts';
import { beatMs, speechMs, type Beat } from '../../domain/stage';
import type { GiftId } from '../../domain/types';
import { BonecoView } from './BonecoView';
import { CAN_SPEAK, speakAloud } from './voice';
import './stage.css';

export { CAN_SPEAK, speakAloud } from './voice';

const TICK_MS = 40;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ---------- O que a cena mostra ---------- */

export type EventIcon = 'presente' | 'seguidor' | 'compartilhamento' | 'entrada' | 'meta';

export type StageContext =
  | { kind: 'pedido'; username: string; text: string; gift?: GiftId }
  | { kind: 'aviso'; text: string }
  | { kind: 'evento'; icon: EventIcon; title: string; detail?: string }
  | { kind: 'enquete'; question: string; options: [string, string]; votes: [number, number] };

export interface StageView {
  context: StageContext | null;
  speech: { slot: number; text: string } | null;
  /** Quantos caracteres da fala já apareceram na legenda. */
  shown: number;
  talking: boolean;
  /** Próximos da fila (@). `null` esconde a linha. */
  queue: string[] | null;
  waitText: string;
}

/** Uma vaga do quadro em cena: o papel dela e o boneco que a ocupa (ou nenhum). */
export interface StageSlotView {
  label: string;
  boneco: Boneco | null;
}

/* ---------- Roteiro de demonstração ---------- */

/**
 * Toca um roteiro em laço: avança de momento em momento e revela a legenda aos poucos.
 * Trocar o roteiro (outra lista de `beats`) recomeça do início. `voices` traz a voz de cada vaga;
 * `null` deixa o palco mudo.
 */
export function useStagePlayer(beats: Beat[], playing: boolean, voices: readonly BonecoVoice[] | null) {
  // A voz é lida na hora de falar: trocar o boneco de uma vaga não reinicia a fala atual.
  const voicesRef = useRef(voices);
  voicesRef.current = voices;
  const voice = voices !== null;
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
    const useVoice = isSpeech && voice && CAN_SPEAK;
    let stopVoice: (() => void) | undefined;
    let tail: ReturnType<typeof setTimeout> | undefined;
    if (useVoice && beat.kind === 'fala') {
      stopVoice = speakAloud(beat.text, voicesRef.current?.[beat.slot] ?? DEFAULT_VOICE, () => {
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

/** Visão da cena num momento do roteiro. */
export function viewFromScript(beats: Beat[], index: number, shown: number, playing: boolean): StageView {
  const i = Math.min(index, Math.max(0, beats.length - 1));
  const beat = beats[i] ?? null;
  const speech = beat?.kind === 'fala' ? beat : null;
  // O pedido ou o aviso que está valendo: o mais recente antes do momento atual.
  let context: StageContext | null = null;
  if (beat?.kind === 'enquete') context = beat;
  else {
    for (let k = i; k >= 0; k--) {
      const b = beats[k]!;
      if (b.kind === 'pedido' || b.kind === 'aviso') {
        context = b;
        break;
      }
    }
  }
  const current = context?.kind === 'pedido' ? context.username : null;
  const names: string[] = [];
  for (let step = 1; step < beats.length && names.length < 3; step++) {
    const b = beats[(i + step) % beats.length]!;
    if (b.kind === 'pedido' && b.username !== current && !names.includes(b.username)) names.push(b.username);
  }
  return {
    context,
    speech: speech ? { slot: speech.slot, text: speech.text } : null,
    shown,
    talking: Boolean(speech && playing && shown < speech.text.length),
    queue: beats.some((b) => b.kind === 'pedido') ? names : null,
    waitText: beat?.kind === 'enquete' ? 'O chat está votando' : beat?.kind === 'pedido' ? 'Pedido na fila' : 'Aguardando a próxima fala',
  };
}

/** Revela a legenda de uma fala ao vivo conforme o tempo passa, desde `startedAt`. */
export function useReveal(speech: { text: string; startedAt: number; durationMs: number } | null): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!speech) {
      setShown(0);
      return;
    }
    const total = speech.text.length;
    if (prefersReducedMotion()) {
      setShown(total);
      return;
    }
    const tick = () => {
      const p = (Date.now() - speech.startedAt) / Math.max(1, speech.durationMs);
      setShown(Math.min(total, Math.max(0, Math.ceil(p * total))));
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [speech?.text, speech?.startedAt, speech?.durationMs]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}

/* ---------- Peças ---------- */

function RequestCard({ context }: { context: Extract<StageContext, { kind: 'pedido' }> }) {
  const space = context.text.indexOf(' ');
  const command = context.text.startsWith('!') ? (space === -1 ? context.text : context.text.slice(0, space)) : '';
  const rest = command ? context.text.slice(command.length) : context.text;
  return (
    <div className="pstage-card" key={`${context.username}${context.text}`}>
      <p className="pstage-card__who">
        <Avatar seed={context.username} size={30} />
        <span>@{context.username}</span>
        {context.gift ? (
          <span className="pstage-card__gift">
            <Gift aria-hidden /> {getGift(context.gift).name}
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

const EVENT_ICONS: Record<EventIcon, LucideIcon> = {
  presente: Gift,
  seguidor: UserPlus,
  compartilhamento: Share2,
  entrada: LogIn,
  meta: Heart,
};

function EventCard({ context }: { context: Extract<StageContext, { kind: 'evento' }> }) {
  const Icon = EVENT_ICONS[context.icon] ?? Sparkles;
  return (
    <div className={`pstage-card pstage-event pstage-event--${context.icon}`} key={`${context.icon}${context.title}`}>
      <Icon aria-hidden />
      <div>
        <p className="pstage-event__title">{context.title}</p>
        {context.detail ? <p className="pstage-event__detail">{context.detail}</p> : null}
      </div>
    </div>
  );
}

function PollCard({ context }: { context: Extract<StageContext, { kind: 'enquete' }> }) {
  const total = context.votes[0] + context.votes[1] || 1;
  const lead = context.votes[0] >= context.votes[1] ? 0 : 1;
  return (
    <div className="pstage-card pstage-poll">
      <p className="pstage-poll__q">{context.question}</p>
      {context.options.map((label, i) => {
        const pct = Math.round((context.votes[i]! / total) * 100);
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

/* ---------- Cena ---------- */

export interface StageSceneProps {
  title: string;
  command?: string;
  slots: StageSlotView[];
  view: StageView;
  /** Selo no canto: "Roteiro de demonstração", "Ao vivo"... */
  badge?: string;
  /** Tela cheia para captura no OBS: ocupa a janela inteira e escolhe o desenho pela orientação. */
  fullscreen?: boolean;
}

export function StageScene({ title, command, slots, view, badge, fullscreen }: StageSceneProps) {
  const { context, speech, shown, talking, queue } = view;
  const speakerSlot = speech ? slots[speech.slot] : null;
  const speaker = speakerSlot ? speakerSlot.boneco?.name ?? speakerSlot.label : null;
  const portrait = useOrientation(Boolean(fullscreen));

  return (
    <div className={`pstage${fullscreen ? ` pstage--cena${portrait ? ' pstage--vertical' : ''}` : ''}`} role="group" aria-label={`Palco: ${title}`}>
      <div className={`pstage__canvas${slots.length > 1 ? ' pstage__canvas--duo' : ''}`}>
        <header className="pstage__top">
          <span className="pstage__format">{title}</span>
          {command ? <span className="pstage__cmd">Participe: {command}</span> : null}
          {badge ? <span className="pstage__demo">{badge}</span> : null}
        </header>

        <div className="pstage__cast">
          {slots.map((slot, i) => {
            const active = speech?.slot === i;
            return (
              <figure
                key={i}
                className={`pstage__host${active ? ' is-speaking' : ''}${speech && !active ? ' is-waiting' : ''}`}
                style={{ '--plate': slot.boneco?.color ?? DEFAULT_COLOR } as CSSProperties}
              >
                <BonecoView boneco={slot.boneco} speaking={active && talking} emptyLabel={`${slot.label}: sem boneco`} />
                <figcaption>{slot.boneco ? slot.boneco.name : slot.label}</figcaption>
              </figure>
            );
          })}
        </div>

        <div className="pstage__side">
          {context?.kind === 'enquete' ? (
            <PollCard context={context} />
          ) : context?.kind === 'pedido' ? (
            <RequestCard context={context} />
          ) : context?.kind === 'evento' ? (
            <EventCard context={context} />
          ) : context?.kind === 'aviso' ? (
            <div className="pstage-card pstage-notice">
              <Megaphone aria-hidden />
              <p>{context.text}</p>
            </div>
          ) : null}
        </div>

        <div className={`pstage__caption${speech ? '' : ' is-empty'}`} aria-hidden>
          {speech && speaker ? (
            <>
              <span className="pstage__speaker">{speaker}</span>
              <p>
                {speech.text.slice(0, shown)}
                <span className="pstage__ghost">{speech.text.slice(shown)}</span>
              </p>
            </>
          ) : (
            <p className="pstage__wait">{view.waitText}</p>
          )}
        </div>

        {queue ? (
          <footer className="pstage__foot">
            <span className="pstage__next-label">Próximos</span>
            {queue.length ? queue.map((name) => <span key={name}>@{name}</span>) : <span className="pstage__next-none">fila vazia</span>}
          </footer>
        ) : null}
      </div>

      {/* Leitores de tela recebem a fala inteira de uma vez, não letra por letra. */}
      <p className="sr-only" role="status">
        {speech && speaker ? `${speaker}: ${speech.text}` : ''}
      </p>
    </div>
  );
}

/** Na tela cheia, a cena empilha quando a janela é mais alta que larga (LIVE vertical). */
function useOrientation(active: boolean): boolean {
  const read = () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
  const [portrait, setPortrait] = useState(read);
  useEffect(() => {
    if (!active) return;
    const on = () => setPortrait(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [active]);
  return portrait;
}
