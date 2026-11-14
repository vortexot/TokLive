// Palco: área de conversa falada. Os quadros têm VAGAS (anfitrião, acusação, defesa...) e o criador escolhe
// qual dos bonecos dele ocupa cada vaga. Aqui ficam só regras puras: catálogo, roteiros de demonstração e tempos.
// O desenho completo está em docs/area-de-conversa.md.

import type { Boneco } from './bonecos';
import type { GiftId } from './types';

export type StageFormatId = 'papo-reto' | 'correio' | 'oraculo' | 'historia' | 'tribunal' | 'duelo';

export interface StageSlotDef {
  /** Papel da vaga no quadro, como aparece no painel ("Anfitrião", "Acusação"). */
  label: string;
}

export interface StageFormatDef {
  id: StageFormatId;
  name: string;
  command: string;
  summary: string;
  slots: StageSlotDef[];
  /** Passo a passo do ponto de vista do espectador. */
  steps: string[];
  /** O que o presente mais alto libera neste quadro. */
  special: string;
}

export const STAGE_FORMATS: readonly StageFormatDef[] = [
  {
    id: 'papo-reto',
    name: 'Papo Reto',
    command: '!pergunta',
    summary: 'O espectador pergunta qualquer coisa e o boneco responde do jeito dele, chamando pelo nome.',
    slots: [{ label: 'Anfitrião' }],
    steps: ['Comente !pergunta e a sua dúvida.', 'O pedido entra na fila e aparece em "Próximos".', 'O boneco responde em voz alta, com legenda.'],
    special: 'Bis: outro boneco entra em cena e responde a mesma pergunta.',
  },
  {
    id: 'correio',
    name: 'Correio Falado',
    command: '!recado',
    summary: 'O boneco lê o recado do espectador em voz alta, com uma abertura no estilo dele.',
    slots: [{ label: 'Anfitrião' }],
    steps: ['Envie um presente e comente !recado com a mensagem.', 'O boneco anuncia de quem é o recado.', 'O recado é lido como foi escrito, depois dos filtros.'],
    special: 'Jogral: dois bonecos leem o recado alternando.',
  },
  {
    id: 'oraculo',
    name: 'Oráculo',
    command: '!sorte',
    summary: 'Uma leitura bem-humorada que usa o nível, as vitórias e o jogo favorito de quem pediu.',
    slots: [{ label: 'Oráculo' }],
    steps: ['Comente !sorte, com um tema se quiser.', 'O seu personagem aparece ao lado do boneco.', 'Vale uma leitura por espectador em cada LIVE.'],
    special: 'Profecia da LIVE: uma previsão sobre a próxima partida, conferida no fim.',
  },
  {
    id: 'historia',
    name: 'História Coletiva',
    command: '!e',
    summary: 'Uma história em capítulos. Entre um capítulo e outro, o chat sugere e vota o que acontece.',
    slots: [{ label: 'Narrador' }],
    steps: ['O boneco narra um capítulo e para no suspense.', 'Comente !e e o que acontece em seguida.', 'O chat escolhe entre duas sugestões com !voto 1 ou !voto 2.'],
    special: 'Reviravolta: quem enviou escolhe o que acontece, sem votação.',
  },
  {
    id: 'tribunal',
    name: 'Tribunal da LIVE',
    command: '!confesso',
    summary: 'O espectador confessa um crime bobo. Um boneco acusa, outro defende e o chat é o júri.',
    slots: [{ label: 'Acusação' }, { label: 'Defesa' }],
    steps: ['Comente !confesso e o seu crime.', 'A acusação e a defesa falam, uma de cada vez.', 'O chat vota: !voto 1 culpado, !voto 2 inocente.'],
    special: 'Réplica: o lado que você apoia ganha uma fala a mais.',
  },
  {
    id: 'duelo',
    name: 'Duelo de Opiniões',
    command: '!tema',
    summary: 'Dois bonecos defendem lados opostos de um tema leve. Votos e curtidas decidem.',
    slots: [{ label: 'Lado 1' }, { label: 'Lado 2' }],
    steps: ['Comente !tema com duas opções.', 'Cada boneco defende um lado, em duas rodadas.', 'Vote com !voto 1 ou !voto 2. Curtidas contam como aplauso.'],
    special: 'Tréplica: o boneco apoiado ganha uma fala extra.',
  },
];

export function getStageFormat(id: StageFormatId): StageFormatDef {
  return STAGE_FORMATS.find((f) => f.id === id) as StageFormatDef;
}

export function isStageFormatId(value: unknown): value is StageFormatId {
  return STAGE_FORMATS.some((f) => f.id === value);
}

/* Elenco: qual boneco ocupa cada vaga de cada quadro */

