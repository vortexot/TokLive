import type { ReactNode } from 'react';
import type { GameId } from '../../domain/types';

/* Arte dos jogos, desenhada em SVG com a paleta do TokArena. Toda a arte é original
   (formas geométricas e personagens em bloco), sem imagens externas. */

const C = {
  bg: '#0b0b0d',
  bg2: '#111114',
  panel: '#17171c',
  raised: '#202026',
  line: '#3b3b45',
  red: '#e32636',
  deep: '#b51224',
  ink: '#ff5c68',
  white: '#f5f5f5',
  grey: '#a1a1aa',
  skin: '#e3b58f',
  skin2: '#9c6a44',
  hair: '#1a1412',
};

type Pose = 'stand' | 'run' | 'jump' | 'push' | 'fly';

/** Personagem em bloco, na origem = pés. */
function Kid({
  x,
  y,
  s = 1,
  shirt = C.red,
  skin = C.skin,
  hair = C.hair,
  pose = 'stand',
  flip = false,
  pants = '#2b2d35',
}: {
  x: number;
  y: number;
  s?: number;
  shirt?: string;
  skin?: string;
  hair?: string;
  pose?: Pose;
  flip?: boolean;
  pants?: string;
}) {
  const legs: Record<Pose, [string, string]> = {
    stand: ['M-3 0 V-12', 'M3 0 V-12'],
    run: ['M-7 0 L-1 -12', 'M7 -3 L2 -12'],
    jump: ['M-6 -4 L-2 -12', 'M6 -5 L2 -12'],
    push: ['M-8 0 L-2 -12', 'M5 0 L2 -12'],
    fly: ['M-6 -3 L-2 -12', 'M7 -1 L2 -12'],
  };
  const arms: Record<Pose, [string, string]> = {
    stand: ['M-5 -21 L-8 -12', 'M5 -21 L8 -12'],
    run: ['M-5 -21 L-11 -15', 'M5 -21 L10 -26'],
    jump: ['M-5 -21 L-11 -30', 'M5 -21 L11 -30'],
    push: ['M5 -21 L15 -19', 'M5 -19 L15 -16'],
    fly: ['M-5 -21 L-12 -27', 'M5 -21 L12 -17'],
  };
  const lean = pose === 'push' ? 14 : pose === 'fly' ? -58 : pose === 'run' ? 8 : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(${lean} 0 -12)`}>
      <g stroke={pants} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d={legs[pose][0]} />
        <path d={legs[pose][1]} />
      </g>
      <g stroke={skin} strokeWidth="3.6" strokeLinecap="round" fill="none">
        <path d={arms[pose][0]} />
        <path d={arms[pose][1]} />
      </g>
      <rect x="-6" y="-24" width="12" height="13" rx="2" fill={shirt} />
      <circle cx="0" cy="-30" r="6.5" fill={skin} />
      <path d="M-6.8 -30 C-7 -38 7 -38 6.8 -30 C4 -34 -4 -34 -6.8 -30Z" fill={hair} />
    </g>
  );
}

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className="game-art">
      <rect width="320" height="200" fill={C.bg2} />
      {children}
    </svg>
  );
}

/* ---------- 1. Corrida de obstáculos ---------- */

function Corrida() {
  const lanes = 6;
  const bx = (i: number) => -30 + (380 * i) / lanes;
  const tx = (i: number) => 118 + (84 * i) / lanes;
  const yTop = 62;
  const depth = (t: number) => yTop + (200 - yTop) * t;
  const xAt = (i: number, t: number) => tx(i) + (bx(i) - tx(i)) * t;
  const wall = (t: number, from: number, to: number, h: number, color: string) => {
    const y = depth(t);
    const a = xAt(from, t);
    const b = xAt(to, t);
    return <path key={`${t}${from}`} d={`M${a} ${y} L${b} ${y} L${b} ${y - h} L${a} ${y - h}Z`} fill={color} />;
  };
  return (
    <Frame label="Pista com raias, obstáculos vermelhos e linha de chegada">
      <rect width="320" height="62" fill={C.bg} />
      {Array.from({ length: lanes }, (_, i) => (
        <polygon key={i} points={`${tx(i)},${yTop} ${tx(i + 1)},${yTop} ${bx(i + 1)},200 ${bx(i)},200`} fill={i % 2 ? '#1d1d24' : '#17171c'} />
      ))}
      {Array.from({ length: lanes + 1 }, (_, i) => (
        <line key={i} x1={tx(i)} y1={yTop} x2={bx(i)} y2="200" stroke={C.line} strokeWidth="1.2" />
      ))}
      {/* pórtico de chegada */}
      <rect x="104" y="30" width="112" height="14" fill={C.red} />
      <rect x="104" y="30" width="112" height="3" fill="#fff" opacity="0.18" />
      <rect x="108" y="44" width="5" height="22" fill={C.raised} />
      <rect x="207" y="44" width="5" height="22" fill={C.raised} />
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} x={118 + i * 6} y={yTop - 3} width="6" height="3" fill={i % 2 ? C.bg : C.white} />
      ))}
      {/* obstáculos */}
      {wall(0.18, 0, 2, 9, C.red)}
      {wall(0.18, 4, 6, 9, C.red)}
      {wall(0.42, 1, 3, 15, C.white)}
      {wall(0.42, 5, 6, 15, C.white)}
      {wall(0.68, 0, 1, 24, C.deep)}
      {wall(0.68, 3, 5, 24, C.deep)}
      <Kid x={92} y={186} s={1.9} shirt={C.red} pose="run" skin={C.skin2} />
      <Kid x={168} y={170} s={1.45} shirt={C.white} pose="run" hair="#d9b15a" />
      <Kid x={238} y={190} s={2} shirt="#1e3a6b" pose="jump" hair="#4a2f1e" />
    </Frame>
  );
}

/* ---------- 2. Chão de lava ---------- */

function ChaoDeLava() {
  const tile = (x: number, y: number, key: string, lift = 0) => (
    <g key={key} transform={`translate(${x} ${y - lift})`}>
      <polygon points="0,0 34,-14 68,0 34,14" fill="#2b2b33" />
      <polygon points="0,0 34,14 34,26 0,12" fill="#17171c" />
      <polygon points="34,14 68,0 68,12 34,26" fill="#0f0f12" />
    </g>
  );
  return (
    <Frame label="Plataformas sobre um campo de lava">
      <rect width="320" height="200" fill={C.deep} />
      <path d="M0 120 C40 100 70 130 120 112 C170 94 210 128 260 108 C290 98 310 110 320 106 V200 H0Z" fill={C.red} />
      <path d="M0 150 C50 136 90 160 140 148 C190 136 240 162 320 144 V200 H0Z" fill="#ff3d4f" opacity="0.55" />
      {[[40, 168, 5], [96, 182, 4], [150, 160, 3], [214, 176, 5], [270, 156, 4], [24, 134, 3], [188, 140, 3]].map(([x, y, r]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill={C.ink} opacity="0.7" />
      ))}
      <rect width="320" height="72" fill={C.bg} />
      {tile(30, 110, 'a')}
      {tile(116, 92, 'b')}
      {tile(206, 118, 'c')}
      {tile(256, 82, 'd')}
      {tile(-4, 70, 'e')}
      <Kid x={150} y={92} s={1.7} shirt={C.white} pose="jump" hair="#b5472a" skin={C.skin} />
      <Kid x={64} y={106} s={1.4} shirt={C.red} pose="stand" skin={C.skin2} />
      <Kid x={238} y={116} s={1.5} shirt="#1e3a6b" pose="run" />
    </Frame>
  );
}

/* ---------- 3. Batalha de empurrões ---------- */

function Batalha() {
  return (
    <Frame label="Personagens se empurrando em uma plataforma redonda">
      <rect width="320" height="200" fill={C.bg} />
      <ellipse cx="160" cy="150" rx="136" ry="34" fill="#0f0f12" />
      <ellipse cx="160" cy="134" rx="124" ry="32" fill="#2b2b33" />
      <ellipse cx="160" cy="130" rx="124" ry="32" fill={C.raised} />
      <ellipse cx="160" cy="130" rx="100" ry="25" fill="none" stroke={C.red} strokeWidth="2.4" />
      <ellipse cx="160" cy="130" rx="52" ry="13" fill="none" stroke={C.line} strokeWidth="1.2" />
      <rect x="150" y="110" width="20" height="40" fill="none" />
      <Kid x={118} y={140} s={2.1} shirt={C.red} pose="push" />
      <Kid x={202} y={140} s={2.1} shirt={C.white} pose="push" flip hair="#d9b15a" skin={C.skin2} />
      <Kid x={268} y={78} s={1.7} shirt="#1e3a6b" pose="fly" skin={C.skin} />
      {[[250, 96], [258, 104], [244, 106]].map(([x, y]) => (
        <line key={`${x}`} x1={x} y1={y} x2={x + 14} y2={y - 8} stroke={C.grey} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      ))}
      {[[146, 112], [176, 108]].map(([x, y]) => (
        <path key={`${x}`} d={`M${x} ${y} l6 -6 M${x} ${y} l7 2 M${x} ${y} l2 -8`} stroke={C.ink} strokeWidth="2" strokeLinecap="round" />
      ))}
    </Frame>
  );
}

/* ---------- 4. Batatinha frita 1, 2, 3 ---------- */

function Batatinha() {
  return (
    <Frame label="Sinal vermelho no fim da pista e corredores congelados">
      <rect width="320" height="200" fill={C.bg} />
      <polygon points="120,66 200,66 300,200 20,200" fill="#17171c" />
      <polygon points="150,66 170,66 190,200 130,200" fill="#1d1d24" />
      <rect x="40" y="62" width="240" height="6" fill={C.white} opacity="0.9" />
      {Array.from({ length: 24 }, (_, i) => (
        <rect key={i} x={40 + i * 10} y="62" width="5" height="3" fill={C.bg} />
      ))}
      {/* sentinela */}
      <rect x="146" y="14" width="28" height="46" rx="4" fill={C.raised} />
      <circle cx="160" cy="30" r="9" fill={C.red} />
      <circle cx="160" cy="30" r="15" fill="none" stroke={C.red} strokeWidth="1.5" opacity="0.5" />
      <circle cx="160" cy="30" r="22" fill="none" stroke={C.red} strokeWidth="1" opacity="0.25" />
      <circle cx="160" cy="48" r="4" fill={C.line} />
      <Kid x={74} y={170} s={1.5} shirt={C.white} pose="run" />
      <Kid x={130} y={128} s={1.05} shirt={C.red} pose="stand" skin={C.skin2} />
      <Kid x={196} y={146} s={1.2} shirt="#1e3a6b" pose="jump" hair="#4a2f1e" />
      <Kid x={250} y={176} s={1.7} shirt={C.red} pose="stand" hair="#b5472a" />
      <Kid x={176} y={106} s={0.85} shirt={C.white} pose="run" />
    </Frame>
  );
}

/* ---------- 5. Futebol maluco ---------- */

function Futebol() {
  return (
    <Frame label="Campo com gol, bola e dois personagens">
      <rect width="320" height="200" fill={C.bg} />
      <polygon points="70,40 250,40 310,200 10,200" fill="#14161a" />
      <g fill="none" stroke={C.line} strokeWidth="1.6">
        <polygon points="70,40 250,40 310,200 10,200" />
        <line x1="40" y1="120" x2="280" y2="120" />
        <ellipse cx="160" cy="120" rx="46" ry="14" />
        <polygon points="118,40 202,40 214,58 106,58" />
      </g>
      {/* gol */}
      <rect x="116" y="14" width="88" height="28" fill="none" stroke={C.white} strokeWidth="2.2" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1={124 + i * 10} y1="14" x2={124 + i * 10} y2="42" stroke={C.grey} strokeWidth="0.8" opacity="0.55" />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <line key={i} x1="116" y1={22 + i * 8} x2="204" y2={22 + i * 8} stroke={C.grey} strokeWidth="0.8" opacity="0.55" />
      ))}
      <Kid x={104} y={150} s={2} shirt={C.red} pose="run" skin={C.skin2} />
      <Kid x={226} y={140} s={1.7} shirt={C.white} pose="push" flip hair="#d9b15a" />
      <circle cx="164" cy="146" r="9" fill={C.white} />
      <polygon points="164,141 168,144 166.5,149 161.5,149 160,144" fill={C.bg} />
      <ellipse cx="164" cy="156" rx="10" ry="2.6" fill="#000" opacity="0.4" />
      <path d="M136 132 C146 120 156 116 168 118" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="1 7" />
    </Frame>
  );
}

/* ---------- 6. Plataformas desaparecendo ---------- */

function Plataformas() {
  const cells: ReactNode[] = [];
  const missing = new Set(['1-1', '2-3', '3-1', '0-3', '3-3']);
  const cracked = new Set(['1-2', '2-2', '2-0']);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const key = `${r}-${c}`;
      if (missing.has(key)) continue;
      const x = 160 + (c - r) * 40;
      const y = 62 + (c + r) * 20;
      const crack = cracked.has(key);
      cells.push(
        <g key={key} transform={`translate(${x} ${y})`}>
          <polygon points="0,0 40,20 0,40 -40,20" fill={crack ? '#3a1d22' : '#2b2b33'} />
          <polygon points="-40,20 0,40 0,52 -40,32" fill="#17171c" />
          <polygon points="0,40 40,20 40,32 0,52" fill="#0f0f12" />
          {crack ? <path d="M-18 14 L-9 20 L-15 25 L-6 31 M10 11 L16 19 L8 23 L13 29" stroke={C.red} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        </g>,
      );
    }
  }
  return (
    <Frame label="Grade de plataformas, algumas rachadas e outras já desaparecidas">
      <rect width="320" height="200" fill={C.bg} />
      <rect y="150" width="320" height="50" fill={C.bg2} />
      {cells}
      <Kid x={160} y={84} s={1.5} shirt={C.red} pose="jump" hair="#2e6fdb" />
      <Kid x={120} y={106} s={1.35} shirt={C.white} pose="stand" skin={C.skin2} />
      <Kid x={240} y={126} s={1.4} shirt="#1e3a6b" pose="run" />
    </Frame>
  );
}

const ART: Record<GameId, () => ReactNode> = {
  corrida: Corrida,
  'chao-de-lava': ChaoDeLava,
  'batalha-empurroes': Batalha,
  batatinha: Batatinha,
  futebol: Futebol,
  plataformas: Plataformas,
};

export function GameArt({ id }: { id: GameId }) {
  const Art = ART[id];
  return <Art />;
}
