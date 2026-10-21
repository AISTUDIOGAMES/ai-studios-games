# Mundo explorável (OWL: GRIDBREAKERS)

## Arquivos (todos em `public/`, sem bibliotecas externas)
| Arquivo | Papel |
|---|---|
| `world-data.js` | **Conteúdo**: mapa `hub`, construções, objetos investigáveis, NPCs, saídas, missões. Só dados e 3 helpers de colisão (`buildGrid`, `canStand`, `isFree`) |
| `world-quests.js` | `createQuests(defs, state, notify)`: máquina de estados da missão (`idle → active → ready → done`) |
| `world-save.js` | `owl_gridworld_v1`: `sanitize()` valida tudo ao carregar; `loadWorld`, `saveWorld`, `hasWorldSave` |
| `world.js` | `startWorld(root, host, squad)`: loop, input, colisão, câmera, desenho, diálogos, HUD, pausa |
| `world-style.css` | HUD, caixa de diálogo, pausa, controles de toque |
| `rpg-ui.js` | continua dono das telas e da batalha; ganhou o botão do mundo e a ponte de encontros |

`world.js` não conhece o motor de batalha: recebe um objeto **host** (`img`, `hero`, `locked`, `fight`, `resume`, `pickSquad`, `exit`) do `rpg-ui.js`.
O motor (`rpg-engine.js`) não foi alterado e as regras de combate não foram duplicadas.

## Fluxo
Título → EXPLORE → escolher 3 Operators (só na 1ª vez) → mundo.
Encontro: `host.fight(squad, 0, done)` → `fightEncounter()` cria a mesma batalha de sempre (setor 0) → `done("win" | "lose" | "flee")` volta ao mundo.
- **win:** glitch derrotado, objetivo da missão atualizado, jogador na mesma posição.
- **lose:** tela com TRY AGAIN ou RETURN TO SAFE POINT (último ponto onde falou com um NPC; senão o spawn).
- **flee** (botão QUIT): volta ao mundo sem consequências.
Batalhas do mundo **não** mexem em `owl_gridbreakers_v1`, vitórias ou desbloqueios, e não há recompensa financeira.

## Mapa `hub` (32×24)
Praça central com holo-coruja · Foundry Workshop (porta investigável) · Night Market · Data Tower · Hab Block 7 · ruas livres · terminal no beco sul · pilha de caixas · **portão leste selado** (expansão futura) · **saída sul** (`exits`, `to: null`) pronta para conectar outro mapa.
NPCs: **Lyra** (missão principal), **Jax** (missão secundária), **Bit** (boatos), **Archivist Mara** (lore, muda após a missão principal).

## Missões
1. *Signal Leak* (Lyra): investigar o terminal → um glitch aparece → derrotá-lo → voltar à Lyra.
2. *Spare Coil* (Jax): achar a bobina nas caixas → voltar ao Jax.
O painel superior esquerdo mostra os objetivos; toasts avisam cada mudança; ao concluir aparece o texto de `reward`.

## Salvamento
Chave `owl_gridworld_v1` = `{ v:1, map, x, y, safe:{x,y}, squad, quests, flags }`.
Salva ao fechar diálogos, pausar, sair, trocar de tela e a cada 8 s. Ao carregar, `sanitize()` descarta mapa desconhecido, posição fora do mapa/dentro de parede (cai no `safe`, depois no spawn), squad inválido/bloqueado, missões desconhecidas e flags malformadas. O save antigo `owl_gridbreakers_v1` só é lido (para saber quem está desbloqueado).
Fica fora do save: a vida dos Operators (cada encontro começa com o squad inteiro) e o resultado pendente de batalha.

## Desempenho e limpeza
- Um único `requestAnimationFrame` por mundo, com delta time limitado a 50 ms. Pausa, aba oculta ou perda de foco **cancelam** o loop.
- Todos os listeners (teclado, janela, toque, `ResizeObserver`, autosave) são registrados em `cleanups` e removidos em `stop()`.
- `rpg-ui.js` trocou a flag `aborted` por uma **época** (`epoch`): qualquer loop async de uma tela antiga se encerra sozinho. `setScreen()` também zera o `keyHandler` e para o mundo.
- Só os tiles visíveis são desenhados.

## Como expandir
- **Novo NPC:** objeto em `map.npcs` (`hero:"jax"` usa o sprite do Operator; `glyph:"drone"|"owl"` desenha formas). Com `quest:` ele usa `offer/active/ready/done`; sem, usa `idle` (rotaciona).
- **Nova missão:** item em `QUESTS` com `objectives[{id,text,on}]`. Eventos emitidos hoje: `inspect:<ação>` (objetos) e `win:glitch`. Novos eventos: `Q.emit("...")` em `world.js`.
- **Novo objeto:** item em `map.objects` com `inspect({Q,S})` → `{lines, event?, effect?}`. Os tipos visuais (`door`, `terminal`, `crate`, `statue`, `gate`) estão em `drawObject()`.
- **Novo mapa:** crie outro objeto como `hub`, registre em `MAPS` e aponte `exits[i].to` e `exits[i].spawn`. A troca de mapa já está implementada em `interact()`.
- **Novos encontros:** `host.fight(squad, stageIdx, cb)` aceita qualquer setor de `STAGES`.

## Testes
`tests/world_e2e.py` (Playwright + Python) cobre movimento, colisões, pausa, NPCs, as duas missões, entrada/saída do combate (vitória, derrota), save/load, save antigo, save corrompido e celular. Precisa de um servidor estático em `localhost:8766` servindo `public/` com sprites em `images/` (podem ser placeholders) e `?debug`.

## Limitações conhecidas
- 1 mapa, 1 tipo de encontro (glitch do setor 1), 4 NPCs. Sem inventário (por pedido).
- Os Operators são sprites estáticos (frente) com balanço/inclinação ao andar; não há folha de animação de 4 direções.
- A vida do squad não persiste entre encontros.
- O interior da oficina é só um texto "em breve".
- Não testado em celular físico, nem com os sprites reais.
