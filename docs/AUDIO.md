# Áudio do BomberIdle (BomberIdle Premium, fase E)

Música e efeitos sonoros do BomberIdle. **Tudo é gerado por código (Web Audio): nenhum arquivo de som é baixado**, então não há licença de terceiros, nem caminho de asset que possa quebrar, e a publicação não muda.

> **Sobre a trilha:** ela é uma base ambiente **procedural** (pad, baixo e arpejos esparsos com eco, em Lá menor, 78 BPM). É original e discreta, mas **não é uma gravação de músicos nem de estúdio**. Se um dia houver uma trilha gravada ou licenciada, basta trocar o `MusicPlayer` (ver "Como trocar a trilha").

## Arquivos

| Arquivo | Papel |
|---|---|
| `client/src/audio/audioEngine.ts` | Motor: um único `AudioContext`, barramentos, limitador, controle de sobreposição, ciclo de vida da aba. Exporta a instância `audio`. |
| `client/src/audio/synth.ts` | Os 21 efeitos (`SFX`) e o ganho/intervalo/vozes de cada um. |
| `client/src/audio/music.ts` | `planStep()` (função pura que diz quais notas tocam) e `MusicPlayer` (agenda as notas com antecedência). |
| `client/src/audio/audioSettings.ts` | Preferências (música/efeitos ligados e volumes) em `localStorage["bomber-idle:audio"]`, **fora do save do jogo**. |
| `client/src/scenes/FarmScene.ts`, `client/src/main.ts`, `client/index.html` | Ganchos nos eventos do jogo, botão de som no cabeçalho e seção "Áudio" em Configurações. |

## Comportamento

- **Autoplay:** nada soa antes de um gesto. O primeiro clique, toque ou tecla libera o áudio. O botão do cabeçalho mostra **"Ativar som"** (pulsando) até isso acontecer; depois liga/desliga tudo. Quem desligou o som de propósito não é "religado" por um clique qualquer.
- **Contexto único:** `unlock()` pode ser chamado quantas vezes quiser; nunca cria um segundo `AudioContext` nem uma segunda música. A música independe da cena do jogo.
- **Falhas:** sem Web Audio, ou se algo der erro, todas as chamadas viram "não faz nada" e o jogo segue.
- **Aba escondida / fechada:** o contexto é suspenso (sem som e sem CPU) e retoma ao voltar. `dispose()` fecha tudo.
- **Menus:** com uma janela aberta a música fica mais abafada e baixa (`setMood("menu")`), sem trocar de faixa.
- **Sobreposição:** intervalo mínimo por efeito (rajadas viram um som só), máximo de vozes por efeito, teto global de 18 vozes (eventos de prioridade 2 podem passar até 24), redução automática quando muita coisa soa junta, variação de altura de ±6% a cada disparo, ducking da música nas explosões e na vitória, e compressor + limitador suave no master (pico nunca passa de −0,45 dBFS).
- **Volume:** curva quadrática (50% do controle soa como "metade"). Padrões: música 50%, efeitos 70%.

## Efeitos e onde disparam

| Efeito | Quando |
|---|---|
| `bombPlant`, `fuse` | Bomba plantada; aviso nos últimos 500 ms |
| `explosion` | Explosão (o alcance muda a duração). Só som: dano e alcance seguem em `blastCells`/`explode` |
| `blockHit`, `blockBreak` | Bloco danificado / destruído |
| `chestHit`, `chestOpen` | Baú atingido / aberto (raridade = mais notas e brilho) |
| `enemyHit`, `enemyDeath`, `coin` | Inimigo atingido / derrotado (MVP mais grave e longo) / recompensa |
| `crit`, `ability` | Golpe crítico / habilidade ativa (altura por classe) |
| `levelUp` | Operador sobe de nível |
| `mapClear` | Mapa limpo de verdade (não no "destravar") |
| `capsule` | Compra de cápsula (raridade do melhor resultado) |
| `upgrade`, `mission` | Upgrade, alojamento e zelador comprados / missão resgatada |
| `uiClick`, `uiOpen`, `uiClose`, `uiError` | Botões, janelas, ação recusada |

O jogo **não tem dano ao jogador nem tela de derrota** (operadores trabalham sozinhos), por isso não há som de "dano recebido" ou "derrota". O equivalente de vitória é `mapClear`.

## Como trocar a trilha por um arquivo gravado

1. Coloque o arquivo (ogg/mp3) em `client/public/` e carregue-o em um `AudioBuffer` ou `<audio>`.
2. Crie uma classe com `start()`/`stop()`/`running` no lugar de `MusicPlayer` em `audioEngine.ts` (ela deve sair em `buses.musicIn`).
3. Barramentos, volume, mudo, pausa de aba e testes de contexto único continuam valendo.

## Testes

Automáticos (rodam com `npm test` e `npm run smoke`, sem navegador):
- `client/test/audio.test.ts` (28 testes): preferências e persistência, contexto único, música sem duplicar, mudo, intervalo e teto de vozes, pausa com aba escondida, falhas silenciosas, determinismo e faixas de notas da trilha, e nenhuma fonte sem hora de parar.
- `client/test/smoke/scene-smoke.mts`: roda a cena real e confere que **cada som corresponde a um evento do jogo** (ex.: uma explosão por bomba, um som de abertura por baú).

Opcionais, em navegador real (precisam de `playwright` + Chromium; ver cabeçalho de cada arquivo), na pasta `client/`:
- `node test/audio-render/render.mjs [pasta]`: renderiza cada efeito e a música sem tocar nada, mede pico/volume/clipping e grava prévias `.wav` para você ouvir.
- `node test/audio-render/live.mjs`: `AudioContext` real com a política real de autoplay (gesto, estresse, mudo, aba escondida).
- `node test/audio-render/ui.mjs [pasta]`: botão de som e Configurações no celular e no desktop, com capturas de tela.

## Ajustes rápidos

- Volume relativo de um efeito: `gain` em `SFX` (`synth.ts`). Menos repetição: `cooldownMs`/`maxVoices`.
- Padrões de volume: `AUDIO_DEFAULTS` em `audioSettings.ts`.
- Andamento e acordes: `BPM` e `CHORDS` em `music.ts` (`planStep` é testado, então os testes avisam se algo sair da faixa segura).
