import { beforeEach, describe, expect, it } from 'vitest';
import { bonecoFromDraft } from '../domain/bonecos';
import { deleteBoneco, loadBonecos, resetBonecoStoreForTests, saveBoneco, useBonecos } from './bonecoStore';
import { renderHook, waitFor } from '@testing-library/react';

const make = (id: string, name: string, now = 1) =>
  bonecoFromDraft({ name, persona: '', phrasesText: '', voice: { pitch: 1, rate: 1 }, color: '#202026' }, { id, now, media: { parado: null, falando: null } });

const png = (name: string) => new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });

beforeEach(() => resetBonecoStoreForTests());

describe('armazenamento dos bonecos (memória, sem IndexedDB)', () => {
  it('começa vazio e grava um boneco com arquivos', async () => {
    const { result } = renderHook(() => useBonecos());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.items).toEqual([]);

    const saved = await saveBoneco(make('b1', 'Zé'), { parado: png('ze.png') });
    expect(saved.media.parado).toMatchObject({ kind: 'imagem', mime: 'image/png', name: 'ze.png', size: 4 });
    expect(saved.media.falando).toBeNull();
    await waitFor(() => expect(result.current.items.map((b) => b.name)).toEqual(['Zé']));
  });

  it('troca, mantém e remove arquivos ao editar', async () => {
    await loadBonecos();
    const first = await saveBoneco(make('b1', 'Zé'), { parado: png('a.png'), falando: png('b.png') });
    const kept = await saveBoneco({ ...first, name: 'Zé 2' });
    expect(kept.media.parado?.id).toBe(first.media.parado?.id);
    const swapped = await saveBoneco(kept, { parado: png('c.png'), falando: null });
    expect(swapped.media.parado?.id).not.toBe(first.media.parado?.id);
    expect(swapped.media.parado?.name).toBe('c.png');
    expect(swapped.media.falando).toBeNull();
  });

  it('recusa arquivo de formato não aceito sem gravar nada', async () => {
    await loadBonecos();
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    await expect(saveBoneco(make('b1', 'Zé'), { parado: pdf })).rejects.toThrow(/Formato/);
    const { result } = renderHook(() => useBonecos());
    expect(result.current.items).toEqual([]);
  });

  it('lista em ordem de cadastro e exclui', async () => {
    await loadBonecos();
    await saveBoneco(make('b2', 'Segundo', 20));
    await saveBoneco(make('b1', 'Primeiro', 10));
    const { result } = renderHook(() => useBonecos());
    expect(result.current.items.map((b) => b.id)).toEqual(['b1', 'b2']);
    await deleteBoneco('b1');
    await waitFor(() => expect(result.current.items.map((b) => b.id)).toEqual(['b2']));
  });
});
