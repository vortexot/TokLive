import { useEffect, useState } from 'react';
import { FlaskConical, Plug, Unplug } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Controls';
import { STATUS_LABEL, StatusIcon } from '../../components/layout/ConnectionPill';
import { formatDateTime, formatDuration } from '../../lib/format';
import { useNow } from '../../lib/hooks';
import { useActions } from '../../state/AppProvider';
import { isValidHandle } from '../../state/app';
import { useAppState } from '../../state/store';

const BUSY = ['conectando', 'aguardando', 'ao-vivo', 'reconectando'];

export function ConnectionPanel() {
  const actions = useActions();
  const conn = useAppState((s) => s.connection);
  const [draft, setDraft] = useState(conn.handle);
  const [error, setError] = useState<string | null>(null);
  const live = conn.status === 'ao-vivo';
  const now = useNow(live ? 1000 : 30_000);

  // Quando o @ salvo chega depois do carregamento, preenche o campo.
  useEffect(() => {
    if (conn.handle && !draft) setDraft(conn.handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn.handle]);

  const busy = BUSY.includes(conn.status);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidHandle(draft)) {
      setError('Use de 2 a 24 caracteres: letras, números, "_" ou ".".');
      return;
    }
    setError(null);
    actions.connect(draft);
  };

  return (
    <section className="panel conn" aria-labelledby="conn-title">
      <div className="conn__bar">
        <p>
          <strong>Ambiente de demonstração.</strong> A conexão é simulada e nenhuma LIVE real é acessada.
        </p>
        <Button size="sm" variant="ghost" icon={FlaskConical} onClick={() => actions.setSimulator({ open: true })}>
          Abrir simulador
        </Button>
      </div>
      <div className="conn__main">
      <div className="conn__state">
        <h2 className="sr-only" id="conn-title">
          Conexão com a LIVE
        </h2>
        <p className={`conn__label conn__label--${conn.status}`} role="status">
          {live ? <span className="live-dot live-dot--red" aria-hidden /> : <StatusIcon status={conn.status} size={22} />}
          {STATUS_LABEL[conn.status]}
        </p>
        <p className="conn__message">{conn.message}</p>
        <p className="conn__meta">
          {live && conn.connectedSince
            ? `Conectado há ${formatDuration(Math.max(1, (now - conn.connectedSince) / 1000))}.`
            : conn.lastConnectedAt
              ? `Última conexão: ${formatDateTime(conn.lastConnectedAt)}.`
              : 'Nenhuma conexão ainda.'}
        </p>
      </div>

      <form className="conn__form" onSubmit={submit} noValidate>
        <TextField
          label="@ do TikTok"
          prefix="@"
          value={draft}
          placeholder="seu.usuario"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={60}
          disabled={busy}
          error={error}
          hint={error ? undefined : 'Só o nome de usuário público. Nunca pedimos a senha do TikTok.'}
          onChange={(e) => {
            setDraft(e.target.value.replace(/^@/, ''));
            setError(null);
          }}
        />
        <div className="conn__actions">
          <Button type="submit" variant="primary" icon={Plug} loading={conn.status === 'conectando'} disabled={busy && conn.status !== 'conectando'}>
            Conectar LIVE
          </Button>
          <Button icon={Unplug} disabled={conn.status === 'desconectado'} onClick={() => actions.disconnect()}>
            Desconectar
          </Button>
        </div>
      </form>

      </div>
    </section>
  );
}
