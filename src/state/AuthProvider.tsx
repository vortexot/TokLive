// Estado de login e do backend. Sem configuração (config.js vazio), o app roda só em modo demonstração.
// Com configuração, o painel exige login (ou escolha explícita da demonstração) e o overlay usa só o token.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authMessage, createBackend, currentSession, type Backend, type SupabaseLike } from '../services/backend';
import { readConfig } from '../services/config';

export type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in' | 'demo' | 'error';

export interface AuthApi {
  status: AuthStatus;
  backend: Backend | null;
  /** Cliente do Supabase, também usado pelo overlay (que não faz login). Nulo sem configuração. */
  client: SupabaseLike | null;
  error: string | null;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  useDemo(): void;
  retry(): void;
}

const AuthContext = createContext<AuthApi | null>(null);
const DEMO_KEY = 'tokarena:v1:use-demo';

const DISABLED: AuthApi = {
  status: 'disabled',
  backend: null,
  client: null,
  error: null,
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => undefined,
  useDemo: () => undefined,
  retry: () => undefined,
};

/** Sem provedor (testes, componentes isolados), o app se comporta como a demonstração local. */
export function useAuth(): AuthApi {
  return useContext(AuthContext) ?? DISABLED;
}

/** Para testes e para o app sem backend. */
export function StaticAuth({ children, value }: { children: ReactNode; value?: Partial<AuthApi> }) {
  const api: AuthApi = { ...DISABLED, ...value };
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

function readDemoFlag(): boolean {
  try {
    return window.sessionStorage.getItem(DEMO_KEY) === '1';
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => readConfig(), []);
  const [client, setClient] = useState<SupabaseLike | null>(null);
  const [status, setStatus] = useState<AuthStatus>(config ? 'loading' : 'disabled');
  const [backend, setBackend] = useState<Backend | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const demo = useRef(readDemoFlag());

  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const enter = async (c: SupabaseLike) => {
      const session = await currentSession(c);
      if (cancelled) return;
      if (!session) {
        setBackend(null);
        setStatus(demo.current ? 'demo' : 'signed-out');
        return;
      }
      try {
        const b = await createBackend(c, session);
        if (cancelled) return;
        setBackend(b);
        setError(null);
        setStatus('signed-in');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Não foi possível abrir a sua conta.');
        setStatus('error');
      }
    };

    (async () => {
      try {
        setStatus('loading');
        const { createClient } = await import('@supabase/supabase-js');
        if (cancelled) return;
        const c = createClient(config.supabaseUrl, config.supabaseAnonKey) as unknown as SupabaseLike;
        setClient(c);
        const sub = c.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void enter(c);
        });
        unsubscribe = () => sub.data.subscription.unsubscribe();
        await enter(c);
      } catch {
        if (cancelled) return;
        setError('Não foi possível falar com o servidor. Verifique a configuração e a internet.');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [config, attempt]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) return 'Servidor indisponível.';
      const res = await client.auth.signInWithPassword({ email, password });
      return res.error ? authMessage(res.error.message) : null;
    },
    [client],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!client) return 'Servidor indisponível.';
      const res = await client.auth.signUp({ email, password });
      if (res.error) return authMessage(res.error.message);
      const session = (res.data as { session?: unknown } | null)?.session;
      return session ? null : 'Conta criada. Confirme o e-mail pelo link que enviamos e depois entre.';
    },
    [client],
  );

  const signOut = useCallback(async () => {
    await client?.auth.signOut();
    try {
      window.sessionStorage.removeItem(DEMO_KEY);
    } catch {
      /* sem armazenamento */
    }
    demo.current = false;
    setBackend(null);
    setStatus('signed-out');
  }, [client]);

  const useDemo = useCallback(() => {
    try {
      window.sessionStorage.setItem(DEMO_KEY, '1');
    } catch {
      /* sem armazenamento */
    }
    demo.current = true;
    setStatus('demo');
  }, []);

  const api = useMemo<AuthApi>(
    () => ({ status, backend, client, error, signIn, signUp, signOut, useDemo, retry: () => setAttempt((n) => n + 1) }),
    [status, backend, client, error, signIn, signUp, signOut, useDemo],
  );
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
