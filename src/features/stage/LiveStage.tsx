import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Check,
  Gift,
  Heart,
  LogIn,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Pause,
  Play,
  PlugZap,
  Send,
  Share2,
  SkipForward,
  Trash2,
  Unplug,
  UserPlus,
  Volume2,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SelectField, SwitchRow, TextAreaField, TextField } from '../../components/ui/Controls';
import { Pill } from '../../components/ui/Misc';
import { getStageFormat, type StageFormatId } from '../../domain/stage';
import type { RequestKind, StageLiveSettings, StageRequest } from '../../domain/stageLive';
import type { LiveEvent } from '../../domain/types';
import { giftFromDiamonds } from '../../services/liveEvents';
import { bridgeUrlForPage, cleanBridgeUrl, isServedByBridge, useBridge, type BridgeConnection } from '../../services/palcoBridge';
import { loadJson, saveJson } from '../../services/storage';
import { useActions } from '../../state/AppProvider';
import type { LogEntry } from './director';
import { StageScene, useReveal, type StageSlotView } from './StageScene';
import { bonecosVersion, useLiveStage, viewFromDirector } from './useLiveStage';
import { useSpeechInput } from './useSpeechInput';
import { CAN_SPEAK } from './voice';
import type { Boneco } from '../../domain/bonecos';

const KIND_LABEL: Record<RequestKind, string> = {
  pedido: 'Pedido',
  presente: 'Presente',
  seguidor: 'Seguidor',
  compartilhamento: 'Compartilhamento',
  entrada: 'Entrada',
  meta: 'Meta',
  manual: 'Fala manual',
};

const TIKTOK_LABEL: Record<string, string> = {
  desligado: 'Sem @ (só simulador)',
  conectando: 'Conectando…',
  'ao-vivo': 'Ao vivo',
  reconectando: 'Reconectando…',
  erro: 'Erro',
  encerrada: 'LIVE encerrada',
};

/* Simulador de eventos: as mesmas mensagens que a LIVE mandaria. */
const FAKE_PEOPLE = [
  { username: 'lu_gamer', nickname: 'Lu' },
  { username: 'caio_77', nickname: 'Caio' },
  { username: 'bia.joga', nickname: 'Bia' },
  { username: 'rafa_zx', nickname: 'Rafa' },
  { username: 'duda.ok', nickname: 'Duda' },
  { username: 'nina.play', nickname: 'Nina' },
];

const SAMPLE_REQUEST: Record<StageFormatId, string[]> = {
  'papo-reto': ['qual é o seu maior medo?', 'você prefere pizza ou hambúrguer?', 'me dá uma dica pra dormir cedo'],
  correio: ['manda um beijo pra minha mãe que tá assistindo', 'um salve pro pessoal da escola'],
  oraculo: ['trabalho', 'escola', ''],
  historia: ['aparece um gato falante', 'chove pipoca na cidade', 'o vilão vira vegetariano'],
  tribunal: ['dormi na aula de matemática', 'comi o chocolate do meu irmão'],
  duelo: ['praia ou campo', 'café ou chá', 'cachorro ou gato'],
};

function useStored<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => ({ ...initial, ...(loadJson<T>(key) ?? {}) }) as T);
  return [
    value,
    (next: T) => {
      setValue(next);
      saveJson(key, next);
    },
  ];
}

