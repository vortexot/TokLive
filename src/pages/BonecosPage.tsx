import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, Pencil, Plus, UserRound } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { formatBytes, type Boneco } from '../domain/bonecos';
import { plural } from '../lib/format';
import { BonecoView } from '../features/stage/BonecoView';
import { PalcoTabs } from '../features/stage/PalcoTabs';
import { loadBonecos, useBonecos } from '../services/bonecoStore';
import '../features/stage/stage.css';

function mediaSummary(b: Boneco): string {
  const { parado, falando } = b.media;
  if (!parado && !falando) return 'Sem arquivos';
  const kind = (k: 'imagem' | 'video') => (k === 'video' ? 'vídeo' : 'imagem');
  const parts = [parado ? `parado (${kind(parado.kind)})` : null, falando ? `falando (${kind(falando.kind)})` : null].filter(Boolean);
  const size = (parado?.size ?? 0) + (falando?.size ?? 0);
  return `${parts.join(' e ')} · ${formatBytes(size)}`;
}

function BonecoCard({ boneco }: { boneco: Boneco }) {
  return (
    <article className="cast-card" aria-labelledby={`b-${boneco.id}`}>
      <Link className="cast-card__art" to={`/palco/bonecos/${boneco.id}`} tabIndex={-1} aria-hidden style={{ '--plate': boneco.color } as CSSProperties}>
        <BonecoView boneco={boneco} />
      </Link>
      <div className="cast-card__body">
        <h2 className="cast-card__name" id={`b-${boneco.id}`}>
          <Link to={`/palco/bonecos/${boneco.id}`}>{boneco.name}</Link>
        </h2>
        <p className="cast-card__mix">{mediaSummary(boneco)}</p>
        {boneco.persona ? <p className="cast-card__text">{boneco.persona}</p> : null}
        <p className="cast-card__voice">
          <MessageSquareText size={15} aria-hidden />
          {boneco.phrases.length ? `${boneco.phrases.length} ${plural(boneco.phrases.length, 'fala pronta', 'falas prontas')}` : 'Sem falas prontas'}
        </p>
        <div className="cast-card__actions">
          <ButtonLink to={`/palco/bonecos/${boneco.id}`} size="sm" icon={Pencil} aria-label={`Editar ${boneco.name}`}>
            Editar
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

const TIPS = [
  { t: 'Parado', d: 'Uma imagem ou vídeo curto em loop do boneco quieto. É o que aparece na maior parte do tempo.' },
  { t: 'Falando', d: 'Opcional. O mesmo boneco com a boca mexendo, em vídeo ou GIF. Aparece só enquanto ele fala.' },
  { t: 'Fundo', d: 'PNG ou WebP com fundo transparente (ou WebM com transparência) ficam melhores na placa colorida.' },
  { t: 'Formato', d: 'Boneco de corpo inteiro ou da cintura para cima, em pé, centralizado. Até 25 MB por arquivo.' },
];

export default function BonecosPage() {
  const bonecos = useBonecos();

  return (
    <div className="palco">
      <PalcoTabs />

      <div className="bonecos__bar">
        <p className="palco__note">
          Cadastre aqui os bonecos que você criou com IA. Cada um pode ocupar qualquer vaga dos quadros do Palco. Ficam guardados neste navegador.
        </p>
        <ButtonLink to="/palco/bonecos/novo" variant="primary" icon={Plus}>
          Novo boneco
        </ButtonLink>
      </div>

      {bonecos.status === 'loading' ? (
        <div className="cast-grid" aria-busy="true" aria-label="Carregando bonecos">
          <Skeleton height="22rem" />
          <Skeleton height="22rem" />
          <Skeleton height="22rem" />
        </div>
      ) : bonecos.status === 'error' ? (
        <div className="panel">
          <ErrorState title="Não foi possível abrir os bonecos" text={bonecos.error ?? undefined} onRetry={() => void loadBonecos()} />
        </div>
      ) : bonecos.items.length ? (
        <>
          <p className="bonecos__count" role="status">
            {bonecos.items.length} {plural(bonecos.items.length, 'boneco', 'bonecos')}
          </p>
          <div className="cast-grid">
            {bonecos.items.map((b) => (
              <BonecoCard key={b.id} boneco={b} />
            ))}
          </div>
        </>
      ) : (
        <div className="panel">
          <EmptyState icon={UserRound} title="Nenhum boneco ainda" text="Gere a imagem do seu boneco na IA que preferir, cadastre aqui e coloque em cena no Palco.">
            <ButtonLink to="/palco/bonecos/novo" variant="primary" icon={Plus}>
              Criar o primeiro boneco
            </ButtonLink>
          </EmptyState>
        </div>
      )}

      <section className="panel" aria-labelledby="bonecos-tips">
        <header className="panel__head">
          <h2 className="panel__title" id="bonecos-tips">
            Como preparar os arquivos
          </h2>
        </header>
        <dl className="bonecos__tips">
          {TIPS.map((tip) => (
            <div key={tip.t}>
              <dt>{tip.t}</dt>
              <dd>{tip.d}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
