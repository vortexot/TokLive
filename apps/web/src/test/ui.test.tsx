import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../App';
import { createRng } from '../domain/prng';
import { createLocalDataService } from '../services/dataService';
import { createApp, type App, type Role } from '../state/app';
import { AppFactoryContext } from '../state/AppProvider';

function setup(path = '/') {
  const apps: App[] = [];
  const factory = (role: Role) => {
    const app = createApp({ role, persist: false, rng: createRng(`ui-${role}`), dataService: createLocalDataService({ latencyMs: 0 }) });
    apps.push(app);
    return app;
  };
  const utils = render(
    <AppFactoryContext.Provider value={factory}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppFactoryContext.Provider>,
  );
  return { ...utils, apps };
}

const ready = () => screen.findByRole('main');

describe('shell e navegação', () => {
  it('recolhe e expande a barra lateral, anunciando o estado', async () => {
    setup('/');
    await ready();
    const collapse = await screen.findByRole('button', { name: 'Recolher barra lateral' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapse);
    const expand = await screen.findByRole('button', { name: 'Expandir barra lateral' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    // Recolhida, os itens continuam com nome acessível.
    expect(screen.getByRole('link', { name: 'Game Hub' })).toBeInTheDocument();
  });

  it('navega pelo menu e atualiza o título da página', async () => {
    setup('/');
    await ready();
    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Ranking' })).toBeInTheDocument();
    expect(document.title).toBe('Ranking · TokArena');
  });

  it('mostra a página não encontrada para rotas desconhecidas', async () => {
    setup('/nao-existe');
    expect(await screen.findByText('Página não encontrada', { selector: 'h3' })).toBeInTheDocument();
  });
});

describe('visão geral e conexão simulada', () => {
  it('deixa claro que é demonstração e valida o @ antes de conectar', async () => {
    setup('/');
    expect(await screen.findByText(/Ambiente de demonstração\./)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('@ do TikTok'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar LIVE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use de 2 a 24 caracteres');
  });

  it('conecta pelo @ até ficar ao vivo e permite desconectar', async () => {
    setup('/');
    fireEvent.change(await screen.findByLabelText('@ do TikTok'), { target: { value: '@criador.demo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar LIVE' }));
    await waitFor(() => expect(screen.getAllByText('Conectando').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText('Ao vivo').length).toBeGreaterThan(0), { timeout: 3500 });
    const disconnect = screen.getByRole('button', { name: 'Desconectar' });
    expect(disconnect).toBeEnabled();
    fireEvent.click(disconnect);
    await waitFor(() => expect(screen.getAllByText('Desconectado').length).toBeGreaterThan(0));
  });
});

describe('game hub', () => {
  it('filtra por busca e categoria e se recupera do estado vazio', async () => {
    setup('/game-hub');
    expect(await screen.findByText('6 jogos')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar jogo pelo nome'), { target: { value: 'lava' } });
    expect(await screen.findByText('1 jogo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chão de lava' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar jogo pelo nome'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sobrevivência' }));
    expect(await screen.findByText('3 jogos')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar jogo pelo nome'), { target: { value: 'zzzz' } });
    expect(await screen.findByText('Nenhum jogo encontrado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByText('6 jogos')).toBeInTheDocument();
  });

  it('só a corrida pode ser aberta na arena; os demais mostram "Em breve" desabilitado', async () => {
    setup('/game-hub');
    await screen.findByText('6 jogos');
    expect(screen.getByRole('button', { name: 'Abrir Corrida de obstáculos na arena' })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: 'Em breve' })).toHaveLength(5);
  });
});

describe('configuração do jogo', () => {
  it('altera duração, dificuldade e regras e restaura o padrão', async () => {
    setup('/game-hub/corrida');
    const duration = await screen.findByRole('radio', { name: '2 min' });
    fireEvent.click(duration);
    expect(duration).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Difícil' }));
    expect(screen.getByRole('radio', { name: 'Difícil' })).toBeChecked();

    const gifts = screen.getByRole('switch', { name: 'Presentes ativam poderes' });
    expect(gifts).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(gifts);
    expect(gifts).toHaveAttribute('aria-checked', 'false');

    fireEvent.change(screen.getByLabelText('Limite de participantes'), { target: { value: '10' } });
    expect(screen.getByLabelText('Limite de participantes')).toHaveValue('10');

    fireEvent.click(screen.getByRole('button', { name: /Restaurar padrão/ }));
    await waitFor(() => expect(screen.getByRole('radio', { name: '90 s' })).toBeChecked());
    expect(screen.getByRole('switch', { name: 'Presentes ativam poderes' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();
  });

  it('jogos em desenvolvimento permitem configurar mas não iniciar', async () => {
    setup('/game-hub/futebol');
    expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeDisabled();
    expect(screen.getByText('Prévia 3D em desenvolvimento')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Escolha de time por comentário/ })).toBeEnabled();
  });

  it('mostra erro amigável para jogo inexistente', async () => {
    setup('/game-hub/inexistente');
    expect(await screen.findByText('Jogo não encontrado')).toBeInTheDocument();
  });
});

describe('simulador de eventos', () => {
  it('abre com Shift+D e um novo seguidor atualiza o contador do cabeçalho', async () => {
    setup('/');
    await screen.findByLabelText('120 participantes');
    const sim = screen.getByRole('complementary', { name: 'Simulador de eventos' });
    expect(sim).toHaveAttribute('inert');
    fireEvent.keyDown(window, { key: 'D', shiftKey: true });
    await waitFor(() => expect(sim).not.toHaveAttribute('inert'));
    fireEvent.change(within(sim).getByLabelText('Usuário do evento'), { target: { value: '@fulano.teste' } });
    fireEvent.click(within(sim).getByRole('button', { name: 'Novo seguidor' }));
    expect(await screen.findByLabelText('121 participantes')).toBeInTheDocument();
    expect(await screen.findByText('@fulano.teste começou a seguir')).toBeInTheDocument();
    fireEvent.keyDown(sim, { key: 'Escape' });
    await waitFor(() => expect(sim).toHaveAttribute('inert'));
  });

  it('comentário com !entrar coloca o usuário na fila da arena', async () => {
    setup('/arena');
    fireEvent.click(await screen.findByRole('button', { name: 'Usar a corrida de obstáculos' }));
    await screen.findByText('Fila da próxima partida');
    const sim = screen.getByRole('complementary', { name: 'Simulador de eventos' });
    fireEvent.keyDown(window, { key: 'D', shiftKey: true });
    await waitFor(() => expect(sim).not.toHaveAttribute('inert'));
    fireEvent.click(within(sim).getByRole('button', { name: '!entrar' }));
    expect(await screen.findByText('1/24')).toBeInTheDocument();
  });
});

describe('arena', () => {
  it('sem jogo escolhido mostra o estado vazio com chamada para escolher', async () => {
    setup('/arena');
    expect(await screen.findByText('Nenhuma partida em andamento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Escolher jogo' })).toHaveAttribute('href', '/game-hub');
  });

  it('inicia, pausa, retoma e encerra uma partida com confirmação', async () => {
    setup('/arena');
    fireEvent.click(await screen.findByRole('button', { name: 'Usar a corrida de obstáculos' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar partida' }));
    expect(await screen.findByText('Largando')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(await screen.findByText('Pausada', { selector: '.pill' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
    expect(await screen.findByText('Largando')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Encerrar a partida agora?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Encerrar partida' }));
    expect(await screen.findByText('Encerrada', { selector: '.pill' })).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: 'Resultado da partida' })).toBeInTheDocument();
  });
});

describe('participantes', () => {
  it('busca, ordena, pagina e abre os detalhes', async () => {
    setup('/participantes');
    expect(await screen.findByText('Página 1 de 8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(await screen.findByText('Página 2 de 8')).toBeInTheDocument();

    const wins = screen.getByRole('button', { name: 'Vitórias' });
    fireEvent.click(wins);
    expect(wins.closest('th')).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(wins);
    expect(wins.closest('th')).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.change(screen.getByLabelText('Buscar participante por usuário'), { target: { value: 'zzzzzz' } });
    expect(await screen.findByText('Nenhum participante encontrado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    const first = (await screen.findAllByRole('button', { name: /Ver detalhes de @/ }))[0]!;
    fireEvent.click(first);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/^@/, { selector: 'h2' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Ver personagem em 3D' })).toBeInTheDocument();
  });
});

describe('personagens, ranking e estatísticas', () => {
  it('sortear nova aparência confirma a ação', async () => {
    setup('/personagens');
    fireEvent.click(await screen.findByRole('button', { name: 'Sortear nova aparência' }));
    expect(await screen.findByText(/Nova aparência para @/)).toBeInTheDocument();
  });

  it('ranking por jogo sem partidas mostra estado vazio explicativo', async () => {
    setup('/ranking');
    await screen.findByText(/participantes pontuaram/);
    fireEvent.click(screen.getByRole('tab', { name: 'Por jogo' }));
    fireEvent.change(await screen.findByLabelText('Jogo'), { target: { value: 'futebol' } });
    expect(await screen.findByText('Sem classificação em Futebol maluco')).toBeInTheDocument();
  });

  it('estatísticas mostram erro de carregamento e se recuperam ao tentar de novo', async () => {
    const { apps } = setup('/estatisticas');
    await screen.findByText('Resumo do período');
    apps[0]!.dataService.failNext(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Últimos 30 dias' }));
    expect(await screen.findByText('Não foi possível carregar as estatísticas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Resumo do período')).toBeInTheDocument();
  });
});

describe('overlay', () => {
  it('abre sem navegação nem controles e com fundo transparente', async () => {
    setup('/overlay/demo-arena-7k2f9x');
    await waitFor(() => expect(document.querySelector('.ov')).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.documentElement).toHaveClass('overlay-mode');
  });

  it('token inválido mostra só um aviso discreto', async () => {
    setup('/overlay/ruim');
    expect(await screen.findByRole('alert')).toHaveTextContent('Token inválido ou revogado');
    expect(document.querySelector('.ov')).toBeNull();
  });
});

describe('configurações e conta', () => {
  it('valida o nome da arena e refletir na barra lateral', async () => {
    setup('/configuracoes');
    const name = await screen.findByLabelText('Nome da arena');
    fireEvent.change(name, { target: { value: 'x' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 2 caracteres');
    fireEvent.change(name, { target: { value: 'Arena do Teste' } });
    await waitFor(() => expect(screen.getAllByText('Arena do Teste').length).toBeGreaterThan(0));
  });

  it('restaurar dados pede confirmação e depois avisa', async () => {
    setup('/conta');
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar dados de demonstração' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restaurar' }));
    expect(await screen.findByText('Dados restaurados')).toBeInTheDocument();
  });
});
