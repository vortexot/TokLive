# Palco: área de conversa falada

> **Estado: em teste.** O painel tem o Palco com os modos Demonstração e Ao vivo, a aba Bonecos e uma ponte local que liga a LIVE do TikTok e a IA (seção 16 e seção 17). Nada foi usado ainda numa LIVE real. Os pontos que dependem de teste estão marcados como "não verificado".

## 1. Resumo

O **Palco** é uma área do TokArena onde o espectador interage por **conversa**, não por jogo. Ele escreve no chat da LIVE, e um **anfitrião** (personagem com voz) responde falando, com legenda na tela. O Palco tem **quadros**, como um programa de auditório: cada quadro é um formato de conversa com regras próprias.

Este documento propõe seis quadros e seis anfitriões, em três fases de entrega. A primeira fase entrega dois quadros com um anfitrião por vez.

Vocabulário usado aqui:

| Termo | Significado |
|---|---|
| Palco | A área de conversa. Fica ao lado do Game Hub no painel e ocupa o overlay quando está ativa |
| Quadro | Um formato de conversa (equivale a um jogo no Game Hub) |
| Anfitrião | O personagem que fala. "Personagem" continua sendo o boneco 3D de cada espectador |
| Fala | Uma vez em que o anfitrião fala: um texto, um áudio e uma legenda |

## 2. O que o Palco é e o que não é

- **É** conversa por texto com resposta em voz. O espectador nunca precisa sair do TikTok.
- **É** um modo separado da partida. Palco e partida não rodam juntos: o overlay mostra um ou outro.
- **Não é** conversa por microfone do espectador. Isso fica para uma fase opcional (seção 12), porque depende de transcrição e de identificar quem falou.
- **Não é** um bot que escreve no chat do TikTok. O anfitrião só fala e aparece no overlay.

## 3. Como o espectador participa

Cada quadro usa um comando próprio. O comando serve de consentimento: o anfitrião só chama pelo nome quem pediu para participar.

| Ação na LIVE | Efeito no Palco |
|---|---|
| Comentar com o comando do quadro (`!pergunta`, `!sorte`, `!recado`, `!e`, `!confesso`, `!tema`) | Entra na fila do quadro |
| `!voto 1` ou `!voto 2` | Vota nas enquetes dos quadros (reaproveita a enquete que já existe) |
| Presente | Passa na frente da fila. Quanto maior a faixa, maior o efeito (tabela abaixo) |
| Curtidas | Enchem a meta coletiva que já existe. Quando enche, o anfitrião faz um momento especial. A partir de 50 curtidas na sessão, o espectador ganha uma vaga na fila (mesma regra da fila dos jogos) |
| Seguir | Ganha personagem, como hoje, e uma saudação falada curta |
| Compartilhar | Agradecimento falado, agrupado quando vários chegam juntos |
| Comentário sem comando | Aparece no chat do overlay e não gera fala. Uma regra opcional ("Responder comentários sem comando", desligada por padrão) serve para salas pequenas |

Efeito dos presentes, usando as faixas que o TokArena já tem (`GIFT_TIERS`):

| Presente | Efeito comum a todos os quadros |
|---|---|
| Faísca | Passa na frente dos comentários |
| Escudo | Passa na frente e o pedido vale por 3 minutos, em vez de 90 segundos |
| Foguete | Passa na frente e ganha fala longa (até 280 caracteres) |
| Meteoro | Tudo do Foguete, mais o "momento especial" do quadro (descrito em cada um) |

## 4. Elenco: os anfitriões

### 4.1 Critério de escolha

O pedido foi por personagens conhecidos. O elenco inicial usa personagens que **todo mundo reconhece e que estão em domínio público ou no folclore**. Motivo: o TokArena é um produto, e o PRODUCT.md já registra que qualquer asset externo exige licença verificada.

Ficam de fora do elenco inicial:

- **Personagens com dono** (heróis de quadrinhos, anime, desenhos, games). Só entram com licença.
- **Pessoas reais**, vivas ou mortas, e qualquer voz que imite uma pessoa real. Clonar voz exige consentimento comprovado.
- **Figuras religiosas.** O Abismo tem um convidado desse tipo. Aqui ficam de fora, pelo risco de ofender e de moderação da plataforma.

Mesmo com personagem em domínio público, **o visual e a voz são originais do TokArena**. Não copiamos a versão de nenhum filme, série ou programa de TV, que tem dono. O visual segue o estilo que o projeto já usa: formas simples montadas por código. A voz vem das vozes prontas do provedor de TTS, escolhida pelo tom.

Esta é uma leitura de produto, não um parecer jurídico. Antes de lançar, o elenco precisa de revisão de um advogado.

### 4.2 Os seis anfitriões

