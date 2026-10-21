# OWL: GRIDBREAKERS — documentação técnica (protótipo 0.1)

## Arquivos

| Arquivo | Papel |
|---|---|
| `rpg.html` | casca da página; carrega `rpg-ui.js` como módulo e `rpg-style.css` |
| `rpg-engine.js` | regras: operadores, inimigos, setores, turnos, dano, upgrades |
| `rpg-ui.js` | telas, batalha, entrada do jogador, áudio, save, câmera, golpes |
| `rpg-art.js` | `enemyArt(kind, color)`: SVG placeholder de cada inimigo |
| `rpg-scenes.js` | `sceneArt(stageIdx)`: cenário SVG em 2 camadas (far/mid) |
| `rpg-style.css` | todo o visual |

## Motor (`rpg-engine.js`)

Exporta: `HEROES`, `HERO_ORDER`, `ENEMIES`, `STAGES`, `SCALE`, `UPGRADES`, `makeHero`,
`createBattle`, `nextTurn`, `endTurn`, `canUse`, `validTargets`, `playerAct`, `enemyAct`,
`rollUpgrades`, `betweenStages`, `R` (`R.rand` troca o gerador aleatório, útil para testes).

O motor não mexe na tela. `nextTurn`, `playerAct` e `enemyAct` devolvem **eventos**:
`round`, `turn`, `act`, `dmg`, `heal`, `dodge`, `text`, `status`, `dead`, `revive`, `spawn`.
A função `play(events)` do `rpg-ui.js` reproduz cada evento com animação, som e câmera.
Quer um novo efeito visual? Reaja a um evento em `play()`. Não precisa mexer nas regras.

### Operadores (8)
Cada um tem: passiva, ataque básico, 2 skills (com recarga/CD) e ultimate (carrega com os golpes, 100%).

| Operador | Papel |
|---|---|
| LYRA | Suporte (cura) |
| TITAN | Tanque |
| KAI | Batedor |
| VEX | Controlador |
| KIRA | Assassina |
| JAX | Duelista |
| AEON | Arquiteto (lendário) |
| ORION | Guardião (lendário) |

### Status (chips sobre as unidades)
Bons: ATK↑, DEF↑, SHD (escudo), TAUNT, REGEN, STASIS, PARRY, VANISH.
Ruins: MARK, STUN, WEAK, HIJACK. Chefes resistem a parte dos controles (`bossResist`).

### Setores e inimigos
| # | Setor | Chefe |
|---|---|---|
| 1 | Night City | — |
| 2 | The Foundry | Rustmaw Colossus |
| 3 | The Undergrid | Signal Warden |
| 4 | Zero Cathedral | Hollow Seraph |
| 5 | The Static Wastes | THE STATIC CORE (convoca Wisps) |

Dificuldade por setor (`SCALE`, multiplicadores de HP e ataque):
1.0/1.0, 1.3/1.2, 1.5/1.4, 1.5/1.35, 1.75/1.6.
Entre setores: grupo se recupera (`betweenStages`) e o jogador escolhe 1 de 3 upgrades (`rollUpgrades`).

## Interface (`rpg-ui.js`)

- **Save:** `localStorage["owl_gridbreakers_v1"]` = `{ unlocked, clears, muted }`.
- **Áudio:** tons sintetizados com Web Audio (`sfx`), sem arquivos de som.
- **Controles:** clique nos botões de skill ou teclas 1–4; Esc cancela a escolha de alvo.
  Botão SPEED alterna ×1/×2/×3 e afeta animações, câmera e golpes.

## Arena de batalha (formato em perspectiva)

Estrutura do HTML gerado em `startBattle()`:

```
.arena
 ├─ .scene.far        cenário distante (parallax fraco)
 ├─ .scene.mid        cenário médio   (parallax médio)
 ├─ .cam              câmera: tudo aqui dá zoom junto
 │   ├─ .floorwrap > .floor   chão em grade com perspectiva
 │   ├─ .side.foes    inimigos (fundo, menores)
 │   └─ .side.party   aliados (frente, maiores)
 ├─ .flash            clarão do ultimate
 └─ .banner           nome da skill
```

Cada unidade: nome e chips → barra de vida com selo de função (TAN/SUP/…/BOSS/FOE) e barra de
ultimate → arte. O personagem ativo ganha um anel no chão.

### Câmera
- `camTo(id, zoom, segundos)` move para uma unidade (ou `null` = plano geral).
  Define `--z`, `--tx`, `--ty` na arena; `.cam` usa esses valores e os cenários usam frações
  deles (0,2 e 0,45), o que cria o parallax. A translação é limitada para nunca mostrar as bordas.
- Onde é chamada, em `play()`:

| Evento | Zoom |
|---|---|
| `act` normal | 1.16 no autor |
| `act` com ultimate | 1.32 no autor (+ flash e escurecimento do resto) |
| 1º `dmg` | 1.26 no alvo (1.42 se crítico) |
| `dmg` seguintes (ataque em área) | 1.14, plano aberto |
| `heal` | 1.12 |
| `dead` | 1.3 |
| fim da ação | volta a 1.0 |

### Golpes
`strike(atacante, alvo, grande)` escolhe o efeito pelo estilo do atacante
(`FX_STYLE` no `rpg-ui.js`):

| Estilo | Quem | Efeito |
|---|---|---|
| `slash` | Kira, Kai, Jax | 2 cortes cruzados (3 se crítico/ult) |
| `impact` | Titan e chefes | anel de choque no chão + tremor |
| `beam` | Vex, Aeon | feixe do autor ao alvo |
| `holy` | Orion | pilar de luz sobre o alvo |
| `orb` | Lyra e inimigos comuns | esfera que viaja até o alvo |

Para mudar o estilo de alguém: edite `FX_STYLE`. Para criar um estilo novo: adicione um `case`
em `strike()` e o CSS `.fx.<nome>`.
Os efeitos são criados dentro de `.cam` e posicionados com `ctr()`, que usa `offsetLeft/Top`
(ignora transformações), por isso continuam alinhados com a câmera em zoom.

### Cenários
`sceneArt(i)` devolve `{ far, mid }` (strings SVG, geradas com sementes fixas, sempre iguais):
Night City (skyline com janelas e neon), Foundry (chaminés, brilho, engrenagens),
Undergrid (túnel em arcos, canos, cabos), Zero Cathedral (colunas, arcos, rosácea),
Static Wastes (sol morto, glitch, monólitos).
**Arte pintada:** retorne `<img>` (ou SVG) no mesmo formato `{ far, mid }`; o resto não muda.
O horizonte do chão fica em ~36% da altura da arena; ajuste `.scene.far/.mid { bottom }` e
`.floorwrap { height }` se os pés dos inimigos não encostarem no chão.

### Ajustes rápidos (CSS)
| Quer mudar | Onde |
|---|---|
| altura da arena | `.arena { height: clamp(...) }` |
| tamanho dos personagens | `.unit.p .u-art`, `.unit.e .u-art`, `.unit.e.boss .u-art` |
| inclinação do chão | `.floor { transform: rotateX(64deg) }` |
| velocidade da grade | `.floor { animation: gridrun 5s }` |
| distância do avanço no golpe | `.unit.lunge-up / .lunge-down` |

Acessibilidade: com `prefers-reduced-motion` a grade, o anel, o tremor e as transições da câmera são desligados.
Celular (<700px): arena vira altura automática e os personagens diminuem.
