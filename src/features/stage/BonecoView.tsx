import { ImageOff, UserRound } from 'lucide-react';
import type { Boneco, MediaKind, MediaSlot } from '../../domain/bonecos';
import { useMediaUrl } from '../../services/bonecoStore';

/** Arquivo pronto para exibir: tipo e endereço. */
export interface MediaSource {
  kind: MediaKind;
  url: string;
}

function Media({ source, visible, label }: { source: MediaSource; visible: boolean; label: string }) {
  const className = `boneco-view__media${visible ? '' : ' is-hidden'}`;
  return source.kind === 'video' ? (
    <video className={className} src={source.url} autoPlay muted loop playsInline aria-hidden />
  ) : (
    <img className={className} src={source.url} alt={visible ? label : ''} draggable={false} />
  );
}

/**
 * O boneco em cena. Mostra o arquivo "parado" e, durante a fala, o "falando" (os dois ficam carregados para a troca
 * não piscar). Sem arquivo de fala, o boneco parado ganha um balanço leve enquanto fala.
 * `preview` troca um arquivo guardado por outro ainda não salvo (formulário); `null` esconde o guardado.
 */
export function BonecoView({
  boneco,
  speaking = false,
  emptyLabel = 'Vaga sem boneco',
  preview,
}: {
  boneco: Boneco | null;
  speaking?: boolean;
  emptyLabel?: string;
  preview?: Partial<Record<MediaSlot, MediaSource | null>>;
}) {
  const storedParado = useMediaUrl(preview && 'parado' in preview ? null : boneco?.media.parado);
  const storedFalando = useMediaUrl(preview && 'falando' in preview ? null : boneco?.media.falando);

  if (!boneco) {
    return (
      <div className="boneco-view boneco-view--empty">
        <UserRound aria-hidden />
        <span>{emptyLabel}</span>
      </div>
    );
  }

  const pick = (slot: MediaSlot, stored: string | null): MediaSource | null => {
    if (preview && slot in preview) return preview[slot] ?? null;
    const ref = boneco.media[slot];
    return ref && stored ? { kind: ref.kind, url: stored } : null;
  };
  const parado = pick('parado', storedParado);
  const falando = pick('falando', storedFalando);
  // Enquanto o arquivo guardado carrega, a placa fica vazia em vez de mostrar "sem imagem".
  const pending = !preview && ((boneco.media.parado && !storedParado) || (boneco.media.falando && !storedFalando));
  const showTalk = speaking && Boolean(falando);
  const label = `${boneco.name}${showTalk ? ', falando' : ''}`;

  return (
    <div className={`boneco-view${speaking && !falando ? ' is-bobbing' : ''}`}>
      {parado ? <Media source={parado} visible={!showTalk} label={label} /> : null}
      {falando ? <Media source={falando} visible={showTalk || !parado} label={label} /> : null}
      {!parado && !falando && !pending ? (
        <div className="boneco-view__missing">
          <ImageOff aria-hidden />
          <span>Sem imagem</span>
        </div>
      ) : null}
    </div>
  );
}
