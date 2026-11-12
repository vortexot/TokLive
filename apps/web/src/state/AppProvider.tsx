import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createApp, type Actions, type App, type Role } from './app';
import { StoreContext } from './store';

const ActionsContext = createContext<Actions | null>(null);

export function useActions(): Actions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('ActionsContext ausente: envolva a aplicação em <AppProvider>.');
  return actions;
}

/** Cria o app uma vez, liga os temporizadores e carrega os dados (painel). */
export function AppProvider({ children, role = 'panel', app: injected }: { children: ReactNode; role?: Role; app?: App }) {
  const [app] = useState(() => injected ?? createApp({ role }));

  useEffect(() => {
    const stop = app.start();
    if (role === 'panel') void app.actions.bootstrap();
    return stop;
  }, [app, role]);

  return (
    <StoreContext.Provider value={app.store}>
      <ActionsContext.Provider value={app.actions}>{children}</ActionsContext.Provider>
    </StoreContext.Provider>
  );
}
