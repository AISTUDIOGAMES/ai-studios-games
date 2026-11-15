# v3.7.1 — Mobile: campo de batalha ocupa a tela inteira
Problema (Moto G24): a arena usava alturas fixas (62vh no retrato, 470px no modo deitado) e o #app tinha margens laterais e
espaço inferior, então parte da tela ficava vazia / com rolagem.
1. Celulares (toque) e janelas <= 820px: a arena passa a ocupar 100% da altura e da largura visíveis, sem borda, margem ou rolagem.
2. A altura real visível (barra de endereço, rotação) é medida em JS (`--app-h`), com `100dvh` como alternativa.
3. Em aparelhos de toque, o primeiro toque pede tela cheia ao navegador (só é permitido a partir de um toque). Se o jogador sair
   da tela cheia, o jogo não insiste nessa sessão.
4. Respeita a área de entalhe/cantos com `safe-area-inset`.
5. Celular deitado (altura <= 460px): TACTICAL CONTROLS vira uma linha horizontal de ícones, para não cobrir os heróis 3-5 do grupo
   (a arena ficou mais baixa por ocupar a tela real). A aba ◀/▶ continua funcionando.
- Arquivos novos: css/mobile-fullscreen-v371.css, js/45-mobile-fullscreen-v371.js (+ 2 linhas e 2 metas no index.html).
- Combate, saves, economia e HUDs intocados. Desktop não muda.
