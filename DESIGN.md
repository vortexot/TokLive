---
name: TokArena
description: Painel de controle e overlay de minigames 3D para LIVEs do TikTok, em estética dark gaming de quadro de resultados.
colors:
  bg: "#0b0b0d"
  bg-2: "#111114"
  panel: "#17171c"
  raised: "#202026"
  red: "#e32636"
  red-deep: "#b51224"
  red-ink: "#ff5c68"
  line: "#292930"
  line-strong: "#3b3b45"
  line-control: "#6e6e7a"
  text: "#f5f5f5"
  text-2: "#a1a1aa"
  text-3: "#8a8a94"
  ok: "#3ddc97"
  warn: "#f5b544"
  on-red: "#ffffff"
typography:
  display:
    fontFamily: "Barlow Condensed, Inter Variable, Arial Narrow, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.03em"
  score:
    fontFamily: "Barlow Condensed, Inter Variable, Arial Narrow, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-red}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "#ee3a49"
  button-primary-active:
    backgroundColor: "{colors.red-deep}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 16px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 12px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "16px"
  pill-live:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-red}"
    rounded: "{rounded.pill}"
  nav-link-active:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "40px"
---

# Design System: TokArena

## Overview

**Creative North Star: "O Quadro de Resultados"**

O TokArena é uma sala de controle de arena construída como o quadro de resultados de uma corrida. O criador usa o painel num segundo monitor, em ambiente escuro, durante a transmissão: o estado da LIVE, da partida e da fila precisa ser lido num relance. O preto domina; o vermelho aparece só onde algo está ao vivo, ativo, selecionado ou liderando. Os jogos e os personagens são o centro, e o painel é o apoio.