/** Ids de boneco por vaga, na ordem das vagas do quadro. `null` é vaga vazia. */
export type StageCast = Record<StageFormatId, (string | null)[]>;

/**
 * Elenco que vale de fato: cada vaga guarda o boneco escolhido se ele ainda existir. Vaga sem escolha recebe
 * um boneco que ainda não está em cena no mesmo quadro (na ordem de cadastro). Sem bonecos, a vaga fica vazia.
 */
export function resolveCast(saved: Partial<StageCast> | null | undefined, bonecos: readonly Boneco[]): StageCast {
  const ids = new Set(bonecos.map((b) => b.id));
  const out = {} as StageCast;
  for (const format of STAGE_FORMATS) {
    const chosen = saved?.[format.id] ?? [];
    const used = new Set<string>();
    const row: (string | null)[] = format.slots.map((_, i) => {
      const id = chosen[i];
      if (typeof id === 'string' && ids.has(id) && !used.has(id)) {
        used.add(id);
        return id;
      }
      return null;
    });
    for (let i = 0; i < row.length; i++) {
      // Só preenche sozinho o que nunca foi escolhido. "Nenhum" escolhido de propósito vem como "".
      if (row[i] !== null || chosen[i] === '') continue;
      const free = bonecos.find((b) => !used.has(b.id));
      if (free) {
        used.add(free.id);
        row[i] = free.id;
      }
    }
    out[format.id] = row;
  }
  return out;
}

/* Roteiro: a sequência de momentos que o palco mostra */

export type Beat =
  | { kind: 'pedido'; username: string; text: string; gift?: GiftId }
  /** `slot` é a vaga que fala (0 = primeira vaga do quadro). */
  | { kind: 'fala'; slot: number; text: string }
  | { kind: 'enquete'; question: string; options: [string, string]; votes: [number, number] }
  | { kind: 'aviso'; text: string };

/** Roteiros de demonstração. As falas são neutras: servem para qualquer boneco que o criador puser na vaga. */
export const DEMO_SCRIPTS: Record<StageFormatId, Beat[]> = {
  'papo-reto': [
    { kind: 'pedido', username: 'lu_gamer', text: '!pergunta vale a pena aprender violão depois dos 30?' },
    { kind: 'fala', slot: 0, text: 'Lu, vale sim. Os dedos reclamam nas primeiras semanas e depois agradecem. Comece hoje.' },
    { kind: 'pedido', username: 'caio_77', text: '!pergunta qual é o segredo para acordar cedo?', gift: 'foguete' },
    { kind: 'fala', slot: 0, text: 'Caio, o segredo é dormir cedo. Eu sei, ninguém quer ouvir isso. Mas funciona.' },
    { kind: 'pedido', username: 'bia.joga', text: '!pergunta você gosta de fazer live?' },
    { kind: 'fala', slot: 0, text: 'Bia, eu adoro. Principalmente quando o chat manda pergunta boa assim.' },
  ],
  correio: [
    { kind: 'pedido', username: 'duda.ok', text: '!recado um salve pro meu irmão Caio que tá assistindo do trabalho', gift: 'escudo' },
    { kind: 'fala', slot: 0, text: 'Chegou recado! É da Duda: um salve para o meu irmão Caio, que está assistindo do trabalho. Caio, cuidado com o chefe!' },
    { kind: 'pedido', username: 'rafa_zx', text: '!recado parabéns pra minha vó Lurdes, 80 anos hoje', gift: 'foguete' },
    { kind: 'fala', slot: 0, text: 'Recado do Rafa: parabéns para a minha avó Lurdes, oitenta anos hoje. Dona Lurdes, a live inteira manda um abraço!' },
  ],
  oraculo: [
    { kind: 'pedido', username: 'caio_77', text: '!sorte' },
    { kind: 'fala', slot: 0, text: 'Caio, vejo três vitórias na corrida e um tombo feio no chão de lava. Tradução: hoje, escolha a corrida.' },
    { kind: 'pedido', username: 'nina.play', text: '!sorte trabalho' },
    { kind: 'fala', slot: 0, text: 'Nina, vejo uma reunião que podia ser um e-mail. Ela aparece em todos os futuros. Sinto muito.' },
  ],
  historia: [
    { kind: 'aviso', text: 'Capítulo 1 de 5' },
    { kind: 'fala', slot: 0, text: 'Era uma vez um castelo com uma porta que ninguém conseguia abrir. Até que, numa noite de chuva, alguém bateu do lado de dentro.' },
    { kind: 'aviso', text: 'Sugestões abertas: comente !e e o que acontece agora' },
    { kind: 'pedido', username: 'lu_gamer', text: '!e quem bateu era o cachorro do rei' },
    { kind: 'pedido', username: 'bia.joga', text: '!e um dragão pedindo emprego' },
    { kind: 'enquete', question: 'O que acontece agora?', options: ['Era o cachorro do rei', 'Um dragão pede emprego'], votes: [38, 62] },
    { kind: 'aviso', text: 'Capítulo 2 de 5' },
    { kind: 'fala', slot: 0, text: 'E foi então que, por ideia da Bia, a porta se abriu e um dragão estendeu o currículo. Experiência: quinhentos anos guardando tesouro.' },
  ],
  tribunal: [
    { kind: 'pedido', username: 'lu_gamer', text: '!confesso comi a última fatia de pizza e culpei o cachorro' },
    { kind: 'fala', slot: 0, text: 'A ré comeu a pizza e ainda incriminou um inocente de quatro patas. Peço a condenação máxima.' },
    { kind: 'fala', slot: 1, text: 'Protesto! A fatia estava sozinha e com frio na geladeira. A Lu deu um lar para ela.' },
    { kind: 'enquete', question: 'Veredito do chat', options: ['Culpada', 'Inocente'], votes: [71, 29] },
    { kind: 'fala', slot: 0, text: 'Culpada! A pena é o título de ladra oficial de pizza até o fim da live. Sessão encerrada.' },
  ],
  duelo: [
    { kind: 'pedido', username: 'rafa_zx', text: '!tema biscoito ou bolacha' },
    { kind: 'aviso', text: 'Tema aprovado: biscoito ou bolacha' },
    { kind: 'fala', slot: 0, text: 'É biscoito! Está na embalagem, está no dicionário, está no meu coração.' },
    { kind: 'fala', slot: 1, text: 'É bolacha! Quem fala biscoito nunca molhou uma no café.' },
    { kind: 'fala', slot: 0, text: 'Molhar no café é coisa de quem não respeita a crocância.' },
    { kind: 'fala', slot: 1, text: 'Crocância passa. Bolacha é para sempre. Chat, vocês sabem a verdade.' },
    { kind: 'enquete', question: 'Quem venceu?', options: ['Lado 1: biscoito', 'Lado 2: bolacha'], votes: [44, 56] },
  ],
};

