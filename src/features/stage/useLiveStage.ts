// Palco ao vivo no painel: cria o diretor, liga voz, IA da ponte e eventos da LIVE,
// e envia o estado para a tela do palco (janela capturada no OBS) pelo BroadcastChannel.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { DEFAULT_VOICE, type Boneco } from '../../domain/bonecos';
import { getStageFormat, speechMs, type StageFormatId } from '../../domain/stage';
import type { SlotInfo, StageLiveSettings, StageRequest } from '../../domain/stageLive';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import { askBridgeIa } from '../../services/palcoBridge';
import { StageDirector, type DirectorState } from './director';
import type { StageContext, StageSlotView, StageView } from './StageScene';
import { CAN_SPEAK, silent, speak } from './voice';

/* ---------- Tela do palco (outra janela, mesmo navegador) ---------- */

export const CENA_CHANNEL = 'tokarena-palco';

export interface CenaSnapshot {
  v: 1;
  title: string;
  command?: string;
  slots: { label: string; bonecoId: string | null }[];
  /** Muda quando algum boneco é salvo: a tela recarrega os bonecos. */
  bonecosVersion: number;
  context: StageContext | null;
  speaking: DirectorState['speaking'];
  queue: string[] | null;
  waitText: string;
}

export type CenaMessage = { type: 'hello' } | { type: 'snapshot'; snapshot: CenaSnapshot };

/* ---------- O que mostrar ---------- */

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

export function contextFor(request: StageRequest | null, command: string): StageContext | null {
  if (!request) return null;
  const at = (r: StageRequest) => r.people.map((p) => `@${p.username}`);
  switch (request.kind) {
    case 'pedido':
      return {
        kind: 'pedido',
        username: request.people[0]?.username ?? 'voce',
        text: request.fromPanel ? request.text ?? '' : `${command} ${request.text ?? ''}`,
      };
    case 'presente': {
      const g = request.gift!;
      return {
        kind: 'evento',
        icon: 'presente',
        title: `@${request.people[0]?.username} mandou ${g.count > 1 ? `${g.count}× ` : ''}${g.name}`,
        detail: `${g.diamonds} ${plural(g.diamonds, 'diamante', 'diamantes')}${g.count > 1 ? ' cada' : ''}`,
      };
    }
    case 'seguidor':
      return { kind: 'evento', icon: 'seguidor', title: plural(request.people.length, 'Novo seguidor', 'Novos seguidores'), detail: names(at(request)) };
    case 'compartilhamento':
      return { kind: 'evento', icon: 'compartilhamento', title: 'Compartilharam a LIVE', detail: names(at(request)) };
    case 'entrada':
      return { kind: 'evento', icon: 'entrada', title: plural(request.people.length, 'Chegou na sala', 'Chegaram na sala'), detail: names(at(request)) };
    case 'meta':
      return { kind: 'evento', icon: 'meta', title: 'Meta de curtidas batida!' };
    case 'manual':
      return null;
  }
}

function names(list: string[]): string {
  return list.length <= 4 ? list.join(', ') : `${list.slice(0, 4).join(', ')} e mais ${list.length - 4}`;
}

export function waitTextFor(state: DirectorState, command: string, forViewers: boolean): string {
  switch (state.status) {
    case 'pausado':
      return forViewers ? `Comente ${command} para falar com o palco` : 'Palco pausado';
    case 'pensando':
      return 'Pensando…';
    case 'aprovacao':
      return forViewers ? 'Pensando…' : 'Aguardando a sua aprovação';
    case 'falando':
      return '';
    case 'ocioso':
      return state.queue.length ? 'Preparando a próxima fala' : `Comente ${command} para falar com o palco`;
  }
}

export function viewFromDirector(state: DirectorState, command: string, shown: number, forViewers = false): StageView {
  const queue = state.queue.filter((r) => r.kind === 'pedido').map((r) => r.people[0]?.username ?? '');
  return {
    context: contextFor(state.current, command),
    speech: state.speaking ? { slot: state.speaking.slot, text: state.speaking.text } : null,
    shown,
    talking: Boolean(state.speaking && shown < state.speaking.text.length),
    queue: [...new Set(queue.filter(Boolean))].slice(0, 3),
    waitText: waitTextFor(state, command, forViewers),
  };
}

/* ---------- O hook ---------- */

