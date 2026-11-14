import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Film, Image as ImageIcon, MessageCircle, Save, Trash2, Upload, UserRound, Volume2, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SelectField, Slider, TextAreaField, TextField } from '../components/ui/Controls';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, Skeleton } from '../components/ui/States';
import {
  MEDIA_ACCEPT,
  NAME_MAX,
  PERSONA_MAX,
  PHRASES_MAX,
  bonecoFromDraft,
  checkMediaFile,
  draftFromBoneco,
  formatBytes,
  mediaKindOf,
  parsePhrases,
  validateDraft,
  type Boneco,
  type BonecoDraft,
  type DraftErrors,
  type MediaSlot,
} from '../domain/bonecos';
import { fillName } from '../domain/stage';
import { BonecoView, type MediaSource } from '../features/stage/BonecoView';
import { CAN_SPEAK, speakAloud, useVoices } from '../features/stage/voice';
import { deleteBoneco, newId, saveBoneco, useBonecos, type MediaChanges } from '../services/bonecoStore';
import { useActions } from '../state/AppProvider';
import '../features/stage/stage.css';

const SLOTS: { slot: MediaSlot; title: string; hint: string }[] = [
  { slot: 'parado', title: 'Parado', hint: 'Imagem ou vídeo em loop do boneco quieto. Aparece na maior parte do tempo.' },
  { slot: 'falando', title: 'Falando', hint: 'Opcional. O boneco com a boca mexendo. Sem ele, o boneco parado balança enquanto fala.' },
];

