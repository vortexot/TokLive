import { memo, useMemo } from 'react';
import { generateCharacter } from '../../domain/characters';
import type { CharacterSpec } from '../../domain/types';

/* Desenho 2D de um personagem a partir da spec. Coordenadas relativas ao centro da cabeça,
   e o mesmo vocabulário (cabelo, acessório, roupa) da malha 3D em features/scene. */

function BackHair({ spec }: { spec: CharacterSpec }) {
  if (spec.hairStyle !== 'longo') return null;
  return <path d="M-24 -8 C-24 -28 24 -28 24 -8 L25 32 L-25 32Z" fill={spec.hairColor} />;
}

function FrontHair({ spec }: { spec: CharacterSpec }) {
  const c = spec.hairColor;
  switch (spec.hairStyle) {
    case 'careca':
      return null;
    case 'moicano':
      return (
        <>
          <path d="M-20 -4 C-20 -18 -8 -22 0 -22 C8 -22 20 -18 20 -4 C14 -12 6 -14 0 -14 C-6 -14 -14 -12 -20 -4Z" fill={c} />
          <path d="M-5 -24 C-5 -44 5 -44 5 -24 L5 -6 L-5 -6Z" fill={c} />
        </>
      );
    case 'cacheado':
      return (
        <g fill={c}>
          {[[-17, -12], [-9, -23], [0, -27], [9, -23], [17, -12], [-21, 0], [21, 0]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={9} />
          ))}
        </g>
      );
    default:
      return (
        <>
          <path d="M-21 -2 C-23 -24 -10 -29 0 -29 C10 -29 23 -24 21 -2 C17 -13 9 -17 0 -17 C-9 -17 -17 -13 -21 -2Z" fill={c} />
          {spec.hairStyle === 'topete' ? <path d="M-4 -27 C0 -42 15 -40 19 -26 C12 -31 4 -31 -4 -27Z" fill={c} /> : null}
          {spec.hairStyle === 'coque' ? <circle cx="0" cy="-33" r="9" fill={c} /> : null}
        </>
      );
  }
}

function HeadAccessory({ spec }: { spec: CharacterSpec }) {
  const c = spec.accessoryColor;
  switch (spec.accessory) {
    case 'bone':
      return (
        <>
          <path d="M-22 -6 C-22 -32 22 -32 22 -6Z" fill={c} />
          <rect x="-22" y="-9" width="53" height="6" rx="3" fill={c} />
        </>
      );
    case 'faixa':
      return <rect x="-21" y="-15" width="42" height="6" fill={c} />;
    case 'coroa':
      return <polygon points="-14,-22 -14,-38 -7,-29 0,-40 7,-29 14,-38 14,-22" fill="#e2b33c" />;
    case 'fone':
      return (
        <>
          <path d="M-22 0 C-22 -36 22 -36 22 0" fill="none" stroke={c} strokeWidth="4" />
          <rect x="-27" y="-5" width="8" height="15" rx="3" fill={c} />
          <rect x="19" y="-5" width="8" height="15" rx="3" fill={c} />
        </>
      );
    default:
      return null;
  }
}

function Face({ spec }: { spec: CharacterSpec }) {
  return (
    <>
      <ellipse cx="-21" cy="3" rx="3.5" ry="5" fill={spec.skin} />
      <ellipse cx="21" cy="3" rx="3.5" ry="5" fill={spec.skin} />
      <ellipse cx="0" cy="0" rx="20" ry="22" fill={spec.skin} />
      <circle cx="-7" cy="2" r="2.2" fill="#1a1412" />
      <circle cx="7" cy="2" r="2.2" fill="#1a1412" />
      <path d="M-5 12 Q0 16 5 12" fill="none" stroke="#1a1412" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
      {spec.accessory === 'oculos' ? (
        <g fill="none" stroke={spec.accessoryColor} strokeWidth="2.2">
          <circle cx="-8" cy="2" r="6" />
          <circle cx="8" cy="2" r="6" />
          <path d="M-2 2 H2" />
        </g>
      ) : null}
    </>
  );
}

function Head({ spec }: { spec: CharacterSpec }) {
  return (
    <>
      <BackHair spec={spec} />
      <Face spec={spec} />
      <FrontHair spec={spec} />
      <HeadAccessory spec={spec} />
    </>
  );
}

function sleeveFill(spec: CharacterSpec) {
  return spec.topStyle === 'regata' ? spec.skin : spec.topColor;
}

