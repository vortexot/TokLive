# TokArena

Plataforma de minigames 3D interativos para LIVEs do TikTok. Os espectadores participam pela própria LIVE (seguir, curtir, comentar, enviar presentes) e cada seguidor ganha um personagem 3D gerado automaticamente. O criador controla os jogos por um painel e transmite o jogo pelo OBS, com uma fonte de navegador.

> **Esta etapa é uma demonstração.** Toda a interface funciona, mas os dados e os eventos são **simulados**. Não existe integração com o TikTok, login, cobrança, backend nem banco de dados real.

## O que existe nesta etapa

| Área | Situação |
|---|---|
| Visão geral, Game Hub, Minha arena, Participantes, Personagens, Ranking, Estatísticas, Configurações, Conta, Ajuda | Implementadas, navegáveis e funcionais localmente |
| Corrida de obstáculos | Jogável em 3D, com física, obstáculos, poderes de presentes, turbo coletivo e classificação |
| Outros cinco jogos | Aparecem no catálogo e permitem configurar as regras, mas **ainda não iniciam partida** |
| Conexão com a LIVE | **Simulada** (seis estados, resultado escolhido no simulador) |
| Simulador de eventos | Seguidor, comentário (`!entrar`, `!voto 1/2`), curtidas, presente, compartilhamento, entrada na fila, encerrar LIVE, modo automático |
| Overlay para o OBS | Rota `/overlay/:token`, fundo transparente, sincronizada com o painel (mesmo navegador) ou com simulação própria |
| Personagens | Gerador procedural por semente (pele, cabelo, roupa, acessório, cores), desenhados em 2D (SVG) e 3D (Three.js). Formas simples montadas por código, **não** são os assets finais |

## Como executar

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev        # painel em http://localhost:5173
npm test           # 88 testes (domínio, motor de eventos e interface)
npm run typecheck
npm run build
```

O overlay de demonstração está em `http://localhost:5173/overlay/demo-arena-7k2f9x`. Qualquer token no formato `demo-...` é aceito.

### Como testar

1. Abra a **Visão geral** e clique em **Conectar LIVE** (a conexão é simulada).
2. No **Game Hub**, abra a **Corrida de obstáculos** e clique em **Iniciar**.
3. Abra o **Simulador** (botão no cabeçalho ou `Shift + D`) e dispare eventos: presente de impulso, curtidas até encher a meta (turbo coletivo), comentário `!entrar`.
4. Abra `/overlay/demo-arena-7k2f9x?debug=1` **em outra aba** para ver o overlay acompanhar o painel.

No OBS, a fonte de navegador roda em outro processo e não compartilha o armazenamento do navegador: lá o overlay executa a própria simulação.

## Estrutura

```
apps/web/src/
  domain/      Regras puras: simulação da corrida, ranking, personagens, catálogo, níveis
  state/       Motor de eventos e de partida (funções puras), store, ações e temporizadores
  services/    Camada de dados assíncrona (hoje local), persistência, resolução do token do overlay
  components/  Kit de UI, layout (barra lateral, cabeçalho), avatar 2D, quadro de raias, gráficos SVG
  features/    Cena 3D, arena, hub, overlay, simulador, personagens, ranking, estatísticas
  pages/       Uma página por rota
```

Decisões que facilitam trocar o simulador pelo serviço real:

- Os eventos da LIVE entram por **um único ponto** (`applyLiveEvent`). Um provedor real entregaria os mesmos eventos.
- A camada de dados (`DataService`) já é assíncrona, com estados de carregamento, erro e nova tentativa na interface.
- O token do overlay passa por `resolveOverlayToken`, que um servidor substituirá (validação, ambiente do criador, revogação).
- O motor de partida não usa relógio nem aleatoriedade globais: é determinístico por semente e testável.

## Limitações conhecidas

- Nenhuma LIVE real é acessada. Não existe integração com o TikTok nem foi validada uma biblioteca para isso.
- Só a corrida de obstáculos inicia partidas.
- Os modelos 3D são primitivas geométricas, sem assets externos. Se forem adotados assets de terceiros, a licença precisa ser verificada.
- O desempenho foi medido por contagem de chamadas de desenho (cerca de 274 por quadro com 30 corredores), **não em GPU real**. A taxa de quadros em computadores intermediários ainda precisa ser medida.
- O painel em aba oculta recupera o tempo da partida, mas o navegador reduz a frequência de atualização do overlay sincronizado. Mantenha a aba do painel visível durante os testes sincronizados.
- Os dados ficam no `localStorage` do navegador. Não há multiusuário.
- O layout foi verificado em cinco tamanhos de tela e com uma varredura de acessibilidade automatizada, mas não em dispositivos físicos nem com leitores de tela.

## Licenças

Fontes Inter e Barlow Condensed (SIL Open Font License, via Fontsource) e ícones Lucide (ISC). Não há imagens, modelos ou animações de terceiros.
