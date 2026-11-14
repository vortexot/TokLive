import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLOR,
  MEDIA_MAX_BYTES,
  PHRASES_MAX,
  bonecoFromDraft,
  checkMediaFile,
  draftFromBoneco,
  formatBytes,
  mediaKindOf,
  parsePhrases,
  sanitizeBoneco,
  validateDraft,
  type BonecoDraft,
} from './bonecos';

const draft = (patch: Partial<BonecoDraft> = {}): BonecoDraft => ({
  name: 'Zé Neon',
  persona: '',
  phrasesText: '',
  voice: { pitch: 1, rate: 1 },
  color: '#123456',
  ...patch,
});

describe('bonecos: arquivos', () => {
  it('aceita imagens e vídeos comuns e recusa o resto', () => {
    expect(mediaKindOf('image/png')).toBe('imagem');
    expect(mediaKindOf('IMAGE/WEBP')).toBe('imagem');
    expect(mediaKindOf('video/webm')).toBe('video');
    expect(mediaKindOf('image/svg+xml')).toBeNull();
    expect(checkMediaFile({ type: 'application/pdf', size: 10 })).toMatch(/Formato não aceito/);
    expect(checkMediaFile({ type: 'image/png', size: MEDIA_MAX_BYTES + 1 })).toMatch(/grande demais/);
    expect(checkMediaFile({ type: 'image/png', size: 0 })).toMatch(/vazio/);
    expect(checkMediaFile({ type: 'video/mp4', size: 1000 })).toBeNull();
  });

  it('mostra tamanhos em KB ou MB', () => {
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3,5 MB');
  });
});

describe('bonecos: falas e formulário', () => {
  it('uma fala por linha, sem vazias nem repetidas, dentro do limite', () => {
    expect(parsePhrases('  Oi, {nome}!  \n\n oi, {NOME}! \nTchau')).toEqual(['Oi, {nome}!', 'Tchau']);
    const many = Array.from({ length: PHRASES_MAX + 5 }, (_, i) => `fala ${i}`).join('\n');
    expect(parsePhrases(many)).toHaveLength(PHRASES_MAX);
  });

  it('exige nome com 2 caracteres ou mais, sem repetir outro boneco', () => {
    expect(validateDraft(draft({ name: ' a ' }), []).name).toMatch(/pelo menos 2/);
    expect(validateDraft(draft({ name: 'Zé Neon' }), ['zé neon']).name).toMatch(/Já existe/);
    expect(validateDraft(draft(), ['Outro'])).toEqual({});
  });

  it('monta o boneco limpando e limitando os campos', () => {
    const b = bonecoFromDraft(draft({ name: '  Zé Neon  ', phrasesText: 'a\nb', voice: { pitch: 9, rate: 0 }, color: 'vermelho' }), {
      id: 'b1',
      now: 50,
      media: { parado: null, falando: null },
    });
    expect(b).toMatchObject({ id: 'b1', name: 'Zé Neon', phrases: ['a', 'b'], voice: { pitch: 2, rate: 0.5 }, color: DEFAULT_COLOR, createdAt: 50 });
  });

  it('ao editar, mantém id e data de criação', () => {
    const first = bonecoFromDraft(draft(), { id: 'b1', now: 10, media: { parado: null, falando: null } });
    const edited = bonecoFromDraft(draft({ name: 'Outro nome' }), { id: 'novo-id', now: 99, existing: first, media: first.media });
    expect(edited).toMatchObject({ id: 'b1', createdAt: 10, updatedAt: 99, name: 'Outro nome' });
    expect(draftFromBoneco(edited).name).toBe('Outro nome');
  });
});

describe('bonecos: leitura do armazenamento', () => {
  it('descarta registro sem id ou nome e completa campos faltando', () => {
    expect(sanitizeBoneco(null)).toBeNull();
    expect(sanitizeBoneco({ id: 'x', name: '   ' })).toBeNull();
    const b = sanitizeBoneco({ id: 'x', name: 'Zé', media: { parado: { id: 'm1', mime: 'image/png', name: 'ze.png', size: 10 }, falando: { id: 'm2', mime: 'text/html' } } });
    expect(b).toMatchObject({ id: 'x', name: 'Zé', phrases: [], voice: { pitch: 1, rate: 1 }, color: DEFAULT_COLOR });
    expect(b?.media.parado).toMatchObject({ id: 'm1', kind: 'imagem' });
    expect(b?.media.falando).toBeNull();
  });
});