**Key Characteristics:**
- Preto quase puro com painéis em degraus (#0B0B0D, #111114, #17171C, #202026) e filetes finos.
- Numerais de placar em Barlow Condensed, sempre tabulares, para tempo, posição e pontos.
- Réguas de raia (tracejado fino) como divisor entre linhas de lista e de dados.
- Chanfro de 45° em placas não interativas (arte dos jogos, pódio, avatar do usuário).
- Vermelho como única cor de marca; verde e âmbar só como estado.
- Interface densa e legível, com controles padrão da plataforma.

## Colors

Paleta fixada pelo brief, com extensões medidas para contraste.

### Primary
- **Vermelho Arena** (#e32636): ação principal, estado ativo, líder, ao vivo. Texto sobre ele é branco puro (#ffffff, 4.57:1); #f5f5f5 daria 4.19:1.
- **Vermelho Escuro** (#b51224): estado pressionado e borda de item selecionado.
- **Vermelho Tinta** (#ff5c68): texto e ícones vermelhos pequenos sobre fundo escuro (5.9:1 no painel).

### Neutral
- **Preto de Arena** (#0b0b0d), **Preto Lateral** (#111114), **Painel** (#17171c), **Superfície Elevada** (#202026).
- **Filete** (#292930), **Filete Forte** (#3b3b45), **Borda de Controle** (#6e6e7a, >= 3:1 para campos).
- **Texto** (#f5f5f5), **Texto Secundário** (#a1a1aa), **Texto Terciário** (#8a8a94).

### State
- **Verde** (#3ddc97) e **Âmbar** (#f5b544): significado apenas (disponível, aguardando, tropeço). Nunca decoração.

### Named Rules
**The Leader Red Rule.** O vermelho marca ao vivo, ativo, selecionado ou líder. Se tudo é vermelho, nada é líder.
**The Ink Rule.** Texto vermelho pequeno usa #ff5c68, nunca #e32636 (3.9:1 no painel).

## Typography

**Display Font:** Barlow Condensed (700, 600), auto-hospedada.
**Body Font:** Inter Variable, auto-hospedada.

### Hierarchy
- **Page title** (Barlow 700, 1.75rem, caixa alta, 0.03em): título da página no cabeçalho.
- **Score** (Barlow 700, tabular, 1.2 a 3rem): posições, tempo, pontos, nível, contagem.
- **Greeting/Title** (Inter 700, 1.75rem): saudação da visão geral.
- **Panel title** (Inter 600, 0.875rem): título de painel.
- **Body** (Inter 400, 0.875rem, 1.5): texto corrido, com 65 a 75 caracteres de medida.
- **Label** (Inter 600, 0.8125rem): rótulos de campo e cabeçalhos de tabela.

### Named Rules
**The Scoreboard Numerals Rule.** Todo número que muda ou compara (tempo, posição, pontos) usa Barlow tabular ou `tabular-nums`.

## Layout

Barra lateral de 248px (72px recolhida) e cabeçalho de 56px. O conteúdo é um container nomeado (`page`) e **os layouts respondem à largura do conteúdo com container queries**, não à da janela, porque a barra lateral e o simulador mudam o espaço disponível. Espaçamento em múltiplos de 4px, com mais espaço acima do que abaixo de títulos. No celular a barra vira gaveta e a tabela vira lista de cartões.

### Named Rules
**The Lane Rule.** Linhas de lista e de dados são separadas por tracejado fino (`1px dashed #3b3b45`), como as divisórias de raia, nunca por caixas aninhadas.

## Elevation & Depth

Profundidade vem do degrau de superfície e de filetes, não de brilho. Sombras existem só em camadas flutuantes (popover, diálogo, aviso), com deslocamento e desfoque reais.

### Shadow Vocabulary
- **pop** (`0 14px 36px rgb(0 0 0 / .55), 0 2px 8px rgb(0 0 0 / .45)`): popover, diálogo, aviso.
- **sheet** (`-18px 0 48px rgb(0 0 0 / .5)`): gaveta do simulador.

## Shapes

Raio de 6px nos controles e painéis, 4px em chips pequenos, 10px em diálogos e menus, pílula só para estado. O **chanfro de 45° (12px)** na quina superior direita marca placas não interativas: arte dos jogos, blocos do pódio, avatar do usuário, plaquinha de estado vazio.

### Named Rules
**The Chamfer Rule.** O chanfro marca superfícies que não recebem foco. Botões e campos mantêm o raio comum, porque `clip-path` esconderia o anel de foco.

## Components

### Buttons
Altura de 36px (30px em `sm`), raio 6px, texto 600. **Primary** vermelho com texto branco; **secondary** em superfície elevada com borda; **ghost** transparente; **danger** com borda e texto vermelhos. Desabilitado a 45%.

### Fields
Altura de 40px, fundo #111114, borda #6e6e7a, foco com anel vermelho de 2px e recuo de 2px. Erro com borda e mensagem em vermelho tinta, com ícone.

### Navigation
Itens de 40px em barra lateral. O ativo usa superfície elevada e ícone em vermelho tinta, sem faixa lateral colorida. Recolhida, o rótulo vira dica ao passar o mouse ou focar.

### Quadro de raias (componente-assinatura)
Linha de classificação com posição em numeral Barlow, avatar, nome, barra de progresso e valor. **O líder** ganha fundo vermelho translúcido e numeral em vermelho tinta. É a mesma peça na arena, no overlay e no resultado.

### Status
Pílulas com texto sempre presente (nunca só cor). "Ao vivo" é a única pílula preenchida de vermelho.

## Do's and Don'ts

### Do:
- **Do** usar #ffffff sobre vermelho e #ff5c68 para texto vermelho pequeno.
- **Do** separar linhas com tracejado fino e usar numerais tabulares para dados.
- **Do** escrever "demonstração" onde houver dado simulado.
- **Do** usar container queries nos layouts de página.

### Don't:
- **Don't** usar vermelho como decoração ou em todos os elementos.
- **Don't** usar kicker/eyebrow acima de títulos, faixa lateral colorida, texto com gradiente nem sombras de deslocamento duro.
- **Don't** usar emojis ou símbolos Unicode como ícones: os ícones são da biblioteca Lucide, em traço único.
- **Don't** aplicar `clip-path` a elementos focáveis.
