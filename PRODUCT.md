# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Definida pelo usuário: React, Vite, TypeScript, CSS organizado por funcionalidade, Lucide React para ícones e Three.js para renderização 3D quando houver necessidade. Sem backend, sem banco e sem integração com o TikTok nesta etapa.

## Users

Criadores de conteúdo que fazem transmissões ao vivo no TikTok. Durante a LIVE, o criador controla os jogos pelo painel do TokArena (geralmente em um segundo monitor, em ambiente de pouca luz) e transmite o jogo pelo OBS usando uma fonte de navegador. Os espectadores não usam o site: participam pelos eventos da própria LIVE.

## Product Purpose

Plataforma SaaS de minigames 3D interativos para LIVEs do TikTok. Cada seguidor ganha um personagem 3D próprio, gerado por combinação procedural de modelo-base, tons de pele, cabelos, roupas, acessórios e cores. Os personagens competem em minigames escolhidos pelo criador. Sucesso é o criador abrir o painel, escolher um jogo, iniciar uma partida e ver os espectadores participando, sem precisar de nenhuma ferramenta além do painel e do OBS.

## Positioning

Um catálogo de jogos 3D feito para a LIVE, onde cada espectador é um personagem persistente com nome, nível, XP e vitórias. O produto trata jogos e personagens como o centro, e o painel administrativo como o apoio.

## Operating Context

- O criador usa o painel durante a transmissão e precisa ler o estado da LIVE, da partida e da fila sem procurar.
- O jogo vai ao ar por uma rota de overlay (`/overlay/:token`) usada como Browser Source no OBS, com fundo transparente, sem navegação administrativa.
- Futuramente: eventos reais da LIVE (seguidores, curtidas, comentários, presentes, compartilhamentos) alimentam os jogos.
- Vários criadores, cada um com ambiente, configurações, participantes e jogos próprios (multi-tenant, fora do escopo desta etapa).

## Capabilities and Constraints

Escopo desta etapa: interface funcional e navegável com dados simulados. Páginas: Visão geral, Game Hub (catálogo e configuração dos jogos), Minha arena, Participantes, Personagens, Ranking, Estatísticas, Configurações, Conta, Ajuda e a rota de overlay.

Fora do escopo desta etapa:

- integração real com o TikTok, login com TikTok, recebimento real de presentes;
- cobrança, planos pagos;
- backend de produção, banco de dados definitivo, autenticação definitiva;
- sistema completo de geração procedural de personagens;
- todos os jogos 3D funcionando. Apenas a corrida de obstáculos é priorizada.

Todos os dados são simulados e sintéticos. Nenhum dado de usuário real. A interface fica em português brasileiro.

## Brand Commitments

- Nome: TokArena.
- Paleta inicial vinculante: fundo #0B0B0D, fundo secundário #111114, painéis #17171C, superfícies elevadas #202026, vermelho principal #E32636, vermelho escuro #B51224, bordas #292930, texto #F5F5F5, texto secundário #A1A1AA.
- Preto predomina; o vermelho é usado de forma estratégica (ação principal, estado ativo, competição, destaque).
- Estética dark gaming premium; tipografia moderna, forte e legível (preferência por Inter).
- Evitar: visual de dashboard administrativo genérico, gradientes exagerados, glassmorphism em excesso, cards arredondados em tudo, brilhos luminosos, aparência de cassino, tipografia futurista difícil de ler, emojis no lugar de ícones.

## Evidence on Hand

Nenhuma. Não há usuários, clientes, métricas ou depoimentos reais. Participantes, estatísticas, rankings e eventos são dados sintéticos gerados por código e rotulados como demonstração. Não há assets de personagens ou imagens de jogos; qualquer asset externo exige licença verificada.

## Product Principles

1. O jogo é o centro: arena, personagens e catálogo recebem o destaque, não as tabelas.
2. O painel serve ao criador ao vivo: estado da LIVE e da partida legíveis num relance.
3. Demonstração honesta: tudo que é simulado diz que é simulado.
4. Preparado para o real: a camada de dados e a de eventos podem ser trocadas por serviços reais sem reescrever a interface.
5. Um criador, um ambiente: nada se mistura entre criadores.

## Accessibility & Inclusion

Interface em português brasileiro. Contraste mínimo AA para texto, navegação por teclado, foco visível, `prefers-reduced-motion` respeitado e estados anunciados para tecnologia assistiva (conexão, partida, notificações).
