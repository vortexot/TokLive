// Diretor do Palco ao vivo: recebe eventos e pedidos, decide quem fala, pede a fala à IA (ou usa o roteiro),
// espera aprovação quando ligada, fala e registra. Não depende de React nem do navegador: tudo vem por `deps`.

import type { BonecoVoice } from '../../domain/bonecos';
import { speechMs, type StageFormatId } from '../../domain/stage';
import {
  DEFAULT_LIVE_SETTINGS,
  acceptLines,
  blockedTerms,
  buildPrompt,
  enqueue,
  extendStory,
  hasBlockedTerm,
  isGreeting,
  isNoise,
  joinNames,
  looksLikeInjection,
  maxCharsFor,
  personFrom,
  pickNext,
  pruneQueue,
  requestFromEvent,
  scriptedLines,
  speakersFor,
  greetingReadyAt,
  type Line,
  type RequestKind,
  type SlotInfo,
  type StageLiveSettings,
  type StageRequest,
} from '../../domain/stageLive';
import type { LiveEvent } from '../../domain/types';

export type IaReply =
  | { ok: true; falas: { vaga: number; texto: string }[]; ms: number; modelo: string }
  | { ok: false; erro: string; mensagem: string };

export interface SpeechHandleLike {
  done: Promise<void>;
  cancel(): void;
}

export interface DirectorDeps {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
  /** Pede as falas à IA. Sem isto (ou com a IA desligada), o palco usa o roteiro. */
  ai?: ((prompt: ReturnType<typeof buildPrompt>) => Promise<IaReply>) | null;
  /** Fala o texto. `limitMs` é o teto de segurança. */
  speak(text: string, voice: BonecoVoice | null, limitMs: number): SpeechHandleLike;
}

export interface DirectorConfig {
  format: StageFormatId;
  slots: SlotInfo[];
  voices: (BonecoVoice | null)[];
  settings: StageLiveSettings;
  /** O que o TokArena sabe de um espectador, para a IA personalizar (ex.: "3 vitórias em 10 partidas"). */
  viewerFacts?: (username: string) => string | undefined;
}

export type DirectorStatus = 'pausado' | 'ocioso' | 'pensando' | 'aprovacao' | 'falando';
export type LineSource = 'ia' | 'roteiro' | 'manual';

export interface LogEntry {
  id: string;
  at: number;
  kind: RequestKind;
  who: string;
  /** O que a pessoa pediu (pedidos do chat e do painel). */
  asked?: string;
  lines: Line[];
  /** Nome de quem disse cada fala, na hora em que foi dita (o elenco pode mudar depois). */
  names: string[];
  source: LineSource;
  /** Por que não veio da IA, quando não veio. */
  note?: string;
  ms?: number;
  /** Ignorado: bloqueado, ruído, descartado na aprovação. Nada foi falado. */
  dropped?: boolean;
}

export interface Speaking {
  slot: number;
  text: string;
  startedAt: number;
  durationMs: number;
}

export interface DirectorState {
  status: DirectorStatus;
  queue: StageRequest[];
  /** Pedido em atendimento (pensando, aguardando aprovação ou falando). */
  current: StageRequest | null;
  speaking: Speaking | null;
  approval: { request: StageRequest; lines: Line[]; source: LineSource; note?: string } | null;
  log: LogEntry[];
  /** Total de falas que foram ao ar e quantas vieram da IA. */
  spoken: number;
  fromAi: number;
}

const LOG_MAX = 60;
const GAP_BETWEEN_LINES = 450;
const GAP_AFTER_TURN = 900;

export class StageDirector {
  private state: DirectorState = { status: 'pausado', queue: [], current: null, speaking: null, approval: null, log: [], spoken: 0, fromAi: 0 };
  private listeners = new Set<() => void>();
  private config: DirectorConfig;
  private seq = 0;
  private turn = 0;
  private giftsInARow = 0;
  private lastGreetAt = Number.NEGATIVE_INFINITY;
  private recent: string[] = [];
  private history = new Map<string, { question: string; answer: string }[]>();
  private story = '';
  private wake: unknown = null;
  private handle: SpeechHandleLike | null = null;
  private skipTurn = false;
  private disposed = false;
  private resolveApproval: ((ok: boolean) => void) | null = null;
  private paused = true;

