import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { SwitchRow } from '../../components/ui/Controls';
import { buildOverlayUrl, DEMO_OVERLAY_TOKEN } from '../../services/overlayAuth';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import './overlay-dialog.css';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Contexto sem permissão de área de transferência: cai para a seleção manual.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Como usar o jogo no OBS: URL do overlay, opções de exibição e passo a passo. */
export function OverlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const actions = useActions();
  const options = useAppState((s) => s.settings.overlay);
  const [copied, setCopied] = useState(false);
  const url = buildOverlayUrl(window.location.origin, DEMO_OVERLAY_TOKEN, options);

  const copy = async () => {
    const ok = await copyText(url);
    setCopied(ok);
    actions.toast(ok ? 'ok' : 'warn', ok ? 'Link do overlay copiado' : 'Não foi possível copiar', ok ? 'Cole na fonte de navegador do OBS.' : 'Selecione o link e copie manualmente.');
    if (ok) setTimeout(() => setCopied(false), 2200);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Overlay para o OBS"
      description="Use esta URL como fonte de navegador. O fundo é transparente."
      wide
      footer={
        <>
          <a className="btn btn--secondary" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={17} aria-hidden /> Abrir em nova aba
          </a>
          <Button variant="primary" icon={copied ? Check : Copy} onClick={copy}>
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
        </>
      }
    >
      <div className="ovd">
        <div className="ovd__url">
          <label className="field__label" htmlFor="ovd-url">
            URL do overlay
          </label>
          <input id="ovd-url" className="input ovd__input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <p className="field__hint">
            Token de demonstração. Na versão final, cada criador terá uma URL com token seguro, que pode ser revogado.
          </p>
        </div>

        <div className="ovd__cols">
          <section aria-labelledby="ovd-steps">
            <h3 className="ovd__h" id="ovd-steps">
              No OBS
            </h3>
            <ol className="ovd__steps">
              <li>Em Fontes, clique em + e escolha <strong>Navegador</strong>.</li>
              <li>Cole a URL acima.</li>
              <li>Use largura <strong>1920</strong> e altura <strong>1080</strong>.</li>
              <li>Deixe a opção de CSS personalizado em branco: o fundo já é transparente.</li>
            </ol>
            <p className="field__hint">
              Na demonstração, o overlay aberto no OBS roda a própria simulação. Aberto em outra aba deste navegador, ele acompanha o painel em tempo real.
            </p>
          </section>

          <section aria-labelledby="ovd-show">
            <h3 className="ovd__h" id="ovd-show">
              O que aparece
            </h3>
            <SwitchRow label="Ranking da corrida" checked={options.showRanking} onChange={(v) => actions.updateSettings({ overlay: { ...options, showRanking: v } })} />
            <SwitchRow label="Feed de eventos" checked={options.showFeed} onChange={(v) => actions.updateSettings({ overlay: { ...options, showFeed: v } })} />
            <SwitchRow label="Meta de curtidas" checked={options.showGoal} onChange={(v) => actions.updateSettings({ overlay: { ...options, showGoal: v } })} />
            <SwitchRow label="Nomes sobre os personagens" checked={options.showNames} onChange={(v) => actions.updateSettings({ overlay: { ...options, showNames: v } })} />
          </section>
        </div>
      </div>
    </Dialog>
  );
}
