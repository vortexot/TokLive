// Store mínimo (sem dependência externa) com seleção por igualdade.

import { createContext, useContext, useRef, useSyncExternalStore } from 'react';
import type { AppState } from './types';

export interface Store<S> {
  getState(): S;
  setState(updater: (state: S) => S): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<S>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState(updater) {
      const next = updater(state);
      if (next === state) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export const StoreContext = createContext<Store<AppState> | null>(null);

export function useAppStore(): Store<AppState> {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext ausente: envolva a aplicação em <AppProvider>.');
  return store;
}

/** Lê uma fatia do estado. O seletor pode devolver objetos novos: a igualdade rasa evita re-renders inúteis. */
export function useAppState<T>(selector: (state: AppState) => T, equals: (a: T, b: T) => boolean = shallowEqual): T {
  const store = useAppStore();
  const last = useRef<{ value: T } | null>(null);
  const getSnapshot = () => {
    const next = selector(store.getState());
    if (last.current && equals(last.current.value, next)) return last.current.value;
    last.current = { value: next };
    return next;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
