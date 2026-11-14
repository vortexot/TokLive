// Remove os arquivos gerados pelo build anterior (a pasta assets/ da raiz) antes de gerar de novo.
// O build escreve direto na raiz do repositório, que é de onde o GitHub Pages publica; sem esta limpeza,
// arquivos com hash de versões antigas se acumulariam.
import { rmSync } from 'node:fs';

rmSync(new URL('../assets', import.meta.url), { recursive: true, force: true });
