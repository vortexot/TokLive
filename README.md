# TokArena

Plataforma de minigames 3D interativos para LIVEs do TikTok. Os espectadores participam pela própria LIVE (seguir, curtir, comentar, enviar presentes) e cada seguidor ganha um personagem 3D gerado automaticamente. O criador controla os jogos por um painel e transmite o jogo pelo OBS, com uma fonte de navegador.

> **Estado atual.** A demonstração funciona sozinha, com dados e eventos simulados. O código para o modo real (contas, dados salvos online, overlay pela internet e conexão com a LIVE) já está no repositório, mas **só liga depois que você configurar o Supabase e subir o worker** (veja "Modo real"). **Ainda não foi testado contra um projeto Supabase nem contra uma LIVE de verdade.** O que foi verificado está em "O que foi verificado".

## O que existe nesta etapa

| Área | Situação |
|---|---|
| Visão geral, Game Hub, Minha arena, Participantes, Personagens, Ranking, Estatísticas, Configurações, Conta, Ajuda | Implementadas, navegáveis e funcionais localmente |
| Seis jogos | Corrida de obstáculos, chão de lava, batalha de empurrões, batatinha frita, futebol e plataformas desaparecendo: todos jogáveis em 3D, com poderes de presentes, turbo coletivo e classificação |
| Palco | Área de conversa falada, sem jogo: seis quadros (perguntas, recados, oráculo, história, tribunal e duelo) com os bonecos que o criador cadastra na aba **Bonecos**. Modo **Demonstração** (falas de roteiro) e modo **Ao vivo**: respostas da IA a comentários, presentes, seguidores, compartilhamentos e meta de curtidas, fala pelo microfone, fila, aprovação antes de falar, histórico e uma tela própria para capturar no OBS. Na LIVE, funciona pela ponte local (veja "Palco na sua LIVE") |
| Interação | Presente: XP e pontos pelo valor, poder no jogo e vaga na frente da fila. Curtida: a cada 20, impulso para o personagem de quem curtiu (e vaga na fila aos 50). Quem interage sem ter seguido ganha personagem |
| Conexão com a LIVE | **Simulada** na demonstração. No modo real, feita por um worker (veja abaixo) |
| Simulador de eventos | Seguidor, comentário (`!entrar`, `!voto 1/2`), curtidas, presente, compartilhamento, entrada na fila, encerrar LIVE, modo automático |
| Overlay para o OBS | Rota `/overlay/:token`, fundo transparente, sincronizada com o painel (mesmo navegador) ou com simulação própria |
| Personagens | Gerador procedural por semente (pele, cabelo, roupa, acessório, cores), desenhados em 2D (SVG) e 3D (Three.js). Formas simples montadas por código, **não** são os assets finais |

## Como executar

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev        # abre o painel em http://localhost:5173/app.html
npm test           # 88 testes (domínio, motor de eventos e interface)
npm run typecheck
npm run build      # gera o site publicado na raiz (index.html + assets/)
```

O overlay de demonstração está em `http://localhost:5173/app.html#/overlay/demo-arena-7k2f9x`. Qualquer token no formato `demo-...` é aceito.

### Modo real (Supabase + worker)