| Anfitrião | Origem | Personalidade | Jeito de falar | Visual (formas simples) | Voz |
|---|---|---|---|---|---|
| **Sherlock Holmes** | Conan Doyle, domínio público | Detetive vaidoso que deduz tudo a partir de quase nada | "Elementar." Tira conclusões do nome de usuário e do comentário | Capa xadrez, boné de caçador, lupa | Grave, rápida, segura |
| **Drácula** | Bram Stoker (1897), domínio público | Conde antiquado e dramático, que finge ser assustador e é educado demais | Formal, chama todos de "caro visitante", reclama do sol | Capa preta de gola alta, rosto pálido | Grave, lenta, teatral |
| **Saci** | Folclore brasileiro | Travesso, rápido, brincalhão | Gíria leve, rima de vez em quando, ri das próprias piadas | Gorro vermelho, uma perna, redemoinho nos pés | Aguda, animada |
| **Dom Quixote** | Cervantes (1605), domínio público | Cavaleiro sonhador que vê aventura e honra em tudo | Grandioso, trata qualquer assunto banal como missão épica | Armadura torta, bacia na cabeça, lança | Média, empolgada, solene |
| **Sherazade** | *As Mil e Uma Noites*, tradição oral | Contadora de histórias, calma e misteriosa | Sempre termina no suspense | Véu, lanterna, livro aberto | Suave, pausada |
| **Pítia, o Oráculo de Delfos** | Grécia antiga, mitologia | Vidente enigmática com humor seco | Fala por enigmas curtos e depois "traduz" | Túnica, trípode, fumaça | Baixa, etérea |

### 4.3 Ficha de anfitrião

Cada anfitrião é um arquivo de dados, como o `config.json` dos convidados do Abismo, com campos a mais:

```ts
interface HostDef {
  id: HostId;
  name: string;
  /** De onde vem o personagem e por que pode ser usado. Aparece na tela de elenco. */
  origin: string;
  /** Texto da persona enviado ao modelo. Fica só no servidor. */
  persona: string;
  /** Bordões e frases de reserva, usados na demonstração e quando a IA falha ou é bloqueada. */
  scriptLines: Record<ScriptKind, string[]>;
  /** Identificador da voz no provedor de TTS. */
  voice: string;
  /** Semente e peças do modelo 3D, no mesmo esquema procedural dos personagens. */
  look: HostLook;
  /** Quadros em que pode atuar. */
  formats: StageFormatId[];
}
```

Personas criadas pelo próprio criador ficam fora da primeira versão. Elas abririam a porta para personagens com dono e pessoas reais, e isso exige termos de uso e moderação próprios (seção 14).

## 5. Os quadros

Todos os quadros compartilham a fila, os filtros e os limites da seção 7 e da seção 8. Cada um abaixo descreve só o que tem de próprio.

### 5.1 Papo Reto (perguntas e respostas)

**Ideia.** O espectador pergunta qualquer coisa e o anfitrião responde no próprio estilo, chamando pelo nome. É o quadro básico e o primeiro a ser entregue.

- **Anfitrião:** qualquer um, à escolha do criador. Padrão: Sherlock Holmes.
- **Como participar:** `!pergunta <texto>`.
- **Fluxo:**
  1. O pedido entra na fila. O overlay mostra "Próximos" com até três nomes.
  2. O overlay mostra a pergunta em um cartão, com o @ de quem perguntou.
  3. O anfitrião responde em uma fala de até 160 caracteres (cerca de 10 segundos).
  4. Próximo da fila.
- **Momento especial (Meteoro ou meta de curtidas):** "Bis". O anfitrião responde a mesma pergunta de novo, do ponto de vista de outro anfitrião que entra em cena por uma fala.
- **Exemplo:**
  - `@lu_gamer`: `!pergunta vale a pena aprender violão depois dos 30?`
  - Sherlock: "Lu, elementar. Quem pergunta isso já decidiu. Seus dedos reclamam duas semanas e depois agradecem. Comece hoje."
- **Regras do criador:** tamanho máximo da fala; "Responder comentários sem comando"; tempo de descanso por espectador.

### 5.2 Correio Falado (recado lido em voz alta)

**Ideia.** O espectador manda um recado e o anfitrião lê em voz alta, com uma introdução no próprio estilo. O corpo do recado é o texto do espectador, depois dos filtros. Só a introdução é do anfitrião.

- **Anfitrião:** padrão Saci (o mensageiro travesso).
- **Como participar:** `!recado <texto>`. Regra "Recado só com presente", ligada por padrão, para controlar o volume.
- **Fluxo:**
  1. Introdução curta de roteiro: "Chegou recado! Quem manda é a Lu, e ela diz assim:"
  2. Leitura do recado.
  3. Fecho de uma frase, opcional, gerado pela IA.
- **Por que entra na primeira fase:** funciona **sem IA**. A introdução sai de uma lista de frases e o corpo é o texto do espectador. Só precisa de TTS. É o quadro mais barato e o de menor risco de conteúdo.
- **Momento especial (Meteoro):** o recado é lido por dois anfitriões alternando, como jogral.
- **Exemplo:**
  - `@lu_gamer` envia Foguete e `!recado um salve pro meu irmão Caio que tá assistindo do trabalho`
  - Saci: "Chegou recado voando! É da Lu: um salve pro meu irmão Caio que está assistindo do trabalho. Caio, o chefe está atrás de você, hein!"
- **Cuidado próprio:** o recado é lido quase como veio. O filtro de entrada aqui é o mais rígido, e menções a outros @ são lidas só pelo primeiro nome.

### 5.3 Oráculo (leitura do dia)

**Ideia.** O espectador pede a sorte e a Pítia faz uma "leitura" bem-humorada, usando o que o TokArena já sabe sobre ele: nível, XP, vitórias e jogo favorito. É o quadro que mais aproveita os participantes persistentes do produto.

- **Anfitrião:** Pítia.
- **Como participar:** `!sorte`, com uma palavra opcional de tema (`!sorte trabalho`).
- **Fluxo:**
  1. A Pítia chama o espectador. O overlay mostra o personagem 3D dele ao lado dela, com nível e vitórias.
  2. Um enigma curto, depois a "tradução".
