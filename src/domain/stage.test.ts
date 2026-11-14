import { describe, expect, it } from 'vitest';
import type { Boneco } from './bonecos';
import { DEMO_SCRIPTS, FALLBACK_PHRASES, STAGE_FORMATS, beatMs, fillName, isStageFormatId, resolveCast, scriptedReply, speakableName, speechMs } from './stage';

function boneco(id: string, createdAt = 0): Boneco {
  return {
    id,
    name: id,
    persona: '',
    phrases: [],
    voice: { pitch: 1, rate: 1 },
    color: '#202026',
    media: { parado: null, falando: null },
    createdAt,
    updatedAt: createdAt,
  };
}

describe('palco: catálogo e roteiros', () => {
  it('todo quadro tem vagas e roteiro, e só fala quem tem vaga no quadro', () => {
    for (const format of STAGE_FORMATS) {
      expect(format.slots.length).toBeGreaterThan(0);
      const beats = DEMO_SCRIPTS[format.id];
      expect(beats.some((b) => b.kind === 'fala')).toBe(true);
      for (const beat of beats) {
        if (beat.kind === 'fala') expect(beat.slot).toBeLessThan(format.slots.length);
      }
    }
  });

  it('os quadros de diálogo usam as duas vagas', () => {
    for (const id of ['tribunal', 'duelo'] as const) {
      const slots = new Set(DEMO_SCRIPTS[id].flatMap((b) => (b.kind === 'fala' ? [b.slot] : [])));
      expect([...slots].sort()).toEqual([0, 1]);
    }
  });

  it('as falas cabem no limite longo de uma fala (280 caracteres)', () => {
    for (const beat of Object.values(DEMO_SCRIPTS).flat()) {
      if (beat.kind === 'fala') expect(beat.text.length).toBeLessThanOrEqual(280);
    }
  });

  it('reconhece os ids de quadro', () => {
    expect(isStageFormatId('duelo')).toBe(true);
    expect(isStageFormatId('nada')).toBe(false);
    expect(isStageFormatId(null)).toBe(false);
  });
});

describe('palco: elenco', () => {
  it('sem bonecos, todas as vagas ficam vazias', () => {
    const cast = resolveCast({}, []);
    expect(cast.tribunal).toEqual([null, null]);
    expect(cast['papo-reto']).toEqual([null]);
  });

  it('preenche vagas sem escolha com bonecos diferentes, na ordem de cadastro', () => {
    const cast = resolveCast(null, [boneco('a', 1), boneco('b', 2)]);
    expect(cast['papo-reto']).toEqual(['a']);
    expect(cast.tribunal).toEqual(['a', 'b']);
  });

  it('respeita a escolha, inclusive "nenhum", e esquece boneco que não existe mais', () => {
    const bonecos = [boneco('a'), boneco('b'), boneco('c')];
    const cast = resolveCast({ tribunal: ['c', ''], duelo: ['sumiu', 'b'], 'papo-reto': ['b'] }, bonecos);
    expect(cast.tribunal).toEqual(['c', null]);
    expect(cast.duelo).toEqual(['a', 'b']);
    expect(cast['papo-reto']).toEqual(['b']);
  });

  it('o mesmo boneco não ocupa duas vagas do mesmo quadro', () => {
    const cast = resolveCast({ duelo: ['a', 'a'] }, [boneco('a'), boneco('b')]);
    expect(cast.duelo).toEqual(['a', 'b']);
  });
});

describe('palco: tempo das falas', () => {
  it('fala longa dura mais que fala curta, dentro dos limites', () => {
    expect(speechMs('Oi.')).toBe(1800);
    expect(speechMs('a'.repeat(100))).toBeGreaterThan(speechMs('a'.repeat(50)));
    expect(speechMs('a'.repeat(5000))).toBe(16000);
  });

  it('todo momento do roteiro tem duração positiva', () => {
    for (const beat of Object.values(DEMO_SCRIPTS).flat()) expect(beatMs(beat)).toBeGreaterThan(0);
  });
});

describe('palco: pedido de teste', () => {
  it('reduz o nome de usuário a algo que dá para falar', () => {
    expect(speakableName('@lu_gamer')).toBe('Lu');
    expect(speakableName('caio_77')).toBe('Caio');
    expect(speakableName('→💯157‽M!GΠ€L💯←')).toBe('visitante');
    expect(speakableName('12345')).toBe('visitante');
  });

  it('troca {nome} em qualquer posição e caixa', () => {
    expect(fillName('{nome}, oi. Tchau, {NOME}!', 'bia.joga')).toBe('Bia, oi. Tchau, Bia!');
  });

  it('responde com uma das falas prontas do boneco, com o comando do quadro', () => {
    const phrases = ['Boa, {nome}!', 'Anotado, {nome}.'];
    const beats = scriptedReply('papo-reto', 'lu_gamer', '  qual o melhor jogo?  ', phrases);
    expect(beats[0]).toEqual({ kind: 'pedido', username: 'lu_gamer', text: '!pergunta qual o melhor jogo?' });
    expect(beats[1]).toMatchObject({ kind: 'fala', slot: 0 });
    const text = beats[1]!.kind === 'fala' ? beats[1]!.text : '';
    expect(['Boa, Lu!', 'Anotado, Lu.']).toContain(text);
  });

  it('sem falas prontas, usa as frases padrão', () => {
    const beats = scriptedReply('oraculo', 'nina.play', 'amor', []);
    const text = beats[1]!.kind === 'fala' ? beats[1]!.text : '';
    expect(FALLBACK_PHRASES.map((p) => fillName(p, 'nina.play'))).toContain(text);
  });

  it('é determinístico, ignora pedido vazio e não repete o comando digitado', () => {
    expect(scriptedReply('duelo', 'voce', 'pizza ou hambúrguer', ['a', 'b'])).toEqual(scriptedReply('duelo', 'voce', 'pizza ou hambúrguer', ['a', 'b']));
    expect(scriptedReply('duelo', 'voce', '   ', ['a'])).toEqual([]);
    expect(scriptedReply('oraculo', 'voce', '!sorte amor', [])[0]).toMatchObject({ text: '!sorte amor' });
  });
});