export interface LiveStageOptions {
  /** Liga a escuta de eventos e o envio para a tela do palco. Fora do modo ao vivo, o diretor fica parado. */
  active: boolean;
  format: StageFormatId;
  slots: StageSlotView[];
  settings: StageLiveSettings;
  voiceOn: boolean;
  /** Endereço da ponte com a IA ligada; null usa só o roteiro. */
  iaUrl: string | null;
  bonecosVersion: number;
}

function slotInfo(slot: StageSlotView): SlotInfo {
  return { label: slot.label, name: slot.boneco?.name ?? null, persona: slot.boneco?.persona ?? '', phrases: slot.boneco?.phrases ?? [] };
}

export function useLiveStage(options: LiveStageOptions) {
  const actions = useActions();
  const participants = useAppState((s) => s.participants);
  const goalReached = useAppState((s) => s.goal.reached, Object.is);
  const latest = useRef(options);
  latest.current = options;
  const peopleRef = useRef(participants);
  peopleRef.current = participants;

  const [director] = useState(
    () =>
      new StageDirector(
        {
          now: () => Date.now(),
          setTimeout: (fn, ms) => setTimeout(fn, ms),
          clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
          ai: async (prompt) => {
            const url = latest.current.iaUrl;
            if (!url) return { ok: false, erro: 'sem-chave', mensagem: 'IA desligada: conecte a ponte com a chave configurada.' };
            return askBridgeIa(url, prompt);
          },
          speak: (text, voice, limitMs) =>
            latest.current.voiceOn && CAN_SPEAK ? speak(text, voice ?? DEFAULT_VOICE, limitMs) : silent(speechMs(text)),
        },
        { format: options.format, slots: options.slots.map(slotInfo), voices: options.slots.map((s) => s.boneco?.voice ?? null), settings: options.settings },
      ),
  );

  // Configuração sempre em dia com o painel.
  const slotKey = options.slots.map((s) => `${s.label}:${s.boneco?.id ?? ''}:${s.boneco?.updatedAt ?? 0}`).join('|');
  useEffect(() => {
    director.setConfig({
      format: options.format,
      slots: options.slots.map(slotInfo),
      voices: options.slots.map((s) => s.boneco?.voice ?? null),
      settings: options.settings,
      viewerFacts: (username) => {
        const p = peopleRef.current.find((x) => x.username === username.toLowerCase());
        if (!p || !p.matches) return undefined;
        return `${p.wins} ${p.wins === 1 ? 'vitória' : 'vitórias'} em ${p.matches} ${p.matches === 1 ? 'partida' : 'partidas'} nos jogos da live`;
      },
    });
  }, [director, options.format, slotKey, options.settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Eventos da LIVE (simulador, Supabase ou ponte) entram no palco só no modo ao vivo.
  useEffect(() => {
    if (!options.active) return;
    return actions.onLiveEvent((event) => director.handleEvent(event));
  }, [actions, director, options.active]);

  // Meta de curtidas batida.
  const lastGoal = useRef(goalReached);
  useEffect(() => {
    if (options.active && goalReached > lastGoal.current) director.goalReached();
    lastGoal.current = goalReached;
  }, [goalReached, options.active, director]);

  // Sair do modo ao vivo pausa o palco.
  useEffect(() => {
    if (!options.active) director.pause();
  }, [options.active, director]);

  useEffect(() => () => director.dispose(), [director]);

  const state = useSyncExternalStore(
    (l) => director.subscribe(l),
    () => director.getState(),
    () => director.getState(),
  );

  // Tela do palco: manda o estado a cada mudança e responde a quem chega.
  const def = getStageFormat(options.format);
  const snapshot: CenaSnapshot = useMemo(
    () => ({
      v: 1,
      title: def.name,
      command: def.command,
      slots: options.slots.map((s) => ({ label: s.label, bonecoId: s.boneco?.id ?? null })),
      bonecosVersion: options.bonecosVersion,
      context: contextFor(state.current, def.command),
      speaking: state.speaking,
      queue: viewFromDirector(state, def.command, 0, true).queue,
      waitText: waitTextFor(state, def.command, true),
    }),
    [state, def, slotKey, options.bonecosVersion], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (!options.active || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CENA_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent<CenaMessage>) => {
      if (e.data?.type === 'hello') channel.postMessage({ type: 'snapshot', snapshot: snapRef.current } satisfies CenaMessage);
    };
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [options.active]);
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'snapshot', snapshot } satisfies CenaMessage);
  }, [snapshot]);

  return { director, state };
}

/** Número que muda sempre que algum boneco é salvo. */
export function bonecosVersion(items: readonly Boneco[]): number {
  return items.reduce((max, b) => Math.max(max, b.updatedAt), 0) + items.length;
}
