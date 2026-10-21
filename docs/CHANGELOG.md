# Changelog

## Sessão atual: arena em perspectiva, câmera, golpes e cenários

**Arena em perspectiva** (`rpg-ui.js`, `rpg-style.css`)
- Inimigos no fundo, aliados na frente, chefe maior; chão em grade em perspectiva animado.
- Barras de vida acima de cada personagem, com selo de função e barra de ultimate.
- Anel no chão sob o personagem ativo; golpes avançam para frente/fundo (`lunge-up/down`).
- Flash colorido e escurecimento do resto no ultimate; tremor de tela no crítico.

**Câmera** — `camTo()`, zoom no autor, no alvo e plano aberto em ataques em área, parallax de 3 camadas.

**Golpes** — 5 estilos (`slash`, `impact`, `beam`, `holy`, `orb`) escolhidos por personagem.

**Cenários** — novo `rpg-scenes.js`, um por setor, 2 camadas.

**Arquivos alterados:** `rpg-ui.js`, `rpg-style.css`. **Novo:** `rpg-scenes.js`.
**Sem mudanças:** `rpg-engine.js`, `rpg-art.js`, `rpg.html`, e os arquivos do site em `src/`.

**Teste feito:** navegador headless (Chromium), tela 1366×800, entrada na batalha e uso de uma skill:
sem erros de JavaScript, zoom e corte funcionando. Sem os sprites reais e sem teste em celular.

## Mundo explorável (MVP)

**Novo:** `world.js`, `world-data.js`, `world-quests.js`, `world-save.js`, `world-style.css`, `docs/MUNDO.md`, `tests/world_e2e.py`.
**Alterado:** `rpg-ui.js` (botão EXPLORE/CONTINUE, seleção de squad em modo mundo, ponte de encontros, época no lugar de `aborted`), `rpg.html` (+ `world-style.css`).
**Sem mudanças:** `rpg-engine.js`, `rpg-art.js`, `rpg-scenes.js`, `rpg-style.css`, `src/`.

**Problemas corrigidos (auditoria):**
- Loop de batalha duplicado possível: a flag global `aborted` voltava a `false` em `startBattle` e "reanimava" um loop antigo ainda dormindo em `sleep()`. Agora cada tela tem uma época.
- `keyHandler` da batalha ficava ativo ao trocar de tela. Agora `setScreen()` o limpa.
- Promessa de `waitChoice` de uma batalha abandonada continuava viva; agora a ação é descartada se a época mudou.

**Testes (Chromium headless, 38 verificações, todas passando, sem erros de console):** carregamento, movimento por WASD e setas, colisão com parede, estátua, prédio e portão, pausa/retomada sem frames, interação com NPC, as duas missões, entrada e vitória no combate com retorno à mesma posição, derrota com TRY AGAIN / SAFE POINT, save/load, save antigo intacto, save inválido recuperado, um único loop ativo em todas as etapas, e celular 390×740 (toque e sem scroll horizontal).
