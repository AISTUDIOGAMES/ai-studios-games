# Fase F: balanceamento, persistência e performance

Auditoria feita sobre o código real (simulação da cena com 15 operadores, interface real no Chromium com 500 operadores e testes automáticos). **Nenhum valor de economia foi alterado** (preços, custos, recompensas, chances e missões seguem iguais; há um teste que trava isso).

## 1. Salvamento e persistência

Problemas encontrados e corrigidos (`client/src/state.ts`, `client/src/main.ts`):

| Problema | Correção |
|---|---|
| **"Apagar progresso" não apagava**: o `pagehide` do recarregamento chamava `saveNow()` e regravava o progresso antigo. | `eraseSave()` apaga save, backup e cópia e **congela** as gravações antes do reload. |
| Save principal **ilegível virava jogo novo em silêncio** e era sobrescrito (perda total). | Guarda a cópia em `bomber-idle:v1:corrupt`, tenta o backup e **avisa o jogador**. |
| Sem backup. | `bomber-idle:v1:bak`: o save que abriu bem vira o backup da sessão e é renovado a cada 10 min. O backup nunca "ressuscita" um progresso apagado de propósito. |
| Falha ao gravar (armazenamento cheio/bloqueado) era ignorada. | `saveStatus.ok`/`failures`; a interface avisa uma vez por ocorrência. |
| Campos do save sem validação: `lodging`, `butler`, `daily` (textos, negativos, listas erradas), `serial` inválido (gerava `opNaN`). | Todos viram valores seguros ao carregar. O total de alojamentos respeita o limite. |
| Dois operadores com o **mesmo número** se misturavam (mesmo id). | Nenhum é descartado: o repetido ganha número novo e volta para a reserva. |
| `buyCapsule(-5)` (ou 0, 1.5, NaN) **aumentava** o saldo; `addReward`/`addEnemyReward` aceitavam NaN/negativo; `upgrade`/`buyLodging` com argumento inválido. | Entradas inválidas são recusadas sem tocar no saldo; o saldo respeita o teto de 1e15 (o mesmo que a carga aceita). |

Compatibilidade: a chave do save continua `bomber-idle:v1` e o formato não mudou, então **saves antigos abrem normalmente** (a migração do formato <1.6 continua e tem teste). Não existe progresso offline no jogo (a stamina só recupera com a página aberta); não foi inventado, porque mudaria a economia.

## 2. Performance (medida, não suposta)

| Medição | Resultado |
|---|---|
| Lógica da cena, 15 operadores, 5 min simulados | média **0,15 a 0,19 ms por frame** (orçamento de 16 ms) |
| Interface com **500 operadores** e save de 90 KB | `render` ~1,4 a 2,4 ms a cada 400 ms; `economyTick` ~0,5 ms/s; gravar o save ~2 a 4 ms; no total **~0,4 a 1% de um núcleo** |
| Objetos do Phaser ao montar um mapa | **1.391 → ~1.095 (−21%)** |

- Otimização feita: as barras de vida dos blocos (2 objetos por bloco, invisíveis) agora só são criadas no **primeiro dano** (`hitBlock`), reduzindo a criação de objetos a cada troca de mapa. Sem vazamento: os objetos vivos no fim da simulação seguem iguais aos do início, inclusive em mapas difíceis (dano parcial).
- **Não** foi alterado o que a medição mostrou ser barato: lógica da cena, `render` e gravação do save. Mexer neles só traria risco.
- Limite honesto: o custo de **desenho (WebGL)** e a taxa de quadros em aparelhos reais não puderam ser medidos aqui (sem o Phaser instalado nem GPU). Valide no seu computador e num celular.

## 3. Balanceamento: dados para você decidir (nada foi mudado)

Simulação de 20 min no Campo Verde, sem Zelador nem alojamentos, com sorteio real (varia 20 a 40% entre rodadas):

| Cenário | $BOMBERSI por minuto (aprox.) | Tempo para 1 cápsula (30.000) |
|---|---|---|
| 1 comum, nível 1 | 0,3 a 0,6 mil | 50 a 100 min |
| 4 comuns | 0,75 mil | 40 min |
| 15 comuns | 1,6 mil | 19 min |
| 4 mistos (comum, incomum, raro, épico) | 1,9 mil | 16 min |
| 15 mistos, nível 1 | 15 a 17 mil | ~2 min |
| 15 mistos, nível 15 | ~26 mil | ~1 min |
| 15 mistos, nível 30 | ~48 mil | menos de 1 min |
| 1 ancestral, nível 1 | 17 a 24 mil | ~1,5 min |

Referências de preço: melhoria 10.000 (×1,4 por nível, `UPGRADE_GROWTH` no seu `state.ts`), Casulo 150.000, Módulo 600.000, Zelador 1.000.000.

O que os números sugerem (decisão sua, nenhuma alteração feita):
1. **A raridade domina a quantidade**: 15 comuns rendem ~5,6x um comum, e 1 ancestral rende quase o mesmo que 15 operadores mistos (~50x um comum). Isso combina com as chances das cápsulas (ancestral 0,1%), mas torna os comuns pouco relevantes depois que se tem um raro.
2. **Início lento**: com 1 comum, a primeira melhoria leva ~25 min e a primeira cápsula ~1h+. O saldo inicial de 60.000 (2 cápsulas) suaviza isso.
3. Sem alojamento, o descanso é lento (0,1 de stamina/s), o que limita quem trabalha ao mesmo tempo.

É uma simulação com o Phaser simulado (sem tempo real de tela): use como guia relativo, não como valor absoluto.

## 4. Testes

- `client/test/persistence.test.ts` (20 testes): save ilegível, backup, falha de gravação, campos inválidos, números repetidos, entradas inválidas na economia, `eraseSave` e preços de referência. Rodam isolados e em conjunto; falham no código anterior.
- `client/test/smoke/scene-smoke.mts`: agora aceita `OPS` (nº de operadores) e informa `liveAtStart` e `pendingEnd`.
- Opcionais em navegador (precisam de `playwright` + Chromium), na pasta `client/`:
  - `node test/perf/ui-load.mjs [operadores]`: custo dos temporizadores da interface (`OPEN_TAB=capsules` abre uma janela por cima).
  - `node test/perf/ui-save.mjs`: avisos de save ilegível/backup/falha de gravação e o "Apagar progresso".
