import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dices, PersonStanding, SearchX } from 'lucide-react';
import { ACCESSORY_LABELS, combinationCount, describeCharacter, generateCharacter, HAIR_LABELS } from '../domain/characters';
import { levelProgress } from '../domain/leveling';
import type { Accessory, HairStyle, Participant } from '../domain/types';
import { AvatarSvg } from '../components/avatar/AvatarSvg';
import { Button } from '../components/ui/Button';
import { SearchField, SelectField } from '../components/ui/Controls';
import { ProgressBar } from '../components/ui/Misc';
import { EmptyState, Skeleton } from '../components/ui/States';
import { formatDate, formatNumber, plural } from '../lib/format';
import { useDebounced } from '../lib/hooks';
import { useActions } from '../state/AppProvider';
import { useAppState } from '../state/store';
import '../features/characters/characters.css';

const CharacterViewer = lazy(() => import('../features/scene/CharacterViewer').then((m) => ({ default: m.CharacterViewer })));

const PAGE = 24;
type Sort = 'recentes' | 'nivel';

function Card({ p, selected, onSelect }: { p: Participant; selected: boolean; onSelect: () => void }) {
  const spec = useMemo(() => generateCharacter(p.characterSeed), [p.characterSeed]);
  const lvl = levelProgress(p.xp);
  const gear = describeCharacter(spec).filter((i) => i.slot === 'Cabelo' || i.slot === 'Acessório').map((i) => i.label.split(' · ')[0]).join(' · ');
  return (
    <li>
      <button type="button" className="char" aria-pressed={selected} onClick={onSelect}>
        <span className="char__fig">
          <AvatarSvg spec={spec} variant="full" />
        </span>
        <span className="char__name">@{p.username}</span>
        <span className="char__meta">
          <span className="score">Nv {lvl.level}</span> {formatNumber(p.xp)} XP
        </span>
        <span className="char__gear">{gear}</span>
      </button>
    </li>
  );
}

export default function CharactersPage() {
  const actions = useActions();
  const participants = useAppState((s) => s.participants);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [hair, setHair] = useState<'todos' | HairStyle>('todos');
  const [acc, setAcc] = useState<'todos' | Accessory>('todos');
  const [sort, setSort] = useState<Sort>('recentes');
  const [shown, setShown] = useState(PAGE);
  const debounced = useDebounced(query, 150);

  const list = useMemo(() => {
    const q = debounced.trim().replace(/^@/, '').toLowerCase();
    return participants
      .filter((p) => !q || p.username.includes(q))
      .map((p) => ({ p, spec: generateCharacter(p.characterSeed) }))
      .filter(({ spec }) => (hair === 'todos' || spec.hairStyle === hair) && (acc === 'todos' || spec.accessory === acc))
      .sort((a, b) => (sort === 'nivel' ? b.p.xp - a.p.xp : b.p.joinedAt - a.p.joinedAt))
      .map(({ p }) => p);
  }, [participants, debounced, hair, acc, sort]);

  const selectedId = params.get('id');
  const selected = participants.find((p) => p.id === selectedId) ?? list[0] ?? null;
  const spec = useMemo(() => (selected ? generateCharacter(selected.characterSeed) : null), [selected]);

  // Garante que o selecionado por link apareça na primeira página.
  useEffect(() => {
    setShown(PAGE);
  }, [debounced, hair, acc, sort]);

  const select = (id: string) => setParams({ id }, { replace: true });
  const lvl = selected ? levelProgress(selected.xp) : null;

  return (
    <div className="stack">
      <div className="chars__bar">
        <div className="grow">
          <SearchField label="Buscar personagem pelo usuário" placeholder="Buscar usuário" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="select">
          <SelectField label="Cabelo" value={hair} onChange={(e) => setHair(e.target.value as typeof hair)}>
            <option value="todos">Todos os cabelos</option>
            {(Object.keys(HAIR_LABELS) as HairStyle[]).map((h) => (
              <option key={h} value={h}>
                {HAIR_LABELS[h]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="select">
          <SelectField label="Acessório" value={acc} onChange={(e) => setAcc(e.target.value as typeof acc)}>
            <option value="todos">Todos os acessórios</option>
            {(Object.keys(ACCESSORY_LABELS) as Accessory[]).map((a) => (
              <option key={a} value={a}>
                {ACCESSORY_LABELS[a]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="select">
          <SelectField label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recentes">Mais recentes</option>
            <option value="nivel">Maior nível</option>
          </SelectField>
        </div>
        <p className="chars__count" role="status">
          {formatNumber(list.length)} {plural(list.length, 'personagem', 'personagens')}
        </p>
      </div>

      <div className="chars">
        <section className="panel" aria-label="Galeria de personagens">
          {participants.length === 0 ? (
            <EmptyState icon={PersonStanding} title="Nenhum personagem ainda" text="Cada novo seguidor ganha um personagem gerado automaticamente." />
          ) : list.length === 0 ? (
            <EmptyState icon={SearchX} title="Nenhum personagem encontrado" text="Nada corresponde aos filtros escolhidos.">
              <Button
                onClick={() => {
                  setQuery('');
                  setHair('todos');
                  setAcc('todos');
                }}
              >
                Limpar filtros
              </Button>
            </EmptyState>
          ) : (
            <>
              <ul className="gallery">
                {list.slice(0, shown).map((p) => (
                  <Card key={p.id} p={p} selected={selected?.id === p.id} onSelect={() => select(p.id)} />
                ))}
              </ul>
              {shown < list.length ? (
                <div className="more">
                  <Button onClick={() => setShown(shown + PAGE)}>Mostrar mais ({list.length - shown})</Button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <aside className="side" aria-label="Detalhes do personagem">
          {selected && spec && lvl ? (
            <section className="panel">
              <div className="detail">
                <div className="detail__head">
                  <h2 className="detail__name">@{selected.username}</h2>
                  <span className="score detail__lvl">Nível {lvl.level}</span>
                </div>
                <Suspense fallback={<Skeleton height="22rem" />}>
                  <CharacterViewer spec={spec} />
                </Suspense>
                <div>
                  <p className="panel__sub num">
                    {formatNumber(selected.xp)} XP · faltam {formatNumber(lvl.needed - lvl.current)} para o nível {lvl.level + 1}
                  </p>
                  <ProgressBar value={lvl.ratio} label="Progresso para o próximo nível" />
                </div>
                <ul className="items" aria-label="Itens equipados">
                  {describeCharacter(spec).map((item) => (
                    <li key={item.slot}>
                      <small>{item.slot}</small>
                      <span className="gear__swatch" style={{ background: item.swatch, width: '0.8rem', height: '0.8rem', borderRadius: '50%', boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.25)' }} aria-hidden />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
                <p className="panel__sub">Criado em {formatDate(selected.joinedAt)}</p>
                <Button icon={Dices} onClick={() => actions.rerollCharacter(selected.id)}>
                  Sortear nova aparência
                </Button>
              </div>
            </section>
          ) : null}
          <section className="panel how" aria-labelledby="how-title">
            <h2 className="panel__title" id="how-title">
              Como os personagens são gerados
            </h2>
            <p>
              Cada personagem nasce de uma <strong>semente</strong>. Dela saem tom de pele, cabelo, roupa, acessório e cores, com regras para evitar combinações estranhas. O gerador alcança mais de <strong>{formatNumber(combinationCount() / 1_000_000)} milhões</strong> de combinações e a aparência é sempre a mesma para a mesma semente.
            </p>
            <p>Nesta demonstração, os modelos 3D são formas simples montadas por código. Os modelos finais virão de assets com licença verificada.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