- **Limite:** uma leitura por espectador por LIVE. Com presente, uma segunda.
- **Momento especial (Meteoro):** "Profecia da LIVE". A Pítia faz uma previsão sobre a própria transmissão (por exemplo, quem vence a próxima partida). O painel guarda a profecia, e quando a partida termina o anfitrião comenta se acertou.
- **Exemplo:**
  - `@caio_77`: `!sorte`
  - Pítia: "Caio. Vejo três vitórias e um chão que derrete. Tradução: você é bom de corrida e péssimo na lava. Hoje, escolha a corrida."
- **Cuidado próprio:** a persona proíbe previsão sobre saúde, morte, dinheiro, relacionamento e qualquer decisão séria. A leitura é sempre sobre a LIVE, os jogos e o cotidiano leve. O overlay mostra o selo "Entretenimento".

### 5.4 História Coletiva

**Ideia.** A Sherazade conta uma história em capítulos curtos. Entre os capítulos, o chat decide o que acontece. Quem sugere vira personagem da história.

- **Anfitrião:** Sherazade.
- **Como participar:** `!e <o que acontece>` durante a janela de sugestões; `!voto 1` ou `!voto 2` durante a votação.
- **Fluxo de um capítulo:**
  1. **Narração:** duas falas (cerca de 25 segundos), terminando em suspense.
  2. **Sugestões:** 30 segundos. O overlay mostra "O que acontece agora? Comente `!e ...`".
  3. **Votação:** o painel escolhe duas sugestões aprovadas pelos filtros (quem enviou presente tem preferência) e abre a enquete por 20 segundos.
  4. A sugestão vencedora entra no próximo capítulo, com o nome de quem sugeriu: "E foi então que, por ideia da Lu, o dragão pediu demissão."
- **Tamanho:** cinco capítulos e um final. O criador pode encerrar antes ou pedir mais um capítulo.
- **Momento especial (Meteoro):** "Reviravolta". Quem enviou escolhe o que acontece, sem votação.
- **Estado guardado:** tema, capítulo atual, resumo de até 400 caracteres e lista de espectadores que viraram personagens. O servidor recebe o resumo e o último capítulo, não a história inteira, para manter o custo fixo por capítulo.
- **Tela final:** "Autores desta história", com os @ de quem teve sugestão escolhida.

### 5.5 Tribunal da LIVE

**Ideia.** O espectador confessa um "crime" bobo. Um anfitrião acusa, outro defende, e o chat é o júri. Primeiro quadro com dois anfitriões.

- **Anfitriões:** Sherlock Holmes na acusação e Dom Quixote na defesa. O criador pode trocar.
- **Como participar:** `!confesso <texto>`; votação com `!voto 1` (culpado) ou `!voto 2` (inocente).
- **Fluxo:**
  1. O overlay mostra o réu (personagem 3D do espectador) no centro e a confissão em um cartão.
  2. **Acusação:** uma fala. Sherlock "deduz" agravantes.
  3. **Defesa:** uma fala. Dom Quixote transforma o crime em ato de bravura.
  4. **Júri:** enquete por 20 segundos.
  5. **Veredito:** uma fala do lado vencedor. O réu ganha um título de brincadeira, mostrado no overlay até o fim da LIVE ("Culpado: ladrão oficial de pizza").
- **Momento especial (Meteoro durante o julgamento):** "Réplica". O lado que o espectador apoiar com `!voto` ganha uma fala a mais antes do veredito.
- **Exemplo:**
  - `@lu_gamer`: `!confesso comi a última fatia de pizza e culpei o cachorro`
  - Sherlock: "O molho na manga da ré dispensa testemunhas. E o cachorro, vejam, tem álibi: estava dormindo."
  - Dom Quixote: "Calúnia! Esta nobre dama salvou a fatia de um destino frio e solitário na geladeira!"
  - Chat vota. Veredito: culpada, com o título "Ladra oficial de pizza".
- **Cuidado próprio:** **só vale confissão própria.** Não existe comando para acusar outra pessoa, para o quadro não virar ferramenta de assédio. Confissão que cite outro @ tem a menção removida. Confissão de crime de verdade recebe uma resposta de roteiro e não vai a julgamento.

### 5.6 Duelo de Opiniões

**Ideia.** Dois anfitriões defendem lados opostos de um tema leve escolhido pelo chat. A plateia decide com votos e com aplausos.

- **Anfitriões:** dois à escolha. Padrão: Drácula contra Saci.
- **Como participar:** `!tema <A ou B>` para sugerir; `!voto 1` ou `!voto 2` para votar; curtidas contam como aplauso.
- **Fluxo:**
  1. **Tema:** o painel junta as sugestões. O criador aprova uma, ou liga a regra "Tema por votação" e o chat escolhe entre duas.
  2. **Duelo:** duas rodadas alternadas, quatro falas no total (cerca de 50 segundos). Cada anfitrião defende um lado.
  3. **Aplausômetro:** as curtidas que chegam enquanto um anfitrião fala contam para ele. O overlay mostra duas barras.
  4. **Resultado:** votos mais aplausos. O perdedor reconhece a derrota em uma fala, no próprio estilo.