function time(at: number): string {
  return new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function describe(r: StageRequest): string {
  if (r.kind === 'presente' && r.gift) return `${r.gift.count > 1 ? `${r.gift.count}× ` : ''}${r.gift.name} (${r.gift.diamonds} diamantes)`;
  if (r.kind === 'pedido' || r.kind === 'manual') return r.kind === 'manual' ? (r.text ?? '').split('|').slice(1).join('|') : r.text ?? '';
  return r.people.map((p) => `@${p.username}`).join(', ');
}

/* ---------- Conexão ---------- */

function ConnectionPanel({
  url,
  connected,
  bridge,
  onConnect,
  onDisconnect,
}: {
  url: string;
  connected: boolean;
  bridge: BridgeConnection;
  onConnect: (url: string) => void;
  onDisconnect: () => void;
}) {
  const [draft, setDraft] = useState(url);
  const [error, setError] = useState<string | null>(null);
  const info = bridge.info;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = cleanBridgeUrl(draft);
    if (!clean) return setError('Endereço inválido. Exemplo: http://localhost:8787');
    setError(null);
    onConnect(clean);
  };
  return (
    <section className="panel" aria-labelledby="live-conn">
      <header className="panel__head">
        <h2 className="panel__title" id="live-conn">
          Conexão com a LIVE
        </h2>
        {bridge.status === 'conectada' ? (
          <Pill tone="ok" dot>
            Ponte conectada
          </Pill>
        ) : bridge.status === 'conectando' ? (
          <Pill tone="warn" dot>
            Conectando
          </Pill>
        ) : (
          <Pill>Sem ponte</Pill>
        )}
      </header>
      <div className="palco-info__body">
        {connected ? (
          <>
            <dl className="live-status">
              <div>
                <dt>TikTok</dt>
                <dd>
                  {info ? (
                    <>
                      {TIKTOK_LABEL[info.tiktok] ?? info.tiktok}
                      {info.handle ? ` · @${info.handle}` : ''}
                    </>
                  ) : (
                    '…'
                  )}
                </dd>
              </div>
              <div>
                <dt>IA</dt>
                <dd>{info ? (info.ia.ligada ? `Ligada · ${info.ia.modelo}` : 'Desligada (sem chave na ponte)') : '…'}</dd>
              </div>
            </dl>
            {info?.mensagem ? <p className="palco-info__summary">{info.mensagem}</p> : null}
            {bridge.error ? (
              <p className="palco__warn" role="alert">
                {bridge.error}
              </p>
            ) : null}
            <Button size="sm" variant="ghost" icon={Unplug} onClick={onDisconnect}>
              Desconectar a ponte
            </Button>
          </>
        ) : (
          <form className="live-conn__form" onSubmit={submit}>
            <p className="palco-info__summary">
              Para usar na sua LIVE, rode a ponte no seu computador: <code>npm run palco -- @seu_usuario</code>. Sem ela, o palco funciona com o simulador e
              falas de roteiro.
            </p>
            <TextField label="Endereço da ponte" value={draft} error={error} onChange={(e) => setDraft(e.target.value)} />
            <Button type="submit" variant="primary" size="sm" icon={PlugZap}>
              Conectar à ponte
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

/* ---------- Fila e histórico ---------- */

function QueuePanel({ queue, onRemove, onClear }: { queue: StageRequest[]; onRemove: (id: string) => void; onClear: () => void }) {
  return (
    <section className="panel" aria-labelledby="live-queue">
      <header className="panel__head">
        <h2 className="panel__title" id="live-queue">
          Fila <span className="live-count">{queue.length}</span>
        </h2>
        {queue.length ? (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={onClear}>
            Limpar
          </Button>
        ) : null}
      </header>
      {queue.length ? (
        <ul className="live-list">
          {queue.map((r) => (
            <li key={r.id}>
              <div>
                <p className="live-list__head">
                  <span className="live-kind">{KIND_LABEL[r.kind]}</span>
                  {r.people[0] && r.kind !== 'seguidor' && r.kind !== 'compartilhamento' && r.kind !== 'entrada' ? <span>@{r.people[0].username}</span> : null}
                </p>
                <p className="live-list__text">{describe(r)}</p>
              </div>
              <Button size="sm" variant="ghost" iconOnly icon={X} aria-label={`Tirar da fila: ${KIND_LABEL[r.kind]} ${describe(r)}`} onClick={() => onRemove(r.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="live-empty">Nada na fila. Comentários com o comando, presentes e seguidores entram aqui.</p>
      )}
    </section>
  );
}

function LogPanel({ log }: { log: LogEntry[] }) {
  return (
    <section className="panel" aria-labelledby="live-log">
      <header className="panel__head">
        <h2 className="panel__title" id="live-log">
          Histórico
        </h2>
      </header>
      {log.length ? (
        <ol className="live-list live-log">
          {log.map((entry) => (
            <li key={`${entry.id}-${entry.at}`} className={entry.dropped ? 'is-dropped' : undefined}>
              <div>
                <p className="live-list__head">
                  <time>{time(entry.at)}</time>
                  <span className="live-kind">{KIND_LABEL[entry.kind]}</span>
                  <span>{entry.who}</span>
                  {entry.dropped ? (
                    <Pill tone="danger">Não foi ao ar</Pill>
                  ) : entry.source === 'ia' ? (
                    <Pill tone="ok">IA{entry.ms ? ` · ${(entry.ms / 1000).toFixed(1).replace('.', ',')} s` : ''}</Pill>
                  ) : entry.source === 'manual' ? (
                    <Pill tone="outline">Manual</Pill>
                  ) : (
                    <Pill tone="warn">Roteiro</Pill>
                  )}
                </p>
                {entry.asked ? <p className="live-list__asked">“{entry.asked}”</p> : null}
                {entry.lines.map((line, i) => (
                  <p className="live-list__text" key={i}>
                    <b>{entry.names[i] ?? 'Boneco'}:</b> {line.text}
                  </p>
                ))}
                {entry.note ? <p className="live-list__note">{entry.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="live-empty">As falas aparecem aqui, com a origem (IA ou roteiro) e o tempo de resposta.</p>
      )}
    </section>
  );
}

/* ---------- Modo ao vivo ---------- */

export const DEFAULT_SPEAK_AS = 'voce';

export function LiveStage({
  format,
  slots,
  bonecos,
  settings,
  onSettings,
  castPanel,
}: {
  format: StageFormatId;
  slots: StageSlotView[];
  bonecos: readonly Boneco[];
  settings: StageLiveSettings;
  onSettings: (next: StageLiveSettings) => void;
  /** Painel "Em cena" (escolha dos bonecos), mostrado no alto da coluna lateral. */
  castPanel?: ReactNode;
}) {
  const actions = useActions();
  const def = getStageFormat(format);
  const [voiceOn, setVoiceOn] = useState(CAN_SPEAK);
  const [storedBridge, storeBridge] = useStored<{ url: string; on: boolean }>('palco-ponte', { url: bridgeUrlForPage(), on: false });
  // Aberto pela própria ponte: conecta nela sozinho (a não ser que o criador desconecte).
  const [servedOn, setServedOn] = useState(isServedByBridge);
  const served = isServedByBridge();
  const bridgeCfg = served ? { url: bridgeUrlForPage(), on: servedOn } : storedBridge;
  const setBridgeCfg = (next: { url: string; on: boolean }) => (served ? setServedOn(next.on) : storeBridge(next));
  const bridge = useBridge(bridgeCfg.on ? bridgeCfg.url : null, (event: LiveEvent) => actions.emit(event));
  const iaUrl = bridge.status === 'conectada' && bridge.info?.ia.ligada ? bridgeCfg.url : null;

  // LIVE real pela ponte: o painel inteiro mostra "ao vivo" com o @ certo.
  const tiktok = bridge.info?.tiktok;
  const handle = bridge.info?.handle;
  useEffect(() => {
    if (tiktok === 'ao-vivo' && handle) {
      actions.setHandle(handle);
      actions.forceConnection('ao-vivo');
    }
  }, [tiktok, handle, actions]);

  const { director, state } = useLiveStage({ active: true, format, slots, settings, voiceOn, iaUrl, bonecosVersion: bonecosVersion(bonecos) });
  const shown = useReveal(state.speaking);
  const view = viewFromDirector(state, def.command, shown);
  const running = state.status !== 'pausado';

  const [speakAs, setSpeakAs] = useState(DEFAULT_SPEAK_AS);
  const [draft, setDraft] = useState('');
  const [manual, setManual] = useState('');
  const [manualSlot, setManualSlot] = useState(0);
  const askAs = (text: string) => {
    const user = speakAs.replace(/^@/, '').trim() || DEFAULT_SPEAK_AS;
    director.ask(text, user, user === DEFAULT_SPEAK_AS ? 'Você' : undefined);
  };
  const mic = useSpeechInput((text) => askAs(text));

  const sendDraft = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    askAs(draft);
    setDraft('');
  };
  const sendManual = (e: FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    director.say(manual, manualSlot);
    setManual('');
  };

  const [n, setN] = useState(0);
  const person = () => {
    setN((x) => x + 1);
    return FAKE_PEOPLE[(n + Math.floor(Math.random() * FAKE_PEOPLE.length)) % FAKE_PEOPLE.length]!;
  };
  const sample = SAMPLE_REQUEST[format];
  const emitGift = (name: string, diamonds: number) => actions.emit({ type: 'gift', ...person(), gift: giftFromDiamonds(diamonds), giftName: name, diamonds });

  const openScreen = () => {
    const base = `${window.location.origin}${window.location.pathname}`;
    window.open(`${base}#/palco-cena`, 'palco-cena', 'popup,width=540,height=960');
  };

  const nameOf = (slot: number) => slots[slot]?.boneco?.name ?? slots[slot]?.label ?? 'Boneco';
  const badge = !running ? 'Pausado' : iaUrl ? 'Ao vivo · IA' : 'Ao vivo · roteiro';
  const set = <K extends keyof StageLiveSettings>(key: K, value: StageLiveSettings[K]) => onSettings({ ...settings, [key]: value });

  const status = useMemo(
    () =>
      ({ pausado: 'Pausado', ocioso: 'Esperando pedidos', pensando: 'Pensando', aprovacao: 'Aguardando aprovação', falando: 'Falando' })[state.status],
    [state.status],
  );

  return (
    <div className="palco__main">
      <section aria-label="Palco ao vivo" className="live-main">
        <StageScene title={def.name} command={def.command} slots={slots} view={view} badge={badge} />

        <div className="palco__controls">
          {running ? (
            <Button variant="primary" icon={Pause} onClick={() => director.pause()}>
              Pausar palco
            </Button>
          ) : (
            <Button variant="primary" icon={Play} onClick={() => director.start()}>
              Ligar palco
            </Button>
          )}
          <Button icon={SkipForward} onClick={() => director.skip()} disabled={!state.current}>
            Pular
          </Button>
          <Button variant="ghost" icon={MonitorUp} onClick={openScreen}>
            Abrir tela do palco
          </Button>
          <p className="live-state" role="status">
            {status}
            {state.spoken ? ` · ${state.spoken} ${state.spoken === 1 ? 'fala' : 'falas'}, ${state.fromAi} da IA` : ''}
          </p>
        </div>

        {state.approval ? (
          <section className="panel live-approve" aria-labelledby="live-approve">
            <header className="panel__head">
              <h2 className="panel__title" id="live-approve">
                Aprovar antes de falar
              </h2>
              <Pill tone={state.approval.source === 'ia' ? 'ok' : 'warn'}>{state.approval.source === 'ia' ? 'IA' : 'Roteiro'}</Pill>
            </header>
            <div className="palco-info__body">
              {state.approval.request.text && state.approval.request.kind === 'pedido' ? (
                <p className="live-list__asked">
                  @{state.approval.request.people[0]?.username}: “{state.approval.request.text}”
                </p>
              ) : null}
              {state.approval.lines.map((line, i) => (
                <p key={i}>
                  <b>{nameOf(line.slot)}:</b> {line.text}
                </p>
              ))}
              {state.approval.note ? <p className="live-list__note">{state.approval.note}</p> : null}
              <div className="palco__controls">
                <Button variant="primary" icon={Check} onClick={() => director.approve()}>
                  Aprovar e falar
                </Button>
                <Button variant="danger" icon={X} onClick={() => director.reject()}>
                  Descartar
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="panel" aria-labelledby="live-talk">
          <header className="panel__head">
            <h2 className="panel__title" id="live-talk">
              Fale com os bonecos
            </h2>
          </header>
          <div className="palco-info__body">
            <form className="live-talk" onSubmit={sendDraft}>
              {mic.supported ? (
                <Button
                  className="live-mic"
                  variant={mic.listening ? 'danger' : 'secondary'}
                  icon={mic.listening ? MicOff : Mic}
                  aria-pressed={mic.listening}
                  onClick={() => (mic.listening ? mic.stop() : mic.start())}
                >
                  {mic.listening ? 'Ouvindo… toque para parar' : 'Falar no microfone'}
                </Button>
              ) : null}
              <TextField
                label="Escreva um pedido"
                placeholder={mic.interim || `Pergunte algo. Não precisa do ${def.command}`}
                value={draft}
                maxLength={200}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button type="submit" icon={Send} disabled={!draft.trim()}>
                Enviar
              </Button>
            </form>
            {mic.error ? (
              <p className="palco__warn" role="alert">
                {mic.error}
              </p>
            ) : null}
            <div className="live-talk__as">
              <TextField label="Falar como" prefix="@" value={speakAs} maxLength={24} hint="O boneco chama você por este nome." onChange={(e) => setSpeakAs(e.target.value)} />
            </div>
            {!mic.supported ? <p className="field__hint">Este navegador não reconhece voz. No Chrome ou no Edge, o botão de microfone aparece aqui.</p> : null}

            <form className="live-talk live-talk--manual" onSubmit={sendManual}>
              <TextField label="Fala manual (o boneco diz exatamente isto)" value={manual} maxLength={300} onChange={(e) => setManual(e.target.value)} />
              {slots.length > 1 ? (
                <SelectField label="Quem fala" value={String(manualSlot)} onChange={(e) => setManualSlot(Number(e.target.value))}>
                  {slots.map((_, i) => (
                    <option key={i} value={i}>
                      {nameOf(i)}
                    </option>
                  ))}
                </SelectField>
              ) : null}
              <Button type="submit" variant="ghost" icon={Volume2} disabled={!manual.trim()}>
                Falar agora
              </Button>
            </form>
          </div>
        </section>

        <section className="panel" aria-labelledby="live-sim">
          <header className="panel__head">
            <h2 className="panel__title" id="live-sim">
              Simular eventos da LIVE
            </h2>
          </header>
          <div className="palco-info__body">
            <p className="palco-info__summary">Os mesmos eventos que a LIVE manda, para testar sem estar no ar. Também aparecem no resto do painel.</p>
            <div className="live-sim">
              <Button size="sm" icon={MessageSquare} onClick={() => actions.emit({ type: 'comment', ...person(), text: `${def.command} ${sample[Math.floor(Math.random() * sample.length)]}`.trim() })}>
                Comentário {def.command}
              </Button>
              <Button size="sm" icon={UserPlus} onClick={() => actions.emit({ type: 'follow', ...person() })}>
                Novo seguidor
              </Button>
              <Button size="sm" icon={Gift} onClick={() => emitGift('Rosa', 1)}>
                Presente pequeno
              </Button>
              <Button size="sm" icon={Gift} onClick={() => emitGift('Galáxia', 1000)}>
                Presente grande
              </Button>
              <Button size="sm" icon={Share2} onClick={() => actions.emit({ type: 'share', ...person() })}>
                Compartilhar
              </Button>
              <Button size="sm" icon={LogIn} onClick={() => actions.emit({ type: 'enter', ...person() })}>
                Entrou na sala
              </Button>
              <Button size="sm" icon={Heart} onClick={() => actions.emit({ type: 'like', ...person(), count: 250 })}>
                250 curtidas
              </Button>
            </div>
          </div>
        </section>
      </section>

      <div className="palco__aside">
        {castPanel}
        <ConnectionPanel
          url={bridgeCfg.url}
          connected={bridgeCfg.on}
          bridge={bridge}
          onConnect={(url) => setBridgeCfg({ url, on: true })}
          onDisconnect={() => setBridgeCfg({ ...bridgeCfg, on: false })}
        />

        <section className="panel" aria-labelledby="live-opts">
          <header className="panel__head">
            <h2 className="panel__title" id="live-opts">
              Reações
            </h2>
          </header>
          <div className="palco-info__body live-opts">
            <SwitchRow label="Voz" hint={CAN_SPEAK ? 'Fala com a voz de cada boneco. Desligada, só legenda.' : 'Este navegador não tem voz sintetizada.'} checked={voiceOn && CAN_SPEAK} disabled={!CAN_SPEAK} onChange={setVoiceOn} />
            <SwitchRow label="Aprovar antes de falar" hint="Cada fala espera o seu clique. Recomendado nas primeiras LIVEs." checked={settings.approve} onChange={(v) => set('approve', v)} />
            <SwitchRow label="Agradecer presentes" checked={settings.thankGifts} onChange={(v) => set('thankGifts', v)} />
            <SwitchRow label="Cumprimentar novos seguidores" checked={settings.greetFollows} onChange={(v) => set('greetFollows', v)} />
            <SwitchRow label="Agradecer compartilhamentos" checked={settings.thankShares} onChange={(v) => set('thankShares', v)} />
            <SwitchRow label="Comemorar a meta de curtidas" checked={settings.celebrateGoal} onChange={(v) => set('celebrateGoal', v)} />
            <SwitchRow label="Cumprimentar quem entra" hint="Bom para salas pequenas. Em sala cheia, vira fila de cumprimentos." checked={settings.greetEnters} onChange={(v) => set('greetEnters', v)} />
            <SwitchRow label="Responder comentários sem comando" hint={`Sem isso, só comentários com ${def.command} viram pedido.`} checked={settings.anyComment} onChange={(v) => set('anyComment', v)} />
            <TextAreaField
              label="Palavras bloqueadas"
              rows={3}
              value={settings.blocked}
              hint="Uma por linha, além da lista padrão. Pedido com elas é ignorado; fala da IA com elas é trocada pelo roteiro."
              onChange={(e) => set('blocked', e.target.value)}
            />
          </div>
        </section>

        <QueuePanel queue={state.queue} onRemove={(id) => director.remove(id)} onClear={() => director.clearQueue()} />
        <LogPanel log={state.log} />
      </div>
    </div>
  );
}