1. Crie um projeto no [Supabase](https://supabase.com) e rode `supabase/migrations/0001_init.sql` (SQL Editor). Ele cria as tabelas, as regras de segurança por linha e as funções.
2. Em **Authentication → Providers**, deixe e-mail e senha ligados.
3. Edite `config.js` na raiz do repositório com a **URL** e a chave **anon public** do projeto (Project Settings → API). Essa chave é pública; os dados são protegidos pelas regras de segurança. **Nunca coloque a chave `service_role` nesse arquivo.** Não precisa refazer o build: basta salvar o arquivo e publicar.
4. Para a conexão com a LIVE, rode o worker em um servidor seu (o GitHub Pages só serve arquivos):

```bash
cd worker && npm install
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... EULER_SIGN_API_KEY=... npm start
```

Fluxo: o criador digita o @ no painel → o painel grava o pedido em `live_connections` → o worker conecta à LIVE com a biblioteca [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector) (não oficial) → grava os eventos em `live_events` → o painel recebe em tempo real e aplica no jogo. O painel publica o estado da partida em um canal com o token do overlay, e o OBS (sem login) o recebe.

Presentes reais viram presentes do jogo pelo valor em diamantes: 0–9 Faísca, 10–29 Escudo, 30–99 Foguete, 100 ou mais Meteoro (`GIFT_TIERS` em `src/services/liveEvents.ts`).

### Palco na sua LIVE (ponte local)

O Palco põe bonecos para conversar com a LIVE: eles respondem comentários, agradecem presentes e cumprimentam quem segue, com voz e legenda. Na LIVE, quem liga tudo é a **ponte**, um programa que roda no mesmo computador da transmissão. Ela conecta na sua LIVE, chama a IA com a sua chave (que nunca vai para o navegador) e abre o próprio painel.

1. Copie `worker/.env.example` para `worker/.env` e preencha `ANTHROPIC_API_KEY` (chave da API da Anthropic). Sem a chave, os bonecos falam só as falas prontas.
2. Na raiz do repositório, rode:

```bash
npm run palco -- @seu_usuario
```

3. Abra no Chrome **http://localhost:8787/TokLive/#/palco**. Use sempre este endereço: os bonecos ficam guardados no navegador, separados por endereço.
4. Na aba **Bonecos**, cadastre os seus (imagem ou vídeo parado e falando, personalidade, falas prontas e voz).
5. Na aba **Palco**, escolha o quadro e quem está em cena, mude para **Ao vivo** (a ponte conecta sozinha) e clique em **Ligar palco**. Nas primeiras LIVEs, ligue **Aprovar antes de falar**.
6. Clique em **Abrir tela do palco** e capture essa janela no OBS ou no TikTok LIVE Studio (captura de janela). O som sai pelo Chrome: capture o áudio do aplicativo Chrome ou o áudio da área de trabalho. Com `#/palco-cena?fundo=verde`, o fundo fica verde para recorte.
7. Na LIVE, os espectadores participam comentando o comando do quadro (`!pergunta`, `!recado`, `!sorte`, `!e`, `!confesso`, `!tema`). Presentes, seguidores, compartilhamentos e a meta de curtidas também geram falas. No painel, você ainda pode falar com os bonecos pelo microfone ou por texto.

**IA no seu computador (sem chave).** Em vez da Anthropic, a ponte pode usar o [Ollama](https://ollama.com) com o modelo `qwen2.5:3b`, o mesmo da Mentiliza. Instale o Ollama, rode `ollama pull qwen2.5:3b` e ponha `PALCO_IA=ollama` no `worker/.env` (opcionais: `OLLAMA_MODELO` e `OLLAMA_URL`). Não há custo por fala e o chat da LIVE não sai do computador: a ponte recusa um `OLLAMA_URL` que não seja o próprio PC. Ao subir, a ponte já carrega o modelo e o mantém carregado por 30 minutos sem uso; espere a mensagem "Modelo local pronto" antes de ligar o palco (neste PC, carregar levou de 36 s a 2 min). Enquanto isso, as falas usam o roteiro. Um modelo de 3B responde pior que o Claude e às vezes foge do formato; quando isso acontece, entra a fala de roteiro. A velocidade depende do seu computador. A IA responde só com texto: ela não tem ferramentas nem acesso ao computador.

Deixe a aba do Palco aberta durante a LIVE: é ela que decide as falas e toca a voz. O modelo padrão é `claude-opus-5-5`; para respostas mais rápidas e baratas, use `PALCO_MODELO=claude-haiku-5-5` no `worker/.env`. Cada fala é uma chamada à API, cobrada na sua conta.

### Publicação (GitHub Pages)

O site publicado: **https://vortexot.github.io/TokLive/**

O Pages serve a raiz da branch `main`. Por isso o projeto é plano (sem pastas aninhadas) e o build escreve direto na raiz:

- `app.html` é a página de entrada do **código-fonte** (usada por `npm run dev`).
- `npm run build` gera `index.html` e `assets/` na raiz, que é o que o Pages publica.
- Para atualizar o site: `npm run build`, commit de `index.html` e `assets/`, e push na `main`.
- As rotas usam `#` (`/#/game-hub`) para funcionar no Pages sem configuração de servidor.

### Como testar

1. Abra a **Visão geral** e clique em **Conectar LIVE** (a conexão é simulada).
2. No **Game Hub**, abra a **Corrida de obstáculos** e clique em **Iniciar**.
3. Abra o **Simulador** (botão no cabeçalho ou `Shift + D`) e dispare eventos: presente de impulso, curtidas até encher a meta (turbo coletivo), comentário `!entrar`.
4. Abra `/#/overlay/demo-arena-7k2f9x` **em outra aba** para ver o overlay acompanhar o painel.

No OBS, a fonte de navegador roda em outro processo e não compartilha o armazenamento do navegador: lá o overlay executa a própria simulação.

## Estrutura

```
app.html       Entrada do código-fonte (dev)
index.html     Site publicado (gerado pelo build)
assets/        Arquivos gerados pelo build
public/        Arquivos estáticos copiados no build
scripts/       Utilitários do build
config.js      Configuração do Supabase (editável sem refazer o build)
supabase/      Migração SQL e testes das regras de segurança
worker/        Worker que liga a LIVE do TikTok ao jogo (roda em servidor)
src/
  domain/      Regras puras: corrida (race.ts), demais jogos (arena.ts), ranking, personagens, catálogo
  state/       Motor de eventos e de partida (funções puras), store, ações e temporizadores
  services/    Dados (local ou Supabase), tradução dos eventos da LIVE, token do overlay
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

- A ligação com o TikTok (`worker/tiktok.ts`) foi escrita a partir dos tipos da biblioteca e compila, mas **nunca rodou contra uma LIVE real**. A documentação da biblioteca mostra `user.uniqueId` e `giftDetails`, mas os tipos da versão 2.5 trazem `user.displayId`, `gift.name` e o fim de combo como número: o tradutor aceita os dois formatos. Os formatos das mensagens são lidos de forma tolerante e cobertos por testes com dados de exemplo, não com dados reais. A biblioteca é não oficial e depende do serviço Euler Stream: pode mudar ou parar.
- O worker aceita qualquer @ pedido por um criador logado. **Não existe verificação de que o @ pertence a quem pediu.**
- Contas e dados online foram verificados com um Postgres local (PGlite) e um cliente de teste, **não com um projeto Supabase real**. A confirmação de e-mail, o limite de mensagens do canal em tempo real e o plano gratuito não foram exercitados.
- Os dados de um criador ficam em um único documento por conta (teto de 4 MB, cerca de 8.000 participantes salvos). Acima disso ficam os vistos mais recentemente.
- Os modelos 3D são primitivas geométricas, sem assets externos. Se forem adotados assets de terceiros, a licença precisa ser verificada.
- O desempenho foi medido por contagem de chamadas de desenho (cerca de 274 por quadro com 30 corredores), **não em GPU real**. A taxa de quadros em computadores intermediários ainda precisa ser medida.
- O painel em aba oculta recupera o tempo da partida, mas o navegador reduz a frequência de atualização do overlay sincronizado. Mantenha a aba do painel visível durante os testes sincronizados.
- Sem conta, os dados ficam no `localStorage` do navegador (limite do navegador, cerca de 5 MB).
- O layout foi verificado em cinco tamanhos de tela e com uma varredura de acessibilidade automatizada, mas não em dispositivos físicos nem com leitores de tela.

## O que foi verificado

- 266 testes: Palco (fila, filtros, diretor, texto enviado à IA, ponte, cliente Ollama), cadastro de bonecos, regras dos seis jogos (determinismo, término, classificação, casos específicos), motor de eventos, benefícios de presentes e curtidas em todos os jogos, tradução de mensagens da LIVE, camada Supabase com cliente falso, worker com conexão falsa, login e interface.
- Segurança do banco: a migração roda em um Postgres real (PGlite) e os testes conferem que um criador só lê o que é dele, que o anônimo não lê tabelas, que o token do overlay é gerado no servidor e que só o worker grava eventos.
- Escala: com 5.000 participantes, um evento custa cerca de 0,1 ms; 3.000 eventos misturados e mil pessoas comentando `!entrar` são processados dentro dos limites dos testes; o estado enviado ao overlay tem tamanho fixo (cerca de 47 KB) mesmo com 10.000 participantes. No navegador, o painel abre todas as páginas com 5.000 participantes sem erro, e a taxa de quadros da partida foi a mesma de 120 participantes (cerca de 23 quadros por segundo, **medidos com renderização por software, sem GPU**: em um computador comum deve ser bem maior, mas isso não foi medido).
- Eventos remotos são aplicados em lote (até 10 vezes por segundo) e curtidas do mesmo espectador são somadas no worker, para que mil pessoas interagindo não travem o painel.

- **Palco ao vivo:** a geração de falas pela IA foi testada com uma IA falsa e contra a API real apenas no caminho de erro (chave recusada). **Nenhuma fala real da Anthropic foi gerada nos testes**, e a ponte nunca rodou contra uma LIVE real. Com o Ollama local (`qwen2.5:3b`), a ponte gerou falas reais num ensaio sem LIVE: de 1,5 a 6 s com o modelo carregado; uma resposta em cinco saiu fora do formato (vai para o roteiro) e algumas ignoraram regras do roteiro, como evitar palavras de gênero. A voz usa a síntese do navegador e não foi ouvida nos testes. O reconhecimento de voz do microfone só existe no Chrome e no Edge, e o Chrome envia o áudio ao serviço de voz do Google.

## Licenças

Fontes Inter e Barlow Condensed (SIL Open Font License, via Fontsource) e ícones Lucide (ISC). Não há imagens, modelos ou animações de terceiros.
