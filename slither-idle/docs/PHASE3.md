# Fase 3 — Renderização HD, cobras articuladas, câmera e controles

## Arquivos
- **`render.js` (novo)** — só desenha cobras. Usado pelo jogo **e** pela loja (`Skins.preview` agora delega a ele).
- **`play.html`** — loop de passo fixo, câmera, DPR, partículas em pool, ghosts de morte, entrada, qualidade adaptativa.
- **`store.html`** — carrega `render.js`. **`skins.js` não foi alterado** (IDs, preços e dados intactos; testado).

## Como as cobras são desenhadas
Espinha de pontos (amostrada por ID absoluto do segmento, para as faixas de cor não tremerem) → suavização [1 2 1] → ondulação lateral procedural (~2 px, só visual) → perfil de largura (pescoço, corpo, cauda afilada, "bolo" da refeição descendo) → **uma fita contínua** com curvas quadráticas pelos pontos médios. Camadas: sombra no chão, brilho (turbo/skins especiais), contorno, base, faixas de cor, lado escuro/realce/brilho (3 fitas finas, sem filtros), escamas, espinhos da skin, cabeça (focinho, narinas, boca ao comer, língua, olhos com piscar e olhar na curva, sobrancelha brava no turbo, acessórios da skin), anel de invulnerabilidade.
Objetos criados por quadro: **1 Path2D por camada, independente do comprimento** (testado: 60 vs 1500 segmentos criam o mesmo número).

## Desempenho (medido no Chromium headless, rasterização por SOFTWARE, 25 cobras de ~500 reunidas)
| Cenário | Quadros/s |
|---|---|
| Original, DPR 1 | 50,2 |
| Novo q2 (todos os efeitos), DPR 1 | 44,0 (≈ -12%) |
| Original (tela 2x, canvas borrado, 1x) | 54,7 |
| Novo q0/q1/q2 em tela 2x (DPR 1 / 1,5 / 2) | 51,5 / 23,2 / 14,8 |
O custo grande é **preencher 4x mais pixels** (DPR 2), não os efeitos. Em GPU real isso pesa bem menos, mas **não foi medido em hardware real**. O governador desce de nível sozinho (testado: q1→q0, estabilizou em ~50 fps) e usa recuo exponencial para não oscilar. `?q=0|1|2` força um nível; `?debug` mostra FPS/qualidade/DPR.

## Física e movimento
- Passo fixo de 60 Hz, desenho interpolado. Medido: velocidade 216,5 px/s (esperado 216) com CPU normal e 4x mais lenta. A ~187 fps a irregularidade do movimento por quadro caiu de 145% (sem interpolar) para 35%.
- Câmera: seguimento exponencial (~80 ms), antecipação, zoom por tamanho/turbo/tela.
- **Mudança de gameplay (ajustável em `FEEL`)**: a cobra agora gira no máx. 0,17 rad/tick (curta) até 0,09 (longa, igual às IAs) em vez de virar instantaneamente; evita "quinas" no corpo. Também há WASD/setas.

## Não feito / limites
- **"Sofrer dano":** o jogo não tem pontos de vida; não há o que animar. Morte, comer, crescer (bolo), acelerar e virar estão feitos.
- **HUD mobile:** a barra de botões sobrepõe BOOST/joystick/comprimento. **Já existia** (CSS idêntico ao original); fica para a Fase 7.
- Skins: o desenho melhorou, mas **categorias/texturas/novas skins** (Comum…Mítica) são o escopo da seção 3 do pedido, ainda não feito.
- Camada de escamas só em q2; q0 é plano com contorno.
- Sem teste em GPU real, Safari, Firefox ou celulares reais. Sem teste de áudio.
- Modo `--disable-frame-rate-limit` foi usado só para simular monitor rápido; não é um monitor de 144 Hz de verdade.
