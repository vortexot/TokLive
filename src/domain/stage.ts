// Palco: área de conversa falada. AMOSTRA VISUAL com falas de roteiro, sem IA e sem ligação com a LIVE.
// Tudo aqui é puro (sem React e sem navegador). O desenho completo está em docs/area-de-conversa.md.

import type { GiftId } from './types';

export type HostId = 'lula-akatsuki' | 'irmao-sharingan' | 'patrick-ssj' | 'cebolinha-caderno' | 'picapau-palha';

export type StageFormatId = 'papo-reto' | 'correio' | 'oraculo' | 'historia' | 'tribunal' | 'duelo';

export interface HostDef {
  id: HostId;
  name: string;
  /** Nome curto, usado na legenda do palco. */
  short: string;
  /** De que mistura o anfitrião é paródia. */
  mix: string;
  personality: string;
  voice: string;
  /** Cor da placa atrás do anfitrião. */
  backdrop: string;
  /** Tom (0.6 a 1.6) e ritmo (0.7 a 1.3) da voz do navegador na demonstração. */
  pitch: number;
  rate: number;
  /** Falas de apresentação. */
  intro: string[];
  /** Respostas de roteiro para o campo "Testar um pedido". `{nome}` vira o nome de quem pediu. */
  replies: string[];
}

export const HOSTS: readonly HostDef[] = [
  {
    id: 'lula-akatsuki',
    name: 'Lula Molusco da Akatsuki',
    short: 'Lula Molusco',
    mix: 'Lula Molusco × Akatsuki',
    personality: 'Entediado e sarcástico. Entrou para a organização atrás de silêncio para ensaiar clarinete e não encontrou.',
    voice: 'Nasal, arrastada, sem paciência',
    backdrop: '#3b1622',
    pitch: 0.8,
    rate: 0.9,
    intro: [
      'Entrei para a Akatsuki atrás de paz e silêncio. Descobri que tem reunião toda semana e ninguém respeita o meu clarinete.',
      'Podem perguntar. Eu respondo. Depois volto a fingir que vocês não existem.',
    ],
    replies: [
      '{nome}, ouvi a sua mensagem. Infelizmente.',
      '{nome}, a resposta é não. Qual era a pergunta mesmo?',
      'Ótima questão, {nome}. Vou pensar nela durante o meu solo de clarinete. Ou seja, nunca.',
    ],
  },
  {
    id: 'irmao-sharingan',
    name: 'Irmão do Jorel com Sharingan',
    short: 'Irmão do Jorel',
    mix: 'Irmão do Jorel × Sharingan',
    personality: 'Tímido e empolgado ao mesmo tempo. Enxerga tudo com os olhos novos e continua sendo só o irmão do Jorel.',
    voice: 'Infantil, acelerada, um pouco ofegante',
    backdrop: '#16263f',
    pitch: 1.5,
    rate: 1.15,
    intro: [
      'Com o Sharingan eu copio qualquer técnica. Menos o cabelo do Jorel. Esse ninguém copia.',
      'Ninguém sabe o meu nome, mas agora todo mundo conhece os meus olhos. Já é um começo.',
    ],
    replies: [
      '{nome}, o meu Sharingan leu a sua mensagem antes de você terminar de digitar.',
      'Eu vi isso vindo, {nome}. De verdade. Eu vejo tudo vindo.',
      '{nome}, vou perguntar para a Vovó Juju. Ela sabe mais que qualquer Hokage.',
    ],
  },
  {
    id: 'patrick-ssj',
    name: 'Patrick Super Saiyajin',
    short: 'Patrick',
    mix: 'Patrick Estrela × Super Saiyajin',
    personality: 'O mais poderoso e o menos concentrado do universo. Esquece o que estava fazendo no meio do golpe.',
    voice: 'Grave, lenta, muito feliz',
    backdrop: '#3a3210',
    pitch: 0.65,
    rate: 0.85,
    intro: [
      'O meu poder é de mais de oito mil! Eu acho. Eu não sei contar até oito mil.',
      'Eu treinei cem anos debaixo de uma pedra. Era a minha casa. Eu estava dormindo.',
    ],
    replies: [
      '{nome}, eu ia responder, mas o meu cabelo começou a brilhar e eu me distraí.',
      'A resposta, {nome}, é... qual era a pergunta? Eu estava carregando energia.',
      '{nome}, isso é mais difícil que virar Super Saiyajin. E eu virei sem querer.',
    ],
  },
  {
    id: 'cebolinha-caderno',
    name: 'Cebolinha do Caderno',
    short: 'Cebolinha',
    mix: 'Cebolinha × Death Note',
    personality: 'Dono do plano infalível definitivo. Troca o R pelo L e a confiança continua intacta.',
    voice: 'Infantil, convencida, trocando o R pelo L',
    backdrop: '#143524',
    pitch: 1.35,
    rate: 1.05,
    intro: [
      'Este é o meu plano infalível! Eu esclevo o nome no caderno e, em quarenta segundos, a pessoa me entlega o coelhinho.',
      'Desta vez nada pode dar elado. Eu só pleciso lembrar como se escleve o nome dela.',
    ],
    replies: [
      '{nome}, o seu nome já está no caderno. Calma, é só a lista de convidados do plano.',
      'Boa pergunta, {nome}. A lesposta faz parte do plano, e o plano é secleto.',
      '{nome}, anota aí: desta vez o plano não tem como dar elado.',
    ],
  },
  {
    id: 'picapau-palha',
    name: 'Pica-Pau do Chapéu de Palha',
    short: 'Pica-Pau',
    mix: 'Pica-Pau × Chapéu de Palha',
    personality: 'Capitão caótico. Quer ser o rei dos piratas e sair do restaurante sem pagar a conta.',
    voice: 'Aguda, rápida, com risada no fim',
    backdrop: '#40230f',
    pitch: 1.6,
    rate: 1.25,
    intro: [
      'Eu vou ser o rei dos piratas! E vocês vão pagar a conta do restaurante.',
      'O meu tesouro está bem guardado. Eu só não lembro em qual árvore eu bati para esconder.',
    ],
    replies: [
      '{nome}, respondo depois do almoço. O almoço é por sua conta.',
      'Boa, {nome}! Você acaba de entrar para a tripulação. O salário é zero.',
      '{nome}, isso está no mapa do tesouro. Eu comi o mapa.',
    ],
  },
];

