import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StageScene, useReveal, type StageSlotView } from '../features/stage/StageScene';
import { CENA_CHANNEL, type CenaMessage, type CenaSnapshot } from '../features/stage/useLiveStage';
import { reloadBonecos, useBonecos } from '../services/bonecoStore';
import '../features/stage/stage.css';

const BACKGROUNDS: Record<string, string> = {
  escuro: 'var(--bg)',
  verde: '#00b140',
  transparente: 'transparent',
};

/**
 * Tela do palco para a transmissão. Abre em outra janela do mesmo navegador do painel (botão "Abrir tela do palco")
 * e acompanha o palco ao vivo. No OBS ou no TikTok LIVE Studio, capture esta janela; o som sai pelo painel.
 * `?fundo=verde` deixa o fundo verde para recorte (chroma key).
 */
export default function CenaPage() {
  const [params] = useSearchParams();
  const background = BACKGROUNDS[params.get('fundo') ?? 'escuro'] ?? BACKGROUNDS.escuro;
  const bonecos = useBonecos();
  const [snap, setSnap] = useState<CenaSnapshot | null>(null);

  useEffect(() => {
    document.title = 'Palco · TokArena';
    const previous = document.body.style.background;
    document.body.style.background = background;
    return () => {
      document.body.style.background = previous;
    };
  }, [background]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CENA_CHANNEL);
    channel.onmessage = (e: MessageEvent<CenaMessage>) => {
      if (e.data?.type === 'snapshot') setSnap(e.data.snapshot);
    };
    const hello = () => channel.postMessage({ type: 'hello' } satisfies CenaMessage);
    hello();
    // Até o painel responder (ele pode abrir depois), pergunta de novo.
    const timer = setInterval(hello, 3000);
    return () => {
      clearInterval(timer);
      channel.close();
    };
  }, []);

  // O painel avisa quando um boneco muda; a tela relê os bonecos.
  const version = snap?.bonecosVersion ?? 0;
  useEffect(() => {
    if (version) void reloadBonecos();
  }, [version]);

  const shown = useReveal(snap?.speaking ?? null);
  const slots: StageSlotView[] = useMemo(
    () => (snap?.slots ?? [{ label: 'Anfitrião', bonecoId: null }]).map((s) => ({ label: s.label, boneco: bonecos.items.find((b) => b.id === s.bonecoId) ?? null })),
    [snap?.slots, bonecos.items],
  );

  const speech = snap?.speaking ?? null;
  return (
    <main className="cena" style={{ background }}>
      <StageScene
        fullscreen
        title={snap?.title ?? 'Palco'}
        command={snap?.command}
        slots={slots}
        view={{
          context: snap?.context ?? null,
          speech: speech ? { slot: speech.slot, text: speech.text } : null,
          shown,
          talking: Boolean(speech && shown < speech.text.length),
          queue: snap?.queue ?? null,
          waitText: snap ? snap.waitText : 'Aguardando o painel: abra o Palco no modo Ao vivo neste navegador.',
        }}
      />
    </main>
  );
}
