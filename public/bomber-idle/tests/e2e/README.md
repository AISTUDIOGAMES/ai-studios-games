# Testes de navegador (opcionais)
Verificações visuais/de desempenho feitas com Playwright (Chromium). **Não rodam no `npm test`** e dependem do ambiente.
Requisitos: `pip install playwright && playwright install chromium`. Abra os .py e ajuste os caminhos `file:///...` para a sua pasta.

| Script | O que mostra |
|---|---|
| `shot.py` + `harness.html` | desenha skins isoladas (curvas S e C) e salva PNG |
| `game.py` | abre o jogo com `?debug` e imprime FPS/qualidade/DPR |
| `perf.py` | compara quadros/s: original vs novo (q0/q1/q2). `DSF=1` iguala o DPR |
| `gov.py` | observa o governador de qualidade se estabilizar |
| `smooth.py` | velocidade constante sob CPU lenta e suavidade da interpolação |
| `states.py`, `ghost.py` | turbo, comer, morte e cobra de 8000 de comprimento |
| `input.py` | inércia de curva, teclado WASD/setas, resize e mobile |
| `store.py` | miniaturas da loja em 2x |
**Limite conhecido:** o Chromium headless rasteriza por SOFTWARE (sem GPU). Os números de FPS servem para comparar versões entre si, não para prever celulares reais.