export function getHost(id: HostId): HostDef {
  return HOSTS.find((h) => h.id === id) as HostDef;
}

/* Quadros */

export interface StageFormatDef {
  id: StageFormatId;
  name: string;
  command: string;
  summary: string;
  hostIds: HostId[];
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
    summary: 'O espectador pergunta qualquer coisa e o anfitrião responde do jeito dele, chamando pelo nome.',
    hostIds: ['lula-akatsuki'],
    steps: ['Comente !pergunta e a sua dúvida.', 'O pedido entra na fila e aparece em "Próximos".', 'O anfitrião responde em voz alta, com legenda.'],
    special: 'Bis: outro anfitrião entra em cena e responde a mesma pergunta.',
  },
  {
    id: 'correio',
    name: 'Correio Falado',
    command: '!recado',
    summary: 'O anfitrião lê o recado do espectador em voz alta, com uma abertura no estilo dele.',
    hostIds: ['picapau-palha'],
    steps: ['Envie um presente e comente !recado com a mensagem.', 'O anfitrião anuncia de quem é o recado.', 'O recado é lido como foi escrito, depois dos filtros.'],
    special: 'Jogral: dois anfitriões leem o recado alternando.',
  },
  {
    id: 'oraculo',
    name: 'Oráculo',
    command: '!sorte',
    summary: 'Uma leitura bem-humorada que usa o nível, as vitórias e o jogo favorito de quem pediu.',
    hostIds: ['irmao-sharingan'],
    steps: ['Comente !sorte, com um tema se quiser.', 'O seu personagem aparece ao lado do anfitrião.', 'Vale uma leitura por espectador em cada LIVE.'],
    special: 'Profecia da LIVE: uma previsão sobre a próxima partida, conferida no fim.',
  },
  {
    id: 'historia',
    name: 'História Coletiva',
    command: '!e',
    summary: 'Uma história em capítulos. Entre um capítulo e outro, o chat sugere e vota o que acontece.',
    hostIds: ['cebolinha-caderno'],
    steps: ['O anfitrião narra um capítulo e para no suspense.', 'Comente !e e o que acontece em seguida.', 'O chat escolhe entre duas sugestões com !voto 1 ou !voto 2.'],
    special: 'Reviravolta: quem enviou escolhe o que acontece, sem votação.',
  },
  {
    id: 'tribunal',
    name: 'Tribunal da LIVE',
    command: '!confesso',
    summary: 'O espectador confessa um crime bobo. Um anfitrião acusa, outro defende e o chat é o júri.',
    hostIds: ['lula-akatsuki', 'patrick-ssj'],
    steps: ['Comente !confesso e o seu crime.', 'A acusação e a defesa falam, uma de cada vez.', 'O chat vota: !voto 1 culpado, !voto 2 inocente.'],
    special: 'Réplica: o lado que você apoia ganha uma fala a mais.',
  },
  {
    id: 'duelo',
    name: 'Duelo de Opiniões',
    command: '!tema',
    summary: 'Dois anfitriões defendem lados opostos de um tema leve. Votos e curtidas decidem.',
    hostIds: ['cebolinha-caderno', 'picapau-palha'],
    steps: ['Comente !tema com duas opções.', 'Cada anfitrião defende um lado, em duas rodadas.', 'Vote com !voto 1 ou !voto 2. Curtidas contam como aplauso.'],
    special: 'Tréplica: o anfitrião apoiado ganha uma fala extra.',
  },
];