- **Momento especial (Meteoro):** "Tréplica". O anfitrião apoiado ganha uma fala extra.
- **Exemplo de tema:** `!tema biscoito ou bolacha`. Drácula defende "biscoito" ("há quatrocentos anos chamo assim") e o Saci defende "bolacha".
- **Cuidado próprio:** temas de política, religião, pessoas reais e qualquer grupo de pessoas são recusados pelo filtro de tema. A lista de temas prontos do quadro serve de reserva quando o chat não sugere nada aproveitável.

### 5.7 Resumo dos quadros

| Quadro | Comando | Anfitriões | Precisa de IA | Usa enquete | Fase |
|---|---|---|---|---|---|
| Papo Reto | `!pergunta` | 1 | Sim | Não | 1 |
| Correio Falado | `!recado` | 1 | Não (só TTS) | Não | 1 |
| Oráculo | `!sorte` | 1 | Sim | Não | 2 |
| História Coletiva | `!e` | 1 | Sim | Sim | 2 |
| Tribunal da LIVE | `!confesso` | 2 | Sim | Sim | 3 |
| Duelo de Opiniões | `!tema` | 2 | Sim | Sim | 3 |

## 6. Comportamentos de fundo

Valem em qualquer quadro, usam frases de roteiro (sem IA) e têm prioridade baixa. O criador liga e desliga cada um.

| Gatilho | Fala | Limite |
|---|---|---|
| Novo seguidor | Saudação com o nome: "Que bom te ver, Lu." | No máximo uma a cada 20 segundos e uma por espectador por LIVE. Seguidores em rajada viram uma fala só: "Chegaram a Lu, o Caio e mais oito." |
| Presente fora de um pedido | Agradecimento no estilo do anfitrião | No máximo dois seguidos quando há comentários esperando (regra do Abismo) |
| Meta de curtidas batida | Comemoração e o momento especial do quadro | Uma por meta |
| Silêncio de 45 segundos | O anfitrião puxa assunto e lembra o comando do quadro | Uma por minuto |

As saudações não usam palavras que dependem de gênero ("bem-vindo", "amigo"), como o Abismo já faz.

## 7. Fila e ritmo

O Palco tem uma limitação física: **só uma fala toca por vez**. Com falas de cerca de 10 segundos e 2 segundos de intervalo, cabem no máximo umas cinco falas por minuto. As regras da fila existem para escolher bem essas cinco. As quatro primeiras vêm do Abismo.

1. **Um pedido por espectador.** Um pedido novo substitui o anterior da mesma pessoa.
2. **Pedido tem validade.** Comentário expira em 60 segundos e pedido com presente em 90 (3 minutos a partir do Escudo). Responder algo antigo quebra a conversa.
3. **Prioridade:** fala manual do criador, depois presente (pela faixa), depois comentário com comando, depois comportamentos de fundo.
4. **Presentes não tomam a fila.** Depois de dois presentes seguidos, entra um comentário, se houver.
5. **Descanso por espectador.** Depois de ser atendido, o espectador espera 90 segundos para ser escolhido de novo, a não ser que envie presente.
6. **Fila com teto de 30 pedidos.** Acima disso, o mais antigo sem presente sai.
7. **Preparar antes de tocar.** A próxima fala é gerada enquanto a atual toca, para não haver silêncio entre elas.

Estados de uma fala:

```text
na fila → preparando (texto + áudio) → pronta → falando → concluída
                 └→ descartada (expirou, foi bloqueada ou o criador pulou)
```

## 8. Moderação e segurança

Uma voz ao vivo respondendo a desconhecidos é o maior risco desta área. As proteções ficam em camadas, e todas rodam antes de o áudio existir.

**Entrada (comentário do espectador)**
- Lista de termos bloqueados, com a normalização do Abismo: sem acentos, "0" por "o", "1" por "i", "@" por "a".
- Descarte de ruído: só risada, só números, caractere repetido, palavra com 25 letras ou mais.
- Limite de 140 caracteres, que o motor já aplica.
- Menções a outros @ são removidas ou reduzidas ao primeiro nome.
- Tentativa de extrair ou trocar as instruções do anfitrião ("ignore suas regras") recebe uma resposta de roteiro, sem ir para a IA.

**Geração**
- O texto do espectador vai para o modelo como **dado**, separado das instruções.
- A persona de cada anfitrião fica no servidor e traz as proibições fixas: nada de saúde, direito, dinheiro, política, religião, conteúdo sexual, ofensa, dado pessoal, nem afirmar que é uma pessoa de verdade.
- Resposta curta, em português, sem emoji e sem palavrão.

**Saída (texto do anfitrião)**
- A mesma lista de termos passa na resposta da IA. Se bloquear, entra uma frase de reserva do roteiro.
- Limpeza para TTS: sem símbolos, números por extenso.
- **Nome falável.** Nomes com emoji e símbolos são reduzidos a algo pronunciável. Se não sobrar nada, o anfitrião diz "visitante".

**Controles do criador, sempre visíveis**
- Pausar o Palco: corta o áudio na hora e limpa a fala em preparo.
- Pular a fala atual.
- Remover um pedido da fila.
- Silenciar um espectador no Palco até o fim da LIVE, ou sempre.
- Modo "aprovar antes de falar": cada fala gerada espera um clique do criador. Recomendado nas primeiras transmissões.

**Dados**
- O Palco guarda o @ e o texto pelo tempo da fila. Os áudios são apagados depois de algumas horas, por uma limpeza como a `prune_live_events` que já existe.
- Nenhuma voz de espectador é captada nas fases 1 a 3.

## 9. Arquitetura

### 9.1 Princípio

