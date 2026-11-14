import { useEffect, useState } from 'react';
import { Cast } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SwitchRow, Slider, TextField } from '../components/ui/Controls';
import { OverlayDialog } from '../features/overlay/OverlayDialog';
import { formatNumber } from '../lib/format';
import { useActions } from '../state/AppProvider';
import { useAppState } from '../state/store';
import '../features/settings/settings.css';

export default function SettingsPage() {
  const actions = useActions();
  const settings = useAppState((s) => s.settings);
  const [name, setName] = useState(settings.arenaName);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const invalid = name.trim().length < 2 ? 'Use pelo menos 2 caracteres.' : null;

  // Mantém o campo em sincronia se o nome mudar por outro caminho (ex.: restaurar dados).
  useEffect(() => setName(settings.arenaName), [settings.arenaName]);

  return (
    <div className="narrow">
      <section className="panel" aria-labelledby="set-arena">
        <header className="panel__head">
          <h2 className="panel__title" id="set-arena">
            Arena
          </h2>
        </header>
        <div className="set">
          <TextField
            label="Nome da arena"
            value={name}
            maxLength={40}
            error={invalid}
            hint="Aparece na barra lateral e no overlay."
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim().length >= 2) actions.updateSettings({ arenaName: e.target.value.trim() });
            }}
          />
          <Slider
            label="Meta de curtidas do objetivo coletivo"
            value={settings.likeGoalTarget}
            min={100}
            max={10000}
            step={100}
            format={formatNumber}
            onChange={(v) => actions.updateSettings({ likeGoalTarget: v })}
            hint="Quando as curtidas chegam à meta, o turbo coletivo é liberado e a próxima meta fica maior."
          />
        </div>
      </section>

      <section className="panel" aria-labelledby="set-notif">
        <header className="panel__head">
          <h2 className="panel__title" id="set-notif">
            Avisos
          </h2>
        </header>
        <div className="set">
          <SwitchRow label="Avisos de eventos" hint="Mostra um aviso quando alguém segue, envia presente, compartilha ou a meta é atingida." checked={settings.toastEvents} onChange={(v) => actions.updateSettings({ toastEvents: v })} />
        </div>
      </section>

      <section className="panel" aria-labelledby="set-overlay">
        <header className="panel__head">
          <h2 className="panel__title" id="set-overlay">
            Overlay para o OBS
          </h2>
          <Button size="sm" icon={Cast} onClick={() => setOverlayOpen(true)}>
            Obter link
          </Button>
        </header>
        <div className="set">
          <div>
            <SwitchRow label="Ranking da corrida" checked={settings.overlay.showRanking} onChange={(v) => actions.updateSettings({ overlay: { ...settings.overlay, showRanking: v } })} />
            <SwitchRow label="Feed de eventos" checked={settings.overlay.showFeed} onChange={(v) => actions.updateSettings({ overlay: { ...settings.overlay, showFeed: v } })} />
            <SwitchRow label="Meta de curtidas" checked={settings.overlay.showGoal} onChange={(v) => actions.updateSettings({ overlay: { ...settings.overlay, showGoal: v } })} />
            <SwitchRow label="Nomes sobre os personagens" checked={settings.overlay.showNames} onChange={(v) => actions.updateSettings({ overlay: { ...settings.overlay, showNames: v } })} />
          </div>
          <p className="set__note">As opções vão dentro da URL do overlay: o OBS não compartilha o armazenamento do navegador, então copie o link de novo depois de mudar.</p>
        </div>
      </section>

      <section className="panel" aria-labelledby="set-demo">
        <header className="panel__head">
          <h2 className="panel__title" id="set-demo">
            Demonstração
          </h2>
        </header>
        <div className="set">
          <SwitchRow label="Mostrar o simulador de eventos" hint="Exibe o botão Simulador no cabeçalho. O atalho Shift+D abre e fecha o painel." checked={settings.showDemoTools} onChange={(v) => actions.updateSettings({ showDemoTools: v })} />
        </div>
      </section>

      <OverlayDialog open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </div>
  );
}