function Bust({ spec }: { spec: CharacterSpec }) {
  const strap = spec.accessory === 'mochila';
  return (
    <svg viewBox="0 0 100 100" className="avatar" aria-hidden focusable="false">
      <path d="M8 100 C8 78 26 70 50 70 C74 70 92 78 92 100Z" fill={spec.topStyle === 'regata' ? spec.skin : spec.topColor} />
      {spec.topStyle === 'regata' ? <path d="M30 100 C30 84 38 76 50 76 C62 76 70 84 70 100Z" fill={spec.topColor} /> : null}
      {spec.topStyle === 'moletom' ? <path d="M38 71 C42 80 58 80 62 71 L58 70 C55 76 45 76 42 70Z" fill="#000" opacity="0.28" /> : null}
      {spec.topStyle === 'camisa-time' ? <rect x="8" y="88" width="84" height="5" fill="#fff" opacity="0.85" /> : null}
      {strap ? (
        <>
          <rect x="30" y="72" width="7" height="28" fill={spec.accessoryColor} />
          <rect x="63" y="72" width="7" height="28" fill={spec.accessoryColor} />
        </>
      ) : null}
      <rect x="42" y="56" width="16" height="18" fill={spec.skin} />
      <rect x="42" y="56" width="16" height="18" fill="#000" opacity="0.14" />
      <g transform="translate(50 40)">
        <Head spec={spec} />
      </g>
    </svg>
  );
}

function Full({ spec }: { spec: CharacterSpec }) {
  const sleeve = sleeveFill(spec);
  const longSleeve = spec.topStyle === 'moletom';
  return (
    <svg viewBox="0 0 100 160" className="avatar" aria-hidden focusable="false">
      {spec.accessory === 'mochila' ? <rect x="26" y="64" width="48" height="38" rx="5" fill={spec.accessoryColor} opacity="0.9" /> : null}
      {/* braços */}
      <rect x="14" y="62" width="13" height="36" rx="5" fill={spec.skin} />
      <rect x="73" y="62" width="13" height="36" rx="5" fill={spec.skin} />
      <rect x="14" y="62" width="13" height={longSleeve ? 34 : 17} rx="5" fill={sleeve} />
      <rect x="73" y="62" width="13" height={longSleeve ? 34 : 17} rx="5" fill={sleeve} />
      {/* pernas e tênis */}
      <rect x="32" y="100" width="16" height="44" fill={spec.bottomColor} />
      <rect x="52" y="100" width="16" height="44" fill={spec.bottomColor} />
      <rect x="29" y="142" width="22" height="10" rx="4" fill={spec.shoeColor} />
      <rect x="49" y="142" width="22" height="10" rx="4" fill={spec.shoeColor} />
      {/* tronco */}
      <rect x="26" y="60" width="48" height="44" rx="6" fill={spec.topStyle === 'regata' ? spec.skin : spec.topColor} />
      {spec.topStyle === 'regata' ? <rect x="33" y="60" width="34" height="44" rx="5" fill={spec.topColor} /> : null}
      {spec.topStyle === 'camisa-time' ? <rect x="26" y="86" width="48" height="5" fill="#fff" opacity="0.85" /> : null}
      <rect x="26" y="98" width="48" height="6" fill={spec.bottomColor} />
      {spec.accessory === 'mochila' ? (
        <>
          <rect x="33" y="62" width="6" height="30" fill={spec.accessoryColor} />
          <rect x="61" y="62" width="6" height="30" fill={spec.accessoryColor} />
        </>
      ) : null}
      <rect x="43" y="52" width="14" height="12" fill={spec.skin} />
      <rect x="43" y="52" width="14" height="12" fill="#000" opacity="0.14" />
      <g transform="translate(50 34)">
        <Head spec={spec} />
      </g>
    </svg>
  );
}

export type AvatarVariant = 'bust' | 'full';

export const AvatarSvg = memo(function AvatarSvg({ spec, variant = 'bust' }: { spec: CharacterSpec; variant?: AvatarVariant }) {
  return variant === 'bust' ? <Bust spec={spec} /> : <Full spec={spec} />;
});

/** Avatar a partir da semente persistida do participante, dentro de uma placa quadrada. */
export function Avatar({ seed, size = 40, variant = 'bust' }: { seed: string; size?: number; variant?: AvatarVariant }) {
  const spec = useMemo(() => generateCharacter(seed), [seed]);
  const full = variant === 'full';
  return (
    <span className="avatar-plate" style={{ width: size, height: full ? size * 1.5 : size }} aria-hidden>
      <AvatarSvg spec={spec} variant={variant} />
    </span>
  );
}
