// Configuração em tempo de execução, lida de config.js (na raiz do site, fora do pacote gerado).
// Assim a URL e a chave pública do Supabase mudam editando um arquivo, sem refazer o build.
// A chave "anon" é pública por projeto: quem protege os dados são as políticas de segurança por linha.

export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

declare global {
  interface Window {
    TOKARENA_CONFIG?: Partial<RuntimeConfig>;
  }
}

export function readConfig(source: Partial<RuntimeConfig> | undefined = typeof window === 'undefined' ? undefined : window.TOKARENA_CONFIG): RuntimeConfig | null {
  const url = source?.supabaseUrl?.trim();
  const key = source?.supabaseAnonKey?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return null;
  } catch {
    return null;
  }
  return { supabaseUrl: url.replace(/\/+$/, ''), supabaseAnonKey: key };
}

export function isBackendConfigured(): boolean {
  return readConfig() !== null;
}
