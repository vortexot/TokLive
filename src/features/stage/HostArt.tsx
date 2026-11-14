import { memo, type ReactNode } from 'react';
import { getHost, type HostId } from '../../domain/stage';

/* Anfitriões do Palco, desenhados em SVG com formas simples (mesma abordagem da arte dos jogos).
   São paródias feitas para a amostra visual. Quadro de 200 × 260, com os pés em y = 250.
   `.host-mouth` e `.host-jaw` são animados pelo CSS quando o anfitrião fala. */

const INK = '#14141a';

function Mouth({ cx, cy, rx, ry, fill = '#5a1a22' }: { cx: number; cy: number; rx: number; ry: number; fill?: string }) {
  return <ellipse className="host-mouth" cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />;
}

/** Nuvem vermelha de contorno branco, o estampado do manto. */
function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-16 6 a8 8 0 0 1 2 -15 a10 10 0 0 1 18 -3 a8 8 0 0 1 12 9 a7 7 0 0 1 -2 9 z"
      fill="#d7263d"
      stroke="#f5f5f5"
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );
}

function LulaAkatsuki() {
  const skin = '#a8cfc0';
  const shade = '#86b5a4';
  const dark = '#4f7d6f';
  const cloak = '#191920';
  return (
    <>
      {/* tentáculos */}
      {[70, 90, 110, 130].map((x) => (
        <ellipse key={x} cx={x} cy={243} rx={10} ry={7} fill={skin} stroke={dark} strokeWidth={1.5} />
      ))}
      {/* clarinete e o tentáculo que o segura */}
      <path d="M150 138 L171 214" stroke="#0e0e12" strokeWidth={8} strokeLinecap="round" />
      <path d="M150 138 L171 214" stroke="#3b3b45" strokeWidth={1.5} strokeLinecap="round" />
      <ellipse cx={172} cy={218} rx={8} ry={4.5} fill="#0e0e12" stroke="#3b3b45" strokeWidth={1.5} />
      {[158, 176, 194].map((y, i) => (
        <circle key={y} cx={154.5 + i * 5} cy={y} r={2.2} fill="#c9ccd4" />
      ))}
      {/* manto */}
      <path d="M64 140 L136 140 L158 238 L42 238 Z" fill={cloak} stroke="#3b3b45" strokeWidth={2} strokeLinejoin="round" />
      <path d="M100 142 V238" stroke="#3b3b45" strokeWidth={1.5} />
      <Cloud x={76} y={182} />
      <Cloud x={126} y={214} s={0.9} />
      <path d="M138 172 Q150 166 160 172" stroke={skin} strokeWidth={10} strokeLinecap="round" fill="none" />
      {/* pescoço e cabeça */}
      <rect x={90} y={118} width={20} height={30} fill={shade} />
      <ellipse cx={100} cy={52} rx={44} ry={34} fill={skin} stroke={dark} strokeWidth={1.5} />
      <rect x={78} y={56} width={44} height={74} rx={20} fill={skin} />
      <path d="M78 76 V112 a22 20 0 0 0 44 0 V76" fill="none" stroke={dark} strokeWidth={1.5} />
      {/* bandana riscada */}
      <path d="M58 39 Q100 30 142 39 L143 50 Q100 41 57 50 Z" fill="#24355f" />
      <rect x={82} y={31} width={36} height={12} rx={2} fill="#b9c0cc" />
      <path d="M85 38 L115 36" stroke="#3b3b45" strokeWidth={1.8} strokeLinecap="round" />
      {/* olhos de tédio */}
      {[88, 112].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={72} rx={12} ry={16} fill="#f3efc4" stroke={dark} strokeWidth={1.5} />
          <rect x={x - 4} y={74} width={8} height={6} rx={2} fill="#7b2d26" />
          <path d={`M${x - 12} 73 a12 16 0 0 1 24 0 Z`} fill={shade} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
        </g>
      ))}
      {/* nariz caído */}
      <path d="M92 84 q8 -6 16 0 q5 22 -8 34 q-13 -12 -8 -34 z" fill={shade} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
      <Mouth cx={100} cy={124} rx={11} ry={5} />
      {/* gola alta */}
      <path d="M60 144 L68 108 L90 134 L100 142 L110 134 L132 108 L140 144 Z" fill={cloak} stroke="#3b3b45" strokeWidth={2} strokeLinejoin="round" />
      <path d="M72 116 L90 138 L100 146 L110 138 L128 116 L124 138 L100 150 L76 138 Z" fill="#b51224" />
    </>
  );
}

