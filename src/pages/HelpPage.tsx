import '../features/settings/settings.css';

const STEPS = [
  { t: 'Conecte a LIVE', d: 'Na visão geral, informe o @ do TikTok e clique em Conectar LIVE. Nesta demonstração a conexão é simulada.' },
  { t: 'Escolha um jogo', d: 'No Game Hub, abra a corrida de obstáculos, ajuste duração, limite e regras, e abra o jogo na arena.' },
  { t: 'Coloque no OBS', d: 'Use "Abrir overlay OBS" para copiar o link e cole em uma fonte de navegador de 1920×1080. O fundo é transparente.' },
  { t: 'Inicie a partida', d: 'Na arena, clique em Iniciar partida. Pause, retome ou encerre quando quiser. O resultado vira pontos e XP.' },
];

const FAQ = [
  { q: 'Isso já funciona com a minha LIVE do TikTok?', a: 'Ainda não. Esta é uma demonstração com dados simulados. A conexão real com o TikTok será desenvolvida em uma etapa futura e não foi validada.' },
  { q: 'Como os espectadores participam?', a: 'Sem sair da LIVE. Quem segue ganha um personagem; comentar !entrar coloca na fila; !voto 1 ou !voto 2 vota na enquete; curtidas enchem a meta coletiva; presentes dão poderes.' },
  { q: 'O que o simulador faz?', a: 'Dispara os mesmos eventos que a LIVE enviaria (seguidor, comentário, curtidas, presente, compartilhamento, encerramento) para você testar o painel e o jogo. Abra com Shift+D.' },
  { q: 'Os dados são reais?', a: 'Não. Participantes, nomes, estatísticas e rankings são sintéticos, gerados por código, e ficam salvos só no seu navegador.' },
  { q: 'Pedem a minha senha do TikTok?', a: 'Nunca. A conexão futura usa apenas o nome de usuário público (@).' },
];

const LIMITS = [
  'A conexão com a LIVE é simulada.',
  'Os seis jogos iniciam partidas, mas com participantes e eventos simulados. Nenhuma LIVE real está conectada.',
  'Os modelos 3D são formas simples montadas por código, não os assets finais.',
  'O overlay no OBS roda a própria simulação; aberto em outra aba do mesmo navegador, acompanha o painel.',
  'Não há login, cobrança, planos nem banco de dados real.',
];

export default function HelpPage() {
  return (
    <div className="narrow">
      <section className="panel" aria-labelledby="h-steps">
        <header className="panel__head">
          <h2 className="panel__title" id="h-steps">
            Primeiros passos
          </h2>
        </header>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.t}>
              <div>
                <strong>{s.t}</strong>
                <span>{s.d}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel faq" aria-labelledby="h-faq">
        <header className="panel__head">
          <h2 className="panel__title" id="h-faq">
            Perguntas frequentes
          </h2>
        </header>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <div>{f.a}</div>
          </details>
        ))}
      </section>

      <section className="panel" aria-labelledby="h-keys">
        <header className="panel__head">
          <h2 className="panel__title" id="h-keys">
            Atalhos
          </h2>
        </header>
        <ul className="keys">
          <li>
            <span>Abrir ou fechar o simulador</span>
            <kbd>Shift + D</kbd>
          </li>
          <li>
            <span>Fechar simulador, janelas e menus</span>
            <kbd>Esc</kbd>
          </li>
          <li>
            <span>Pular direto para o conteúdo</span>
            <kbd>Tab</kbd>
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="h-limits">
        <header className="panel__head">
          <h2 className="panel__title" id="h-limits">
            Limites desta demonstração
          </h2>
        </header>
        <ul className="limits">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
