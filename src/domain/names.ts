// Nomes de usuário SINTÉTICOS para a demonstração.
// Gerados por combinação de palavras; qualquer semelhança com contas reais é coincidência.

import { pick, randInt, type Rng } from './prng';

const FIRST = [
  'ana', 'bia', 'caio', 'dani', 'edu', 'fer', 'gabi', 'hugo', 'iris', 'joca', 'kaka', 'lari', 'mari',
  'nando', 'paulo', 'quel', 'rafa', 'sol', 'tati', 'vini', 'yuri', 'zeca', 'duda', 'nina', 'leo',
  'gui', 'pedro', 'bru', 'mel', 'thi', 'vivi', 'cacau', 'lucas', 'bela', 'davi', 'manu',
];

const WORDS = [
  'turbo', 'pixel', 'neon', 'sombra', 'raio', 'lobo', 'fenix', 'cometa', 'byte', 'nitro', 'zen',
  'fogo', 'gelo', 'astro', 'foguete', 'ninja', 'panda', 'tigre', 'corvo', 'cacto', 'jabuti',
  'capivara', 'onca', 'tucano', 'arara', 'quati', 'bugio', 'ipe', 'jaguar', 'mandacaru',
];

const TAILS = ['_play', '.gg', '_fps', '_tv', '_oficial', '.run', '_mito', 'xp', '.live', '_vt', '_ok', '_br'];

export function generateUsername(rng: Rng): string {
  const pattern = randInt(rng, 0, 5);
  const first = pick(rng, FIRST);
  const word = pick(rng, WORDS);
  const num = randInt(rng, 1, 99);
  let name: string;
  switch (pattern) {
    case 0:
      name = `${first}_${word}`;
      break;
    case 1:
      name = `${word}${num}`;
      break;
    case 2:
      name = `${first}.${word}`;
      break;
    case 3:
      name = `${word}${pick(rng, TAILS)}`;
      break;
    case 4:
      name = `${first}${pick(rng, TAILS)}`;
      break;
    default:
      name = `${first}_${num < 10 ? `0${num}` : num}`;
  }
  return name.slice(0, 24);
}

/** Gera um nome ainda não usado. */
export function uniqueUsername(rng: Rng, taken: ReadonlySet<string>): string {
  for (let i = 0; i < 60; i++) {
    const name = generateUsername(rng);
    if (!taken.has(name)) return name;
  }
  let n = 100;
  while (taken.has(`viewer${n}`)) n++;
  return `viewer${n}`;
}