function Sharingan({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill="#f5f5f5" stroke={INK} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={8.4} fill="#d7263d" stroke="#7a0f1c" strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={4.8} fill="none" stroke={INK} strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={2.2} fill={INK} />
      {[-90, 30, 150].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return <circle key={deg} cx={cx + Math.cos(a) * 4.8} cy={cy + Math.sin(a) * 4.8} r={1.9} fill={INK} />;
      })}
    </g>
  );
}

function IrmaoSharingan() {
  const skin = '#f2cba3';
  const hair = '#2b1a12';
  const scallops: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    scallops.push([100 + Math.cos(a) * 44, 76 + Math.sin(a) * 42]);
  }
  return (
    <>
      {/* pernas e tênis */}
      <rect x={86} y={204} width={9} height={36} fill={skin} />
      <rect x={105} y={204} width={9} height={36} fill={skin} />
      <ellipse cx={88} cy={244} rx={12} ry={6.5} fill="#f5f5f5" stroke="#8a8a94" strokeWidth={1.5} />
      <ellipse cx={112} cy={244} rx={12} ry={6.5} fill="#f5f5f5" stroke="#8a8a94" strokeWidth={1.5} />
      {/* bermuda, camiseta e braços */}
      <rect x={80} y={184} width={40} height={26} rx={5} fill="#c8323c" />
      <rect x={68} y={152} width={11} height={36} rx={5.5} fill={skin} />
      <rect x={121} y={152} width={11} height={36} rx={5.5} fill={skin} />
      <rect x={78} y={144} width={44} height={46} rx={9} fill="#8fc7e8" />
      <rect x={66} y={148} width={15} height={16} rx={6} fill="#8fc7e8" />
      <rect x={119} y={148} width={15} height={16} rx={6} fill="#8fc7e8" />
      <rect x={93} y={130} width={14} height={18} fill={skin} />
      {/* cabelão */}
      <circle cx={100} cy={76} r={50} fill={hair} />
      {scallops.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={19} fill={hair} />
      ))}
      {/* rosto e franja */}
      <ellipse cx={100} cy={106} rx={36} ry={31} fill={skin} />
      {[72, 100, 128].map((x, i) => (
        <circle key={x} cx={x} cy={i === 1 ? 74 : 80} r={19} fill={hair} />
      ))}
      {/* bandana ninja */}
      <path d="M58 84 Q100 76 142 84 L142 95 Q100 87 58 95 Z" fill="#24355f" />
      <rect x={84} y={78} width={32} height={12} rx={2} fill="#b9c0cc" />
      <circle cx={100} cy={84} r={3.2} fill="none" stroke="#3b3b45" strokeWidth={1.4} />
      <circle cx={88} cy={84} r={1} fill="#3b3b45" />
      <circle cx={112} cy={84} r={1} fill="#3b3b45" />
      {/* olhos */}
      <Sharingan cx={86} cy={111} />
      <Sharingan cx={114} cy={111} />
      <path d="M74 99 L94 103" stroke={hair} strokeWidth={3} strokeLinecap="round" />
      <path d="M126 99 L106 103" stroke={hair} strokeWidth={3} strokeLinecap="round" />
      <Mouth cx={100} cy={128} rx={6} ry={4} />
    </>
  );
}

