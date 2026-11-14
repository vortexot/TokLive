import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DataService } from '../services/dataService';
import { createApp, type Actions, type App, type Role } from './app';
import { StoreContext } from './store';

const ActionsContext = createContext<Actions | null>(null);

/** Permite trocar a criação do app (testes injetam relógio, aleatório e serviço de dados). */
export const AppFactoryContext = createContext<((role: Role) => App) | null>(null);
const DataServiceContext = createContext<DataService | null>(null);

export function useDataService(): DataService {
  const service = useContext(DataServiceContext);
  if (!service) throw new Error('DataServiceContext ausente: envolva a aplicação em <AppProvider>.');
  return service;
}

export function useActions(): Actions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('ActionsContext ausente: envolva a aplicação em <AppProvider>.');
  return actions;
}

/** Cria o app uma vez, liga os temporizadores e carrega os dados (painel). */
export function AppProvider({ children, role = 'panel', app: injected }: { children: ReactNode; role?: Role; app?: App }) {
  const factory = useContext(AppFactoryContext);
  const [app] = useState(() => injected ?? factory?.(role) ?? createApp({ role }));

  useEffect(() => {
    const stop = app.start();
    if (role === 'panel') void app.actions.bootstrap();
    return stop;
  }, [app, role]);

  return (
    <StoreContext.Provider value={app.store}>
      <ActionsContext.Provider value={app.actions}>
        <DataServiceContext.Provider value={app.dataService}>{children}</DataServiceContext.Provider>
      </ActionsContext.Provider>
    </StoreContext.Provider>
  );
}