/* Tempo de cada momento */

const MS_PER_CHAR = 58;

/** Duração estimada de uma fala. O áudio real traria a duração exata. */
export function speechMs(text: string): number {
  return Math.min(16000, Math.max(1800, Math.round(text.trim().length * MS_PER_CHAR)));
}

/** Quanto tempo um momento fica na tela, incluindo uma pausa depois da fala. */
export function beatMs(beat: Beat): number {
  switch (beat.kind) {
    case 'fala':
      return speechMs(beat.text) + 900;
    case 'pedido':
      return 2600;
    case 'enquete':
      return 4600;
    case 'aviso':
      return 2200;
  }
}

/* Pedido digitado no campo de teste */

/** Nome que dá para falar em voz alta: só letras latinas, sem @, números e símbolos. Sem nada aproveitável, vira "visitante". */
export function speakableName(username: string): string {
  const first = username
    .normalize('NFKC')
    .replace(/^@+/, '')
    .split(/[^A-Za-zÀ-ÖØ-öø-ÿ]+/)
    .find((part) => part.length >= 2);
  if (!first) return 'visitante';
  return first.charAt(0).toUpperCase() + first.slice(1, 14).toLowerCase();
}

/** Falas usadas quando o boneco da vaga não tem nenhuma fala pronta cadastrada. */
export const FALLBACK_PHRASES: readonly string[] = [
  '{nome}, recebi a sua mensagem. Boa pergunta!',
  'Anotado, {nome}. Essa vai para a lista das melhores da live.',
  '{nome}, isso merece uma resposta com calma. Fica de olho que eu volto nela.',
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function fillName(phrase: string, username: string): string {
  return phrase.replace(/\{nome\}/gi, speakableName(username));
}

/**
 * Resposta de roteiro para um pedido digitado: escolhe uma das falas prontas do boneco da primeira vaga.
 * A mesma entrada gera sempre a mesma resposta.
 */
export function scriptedReply(format: StageFormatId, username: string, text: string, phrases: readonly string[]): Beat[] {
  const def = getStageFormat(format);
  const clean = text.trim().replace(/\s+/g, ' ').slice(0, 140);
  if (!clean) return [];
  const pool = phrases.length ? phrases : FALLBACK_PHRASES;
  const line = pool[hash(`${username}:${clean}`) % pool.length]!;
  const withCommand = clean.startsWith('!') ? clean : `${def.command} ${clean}`;
  return [
    { kind: 'pedido', username, text: withCommand },
    { kind: 'fala', slot: 0, text: fillName(line, username) },
  ];
}
