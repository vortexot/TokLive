import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../App';
import { createRng } from '../domain/prng';
import { createLocalDataService } from '../services/dataService';
import { createApp, type App, type Role } from '../state/app';
import { AppFactoryContext, AppProvider } from '../state/AppProvider';
import { StaticAuth } from '../state/AuthProvider';
import { buildOverlayUrl } from '../services/overlayAuth';
import { Toasts } from '../components/ui/Toasts';
import { resetBonecoStoreForTests } from '../services/bonecoStore';

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

  it('todos os jogos podem ser abertos na arena', async () => {
    setup('/game-hub');
    await screen.findByText('6 jogos');
    expect(screen.getByRole('button', { name: 'Abrir na arena: Corrida de obstáculos' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Abrir na arena: Futebol maluco' })).toBeEnabled();
    expect(screen.queryAllByRole('button', { name: 'Em breve' })).toHaveLength(0);
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

  it('outros jogos também podem ser configurados e iniciados', async () => {
    setup('/game-hub/futebol');
    expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: /Entrada por comentário/ })).toBeEnabled();
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

describe('avisos', () => {
  it('somem sozinhos no prazo, e um aviso novo não reinicia o prazo dos antigos', () => {
    vi.useFakeTimers();
    try {
      const app = createApp({ role: 'panel', persist: false, rng: createRng('avisos'), dataService: createLocalDataService({ latencyMs: 0 }) });
      render(
        <AppProvider app={app}>
          <Toasts />
        </AppProvider>,
      );
      act(() => app.actions.toast('info', 'Aviso A'));
      act(() => void vi.advanceTimersByTime(3000));
      act(() => app.actions.toast('info', 'Aviso B'));
      expect(screen.getByText('Aviso A')).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(2100)); // 5,1 s desde o A
      expect(screen.queryByText('Aviso A')).toBeNull();
      expect(screen.getByText('Aviso B')).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(3000));
      expect(screen.queryByText('Aviso B')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('conta e link do overlay', () => {
  it('com backend configurado e sem sessão, mostra o login e permite seguir na demonstração', async () => {
    const useDemo = vi.fn();
    const signIn = vi.fn().mockResolvedValue('E-mail ou senha incorretos.');
    render(
      <StaticAuth value={{ status: 'signed-out', useDemo, signIn }}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </StaticAuth>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar no TokArena' })).toBeInTheDocument();
    const enter = screen.getByRole('button', { name: 'Entrar' });
    expect(enter).toBeDisabled();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo1' } });
    expect(enter).toBeEnabled();
    fireEvent.click(enter);
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(signIn).toHaveBeenCalledWith('ana@exemplo.com', 'segredo1');
    fireEvent.click(screen.getByRole('button', { name: /Continuar na demonstração/ }));
    expect(useDemo).toHaveBeenCalled();
  });

  it('o link do overlay usa "#" para funcionar no GitHub Pages e só grava opções fora do padrão', () => {
    const on = { showRanking: true, showFeed: true, showGoal: true, showNames: true };
    expect(buildOverlayUrl('https://vortexot.github.io/TokLive/', 'abc123', on)).toBe('https://vortexot.github.io/TokLive/#/overlay/abc123');
    expect(buildOverlayUrl('http://localhost:5173/app.html#/arena', 'abc123', { ...on, showFeed: false, showNames: false })).toBe('http://localhost:5173/app.html#/overlay/abc123?feed=0&nomes=0');
  });
});

describe('palco e bonecos', () => {
  beforeEach(() => {
    resetBonecoStoreForTests();
    window.localStorage.clear();
  });

  it('abre pelo menu e mostra as vagas vazias enquanto não há bonecos', async () => {
    setup('/');
    await ready();
    fireEvent.click(screen.getByRole('link', { name: 'Palco' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Palco' })).toBeInTheDocument();
    const stage = screen.getByRole('group', { name: 'Palco: Papo Reto' });
    expect(within(stage).getByText('Anfitrião: sem boneco')).toBeInTheDocument();
    expect(await screen.findByText(/Você ainda não tem bonecos/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tribunal da LIVE' }));
    const trial = screen.getByRole('group', { name: 'Palco: Tribunal da LIVE' });
    expect(within(trial).getByText('Acusação: sem boneco')).toBeInTheDocument();
    expect(within(trial).getByText('Defesa: sem boneco')).toBeInTheDocument();
  });

  it('cria um boneco, que entra em cena e responde com as falas dele', async () => {
    setup('/palco/bonecos');
    expect(await screen.findByRole('heading', { level: 1, name: 'Bonecos' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('link', { name: 'Criar o primeiro boneco' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Novo boneco' })).toBeInTheDocument();

    // Nome é obrigatório.
    fireEvent.click(screen.getByRole('button', { name: 'Criar boneco' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 2 caracteres');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Zé Neon' } });
    fireEvent.change(screen.getByLabelText('Falas prontas'), { target: { value: 'Fala comigo, {nome}!' } });
    const png = new File([new Uint8Array([1, 2, 3])], 'ze-parado.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Escolher arquivo: parado'), { target: { files: [png] } });
    expect(screen.getByText('ze-parado.png')).toBeInTheDocument();
    // Formato errado mostra o erro e não troca o arquivo.
    fireEvent.change(screen.getByLabelText('Escolher arquivo: falando'), { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText(/Formato não aceito/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Criar boneco' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Bonecos' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Zé Neon' })).toBeInTheDocument();
    expect(screen.getByText('1 fala pronta')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Seções do Palco' })).getByRole('link', { name: 'Palco' }));
    const stage = await screen.findByRole('group', { name: 'Palco: Papo Reto' });
    expect(within(stage).getByText('Zé Neon')).toBeInTheDocument();
    expect(screen.getByLabelText('Anfitrião')).toHaveDisplayValue('Zé Neon');

    fireEvent.change(screen.getByLabelText('Testar um pedido'), { target: { value: 'tudo bem?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar ao palco' }));
    expect(within(stage).getByText('@voce')).toBeInTheDocument();
    // Vai direto para a resposta. Leitores de tela recebem a fala inteira, com o nome do boneco.
    fireEvent.click(screen.getByRole('button', { name: 'Pular' }));
    expect(await within(stage).findByText('Zé Neon: Fala comigo, Voce!')).toBeInTheDocument();
  });

  it('tira o boneco de uma vaga e exclui o boneco', async () => {
    setup('/palco/bonecos/novo');
    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Bia Robô' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar boneco' }));
    await screen.findByRole('link', { name: 'Bia Robô' });

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Seções do Palco' })).getByRole('link', { name: 'Palco' }));
    const select = await screen.findByLabelText('Anfitrião');
    fireEvent.change(select, { target: { value: '' } });
    expect(within(screen.getByRole('group', { name: 'Palco: Papo Reto' })).getByText('Anfitrião: sem boneco')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Seções do Palco' })).getByRole('link', { name: 'Bonecos' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Editar Bia Robô' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir boneco' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Nenhum boneco ainda')).toBeInTheDocument();
  });

  it('avisa quando o boneco do endereço não existe', async () => {
    setup('/palco/bonecos/nao-existe');
    expect(await screen.findByText('Boneco não encontrado')).toBeInTheDocument();
  });
});

describe('palco ao vivo', () => {
  beforeEach(() => {
    resetBonecoStoreForTests();
    window.localStorage.clear();
  });

  it('liga o palco, cumprimenta um seguidor simulado e responde um pedido escrito', async () => {
    setup('/palco');
    fireEvent.click(within(await screen.findByRole('radiogroup', { name: 'Modo do palco' })).getByRole('radio', { name: 'Ao vivo' }));
    expect(await screen.findByRole('heading', { name: 'Conexão com a LIVE' })).toBeInTheDocument();
    expect(screen.getByText(/npm run palco -- @seu_usuario/)).toBeInTheDocument();

    // Desligado, os eventos só entram na fila.
    const sim = screen.getByRole('heading', { name: 'Simular eventos da LIVE' }).closest('section')!;
    fireEvent.click(within(sim).getByRole('button', { name: 'Novo seguidor' }));
    const queue = screen.getByRole('heading', { name: /Fila/ }).closest('section')!;
    expect(await within(queue).findByText('Seguidor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ligar palco' }));
    const stage = screen.getByRole('group', { name: 'Palco: Papo Reto' });
    // Sem boneco e sem ponte: a vaga fala pelo roteiro, depois da janela que junta seguidores.
    expect(await within(stage).findByText(/^Anfitrião: (Que bom ter vocês aqui|Chegou gente nova)/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pausar palco' })).toBeInTheDocument();

    const talk = screen.getByRole('heading', { name: 'Fale com os bonecos' }).closest('section')!;
    fireEvent.change(within(talk).getByLabelText('Escreva um pedido'), { target: { value: 'tudo bem por aí?' } });
    fireEvent.click(within(talk).getByRole('button', { name: 'Enviar' }));
    const log = screen.getByRole('heading', { name: 'Histórico' }).closest('section')!;
    expect(await within(log).findByText('“tudo bem por aí?”', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(within(log).getAllByText('Roteiro').length).toBeGreaterThan(0);
    expect(within(log).getAllByText('IA desligada: conecte a ponte com a chave configurada.').length).toBeGreaterThan(0);
  }, 15000);
});
