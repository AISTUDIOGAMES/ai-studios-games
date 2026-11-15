# v3.7 — Barras HP/SP/ULT nos ícones, FOES compacto, skills inferiores removidas
1. Os 5 ícones à esquerda agora mostram 3 barras: HP (verde), SP (ciano) e ULT (amarela).
   - SP = carga da habilidade (enche até a skill ficar pronta).
   - ULT em 100%: a barra amarela pisca/brilha e o anel do ícone acompanha. Se a ULT estiver cheia mas em recarga (180 s), a barra fica apagada, sem brilho.
   - Os ícones são clicáveis (substituem a linha inferior): usam a ULT se estiver cheia, senão a skill se estiver pronta.
2. Linha de skills temporizadas da parte inferior removida (oculta por CSS; o código legado segue intacto).
3. Painel FOES menor e com o HP de TODOS os inimigos da onda (até 5), contador vivos/total, inimigos derrotados apagados; chefe com linha própria.
4. Telas baixas (celular deitado): ícones passam a ficar com as barras ao lado, sem encostar nos TACTICAL CONTROLS.
- Arquivos novos: js/44-party-bars-foes-v170.js, css/party-bars-foes-v170.css (+ 2 linhas no index.html).
- Ajuste mínimo em js/41-hud-guard-v167.js (rowExtra 9→14, rowGap 3→7) para medir a altura dos novos cards.
- Combate, saves, economia e demais HUDs intocados.