function PatrickSsj() {
  const pink = '#f39aa8';
  const spot = '#e27f90';
  return (
    <>
      {/* aura */}
      <path
        d="M100 2 C128 28 170 70 174 132 C180 192 162 238 100 252 C38 238 20 192 26 132 C30 70 72 28 100 2 Z"
        fill="#ffd23f"
        fillOpacity={0.14}
        stroke="#ffd23f"
        strokeOpacity={0.55}
        strokeWidth={2}
      />
      {/* corpo de estrela */}
      <path
        d="M100 44 C112 72 126 100 132 124 L168 138 L136 158 C140 178 140 196 138 206 L150 244 L106 226 L94 226 L50 244 L62 206 C60 196 60 178 64 158 L32 138 L68 124 C74 100 88 72 100 44 Z"
        fill={pink}
        stroke={pink}
        strokeWidth={9}
        strokeLinejoin="round"
      />
      {[
        [80, 150],
        [118, 142],
        [108, 168],
        [50, 138],
        [150, 138],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={2.6} fill={spot} />
      ))}
      {/* bermuda florida */}
      <path d="M60 182 H140 L142 206 L150 230 L106 214 H94 L50 230 L58 206 Z" fill="#9bd34a" stroke="#6fa42b" strokeWidth={1.5} strokeLinejoin="round" />
      {[
        [76, 198],
        [100, 196],
        [124, 198],
        [66, 214],
        [134, 214],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={4.2} fill="#8e5bd1" />
      ))}
      {/* cabelo dourado */}
      <path
        d="M76 76 L66 38 L86 58 L92 10 L104 54 L124 20 L118 60 L140 46 L124 80 Z"
        fill="#ffd23f"
        stroke="#d99e00"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* rosto */}
      {[90, 110].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={98} rx={8} ry={11} fill="#f5f5f5" stroke={INK} strokeWidth={1.5} />
          <circle cx={x} cy={99} r={3.6} fill="#1fae9b" />
          <circle cx={x} cy={99} r={1.5} fill={INK} />
        </g>
      ))}
      <path d="M79 82 L97 89" stroke="#d99e00" strokeWidth={5} strokeLinecap="round" />
      <path d="M121 82 L103 89" stroke="#d99e00" strokeWidth={5} strokeLinecap="round" />
      <g className="host-mouth">
        <path d="M84 116 Q100 138 116 116 Z" fill="#7a1f2b" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M93 126 Q100 132 107 126 Q100 122 93 126 Z" fill="#e8607a" />
      </g>
    </>
  );
}

function CebolinhaCaderno() {
  const skin = '#f6cfa5';
  const hair = '#1a1412';
  return (
    <>
      {/* maçã no chão */}
      <circle cx={158} cy={240} r={9} fill="#d7263d" />
      <path d="M158 231 q1 -6 5 -8" stroke="#5b3a1e" strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M161 227 q7 -4 10 2 q-6 3 -10 -2 z" fill="#3aa655" />
      {/* pernas e sapatos */}
      <rect x={86} y={204} width={10} height={34} fill={skin} />
      <rect x={104} y={204} width={10} height={34} fill={skin} />
      <ellipse cx={87} cy={243} rx={13} ry={7} fill="#6b3f24" />
      <ellipse cx={113} cy={243} rx={13} ry={7} fill="#6b3f24" />
      {/* short e camisa */}
      <rect x={78} y={184} width={44} height={26} rx={5} fill="#23232b" stroke="#3b3b45" strokeWidth={1.5} />
      <rect x={64} y={146} width={12} height={38} rx={6} fill={skin} />
      <rect x={76} y={136} width={48} height={52} rx={10} fill="#3aa655" />
      <rect x={62} y={142} width={16} height={16} rx={6} fill="#3aa655" />
      {/* cabeça */}
      <circle cx={55} cy={92} r={8} fill={skin} />
      <circle cx={145} cy={92} r={8} fill={skin} />
      <circle cx={100} cy={86} r={46} fill={skin} />
      {['M100 42 Q98 24 90 12', 'M91 43 Q84 26 72 20', 'M109 43 Q114 24 126 18', 'M83 46 Q72 34 60 32', 'M117 46 Q128 34 140 32'].map((d) => (
        <path key={d} d={d} stroke={hair} strokeWidth={4} strokeLinecap="round" fill="none" />
      ))}
      {[86, 114].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={84} rx={8} ry={12} fill="#f5f5f5" stroke={hair} strokeWidth={1.5} />
          <ellipse cx={x + (x < 100 ? 2 : -2)} cy={86} rx={4} ry={7} fill={hair} />
        </g>
      ))}
      <path d="M76 68 Q86 62 95 68" stroke={hair} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <path d="M105 62 Q115 54 125 62" stroke={hair} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Mouth cx={100} cy={112} rx={12} ry={7} fill="#6b1f24" />
      {/* caderno do plano infalível */}
      <g transform="translate(8 2) rotate(-8 127 166)">
        <rect x={106} y={140} width={42} height={54} rx={2} fill="#0e0e12" stroke="#8a8a94" strokeWidth={1.5} />
        <text x={127} y={161} textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight={700} fontSize={9} fill="#f5f5f5">
          PLANO
        </text>
        <text x={127} y={172} textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight={700} fontSize={8} fill="#f5f5f5">
          INFALÍVEL
        </text>
        <path d="M114 180 H140" stroke="#8a8a94" strokeWidth={1} />
      </g>
      <path d="M120 150 Q112 170 106 186" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
      <rect x={112} y={140} width={14} height={16} rx={6} fill="#3aa655" />
    </>
  );
}

