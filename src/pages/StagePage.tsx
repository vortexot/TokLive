import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { AudioLines, Pause, Play, RotateCcw, Send, SkipForward } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SwitchRow, TextField } from '../components/ui/Controls';
import { KeyValue } from '../components/ui/Misc';
import { DEMO_SCRIPTS, HOSTS, STAGE_FORMATS, getHost, getStageFormat, introScript, scriptedReply, type Beat, type HostId, type StageFormatId } from '../domain/stage';
import { HostArt } from '../features/stage/HostArt';
import { StageScene, useStagePlayer } from '../features/stage/StageScene';
import '../features/stage/stage.css';

/** O que está em cena: um quadro (com um pedido de teste opcional na frente do roteiro) ou a apresentação de um anfitrião. */
type Show = { kind: 'quadro'; id: StageFormatId; extra: Beat[] } | { kind: 'anfitriao'; id: HostId };

const CAN_SPEAK = typeof window !== 'undefined' && 'speechSynthesis' in window;

export default function StagePage() {
  const [show, setShow] = useState<Show>({ kind: 'quadro', id: 'papo-reto', extra: [] });
  const [playing, setPlaying] = useState(true);
  const [voice, setVoice] = useState(false);
  const [draft, setDraft] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);

  const format = show.kind === 'quadro' ? getStageFormat(show.id) : null;
  const beats = useMemo(() => (show.kind === 'quadro' ? [...show.extra, ...DEMO_SCRIPTS[show.id]] : introScript(show.id)), [show]);
  const player = useStagePlayer(beats, playing, voice);

  const open = (next: Show) => {
    setShow(next);
    setPlaying(true);
  };

  const sendDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!format) return;
    const extra = scriptedReply(format.id, 'voce', draft);
    if (!extra.length) return;
    open({ kind: 'quadro', id: format.id, extra });
    setDraft('');
  };

  const present = (id: HostId) => {
    open({ kind: 'anfitriao', id });
    stageRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  };

  const soloHost = show.kind === 'anfitriao' ? getHost(show.id) : null;

  return (
    <div className="palco">
      <p className="palco__note">
        Amostra visual do Palco, a área em que o espectador conversa com um anfitrião em vez de jogar. As falas são de roteiro: não há IA nem LIVE conectada. Os
        anfitriões são paródias feitas para esta amostra, e os personagens originais pertencem aos seus donos.
      </p>

      <div className="chip-row" role="group" aria-label="Escolher quadro">
        {STAGE_FORMATS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={format?.id === f.id} onClick={() => open({ kind: 'quadro', id: f.id, extra: [] })}>
            {f.name}
          </button>
        ))}
      </div>

      <div className="palco__main">
        <section aria-label="Palco">
          <div ref={stageRef} className="palco__stage">
            <StageScene
              title={format?.name ?? 'Apresentação'}
              command={format?.command}
              hostIds={format?.hostIds ?? (soloHost ? [soloHost.id] : [])}
              beats={beats}
              index={player.index}
              shown={player.shown}
              playing={playing}
              fallback={
                soloHost ? (
                  <div className="pstage-card">
                    <p className="pstage-bio__name">{soloHost.name}</p>
                    <p className="pstage-bio__mix">{soloHost.mix}</p>
                  </div>
                ) : null
              }
            />
          </div>

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
                hint={CAN_SPEAK ? 'Demonstração: usa a voz instalada no seu navegador, não a voz final do anfitrião.' : 'Este navegador não oferece voz sintetizada.'}
                checked={voice && CAN_SPEAK}
                onChange={setVoice}
                disabled={!CAN_SPEAK}
              />
            </div>
          </div>

          {format ? (
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
              <p className="palco__try-hint">A resposta sai de uma lista de frases prontas do anfitrião. Com a IA ligada, ela seria escrita na hora.</p>
            </form>
          ) : null}
        </section>

        <aside className="panel" aria-labelledby="palco-info">
          <header className="panel__head">
            <h2 className="panel__title" id="palco-info">
              {format ? format.name : 'Apresentação do anfitrião'}
            </h2>
          </header>
          {format ? (
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
                  { label: format.hostIds.length > 1 ? 'Anfitriões' : 'Anfitrião', value: format.hostIds.map((id) => getHost(id).short).join(' e ') },
                  { label: 'Presente Meteoro', value: format.special },
                ]}
              />
            </div>
          ) : soloHost ? (
            <div className="palco-info__body">
              <p className="palco-info__summary">{soloHost.personality}</p>
              <KeyValue
                items={[
                  { label: 'Mistura', value: soloHost.mix },
                  { label: 'Voz', value: soloHost.voice },
                  { label: 'Quadros', value: STAGE_FORMATS.filter((f) => f.hostIds.includes(soloHost.id)).map((f) => f.name).join(', ') },
                ]}
              />
            </div>
          ) : null}
        </aside>
      </div>

      <section aria-labelledby="palco-elenco">
        <h2 className="palco__section-title" id="palco-elenco">
          Elenco
        </h2>
        <p className="palco__section-sub">Cada anfitrião tem personalidade, jeito de falar e voz próprios. Coloque um deles no palco para ver a apresentação.</p>
        <div className="cast-grid">
          {HOSTS.map((host) => {
            const on = soloHost?.id === host.id;
            return (
              <article key={host.id} className={`cast-card${on ? ' cast-card--on' : ''}`} aria-labelledby={`host-${host.id}`}>
                <div className="cast-card__art" style={{ '--plate': host.backdrop } as CSSProperties}>
                  <HostArt id={host.id} decorative />
                </div>
                <div className="cast-card__body">
                  <div>
                    <h3 className="cast-card__name" id={`host-${host.id}`}>
                      {host.name}
                    </h3>
                    <p className="cast-card__mix">{host.mix}</p>
                  </div>
                  <p className="cast-card__text">{host.personality}</p>
                  <p className="cast-card__voice">
                    <AudioLines size={15} aria-hidden />
                    {host.voice}
                  </p>
                  <div className="cast-card__actions">
                    <Button size="sm" icon={Play} onClick={() => present(host.id)} aria-label={`Ver no palco: ${host.name}`}>
                      Ver no palco
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