  constructor(
    private readonly deps: DirectorDeps,
    config: DirectorConfig,
  ) {
    this.config = { ...config, settings: { ...DEFAULT_LIVE_SETTINGS, ...config.settings } };
  }

  /* ----- leitura ----- */

  getState(): DirectorState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(patch: Partial<DirectorState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}${this.deps.now().toString(36)}-${this.seq}`;
  }

  /* ----- configuração ----- */

  setConfig(patch: Partial<DirectorConfig>) {
    const formatChanged = patch.format && patch.format !== this.config.format;
    this.config = { ...this.config, ...patch };
    if (formatChanged) {
      // Pedidos do chat eram para o quadro anterior; eventos (presentes, seguidores) continuam valendo.
      this.story = '';
      this.set({ queue: this.state.queue.filter((r) => r.kind !== 'pedido') });
    }
  }

  /* ----- controle ----- */

  /** Liga o palco (ou retoma depois de pausar). */
  start() {
    this.paused = false;
    if (this.state.status === 'pausado') this.set({ status: 'ocioso' });
    this.pump();
  }

  /** Pausa depois da fala atual. Pedidos continuam entrando na fila. */
  pause() {
    this.paused = true;
    if (this.state.status === 'ocioso') this.set({ status: 'pausado' });
  }

  /** Corta a fala atual e passa para o próximo pedido. */
  skip() {
    this.skipTurn = true;
    this.handle?.cancel();
    if (this.state.status === 'aprovacao') this.reject();
  }

  approve() {
    this.resolveApproval?.(true);
  }

  reject() {
    this.resolveApproval?.(false);
  }

  remove(id: string) {
    this.set({ queue: this.state.queue.filter((r) => r.id !== id) });
  }

  clearQueue() {
    this.set({ queue: [] });
  }

  dispose() {
    this.disposed = true;
    this.handle?.cancel();
    this.resolveApproval?.(false);
    if (this.wake !== null) this.deps.clearTimeout(this.wake);
    this.listeners.clear();
  }

  /* ----- entradas ----- */

  /** Evento da LIVE (ou do simulador). */
  handleEvent(event: LiveEvent) {
    const request = requestFromEvent(event, this.config.format, this.config.settings, { id: this.nextId('e'), now: this.deps.now() });
    if (request) this.add(request);
  }

  /** Pedido feito pelo criador no painel (microfone ou texto), sem precisar do comando. */
  ask(text: string, username = 'voce', nickname?: string) {
    const clean = text.replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!clean) return;
    const person = personFrom(username, nickname) ?? { username: 'voce', name: 'Você' };
    const now = this.deps.now();
    this.add({ id: this.nextId('a'), kind: 'pedido', at: now, lastAt: now, people: [person], text: clean, fromPanel: true });
  }

  /** O boneco fala exatamente este texto, na frente da fila. */
  say(text: string, slot = 0) {
    const clean = text.replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!clean) return;
    const now = this.deps.now();
    this.add({ id: this.nextId('m'), kind: 'manual', at: now, lastAt: now, people: [], text: `${slot}|${clean}` });
  }

  /** O chat bateu a meta de curtidas. */
  goalReached() {
    if (!this.config.settings.celebrateGoal) return;
    const now = this.deps.now();
    this.add({ id: this.nextId('g'), kind: 'meta', at: now, lastAt: now, people: [] });
  }

  private add(request: StageRequest) {
    this.set({ queue: enqueue(this.state.queue, request) });
    this.pump();
  }

  /* ----- laço ----- */

  private pump() {
    if (this.disposed || this.state.status !== 'ocioso' || this.paused) return;
    if (this.wake !== null) {
      this.deps.clearTimeout(this.wake);
      this.wake = null;
    }
    const now = this.deps.now();
    const queue = pruneQueue(this.state.queue, now);
    if (queue.length !== this.state.queue.length) this.set({ queue });
    const next = pickNext(queue, { now, giftsInARow: this.giftsInARow, lastGreetAt: this.lastGreetAt });
    if (!next) {
      // Só cumprimentos esperando o intervalo: acorda quando der.
      const greetings = queue.filter((r) => isGreeting(r.kind));
      if (greetings.length) {
        const readyAt = Math.min(...greetings.map((r) => greetingReadyAt(r, this.lastGreetAt)));
        const wait = Math.max(50, readyAt - now);
        this.wake = this.deps.setTimeout(() => {
          this.wake = null;
          this.pump();
        }, wait);
      }
      return;
    }
    this.set({ queue: queue.filter((r) => r.id !== next.id), current: next, status: 'pensando' });
    void this.serve(next);
  }

  private async serve(request: StageRequest) {
    let turn: { lines: Line[]; source: LineSource; note?: string; ms?: number } | null = null;
    try {
      turn = await this.generate(request);
    } catch (error) {
      turn = { lines: this.scripted(request), source: 'roteiro', note: error instanceof Error ? error.message : 'erro inesperado' };
    }
    if (this.disposed) return;
    if (!turn) return this.finish();

    if (this.config.settings.approve && turn.source !== 'manual') {
      this.set({ status: 'aprovacao', approval: { request, lines: turn.lines, source: turn.source, note: turn.note } });
      const ok = await new Promise<boolean>((resolve) => (this.resolveApproval = resolve));
      this.resolveApproval = null;
      this.set({ approval: null });
      if (this.disposed) return;
      if (!ok) {
        this.log(request, { ...turn, dropped: true, note: 'descartado na aprovação' });
        return this.finish();
      }
    }

    this.set({ status: 'falando' });
    this.skipTurn = false;
    for (let i = 0; i < turn.lines.length && !this.skipTurn && !this.disposed; i++) {
      const line = turn.lines[i]!;
      const durationMs = speechMs(line.text);
      this.set({ speaking: { slot: line.slot, text: line.text, startedAt: this.deps.now(), durationMs } });
      this.handle = this.deps.speak(line.text, this.config.voices[line.slot] ?? null, Math.max(8000, durationMs * 3));
      await this.handle.done;
      this.handle = null;
      if (i < turn.lines.length - 1) await this.sleep(GAP_BETWEEN_LINES);
    }
    if (this.disposed) return;

    // Memória: o que foi dito, conversa com a pessoa e a história em andamento.
    const spokenText = turn.lines.map((l) => l.text);
    this.recent = [...this.recent, ...spokenText].slice(-6);
    const who = request.people[0]?.username;
    if (request.kind === 'pedido' && who && request.text) {
      const past = this.history.get(who) ?? [];
      this.history.set(who, [...past, { question: request.text, answer: spokenText.join(' ') }].slice(-2));
    }
    if (request.kind === 'pedido' && this.config.format === 'historia') this.story = extendStory(this.story, spokenText.join(' '));
    if (isGreeting(request.kind)) this.lastGreetAt = this.deps.now();
    this.giftsInARow = request.kind === 'presente' ? this.giftsInARow + 1 : request.kind === 'pedido' ? 0 : this.giftsInARow;
    this.log(request, turn);
    this.set({ spoken: this.state.spoken + turn.lines.length, fromAi: this.state.fromAi + (turn.source === 'ia' ? turn.lines.length : 0) });
    await this.sleep(GAP_AFTER_TURN);
    this.finish();
  }

  private finish() {
    if (this.disposed) return;
    this.set({ current: null, speaking: null, status: this.paused ? 'pausado' : 'ocioso' });
    this.pump();
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => this.deps.setTimeout(resolve, ms));
  }

  private log(request: StageRequest, entry: { lines: Line[]; source: LineSource; note?: string; ms?: number; dropped?: boolean }) {
    const names = entry.lines.map((l) => this.config.slots[l.slot]?.name ?? this.config.slots[l.slot]?.label ?? 'Boneco');
    const item: LogEntry = {
      names,
      id: request.id,
      at: this.deps.now(),
      kind: request.kind,
      who: request.kind === 'manual' ? 'Você (fala manual)' : request.fromPanel ? `Você como @${request.people[0]?.username}` : joinNames(request.people) || 'Chat',
      asked: request.kind === 'pedido' ? request.text : undefined,
      ...entry,
    };
    this.set({ log: [item, ...this.state.log].slice(0, LOG_MAX) });
  }

  /* ----- o que falar ----- */

  private speakers(request: StageRequest): number[] {
    const n = Math.max(1, this.config.slots.length);
    const speakers = speakersFor(this.config.format, request.kind, n, this.turn);
    if (request.kind !== 'pedido') this.turn += 1;
    return speakers;
  }

  private scripted(request: StageRequest, speakers = this.speakers(request)): Line[] {
    return scriptedLines(request, this.config.format, this.config.slots, speakers);
  }

  private async generate(request: StageRequest): Promise<{ lines: Line[]; source: LineSource; note?: string; ms?: number } | null> {
    const terms = blockedTerms(this.config.settings.blocked);

    if (request.kind === 'manual') {
      const raw = request.text ?? '';
      const bar = raw.indexOf('|');
      const slot = Math.min(Math.max(0, Number(raw.slice(0, bar)) || 0), Math.max(0, this.config.slots.length - 1));
      return { lines: [{ slot, text: raw.slice(bar + 1) }], source: 'manual' };
    }

    // Nome bloqueado (apelido ofensivo) não vai ao ar: a pessoa vira "visitante".
    const safe: StageRequest = { ...request, people: request.people.map((p) => (hasBlockedTerm(`${p.name} ${p.username}`, terms) ? { ...p, name: 'visitante' } : p)) };

    if (safe.kind === 'pedido') {
      const text = safe.text ?? '';
      if (hasBlockedTerm(text, terms)) {
        this.log(safe, { lines: [], source: 'roteiro', note: 'bloqueado pelo filtro de termos', dropped: true });
        return null;
      }
      if (isNoise(text)) {
        this.log(safe, { lines: [], source: 'roteiro', note: 'ignorado: mensagem sem conteúdo', dropped: true });
        return null;
      }
      if (looksLikeInjection(text)) {
        const speakers = this.speakers(safe);
        const name = safe.people[0]?.name ?? 'visitante';
        return { lines: [{ slot: speakers[0]!, text: `${name}, minhas regras ficam trancadas. Manda outra pergunta!` }], source: 'roteiro', note: 'tentativa de mudar as regras' };
      }
    }

    const speakers = this.speakers(safe);
    if (!this.deps.ai) return { lines: this.scripted(safe, speakers), source: 'roteiro', note: 'IA desligada' };

    const who = safe.people[0]?.username;
    const prompt = buildPrompt({
      format: this.config.format,
      slots: this.config.slots,
      request: safe,
      speakers,
      recent: this.recent,
      history: who ? this.history.get(who) ?? [] : [],
      story: this.story || undefined,
      viewerFacts: who ? this.config.viewerFacts?.(who) : undefined,
    });
    const reply = await this.deps.ai(prompt);
    if (!reply.ok) return { lines: this.scripted(safe, speakers), source: 'roteiro', note: reply.mensagem };
    const lines = acceptLines({ falas: reply.falas }, speakers, maxCharsFor(this.config.format, safe.kind), terms);
    if (!lines) return { lines: this.scripted(safe, speakers), source: 'roteiro', note: 'resposta da IA descartada pelo filtro' };
    return { lines, source: 'ia', ms: reply.ms };
  }
}
