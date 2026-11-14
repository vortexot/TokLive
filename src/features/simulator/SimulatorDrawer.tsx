import { useEffect, useId, useState } from 'react';
import { Gift, Heart, LogIn, MessageCircle, PowerOff, RotateCcw, Share2, TriangleAlert, UserPlus, X } from 'lucide-react';
import { GIFTS } from '../../domain/gifts';
import type { ConnectionScenario, ConnectionStatus, GiftId } from '../../domain/types';
import { STATUS_LABEL } from '../../components/layout/ConnectionPill';
import { Button } from '../../components/ui/Button';
import { Segmented, SelectField, SwitchRow, TextField } from '../../components/ui/Controls';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import './simulator.css';

const STATUSES: ConnectionStatus[] = ['desconectado', 'aguardando', 'conectando', 'ao-vivo', 'reconectando', 'erro'];

const QUICK_COMMENTS = ['bora!', '!entrar', '!voto 1', '!voto 2'];

export function SimulatorDrawer() {
  const actions = useActions();
  const titleId = useId();
  const { open, auto, rate, status, scenario, enabled, ready } = useAppState((s) => ({
    open: s.simulator.open,
    auto: s.simulator.auto,
    rate: s.simulator.rate,
    status: s.connection.status,
    scenario: s.connection.scenario,
    enabled: s.settings.showDemoTools,
    ready: s.ready,
  }));
  const [user, setUser] = useState('');
  const [comment, setComment] = useState('');
  const [gift, setGift] = useState<GiftId>('foguete');
  const [loadFailArmed, setLoadFailArmed] = useState(false);

  // Atalho: Shift+D abre e fecha, exceto quando o foco está em um campo de texto.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
      if (e.shiftKey && e.key.toLowerCase() === 'd' && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        actions.setSimulator({ open: !open });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, enabled, open]);

  if (!enabled) return null;
  const who = user.trim() || undefined;

  return (
    <aside
      className={`sim${open ? ' sim--open' : ''}`}
      aria-labelledby={titleId}
      inert={!open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') actions.setSimulator({ open: false });
      }}
    >
      <header className="sim__head">
        <div>
          <h2 className="sim__title" id={titleId}>
            Simulador de eventos
          </h2>
          <p className="sim__note">Ferramenta de demonstração. Nada aqui vem do TikTok.</p>
        </div>
        <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Fechar simulador" onClick={() => actions.setSimulator({ open: false })} />
      </header>

      <div className="sim__body">
        <section className="sim__section" aria-label="Conexão">
          <h3 className="sim__h">Estado da conexão</h3>
          <div className="chip-row">
            {STATUSES.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => actions.forceConnection(s)}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="sim__hint">“Reconectando” volta sozinho para “Ao vivo” em poucos segundos.</p>
          <Segmented<ConnectionScenario>
            label="Resultado de “Conectar LIVE”"
            value={scenario}
            onChange={actions.setScenario}
            options={[
              { value: 'ao-vivo', label: 'Ao vivo' },
              { value: 'aguardando-inicio', label: 'Aguardando' },
              { value: 'falha', label: 'Falha' },
            ]}
          />
        </section>

        <section className="sim__section" aria-label="Eventos">
          <h3 className="sim__h">Disparar evento</h3>
          <TextField label="Usuário do evento" prefix="@" placeholder="vazio = aleatório" value={user} onChange={(e) => setUser(e.target.value)} maxLength={25} />

          <div className="sim__grid">
            <Button icon={UserPlus} onClick={() => actions.emit({ type: 'follow', username: who })}>
              Novo seguidor
            </Button>
            <Button icon={LogIn} onClick={() => actions.emit({ type: 'join' })}>
              Entrada na fila
            </Button>
            <Button icon={Share2} onClick={() => actions.emit({ type: 'share', username: who })}>
              Compartilhar
            </Button>
            <Button variant="danger" icon={PowerOff} onClick={() => actions.emit({ type: 'live-end' })}>
              Encerrar LIVE
            </Button>
          </div>

          <div className="sim__row">
            <span className="sim__label">
              <Heart size={15} aria-hidden /> Curtidas
            </span>
            {[10, 100, 500].map((n) => (
              <Button key={n} size="sm" onClick={() => actions.emit({ type: 'like', username: who, count: n })}>
                +{n}
              </Button>
            ))}
          </div>

          <form
            className="sim__form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              actions.emit({ type: 'comment', username: who, text: comment });
              setComment('');
            }}
          >
            <TextField label="Comentário" icon={MessageCircle} placeholder="Escreva ou use !entrar, !voto 1" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={140} />
            <Button type="submit" variant="primary" disabled={!comment.trim()}>
              Enviar
            </Button>
          </form>
          <div className="chip-row">
            {QUICK_COMMENTS.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => actions.emit({ type: 'comment', username: who, text: q })}>
                {q}
              </button>
            ))}
          </div>

          <div className="sim__form">
            <SelectField label="Presente" value={gift} onChange={(e) => setGift(e.target.value as GiftId)}>
              {GIFTS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.powerLabel}
                </option>
              ))}
            </SelectField>
            <Button variant="primary" icon={Gift} onClick={() => actions.emit({ type: 'gift', username: who, gift })}>
              Enviar
            </Button>
          </div>
        </section>

        <section className="sim__section" aria-label="Automático">
          <h3 className="sim__h">Eventos automáticos</h3>
          <SwitchRow
            label="Gerar eventos continuamente"
            hint="Mistura curtidas, comentários, presentes e novos seguidores."
            checked={auto}
            disabled={!ready}
            onChange={(v) => actions.setSimulator({ auto: v })}
          />
          <Segmented
            label="Ritmo"
            value={rate}
            onChange={(v) => actions.setSimulator({ rate: v })}
            options={[
              { value: 1, label: 'Calmo' },
              { value: 3, label: 'Animado' },
              { value: 8, label: 'Intenso' },
            ]}
          />
        </section>

        <section className="sim__section" aria-label="Dados">
          <h3 className="sim__h">Dados da demonstração</h3>
          <div className="sim__grid">
            <Button
              icon={TriangleAlert}
              aria-pressed={loadFailArmed}
              onClick={() => {
                actions.failNextLoad(!loadFailArmed);
                setLoadFailArmed(!loadFailArmed);
                actions.toast('info', loadFailArmed ? 'Falha de carregamento desarmada' : 'Falha armada', loadFailArmed ? undefined : 'A próxima leitura (ex.: Estatísticas) vai falhar.');
              }}
            >
              {loadFailArmed ? 'Desarmar falha' : 'Falhar próxima leitura'}
            </Button>
            <Button
              icon={RotateCcw}
              onClick={async () => {
                await actions.resetDemoData();
                actions.toast('ok', 'Dados restaurados', 'Os participantes e o histórico voltaram ao início.');
              }}
            >
              Restaurar dados
            </Button>
          </div>
        </section>
      </div>
    </aside>
  );
}
