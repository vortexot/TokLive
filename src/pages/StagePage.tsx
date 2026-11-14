import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pause, Play, Plus, RotateCcw, Send, SkipForward } from 'lucide-react';
import { Button, ButtonLink } from '../components/ui/Button';
import { Segmented, SelectField, SwitchRow, TextField } from '../components/ui/Controls';
import { KeyValue } from '../components/ui/Misc';
import { DEFAULT_VOICE, type Boneco } from '../domain/bonecos';
import { DEMO_SCRIPTS, STAGE_FORMATS, getStageFormat, isStageFormatId, resolveCast, scriptedReply, type Beat, type StageCast, type StageFormatId } from '../domain/stage';
import { DEFAULT_LIVE_SETTINGS, type StageLiveSettings } from '../domain/stageLive';
import { LiveStage } from '../features/stage/LiveStage';
import { PalcoTabs } from '../features/stage/PalcoTabs';
import { StageScene, useStagePlayer, viewFromScript, type StageSlotView } from '../features/stage/StageScene';
import { CAN_SPEAK } from '../features/stage/voice';
import { useBonecos } from '../services/bonecoStore';
import { loadJson, saveJson } from '../services/storage';
import '../features/stage/stage.css';

const CAST_KEY = 'palco-elenco';
const FORMAT_KEY = 'palco-quadro';
const MODE_KEY = 'palco-modo';
const SETTINGS_KEY = 'palco-opcoes';

type Mode = 'demo' | 'aovivo';

/** Escolhas do criador por vaga: id do boneco, ou "" para "nenhum". Vagas nunca mexidas ficam de fora. */
type SavedCast = Partial<Record<StageFormatId, string[]>>;

function DemoStage({ formatId, slots, lead }: { formatId: StageFormatId; slots: StageSlotView[]; lead: Boneco | null }) {
  const format = getStageFormat(formatId);
  const [extra, setExtra] = useState<Beat[]>([]);
  const [playing, setPlaying] = useState(true);
  const [voice, setVoice] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => setExtra([]), [formatId]);

  const beats = useMemo(() => [...extra, ...DEMO_SCRIPTS[formatId]], [extra, formatId]);
  const voices = useMemo(() => (voice ? slots.map((s) => s.boneco?.voice ?? DEFAULT_VOICE) : null), [voice, slots]);
  const player = useStagePlayer(beats, playing, voices);

  const sendDraft = (event: FormEvent) => {
    event.preventDefault();
    const reply = scriptedReply(formatId, 'voce', draft, lead?.phrases ?? []);
    if (!reply.length) return;
    setExtra(reply);
    setPlaying(true);
    setDraft('');
  };

  return (
    <section aria-label="Palco">
      <StageScene
        title={format.name}
        command={format.command}
        slots={slots}
        view={viewFromScript(beats, player.index, player.shown, playing)}
        badge="Roteiro de demonstração"
      />

      <div className="palco__controls">
        <Button variant="primary" icon={playing ? Pause : Play} onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pausar' : 'Continuar'}
        </Button>
        <Button icon={SkipForward} onClick={player.next}>
          Pular
        </Button>
        <Button variant="ghost" icon={RotateCcw} onClick={player.restart}>
          Recomeçar
        </Button>
        <div className="palco__voice">
          <SwitchRow
            label="Voz do navegador"
            hint={CAN_SPEAK ? 'Demonstração: usa a voz do seu navegador, com o tom e a velocidade de cada boneco.' : 'Este navegador não oferece voz sintetizada.'}
            checked={voice && CAN_SPEAK}
            onChange={setVoice}
            disabled={!CAN_SPEAK}
          />
        </div>
      </div>

      <form className="palco__try" onSubmit={sendDraft}>
        <TextField
          label="Testar um pedido"
          placeholder={`Escreva como um espectador. O comando ${format.command} entra sozinho`}
          value={draft}
          maxLength={140}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" icon={Send} disabled={!draft.trim()}>
          Enviar ao palco
        </Button>
        <p className="palco__try-hint">
          {lead?.phrases.length
            ? `A resposta sai das falas prontas de ${lead.name}. Para respostas da IA, use o modo Ao vivo.`
            : 'Sem falas prontas no boneco da vaga, a resposta usa frases padrão. Para respostas da IA, use o modo Ao vivo.'}
        </p>
      </form>
    </section>
  );
}

