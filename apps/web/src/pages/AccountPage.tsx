import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { TextField } from '../components/ui/Controls';
import { Pill } from '../components/ui/Misc';
import { useActions } from '../state/AppProvider';
import { useAppState } from '../state/store';
import '../features/settings/settings.css';

export default function AccountPage() {
  const actions = useActions();
  const { profile, handle } = useAppState((s) => ({ profile: s.settings.profile, handle: s.connection.handle }));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const mailInvalid = profile.email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(profile.email) ? 'Informe um e-mail válido.' : null;

  return (
    <div className="narrow">
      <section className="panel" aria-labelledby="acc-profile">
        <header className="panel__head">
          <h2 className="panel__title" id="acc-profile">
            Perfil do criador
          </h2>
        </header>
        <div className="set">
          <div className="set__row">
            <TextField label="Nome de exibição" value={profile.displayName} maxLength={40} onChange={(e) => actions.updateSettings({ profile: { ...profile, displayName: e.target.value } })} />
            <TextField label="E-mail" type="email" value={profile.email} error={mailInvalid} autoComplete="off" onChange={(e) => actions.updateSettings({ profile: { ...profile, email: e.target.value } })} />
          </div>
          <p className="set__note">
            @ do TikTok conectado: {handle ? <strong>@{handle}</strong> : 'nenhum'}. Para trocar, use a <Link to="/">visão geral</Link>.
          </p>
          <p className="set__note">Este perfil fica só neste navegador. Não existe login real nesta etapa, e o TokArena nunca pede a senha do TikTok.</p>
        </div>
      </section>

      <section className="panel" aria-labelledby="acc-plan">
        <header className="panel__head">
          <h2 className="panel__title" id="acc-plan">
            Plano
          </h2>
        </header>
        <div className="set">
          <div className="plan">
            <Pill tone="outline">Demonstração</Pill>
            <p>Esta é uma versão de demonstração, sem planos e sem cobrança. Os recursos pagos serão definidos em uma etapa futura.</p>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="acc-data">
        <header className="panel__head">
          <h2 className="panel__title" id="acc-data">
            Dados desta demonstração
          </h2>
        </header>
        <div className="set">
          <p className="set__note">Participantes, partidas e configurações ficam salvos neste navegador. Restaurar apaga tudo isso e volta ao conjunto inicial de dados simulados.</p>
          <div className="set__actions">
            <Button variant="danger" icon={RotateCcw} onClick={() => setConfirm(true)}>
              Restaurar dados de demonstração
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Restaurar os dados de demonstração?"
        description="Isso não pode ser desfeito."
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                await actions.resetDemoData();
                setBusy(false);
                setConfirm(false);
                actions.toast('ok', 'Dados restaurados', 'Os participantes, o histórico e as configurações voltaram ao início.');
              }}
            >
              Restaurar
            </Button>
          </>
        }
      >
        <p>Os personagens criados pelo simulador, as partidas, as preferências e as configurações dos jogos serão apagados deste navegador.</p>
      </Dialog>
    </div>
  );
}
