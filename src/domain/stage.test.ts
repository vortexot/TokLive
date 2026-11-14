import { describe, expect, it } from 'vitest';
import { DEMO_SCRIPTS, HOSTS, STAGE_FORMATS, beatMs, getHost, introScript, scriptedReply, speakableName, speechMs } from './stage';

describe('palco: catálogo e roteiros', () => {
  it('todo quadro tem roteiro, e só fala quem está no elenco do quadro', () => {
    for (const format of STAGE_FORMATS) {
      const beats = DEMO_SCRIPTS[format.id];
      expect(beats.length).toBeGreaterThan(0);
      expect(format.hostIds.length).toBeGreaterThan(0);
      for (const beat of beats) {
        if (beat.kind === 'fala') expect(format.hostIds).toContain(beat.hostId);
      }
      // Todo roteiro tem pelo menos uma fala, senão o palco ficaria mudo.
      expect(beats.some((b) => b.kind === 'fala')).toBe(true);
    }
  });

  it('as falas cabem no limite longo de uma fala (280 caracteres)', () => {
    const lines = [...Object.values(DEMO_SCRIPTS).flat(), ...HOSTS.flatMap((h) => introScript(h.id))];
    for (const beat of lines) {
      if (beat.kind === 'fala') expect(beat.text.length).toBeLessThanOrEqual(280);
    }
  });

  it('todo anfitrião participa de algum quadro e tem apresentação e respostas', () => {
    for (const host of HOSTS) {
      expect(STAGE_FORMATS.some((f) => f.hostIds.includes(host.id))).toBe(true);
      expect(host.intro.length).toBeGreaterThan(0);
      expect(host.replies.every((r) => r.includes('{nome}'))).toBe(true);
      expect(getHost(host.id)).toBe(host);
    }
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

  it('gera o pedido com o comando do quadro e uma resposta com o nome', () => {
    const beats = scriptedReply('papo-reto', 'lu_gamer', '  qual o melhor jogo?  ');
    expect(beats).toHaveLength(2);
    expect(beats[0]).toEqual({ kind: 'pedido', username: 'lu_gamer', text: '!pergunta qual o melhor jogo?' });
    expect(beats[1]).toMatchObject({ kind: 'fala', hostId: 'lula-akatsuki' });
    expect(beats[1]!.kind === 'fala' && beats[1]!.text).toContain('Lu');
    expect(beats[1]!.kind === 'fala' && beats[1]!.text).not.toContain('{nome}');
  });

  it('é determinístico e ignora pedido vazio', () => {
    expect(scriptedReply('duelo', 'voce', 'pizza ou hambúrguer')).toEqual(scriptedReply('duelo', 'voce', 'pizza ou hambúrguer'));
    expect(scriptedReply('duelo', 'voce', '   ')).toEqual([]);
  });

  it('não repete o comando quando o espectador já digitou um', () => {
    expect(scriptedReply('oraculo', 'voce', '!sorte amor')[0]).toMatchObject({ text: '!sorte amor' });
  });
});