O Palco segue as mesmas decisões que o projeto já tomou para os jogos:

- As regras são **funções puras** no motor de estado, testáveis sem rede e sem relógio global.
- Os eventos da LIVE continuam entrando por **um único ponto**, `applyLiveEvent`. O tipo `LiveEvent` **não muda**: o comentário já traz o texto.
- **Nenhum segredo vai para o navegador.** Chaves de IA e de TTS ficam no servidor.
- A demonstração funciona sozinha e diz que é demonstração.

### 9.2 Fluxo

```text
TikTok → worker (já existe, não muda) → live_events → painel
                                                        │
                               applyLiveEvent: comando do quadro → fila do Palco
                               (filtros de entrada, validade, prioridade)
                                                        │
                                      painel pede a próxima fala ao servidor
                                                        ▼
                         função de servidor "stage-speak" (segredos ficam aqui)
                         confere o dono → teto de uso → persona → modelo de texto
                         → filtro de saída → TTS → Storage
                                                        │
                                  { texto, audioUrl, durationMs }
                                                        ▼
                         painel coloca a fala no estado → snapshot do overlay
                                                        ▼
                         overlay (OBS) toca o áudio, mostra a legenda e mexe a boca
```

### 9.3 Onde cada parte roda

| Parte | Onde | Arquivos previstos |
|---|---|---|
| Catálogo de quadros e de anfitriões | Domínio, puro | `src/domain/stage.ts`, `src/domain/hosts.ts` |
| Fila, filtros, estados dos quadros | Domínio e motor, puros | `src/domain/stageQueue.ts`, `src/domain/chatSafety.ts`, novos casos em `src/state/engine.ts` |
| Falas de roteiro (demonstração e reserva) | Domínio | `src/domain/stageScripts.ts` |
| Pedido de fala ao servidor | Serviço, com interface trocável | `src/services/speech.ts` |
| Geração de texto e áudio | Servidor | Função de borda do Supabase `stage-speak` |
| Áudio | Supabase Storage | Bucket `stage-audio`, caminho `<workspace>/<fala>.mp3` |
| Cena do Palco e reprodução | Overlay | `src/features/stage/` |
| Controle do Palco | Painel | `src/pages/StagePage.tsx`, item "Palco" em `nav.ts` |

**Por que função de borda e não o worker.** O worker consulta o banco a cada 3 segundos, o que serve para ligar e desligar conexões e é lento demais para conversa. Uma função chamada pelo painel responde na hora, confere o login do criador e guarda os segredos. O worker continua só com o TikTok. Os limites de tempo das funções de borda não foram verificados para este uso.

### 9.4 Tipos principais (esboço)

```ts
export type StageFormatId = 'papo-reto' | 'correio' | 'oraculo' | 'historia' | 'tribunal' | 'duelo';
export type HostId = 'sherlock' | 'dracula' | 'saci' | 'quixote' | 'sherazade' | 'pitia';

/** Pedido de um espectador, esperando na fila. */
export interface StageRequest {
  id: string;
  at: number;
  username: string;
  format: StageFormatId;
  text: string;
  /** Presente que acompanhou o pedido, se houve. Define prioridade e tamanho da fala. */
  gift: GiftId | null;
}

export type StageTurnStatus = 'preparando' | 'pronta' | 'falando' | 'concluida' | 'descartada';

/** Uma fala de um anfitrião. */
export interface StageTurn {
  id: string;
  hostId: HostId;
  requestId: string | null;
  text: string;
  audioUrl: string | null;
  durationMs: number;
  status: StageTurnStatus;
  startedAt: number | null;
}

export interface StageState {
  active: boolean;
  paused: boolean;
  formatId: StageFormatId;
  hostIds: HostId[];
  queue: StageRequest[];
  current: StageTurn | null;
  /** Fala já preparada, esperando a atual terminar. */
  next: StageTurn | null;
  /** Último atendimento por espectador, para o descanso. */
  servedAt: Record<string, number>;
  muted: string[];
  /** Estado próprio do quadro em andamento. */
  scene: StoryScene | TrialScene | DuelScene | null;
}
```

`AppState` ganha o campo `stage`. O `SessionSnapshot` do overlay ganha uma versão reduzida: quadro, anfitriões, fala atual, três próximos nomes e o estado da cena. O tamanho continua fixo, como o projeto já exige para o canal em tempo real.

### 9.5 Contrato da função de servidor

```ts
// Pedido (painel → servidor)
interface SpeakRequest {
  workspaceId: string;
  turnId: string;
  format: StageFormatId;
  /** Um anfitrião, ou dois nos quadros de diálogo. */
  hostIds: HostId[];
  kind: 'resposta' | 'leitura' | 'narracao' | 'acusacao-defesa' | 'duelo' | 'veredito';
  viewerName: string | null;
  /** Texto do espectador, já filtrado no painel. O servidor filtra de novo. */
  input: string;
  /** Contexto curto: estatísticas do participante, resumo da história, tema do duelo. */
  context: Record<string, string | number>;
  maxChars: number;
}

// Resposta (servidor → painel)
interface SpeakResponse {
  /** Uma entrada por fala. Quadros com dois anfitriões devolvem as falas em ordem. */
  lines: { hostId: HostId; text: string; audioUrl: string; durationMs: number }[];
  /** Presente quando um filtro trocou a fala por uma frase de reserva. */
  replaced?: 'entrada' | 'saida';
}
```

Decisões embutidas:

- **Diálogo em uma chamada.** Nos quadros com dois anfitriões, o modelo devolve as falas dos dois de uma vez. Isso mantém a conversa coerente e evita uma espera entre as falas.
- **O painel conduz o tempo.** O servidor devolve a duração do áudio, e o painel avança a fila por relógio. O overlay só toca; ele não escreve em lugar nenhum, como hoje.
- **Teto de uso por criador no servidor.** Como só cabe uma fala por vez, o uso tem um teto natural: cerca de 300 falas por hora, ou 48 mil caracteres de TTS por hora no pior caso. O servidor aplica um limite um pouco abaixo disso e devolve uma frase de roteiro quando o limite é atingido.

### 9.6 Overlay

O espaço de desenho continua 1920 × 1080, como o overlay atual.

```text
┌────────────────────────────────────────────────────────────────────┐
│ TokArena · Arena do Demo   ● Ao vivo            QUADRO  Papo Reto  │
│                                                                    │
│        ┌───────────────┐        ┌──────────────────────────────┐   │
│        │               │        │ @lu_gamer perguntou          │   │
│        │   anfitrião   │        │ vale a pena aprender violão  │   │
│        │      3D       │        │ depois dos 30?               │   │
│        │               │        └──────────────────────────────┘   │
│        └───────────────┘                                           │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │ Legenda: Lu, elementar. Quem pergunta isso já decidiu.     │   │
│   └────────────────────────────────────────────────────────────┘   │
│  Próximos  @caio_77  @bia  @jo        Participe: !pergunta         │
│  Objetivo coletivo  ████████░░░░  640 / 1.000 curtidas             │
└────────────────────────────────────────────────────────────────────┘
```

- **Áudio:** o overlay toca cada fala uma única vez, pelo identificador da fala. No OBS, a fonte de navegador pode tocar áudio; isso **não foi verificado** neste projeto. Em uma aba comum, o navegador exige um clique antes do primeiro som, então o overlay mostra um botão "Ativar som" fora do OBS.
- **Boca:** o volume do áudio (Web Audio, `AnalyserNode`) abre e fecha a boca do anfitrião. O lip-sync por micropausas do Abismo fica como melhoria futura.
- **Legenda sempre visível.** Muita gente assiste sem som, e a legenda também atende quem não ouve.
- **Dois anfitriões:** um de cada lado, e quem fala fica em destaque.
- **Movimento reduzido:** com `prefers-reduced-motion`, só a boca e a legenda se movem.
- **Tela vertical:** LIVE de TikTok costuma ser vertical, e o overlay atual é horizontal. O Palco precisa de uma variante vertical (anfitrião em cima, cartão e legenda embaixo). Fica como decisão em aberto, porque vale para o produto todo.

### 9.7 Demonstração e modos sem IA

| Situação | Comportamento |
|---|---|
| Demonstração (sem Supabase) | Falas do roteiro de cada anfitrião e a voz do próprio navegador (`speechSynthesis`), quando existir. A tela diz "Demonstração: falas de roteiro, voz do navegador". O simulador ganha os comandos do Palco |
| Modo real sem IA configurada | Só o Correio Falado e os comportamentos de fundo, que precisam apenas de TTS |
| Modo real sem TTS configurado | O Palco funciona só com legenda e avisa o criador |
| Falha do servidor em uma fala | Frase de reserva do roteiro. Depois de três falhas seguidas, o Palco pausa e avisa |

## 10. Painel do criador

- **Item "Palco"** na barra lateral, entre "Game Hub" e "Minha arena".
- **Catálogo de quadros**, no mesmo padrão dos cartões do Game Hub, com a página de configuração de cada quadro (anfitrião, regras, tamanho da fala).
- **Sala de controle**, pensada para leitura num relance, como a arena:
  - "Falando agora": anfitrião, texto e tempo restante.
  - Fila com os próximos pedidos, e por linha: pular, remover, silenciar.
  - Campo de **fala manual**: o criador digita e o anfitrião fala, com prioridade máxima.
  - Botões Iniciar, Pausar e Encerrar. O vermelho fica só no que está ao vivo, como no restante do painel.
  - Medidor de uso da hora.
- **Elenco:** tela com os anfitriões, a origem de cada um e um botão para ouvir uma amostra da voz.
- Iniciar uma partida pausa o Palco, e iniciar o Palco exige que não haja partida em andamento.

## 11. Latência e custo

Nada aqui foi medido no TokArena.

- **Orçamento de tempo de uma fala:** texto (1 a 2 s) mais voz (1 a 3 s com serviço hospedado). Com a regra de preparar a próxima fala durante a atual, o espectador só sente essa espera na primeira fala de uma fila vazia.
- **Referência do Abismo:** o XTTS local levou 23,41 s frio e 2,07 s aquecido, segundo o README. Rodar XTTS exige GPU no servidor.
- **Custo:** limitado pelo tempo de palco, não pelo tamanho da sala. Mil pessoas comentando geram a mesma quantidade de falas que cinquenta. Os preços de texto e de voz precisam ser levantados na hora de escolher os provedores.
- **Modelo de texto:** as falas são curtas e a latência importa mais que a profundidade. Sugestão: um modelo rápido, como o Claude Haiku 5.5 (`claude-haiku-5-5`), atrás de uma interface para poder trocar. O Abismo usa gpt-4.1-nano e gpt-4.1-mini.

## 12. Fases de entrega