export default function StagePage() {
  const bonecos = useBonecos();
  const [mode, setMode] = useState<Mode>(() => (loadJson<string>(MODE_KEY) === 'aovivo' ? 'aovivo' : 'demo'));
  const [formatId, setFormatId] = useState<StageFormatId>(() => {
    const saved = loadJson<string>(FORMAT_KEY);
    return isStageFormatId(saved) ? saved : 'papo-reto';
  });
  const [savedCast, setSavedCast] = useState<SavedCast>(() => loadJson<SavedCast>(CAST_KEY) ?? {});
  const [settings, setSettings] = useState<StageLiveSettings>(() => ({ ...DEFAULT_LIVE_SETTINGS, ...(loadJson<Partial<StageLiveSettings>>(SETTINGS_KEY) ?? {}) }));

  const format = getStageFormat(formatId);
  const cast: StageCast = useMemo(() => resolveCast(savedCast, bonecos.items), [savedCast, bonecos.items]);
  const byId = useMemo(() => new Map(bonecos.items.map((b) => [b.id, b])), [bonecos.items]);
  const slots: StageSlotView[] = useMemo(
    () =>
      format.slots.map((slot, i) => {
        const id = cast[formatId][i];
        return { label: slot.label, boneco: (id && byId.get(id)) || null };
      }),
    [format, cast, formatId, byId],
  );

  useEffect(() => {
    saveJson(FORMAT_KEY, formatId);
  }, [formatId]);

  const chooseMode = (next: Mode) => {
    setMode(next);
    saveJson(MODE_KEY, next);
  };

  const chooseSettings = (next: StageLiveSettings) => {
    setSettings(next);
    saveJson(SETTINGS_KEY, next);
  };

  const chooseBoneco = (slot: number, id: string) => {
    setSavedCast((prev) => {
      const row = [...(prev[formatId] ?? cast[formatId].map((x) => x ?? ''))];
      row[slot] = id;
      // Um boneco não ocupa duas vagas do mesmo quadro: a outra vaga fica vazia.
      row.forEach((other, i) => {
        if (i !== slot && id && other === id) row[i] = '';
      });
      const next = { ...prev, [formatId]: row };
      saveJson(CAST_KEY, next);
      return next;
    });
  };

  const noBonecos = bonecos.status === 'ready' && bonecos.items.length === 0;

  const castPanel = (
    <section className="panel" aria-labelledby="palco-cast">
      <header className="panel__head">
        <h2 className="panel__title" id="palco-cast">
          Em cena
        </h2>
        <ButtonLink to="/palco/bonecos/novo" size="sm" variant="ghost" icon={Plus}>
          Novo boneco
        </ButtonLink>
      </header>
      <div className="palco-info__body">
        {bonecos.status === 'error' ? (
          <p className="palco__warn" role="alert">
            {bonecos.error}
          </p>
        ) : noBonecos ? (
          <p className="palco-info__summary">
            Você ainda não tem bonecos. Crie os seus com a IA que preferir e cadastre na aba Bonecos. Até lá, o palco mostra as vagas vazias.
          </p>
        ) : null}
        {format.slots.map((slot, i) => (
          <SelectField
            key={`${formatId}-${i}`}
            label={slot.label}
            value={cast[formatId][i] ?? ''}
            disabled={bonecos.status !== 'ready' || noBonecos}
            onChange={(e) => chooseBoneco(i, e.target.value)}
          >
            <option value="">Nenhum</option>
            {bonecos.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectField>
        ))}
      </div>
    </section>
  );

  return (
    <div className="palco">
      <PalcoTabs />

      <div className="palco__head">
        <p className="palco__note">
          {mode === 'demo'
            ? 'Área em que o espectador conversa com um boneco em vez de jogar. Na demonstração, as falas são de roteiro e nada vai para a LIVE.'
            : 'Ao vivo: os bonecos respondem aos comentários, presentes e seguidores da LIVE (ou do simulador). Com a ponte e a chave da IA, as falas são escritas na hora.'}
        </p>
        <Segmented<Mode>
          label="Modo do palco"
          value={mode}
          options={[
            { value: 'demo', label: 'Demonstração' },
            { value: 'aovivo', label: 'Ao vivo' },
          ]}
          onChange={chooseMode}
        />
      </div>

      <div className="chip-row" role="group" aria-label="Escolher quadro">
        {STAGE_FORMATS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={formatId === f.id} onClick={() => setFormatId(f.id)}>
            {f.name}
          </button>
        ))}
      </div>

      {mode === 'aovivo' ? (
        <LiveStage format={formatId} slots={slots} bonecos={bonecos.items} settings={settings} onSettings={chooseSettings} castPanel={castPanel} />
      ) : (
        <div className="palco__main">
          <DemoStage formatId={formatId} slots={slots} lead={slots[0]?.boneco ?? null} />
          <div className="palco__aside">
            {castPanel}
            <section className="panel" aria-labelledby="palco-info">
              <header className="panel__head">
                <h2 className="panel__title" id="palco-info">
                  Como funciona: {format.name}
                </h2>
              </header>
              <div className="palco-info__body">
                <p className="palco-info__summary">{format.summary}</p>
                <div>
                  <p className="palco-info__label">Como o espectador participa</p>
                  <ol className="palco-info__steps">
                    {format.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <KeyValue
                  items={[
                    { label: 'Comando', value: format.command },
                    { label: 'Presente Meteoro', value: format.special },
                  ]}
                />
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