export function getStageFormat(id: StageFormatId): StageFormatDef {
  return STAGE_FORMATS.find((f) => f.id === id) as StageFormatDef;
}

/* Roteiro: a sequência de momentos que o palco mostra */

export type Beat =
  | { kind: 'pedido'; username: string; text: string; gift?: GiftId }
  | { kind: 'fala'; hostId: HostId; text: string }
  | { kind: 'enquete'; question: string; options: [string, string]; votes: [number, number] }
  | { kind: 'aviso'; text: string };

export const DEMO_SCRIPTS: Record<StageFormatId, Beat[]> = {
  'papo-reto': [
    { kind: 'pedido', username: 'lu_gamer', text: '!pergunta vale a pena aprender violão depois dos 30?' },
    { kind: 'fala', hostId: 'lula-akatsuki', text: 'Lu, vale. Só não aprenda perto de mim. Já tenho barulho demais nesta organização.' },
    { kind: 'pedido', username: 'caio_77', text: '!pergunta qual é o segredo para acordar cedo?', gift: 'foguete' },
    { kind: 'fala', hostId: 'lula-akatsuki', text: 'Caio, o segredo é ter um vizinho barulhento. Eu tenho dois. Não durmo desde que cheguei aqui.' },
    { kind: 'pedido', username: 'bia.joga', text: '!pergunta você gosta de fazer live?' },
    { kind: 'fala', hostId: 'lula-akatsuki', text: 'Bia, eu gosto de três coisas: clarinete, silêncio e o fim desta live.' },
  ],
  correio: [
    { kind: 'pedido', username: 'duda.ok', text: '!recado um salve pro meu irmão Caio que tá assistindo do trabalho', gift: 'escudo' },
    {
      kind: 'fala',
      hostId: 'picapau-palha',
      text: 'Chegou recado no navio! É da Duda: um salve para o meu irmão Caio, que está assistindo do trabalho. Caio, o chefe está logo atrás de você!',
    },
    { kind: 'pedido', username: 'rafa_zx', text: '!recado parabéns pra minha vó Lurdes, 80 anos hoje', gift: 'foguete' },
    {
      kind: 'fala',
      hostId: 'picapau-palha',
      text: 'Recado da tripulação! O Rafa manda: parabéns para a minha avó Lurdes, oitenta anos hoje. Dona Lurdes, guarde um pedaço de bolo para o capitão!',
    },
  ],
  oraculo: [
    { kind: 'pedido', username: 'caio_77', text: '!sorte' },
    { kind: 'fala', hostId: 'irmao-sharingan', text: 'Caio, o meu Sharingan vê três vitórias na corrida e um tombo feio no chão de lava. Tradução: hoje, escolha a corrida.' },
    { kind: 'pedido', username: 'nina.play', text: '!sorte trabalho' },
    { kind: 'fala', hostId: 'irmao-sharingan', text: 'Nina, eu vejo uma reunião que podia ser um e-mail. Eu vejo isso em todos os futuros. Sinto muito.' },
  ],
  historia: [
    { kind: 'aviso', text: 'Capítulo 1 de 5' },
    {
      kind: 'fala',
      hostId: 'cebolinha-caderno',
      text: 'Ela uma vez um plano infalível, guardado em um caderno pleto. Só faltava uma coisa: alguém que soubesse ler a minha letla.',
    },
    { kind: 'aviso', text: 'Sugestões abertas: comente !e e o que acontece agora' },
    { kind: 'pedido', username: 'lu_gamer', text: '!e o caderno cai na mão do cachorro' },
    { kind: 'pedido', username: 'bia.joga', text: '!e aparece um dragão pedindo emprego' },
    { kind: 'enquete', question: 'O que acontece agora?', options: ['O cachorro pega o caderno', 'Um dragão pede emprego'], votes: [38, 62] },
    { kind: 'aviso', text: 'Capítulo 2 de 5' },
    {
      kind: 'fala',
      hostId: 'cebolinha-caderno',
      text: 'E foi então que, por ideia da Bia, um dlagão bateu na porta pedindo emplego. Ele tinha expeliência em guardar tesoulos.',
    },
  ],
  tribunal: [
    { kind: 'pedido', username: 'lu_gamer', text: '!confesso comi a última fatia de pizza e culpei o cachorro' },
    { kind: 'fala', hostId: 'lula-akatsuki', text: 'A ré comeu a pizza e incriminou um inocente. Na Akatsuki, isso se chama terça-feira. Peço a condenação.' },
    { kind: 'fala', hostId: 'patrick-ssj', text: 'Eu defendo a Lu! A pizza estava sozinha e com frio. Ela deu um lar para a fatia. Dentro da barriga.' },
    { kind: 'enquete', question: 'Veredito do chat', options: ['Culpada', 'Inocente'], votes: [71, 29] },
    { kind: 'fala', hostId: 'lula-akatsuki', text: 'Culpada. A pena é o título de ladra oficial de pizza desta live. Sessão encerrada. Posso voltar ao clarinete.' },
  ],
  duelo: [
    { kind: 'pedido', username: 'rafa_zx', text: '!tema biscoito ou bolacha' },
    { kind: 'aviso', text: 'Tema aprovado: biscoito ou bolacha' },
    { kind: 'fala', hostId: 'cebolinha-caderno', text: 'É biscoito! Está esclito no meu caderno, e o que está no caderno acontece.' },
    { kind: 'fala', hostId: 'picapau-palha', text: 'É bolacha! Eu comi quarenta pacotes ontem e nenhum reclamou do nome.' },
    { kind: 'fala', hostId: 'cebolinha-caderno', text: 'Bolacha é o que você leva quando o plano dá elado. Eu sei do que estou falando.' },
    { kind: 'fala', hostId: 'picapau-palha', text: 'Então você entende de bolacha mais do que eu. Ponto para mim!' },
    { kind: 'enquete', question: 'Quem venceu?', options: ['Cebolinha: biscoito', 'Pica-Pau: bolacha'], votes: [44, 56] },
  ],
};

/** Roteiro de apresentação de um anfitrião, para a galeria do elenco. */
export function introScript(hostId: HostId): Beat[] {
  return getHost(hostId).intro.map((text) => ({ kind: 'fala' as const, hostId, text }));
}

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

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Resposta de roteiro para um pedido digitado. A mesma entrada gera sempre a mesma resposta. */
export function scriptedReply(format: StageFormatId, username: string, text: string): Beat[] {
  const def = getStageFormat(format);
  const clean = text.trim().replace(/\s+/g, ' ').slice(0, 140);
  if (!clean) return [];
  const host = getHost(def.hostIds[hash(clean) % def.hostIds.length]!);
  const line = host.replies[hash(`${username}:${clean}`) % host.replies.length]!;
  const withCommand = clean.startsWith('!') ? clean : `${def.command} ${clean}`;
  return [
    { kind: 'pedido', username, text: withCommand },
    { kind: 'fala', hostId: host.id, text: line.replace('{nome}', speakableName(username)) },
  ];
}