| Fase | Entrega | Critério de pronto |
|---|---|---|
| **0. Provas técnicas** | Áudio da fonte de navegador no OBS; latência de dois provedores de TTS em português; limites da função de borda | Três respostas de "funciona" ou "não funciona", com números |
| **1. Palco base** | Fila, filtros, sala de controle, cena do overlay com um anfitrião, demonstração com roteiro, **Papo Reto** e **Correio Falado**, comportamentos de fundo | Uma LIVE de teste de 30 minutos com o modo "aprovar antes de falar" |
| **2. Quadros com estado** | **Oráculo** e **História Coletiva** | Uma história completa de cinco capítulos com sugestões do chat |
| **3. Dois anfitriões** | **Tribunal da LIVE** e **Duelo de Opiniões**, aplausômetro | Um julgamento e um duelo completos, com enquete |
| **4. Opcionais** | Voz do espectador (convidado do TikTok ou página com microfone); anfitrião narrando as partidas dos jogos; variante vertical | A definir depois da fase 1 |

A narração de partidas merece destaque: com o Palco pronto, o mesmo anfitrião pode comentar a corrida ("a Lu passou o Caio na última curva") com frases de roteiro, sem IA. É a ponte entre o Palco e os jogos.

## 13. Testes

Seguem o padrão do projeto: regras puras testadas sem rede.

- **Fila:** um pedido por espectador, validade, prioridade, limite de presentes seguidos, descanso, teto de 30.
- **Filtros:** termos bloqueados com as variações de escrita, ruído, menções, nome falável.
- **Quadros:** cada máquina de estados (capítulos da história, etapas do tribunal, rodadas do duelo), com semente fixa.
- **Motor:** os comandos novos em `applyLiveEvent`; Palco e partida não rodam juntos; `!entrar` e `!voto` continuam como estão.
- **Serviço de fala:** com servidor falso, incluindo falha, bloqueio e limite de uso.
- **Overlay:** cada fala toca uma única vez, mesmo recebendo o mesmo snapshot várias vezes.
- **Escala:** mil `!pergunta` em um minuto mantêm a fila no teto e o painel responsivo.

## 14. Decisões em aberto

1. **Provedor de TTS.** Critérios: vozes em português do Brasil, menos de 2 s para 160 caracteres, licença que permita transmissão comercial ao vivo, vozes diferentes o bastante para seis anfitriões.
2. **Provedor e modelo de texto.**
3. **Quem paga o uso.** Chave da plataforma com limite por plano, ou chave do próprio criador guardada no servidor.
4. **Função de borda ou serviço próprio** para a geração, depois da prova técnica da fase 0.
5. **Personas criadas pelo criador.** Exigem termos de uso e moderação.
6. **Revisão jurídica do elenco** e da regra para personagens licenciados no futuro.
7. **Rótulo de conteúdo gerado por IA** do TikTok: confirmar se a regra da plataforma pede o aviso para este tipo de transmissão.
8. **Variante vertical** do overlay.
9. **Nome da área.** "Palco" é a sugestão.

## 15. Referência: o que veio do Live do Abismo

O desenho aproveita ideias do repositório `Pablo672-sys/Live-do-Abismo-Thiago-Reyeres`, lido em novembro de 2026. Nenhum código foi copiado.

| Ideia | No Abismo | No Palco |
|---|---|---|
| Filas separadas com prioridade e validade | `services/live_events.py` | Seção 7 |
| Só o comentário mais recente de cada usuário | `services/live_events.py` | Regra 1 da fila |
| Limite de presentes seguidos | `MAX_GIFT_BURST_BEFORE_CHAT = 2` | Regra 4 da fila |
| Filtro na entrada e na saída da IA | `services/chat_safety.py`, `services/text_ai.py` | Seção 8 |
| Nome falável e texto limpo para TTS | `services/live_text.py` | Seção 8 |
| Frase de reserva quando a IA falha | `_fallback_chat_reply` | Roteiros dos anfitriões |
| Fala manual pelo painel | Painel do Abismo | Seção 10 |
| Preparar o áudio antes de tocar | `services/tts_worker.py` | Regra 7 da fila |
| Saudação sem palavras de gênero | `config/member_welcome_phrases.txt` | Seção 6 |
| Atores em pontos do mapa, convidados com voz própria | `config/actors.json`, `Convidados/` | Anfitriões e quadros |

O que o Palco **não** aproveita: o renderizador em vídeo com transmissão direta por RTMP (o TokArena usa overlay no OBS), o XTTS local com GPU como requisito, e o monitor do TikTok próprio (o TokArena já tem o worker).

## 16. O que já existe no código

O Palco tem duas abas no painel. Nenhuma das duas está ligada ao motor de eventos nem à LIVE ainda.

### Aba Palco (`#/palco`)

- Os seis quadros, cada um com **vagas**: Anfitrião (Papo Reto e Correio), Oráculo, Narrador, Acusação e Defesa (Tribunal), Lado 1 e Lado 2 (Duelo).
- No painel "Em cena", o criador escolhe qual dos bonecos dele ocupa cada vaga. Sem escolha, as vagas são preenchidas com os bonecos na ordem de cadastro. A escolha fica salva no navegador.
- Os roteiros de demonstração usam falas neutras, que servem para qualquer boneco.
- "Testar um pedido" responde com uma das falas prontas do boneco da primeira vaga. Sem falas cadastradas, usa frases padrão.
- A voz do navegador (opcional) usa o tom e a velocidade de cada boneco.