function PicaPauPalha() {
  const blue = '#2f6fd0';
  const deep = '#1f4fa8';
  const yellow = '#f5b301';
  const straw = '#e8c56a';
  const strawLine = '#b8923a';
  return (
    <>
      {/* cauda */}
      <path d="M74 188 L44 214 L58 212 L48 234 L80 206 Z" fill={deep} strokeLinejoin="round" />
      {/* pernas e pés */}
      <path d="M90 198 L88 238" stroke={yellow} strokeWidth={5} strokeLinecap="round" />
      <path d="M108 198 L110 238" stroke={yellow} strokeWidth={5} strokeLinecap="round" />
      <ellipse cx={95} cy={243} rx={14} ry={5.5} fill={yellow} />
      <ellipse cx={117} cy={243} rx={14} ry={5.5} fill={yellow} />
      {/* braço de trás */}
      <path d="M74 150 L56 176" stroke={blue} strokeWidth={10} strokeLinecap="round" />
      <circle cx={54} cy={181} r={8.5} fill="#f5f5f5" stroke="#8a8a94" strokeWidth={1.5} />
      {/* corpo, peito e colete */}
      <ellipse cx={98} cy={164} rx={30} ry={40} fill={blue} />
      <ellipse cx={104} cy={168} rx={17} ry={28} fill="#f5f5f5" />
      <path d="M70 142 Q80 132 92 136 L88 198 Q76 198 70 186 Z" fill="#d7263d" />
      <path d="M116 136 Q126 134 128 146 L126 188 Q121 197 114 197 Z" fill="#d7263d" />
      {/* braço da frente */}
      <path d="M124 150 L146 164" stroke={blue} strokeWidth={10} strokeLinecap="round" />
      <circle cx={151} cy={167} r={8.5} fill="#f5f5f5" stroke="#8a8a94" strokeWidth={1.5} />
      {/* aba do chapéu, atrás da cabeça */}
      <ellipse cx={96} cy={66} rx={58} ry={15} transform="rotate(-8 96 66)" fill={straw} stroke={strawLine} strokeWidth={2} />
      {/* cabeça */}
      <circle cx={100} cy={88} r={30} fill={blue} />
      {/* copa do chapéu e fita */}
      <path d="M66 64 Q68 28 98 26 Q126 26 130 54 Q100 70 66 64 Z" fill={straw} stroke={strawLine} strokeWidth={2} strokeLinejoin="round" />
      <path d="M66 57 Q100 64 130 47 L130 54 Q100 70 66 64 Z" fill="#d7263d" />
      {/* topete */}
      <path d="M96 64 C100 42 122 30 148 36 C135 42 131 51 127 63 C118 57 106 57 96 64 Z" fill="#d7263d" stroke="#9f1626" strokeWidth={1.5} strokeLinejoin="round" />
      {/* olhos e cicatriz */}
      <ellipse cx={106} cy={85} rx={8} ry={11} fill="#f5f5f5" stroke={INK} strokeWidth={1.5} />
      <ellipse cx={122} cy={85} rx={7} ry={10} fill="#f5f5f5" stroke={INK} strokeWidth={1.5} />
      <circle cx={109} cy={87} r={3.2} fill={INK} />
      <circle cx={124} cy={87} r={3} fill={INK} />
      <path d="M97 100 H107 M100 97.5 V102.5 M104 97.5 V102.5" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
      {/* bico: a parte de baixo abre quando fala */}
      <path d="M126 101 L160 104 L126 113 Z" fill="#6b1f24" />
      <g className="host-jaw" style={{ transformOrigin: '126px 106px' }}>
        <path d="M125 104 L166 104 L125 115 Z" fill="#dd9d00" stroke="#b07a00" strokeWidth={1.2} strokeLinejoin="round" />
      </g>
      <path d="M124 92 L178 100 L125 106 Z" fill={yellow} stroke="#b07a00" strokeWidth={1.2} strokeLinejoin="round" />
    </>
  );
}

const ART: Record<HostId, () => ReactNode> = {
  'lula-akatsuki': LulaAkatsuki,
  'irmao-sharingan': IrmaoSharingan,
  'patrick-ssj': PatrickSsj,
  'cebolinha-caderno': CebolinhaCaderno,
  'picapau-palha': PicaPauPalha,
};

export const HostArt = memo(function HostArt({ id, speaking = false, decorative = false }: { id: HostId; speaking?: boolean; decorative?: boolean }) {
  const Art = ART[id];
  const label = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': getHost(id).name };
  return (
    <svg className={`host${speaking ? ' host--speaking' : ''}`} viewBox="0 0 200 260" {...label}>
      <Art />
    </svg>
  );
});
