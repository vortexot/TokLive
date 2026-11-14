import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pause, Play, Plus, RotateCcw, Send, SkipForward } from 'lucide-react';
import { Button, ButtonLink } from '../components/ui/Button';
import { SelectField, SwitchRow, TextField } from '../components/ui/Controls';
import { KeyValue } from '../components/ui/Misc';
import { DEFAULT_VOICE, type Boneco } from '../domain/bonecos';
import { DEMO_SCRIPTS, STAGE_FORMATS, getStageFormat, isStageFormatId, resolveCast, scriptedReply, type Beat, type StageCast, type StageFormatId } from '../domain/stage';
import { PalcoTabs } from '../features/stage/PalcoTabs';
import { CAN_SPEAK, StageScene, useStagePlayer, type StageSlotView } from '../features/stage/StageScene';
import { useBonecos } from '../services/bonecoStore';
import { loadJson, saveJson } from '../services/storage';
import '../features/stage/stage.css';

const CAST_KEY = 'palco-elenco';
const FORMAT_KEY = 'palco-quadro';

/** Escolhas do criador por vaga: id do boneco, ou "" para "nenhum". Vagas nunca mexidas ficam de fora. */
type SavedCast = Partial<Record<StageFormatId, string[]>>;

export default function StagePage() {
  const bonecos = useBonecos();
  const [formatId, setFormatId] = useState<StageFormatId>(() => {
    const saved = loadJson<string>(FORMAT_KEY);
    return isStageFormatId(saved) ? saved : 'papo-reto';
  });
  const [savedCast, setSavedCast] = useState<SavedCast>(() => loadJson<SavedCast>(CAST_KEY) ?? {});
  const [extra, setExtra] = useState<Beat[]>([]);
  const [playing, setPlaying] = useState(true);
  const [voice, setVoice] = useState(false);
  const [draft, setDraft] = useState('');

  const format = getStageFormat(formatId);
  const cast: StageCast = useMemo(() => resolveCast(savedCast, bonecos.items), [savedCast, bonecos.items]);
  const byId = useMemo(() => new Map(bonecos.items.map((b) => [b.id, b])), [bonecos.items]);
  const slots: StageSlotView[] = format.slots.map((slot, i) => {
    const id = cast[formatId][i];
    return { label: slot.label, boneco: (id && byId.get(id)) || null };
  });
  const lead: Boneco | null = slots[0]?.boneco ?? null;

  const beats = useMemo(() => [...extra, ...DEMO_SCRIPTS[formatId]], [extra, formatId]);
  const voices = useMemo(() => (voice ? slots.map((s) => s.boneco?.voice ?? DEFAULT_VOICE) : null), [voice, slots]);
  const player = useStagePlayer(beats, playing, voices);

  useEffect(() => {
    saveJson(FORMAT_KEY, formatId);
  }, [formatId]);

  const chooseFormat = (id: StageFormatId) => {
    setFormatId(id);
    setExtra([]);
    setPlaying(true);
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

  const sendDraft = (event: FormEvent) => {
    event.preventDefault();
    const reply = scriptedReply(formatId, 'voce', draft, lead?.phrases ?? []);
    if (!reply.length) return;
    setExtra(reply);
    setPlaying(true);
    setDraft('');
  };

  const noBonecos = bonecos.status === 'ready' && bonecos.items.length === 0;

  return (
    <div className="palco">
      <PalcoTabs />

      <p className="palco__note">
        Área em que o espectador conversa com um boneco em vez de jogar. Os bonecos são os que você cadastra na aba Bonecos. Nesta demonstração as
        falas são de roteiro: não há IA nem LIVE conectada.
      </p>

      <div className="chip-row" role="group" aria-label="Escolher quadro">
        {STAGE_FORMATS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={formatId === f.id} onClick={() => chooseFormat(f.id)}>
            {f.name}
          </button>
        ))}
      </div>

      <div className="palco__main">
        <section aria-label="Palco">
          <StageScene title={format.name} command={format.command} slots={slots} beats={beats} index={player.index} shown={player.shown} playing={playing} />

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
                ? `A resposta sai das falas prontas de ${lead.name}. Com a IA ligada, ela seria escrita na hora.`
                : 'Sem falas prontas no boneco da vaga, a resposta usa frases padrão. Cadastre as falas dele na aba Bonecos.'}
            </p>
          </form>
        </section>

        <div className="palco__aside">
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
    </div>
  );
}