### Aba Bonecos (`#/palco/bonecos`)

O criador cadastra os próprios bonecos, feitos com a IA que preferir. O TokArena não traz nenhum personagem pronto.

| Campo | Para que serve |
|---|---|
| Nome | Legenda do palco e listas do painel |
| Personalidade e jeito de falar | Vai para a IA quando ela for ligada (seção 4.3, campo `persona`) |
| Cor da placa | Fundo atrás do boneco em cena |
| Arquivo "parado" | Imagem ou vídeo em loop do boneco quieto |
| Arquivo "falando" (opcional) | Substitui o "parado" enquanto o boneco fala. Sem ele, o boneco parado balança de leve |
| Falas prontas | Uma por linha, com `{nome}`. Usadas na demonstração e como reserva quando a IA falhar |
| Tom e velocidade da voz | Voz do navegador na demonstração |

Arquivos aceitos: PNG, WebP, GIF, JPG, WebM e MP4, até 25 MB cada. O formulário tem prévia na placa, com "Simular fala" e "Ouvir voz".

**Onde ficam guardados:** no IndexedDB do navegador (`services/bonecoStore.ts`), que aguenta imagens e vídeos grandes. Sem IndexedDB, ficam só na memória da aba. Isso tem duas consequências que importam para o modo real:

- Os bonecos não acompanham a conta: outro navegador ou computador não vê os bonecos.
- O overlay no OBS roda em outro processo e não enxerga esse armazenamento.

Para o modo real, os arquivos vão para o Supabase Storage (bucket por criador) e os dados do boneco para uma tabela com as mesmas regras de segurança por linha das outras.

| Parte | Arquivo |
|---|---|
| Regras do boneco (validação, falas, leitura segura do armazenamento) | `src/domain/bonecos.ts` |
| Quadros, vagas, elenco, roteiros e tempos | `src/domain/stage.ts` |
| Armazenamento dos bonecos e dos arquivos | `src/services/bonecoStore.ts` |
| Boneco em cena (parado e falando) | `src/features/stage/BonecoView.tsx` |
| Cena do palco e tocador de roteiro | `src/features/stage/StageScene.tsx` |
| Páginas | `src/pages/StagePage.tsx`, `src/pages/BonecosPage.tsx`, `src/pages/BonecoEditPage.tsx` |

O elenco de domínio público da seção 4.2 continua como sugestão. Na prática, o criador decide quem entra em cena. A responsabilidade pelos direitos dos personagens que ele cadastra é dele, e isso precisa constar nos termos de uso antes do lançamento.

## 17. Modo ao vivo e ponte local

O desenho da seção 9 previa uma função de servidor no Supabase. Para testar numa LIVE real sem montar o Supabase, a primeira versão usa uma **ponte local** (`worker/palco.ts`), rodando no computador da transmissão:

```text
TikTok ──(tiktok-live-connector)──▶ ponte (localhost:8787) ──(eventos SSE)──▶ painel, aba Palco
                                     │  ▲                                        │
                                     │  └────────(POST /palco/ia: texto pronto)──┤ diretor
                                     ▼                                           │
                            API do Claude (chave em worker/.env)          voz do navegador
                                                                                 │
                                                       tela do palco (BroadcastChannel) ──▶ OBS
```

| Parte | Arquivo |
|---|---|
| Regras do ao vivo: pedidos, fila, filtros, texto enviado à IA, leitura da resposta | `src/domain/stageLive.ts` |
| Diretor: quem fala, quando, aprovação, memória, histórico | `src/features/stage/director.ts` |
| Ligação com o painel, voz e tela do palco | `src/features/stage/useLiveStage.ts`, `voice.ts`, `useSpeechInput.ts` |
| Interface do modo ao vivo | `src/features/stage/LiveStage.tsx` |
| Tela do palco para o OBS | `src/pages/CenaPage.tsx` (rota `#/palco-cena`) |
| Ponte: TikTok, IA e site | `worker/palco.ts`, `worker/palcoCore.ts` |

Decisões:

- **A chave da IA fica na ponte.** O navegador manda o texto já montado; a ponte confere tamanhos e limites, chama a IA e devolve só as falas. A ponte só atende o próprio computador e o site publicado, para outro site aberto no navegador não gastar a chave.
- **A ponte serve o painel em `localhost:8787`.** Assim não há bloqueio de conteúdo misto nem de acesso à rede local. Os bonecos ficam no armazenamento desse endereço.
- **Resposta estruturada.** A IA devolve `{ falas: [{ vaga, texto }] }`. O painel confere de novo as vagas, limpa o texto e passa o filtro de termos; qualquer problema troca a resposta pelo roteiro.
- **Modelo.** Padrão `claude-opus-5-5` com esforço baixo e modelo reserva automático em caso de recusa. Configurável por `PALCO_MODELO`.
- **Eventos.** Os eventos da ponte entram no painel por `actions.emit`, como os do simulador. Os jogos, o feed e o Palco enxergam a mesma coisa (`actions.onLiveEvent`).
- **Voz.** Síntese do navegador, com a voz instalada escolhida para cada boneco. A voz final, gerada por um serviço de TTS, continua em aberto (seção 14).

O que ainda não existe: votação dentro do tribunal e do duelo ao vivo (a IA escreve acusação e defesa; o veredito fica com o chat e com o criador), preparar a próxima fala enquanto a atual toca, e a função de servidor do Supabase para quem não quer rodar a ponte.