/** Endereços temporários dos arquivos escolhidos e ainda não salvos, liberados quando saem de cena. */
function usePendingPreview(files: MediaChanges): Partial<Record<MediaSlot, MediaSource | null>> | undefined {
  const parado = files.parado;
  const falando = files.falando;
  const [preview, setPreview] = useState<Partial<Record<MediaSlot, MediaSource | null>> | undefined>(undefined);
  useEffect(() => {
    const made: string[] = [];
    const next: Partial<Record<MediaSlot, MediaSource | null>> = {};
    const add = (slot: MediaSlot, file: File | null | undefined, present: boolean) => {
      if (!present) return;
      const kind = file ? mediaKindOf(file.type) : null;
      if (file && kind && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(file);
        made.push(url);
        next[slot] = { kind, url };
      } else {
        next[slot] = null;
      }
    };
    add('parado', parado, 'parado' in files);
    add('falando', falando, 'falando' in files);
    setPreview(Object.keys(next).length ? next : undefined);
    return () => made.forEach((url) => URL.revokeObjectURL(url));
    // `files` muda de identidade a cada escolha; o que importa são os dois arquivos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parado, falando, 'parado' in files, 'falando' in files]);
  return preview;
}

function MediaPicker({
  slot,
  title,
  hint,
  current,
  pending,
  error,
  onPick,
  onClear,
}: {
  slot: MediaSlot;
  title: string;
  hint: string;
  current: { name: string; size: number; kind: 'imagem' | 'video' } | null;
  pending: boolean;
  error: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const Icon = current?.kind === 'video' ? Film : ImageIcon;
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    e.target.value = '';
  };
  return (
    <div className="media-pick">
      <div className="media-pick__head">
        <p className="field__label">{title}</p>
        {pending ? <span className="media-pick__flag">Não salvo</span> : null}
      </div>
      <p className="field__hint">{hint}</p>
      <div className="media-pick__row">
        {current ? (
          <p className="media-pick__file">
            <Icon size={16} aria-hidden />
            <span className="media-pick__name">{current.name || 'arquivo'}</span>
            <span className="media-pick__size">{formatBytes(current.size)}</span>
          </p>
        ) : (
          <p className="media-pick__file media-pick__file--none">Nenhum arquivo</p>
        )}
        <label className="btn btn--secondary btn--sm media-pick__btn">
          <Upload size={15} aria-hidden />
          {current ? 'Trocar arquivo' : 'Escolher arquivo'}
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept={MEDIA_ACCEPT}
            aria-label={`${current ? 'Trocar' : 'Escolher'} arquivo: ${title.toLowerCase()}`}
            aria-invalid={error ? true : undefined}
            onChange={onChange}
            data-slot={slot}
          />
        </label>
        {current ? (
          <Button size="sm" variant="ghost" icon={X} onClick={onClear} aria-label={`Remover arquivo: ${title.toLowerCase()}`}>
            Remover
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Editor({ existing }: { existing: Boneco | null }) {
  const navigate = useNavigate();
  const actions = useActions();
  const bonecos = useBonecos();
  const [draft, setDraft] = useState<BonecoDraft>(() => draftFromBoneco(existing));
  const [files, setFiles] = useState<MediaChanges>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<MediaSlot, string>>>({});
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [talking, setTalking] = useState(false);
  const [hearing, setHearing] = useState(false);
  const stopVoice = useRef<(() => void) | null>(null);
  const preview = usePendingPreview(files);
  const voices = useVoices();

  useEffect(() => () => stopVoice.current?.(), []);

  const set = <K extends keyof BonecoDraft>(key: K, value: BonecoDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const phrases = useMemo(() => parsePhrases(draft.phrasesText), [draft.phrasesText]);

  // O boneco como vai ficar, para a prévia (com os arquivos ainda não salvos).
  const previewBoneco: Boneco = useMemo(
    () =>
      bonecoFromDraft(
        { ...draft, name: draft.name.trim() || 'Novo boneco' },
        { id: existing?.id ?? 'previa', now: 0, existing, media: existing?.media ?? { parado: null, falando: null } },
      ),
    [draft, existing],
  );

  const currentFile = (slot: MediaSlot) => {
    if (slot in files) {
      const f = files[slot];
      const kind = f ? mediaKindOf(f.type) : null;
      return f && kind ? { name: f.name, size: f.size, kind } : null;
    }
    const ref = existing?.media[slot];
    return ref ? { name: ref.name, size: ref.size, kind: ref.kind } : null;
  };

  const pick = (slot: MediaSlot, file: File) => {
    const problem = checkMediaFile(file);
    setFileErrors((e) => ({ ...e, [slot]: problem ?? undefined }));
    if (!problem) setFiles((f) => ({ ...f, [slot]: file }));
  };
  const clear = (slot: MediaSlot) => {
    setFileErrors((e) => ({ ...e, [slot]: undefined }));
    setFiles((f) => {
      // Remover um arquivo novo de um boneco que não tinha nada é só desfazer a escolha.
      if (!existing?.media[slot]) {
        const next = { ...f };
        delete next[slot];
        return next;
      }
      return { ...f, [slot]: null };
    });
  };

  const hear = () => {
    if (!CAN_SPEAK) return;
    stopVoice.current?.();
    const name = draft.name.trim() || 'o seu boneco';
    const line = phrases[0] ? fillName(phrases[0], 'lu_gamer') : `Oi, eu sou ${name}. Pode mandar a sua pergunta.`;
    setHearing(true);
    setTalking(true);
    stopVoice.current = speakAloud(line, draft.voice, () => {
      setHearing(false);
      setTalking(false);
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const taken = bonecos.items.filter((b) => b.id !== existing?.id).map((b) => b.name);
    const found = validateDraft(draft, taken);
    setErrors(found);
    if (found.name) {
      // Leva o foco ao campo com erro, depois que ele for marcado como inválido.
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.boneco-edit input[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const boneco = bonecoFromDraft(draft, { id: newId('b'), now: Date.now(), existing, media: existing?.media ?? { parado: null, falando: null } });
      await saveBoneco(boneco, files);
      actions.toast('ok', existing ? 'Boneco atualizado' : 'Boneco criado', boneco.name);
      navigate('/palco/bonecos');
    } catch (e) {
      setSaving(false);
      setSaveError(e instanceof Error && /quota|space|espaço/i.test(e.message) ? 'Não há espaço livre no navegador para estes arquivos. Use arquivos menores.' : 'Não foi possível salvar. Tente de novo.');
    }
  };

  const remove = async () => {
    if (!existing) return;
    setDeleting(true);
    try {
      await deleteBoneco(existing.id);
      actions.toast('info', 'Boneco excluído', existing.name);
      navigate('/palco/bonecos');
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
      setSaveError('Não foi possível excluir. Tente de novo.');
    }
  };

  return (
    <form className="boneco-edit" onSubmit={submit} noValidate>
      <div className="boneco-edit__form">
        <section className="panel" aria-labelledby="be-ident">
          <header className="panel__head">
            <h2 className="panel__title" id="be-ident">
              Identidade
            </h2>
          </header>
          <div className="boneco-edit__body">
            <TextField
              label="Nome"
              value={draft.name}
              maxLength={NAME_MAX}
              error={errors.name}
              hint="Aparece na legenda do palco e no painel."
              onChange={(e) => set('name', e.target.value)}
            />
            <TextAreaField
              label="Personalidade e jeito de falar"
              value={draft.persona}
              maxLength={PERSONA_MAX}
              rows={4}
              hint={`Quem ele é e como fala. A IA vai usar isso para responder no estilo dele quando for ligada. ${draft.persona.length}/${PERSONA_MAX}`}
              onChange={(e) => set('persona', e.target.value)}
            />
            <div className="boneco-edit__color">
              <label className="field__label" htmlFor="boneco-cor">
                Cor da placa
              </label>
              <div className="boneco-edit__color-row">
                <input id="boneco-cor" type="color" value={draft.color} onChange={(e) => set('color', e.target.value)} />
                <span className="boneco-edit__hex">{draft.color.toUpperCase()}</span>
              </div>
              <p className="field__hint">Fundo atrás do boneco no palco. Escolha uma cor que contraste com ele.</p>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="be-media">
          <header className="panel__head">
            <h2 className="panel__title" id="be-media">
              Imagens e vídeos
            </h2>
          </header>
          <div className="boneco-edit__body">
            {SLOTS.map((s) => (
              <MediaPicker
                key={s.slot}
                slot={s.slot}
                title={s.title}
                hint={s.hint}
                current={currentFile(s.slot)}
                pending={s.slot in files}
                error={fileErrors[s.slot] ?? null}
                onPick={(file) => pick(s.slot, file)}
                onClear={() => clear(s.slot)}
              />
            ))}
            <p className="field__hint">PNG, WebP, GIF, JPG, WebM ou MP4, até 25 MB. Fundo transparente fica melhor.</p>
          </div>
        </section>

        <section className="panel" aria-labelledby="be-falas">
          <header className="panel__head">
            <h2 className="panel__title" id="be-falas">
              Falas e voz
            </h2>
          </header>
          <div className="boneco-edit__body">
            <TextAreaField
              label="Falas prontas"
              value={draft.phrasesText}
              rows={6}
              placeholder={'{nome}, que pergunta boa!\nAnotado, {nome}. Já respondo.'}
              hint={`Uma por linha. {nome} vira o nome de quem pediu. Usadas na demonstração e quando a IA não responder. ${phrases.length}/${PHRASES_MAX} falas.`}
              onChange={(e) => set('phrasesText', e.target.value)}
            />
            <SelectField
              label="Voz"
              value={draft.voice.voiceURI ?? ''}
              hint={
                CAN_SPEAK
                  ? 'Vozes instaladas neste computador. Use vozes diferentes para cada boneco. Na LIVE, use o mesmo computador e navegador.'
                  : 'Este navegador não oferece voz sintetizada.'
              }
              disabled={!CAN_SPEAK}
              onChange={(e) => set('voice', { ...draft.voice, voiceURI: e.target.value || undefined })}
            >
              <option value="">Padrão do navegador (português)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} · {v.lang}
                </option>
              ))}
            </SelectField>
            <Slider
              label="Tom da voz"
              value={draft.voice.pitch}
              min={0.5}
              max={2}
              step={0.05}
              format={(v) => v.toFixed(2).replace('.', ',')}
              hint="Grave à esquerda, aguda à direita. Vale para a voz do navegador na demonstração."
              onChange={(v) => set('voice', { ...draft.voice, pitch: v })}
            />
            <Slider
              label="Velocidade da fala"
              value={draft.voice.rate}
              min={0.5}
              max={1.5}
              step={0.05}
              format={(v) => `${v.toFixed(2).replace('.', ',')}×`}
              onChange={(v) => set('voice', { ...draft.voice, rate: v })}
            />
          </div>
        </section>

        {saveError ? (
          <p className="palco__warn" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="boneco-edit__foot">
          <Button type="submit" variant="primary" icon={Save} loading={saving}>
            {existing ? 'Salvar alterações' : 'Criar boneco'}
          </Button>
          <Link className="btn btn--ghost" to="/palco/bonecos">
            Cancelar
          </Link>
          {existing ? (
            <Button className="boneco-edit__delete" variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>
              Excluir boneco
            </Button>
          ) : null}
        </div>
      </div>

      <aside className="boneco-edit__preview" aria-labelledby="be-preview">
        <section className="panel">
          <header className="panel__head">
            <h2 className="panel__title" id="be-preview">
              Prévia em cena
            </h2>
          </header>
          <div className="boneco-edit__plate" style={{ '--plate': previewBoneco.color } as CSSProperties}>
            <span className="boneco-edit__plate-name">{previewBoneco.name}</span>
            <BonecoView boneco={previewBoneco} speaking={talking} preview={preview} />
          </div>
          <div className="boneco-edit__preview-actions">
            <Button size="sm" icon={MessageCircle} aria-pressed={talking} onClick={() => setTalking((t) => !t)}>
              {talking ? 'Parar fala' : 'Simular fala'}
            </Button>
            <Button size="sm" variant="ghost" icon={Volume2} onClick={hear} disabled={!CAN_SPEAK || hearing} title={CAN_SPEAK ? undefined : 'Este navegador não oferece voz sintetizada.'}>
              {hearing ? 'Falando…' : 'Ouvir voz'}
            </Button>
          </div>
          {phrases.length ? (
            <p className="boneco-edit__sample">
              <span>Exemplo de fala</span>
              {fillName(phrases[0]!, 'lu_gamer')}
            </p>
          ) : null}
        </section>
      </aside>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Excluir ${existing?.name ?? 'boneco'}?`}
        description="O boneco sai de todas as vagas do Palco e os arquivos dele são apagados deste navegador. Não dá para desfazer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Manter boneco
            </Button>
            <Button variant="danger" icon={Trash2} loading={deleting} onClick={() => void remove()}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="palco__note">Os arquivos originais no seu computador não são afetados.</p>
      </Dialog>
    </form>
  );
}

export default function BonecoEditPage() {
  const { bonecoId } = useParams();
  const bonecos = useBonecos();
  const isNew = bonecoId === 'novo';
  const existing = isNew ? null : bonecos.items.find((b) => b.id === bonecoId) ?? null;

  let body;
  if (!isNew && bonecos.status === 'loading') {
    body = (
      <div className="boneco-edit" aria-busy="true" aria-label="Carregando boneco">
        <Skeleton height="28rem" />
        <Skeleton height="22rem" />
      </div>
    );
  } else if (!isNew && !existing) {
    body = (
      <div className="panel">
        <EmptyState icon={UserRound} title="Boneco não encontrado" text="Ele pode ter sido excluído, ou foi criado em outro navegador.">
          <Link className="btn btn--primary" to="/palco/bonecos">
            Ver os bonecos
          </Link>
        </EmptyState>
      </div>
    );
  } else {
    // A chave recomeça o formulário ao trocar de boneco pela navegação.
    body = <Editor key={existing?.id ?? 'novo'} existing={existing} />;
  }

  return (
    <div className="palco">
      <Link className="boneco-edit__back" to="/palco/bonecos">
        <ArrowLeft size={16} aria-hidden />
        Voltar aos bonecos
      </Link>
      {body}
    </div>
  );
}
