# Surface brief: TokArena app (painel + overlay)

Mode: Operate (painel). A rota de overlay segue o mesmo mundo, sem navegação.
Audience, job, task: criador de LIVE controlando jogos ao vivo, em segundo monitor, ambiente escuro.
Proof/content: dados 100% sintéticos, rotulados como demonstração.
Constraints: sem backend, sem integração TikTok, pt-BR, brief fixa paleta e estética.

## Direction contract

THESIS: Uma sala de controle de arena construída como quadro de resultados de corrida. Numerais condensados de placar, réguas de raia como divisores, vermelho só para ao vivo, ativo e líder. Recusa o dashboard SaaS de cards de métrica com sidebar cinza.

OWN-WORLD: Preto quase puro (#0B0B0D) com painéis em degraus (#111114, #17171C, #202026) e filetes #292930. Inter para interface, Barlow Condensed para numerais de placar e títulos de seção. Vermelho #E32636 como única cor de marca; verde e âmbar apenas como estado. Raio 6px nos controles, chanfro de 45° em placas não interativas, tracejado de raia como divisor.

STORY: O criador vê em um relance se a LIVE está no ar, escolhe um jogo, inicia a corrida e acompanha os personagens competindo. Em nenhum momento confunde demonstração com dado real.

FIRST VIEWPORT: Visão geral a 1440×900. Rail de 248px à esquerda, header de 56px. Na área principal: saudação e faixa de conexão em largura total (luz de estado, @, estado, Conectar LIVE à direita). Abaixo, a prévia da arena em 16:9 com a corrida em 3D ocupa ~2/3; coluna direita traz o resumo do ambiente em lista de rótulo e valor, e a atividade recente. Jogos recentes em linha sob a arena.

FORM: Shell de Operate com rail, header e áreas de trabalho distintas, controles padrão. Movimento-assinatura: o quadro de raias, que renderiza ranking, fila e classificação como linhas de raia com posição em numeral condensado e marcador vermelho no líder. Posição 1 de 1 na lista; seed: none (unavailable).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
