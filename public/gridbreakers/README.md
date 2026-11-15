# OWL: GRIDBREAKERS v3.1 — Battlefield Reference Restoration

O campo de batalha foi restaurado visualmente a partir do `index.html` de referência. Menus, equipamentos, Sets, progressão, combate atual e saves foram preservados. Consulte `CHANGELOG-v3.1-BATTLEFIELD-RESTORE.md`.

---

## v1.6.1 — Equipment shimmer boundary fix

The moving rarity highlight on Epic, Mythic, Divine and Ancestral equipment now animates the gradient inside a fixed pseudo-element instead of translating the pseudo-element beyond the equipment tile. The sweep is rounded to the tile's corners and remains within the equipment face even when +10 fire particles require `overflow: visible`. The external fire particles are unchanged. No gameplay values, rarity rates, equipment IDs, inventory, enhancement levels or save data were changed. Asset query strings were bumped to prevent stale cached styles/scripts.

## v1.6.0 — Equipment Sets & Catalog

The Bag now presents the three equipment collections in a fixed order: **Obsidian**, **Lunar** and **Thread**. Each collection has six named base pieces (Weapon, Helmet, Armor, Gloves, Boots and Relic), and every piece can drop in one of eight rarities: Common, Uncommon, Rare, Epic, Legendary, Mythic, Divine or Ancestral. The inventory defaults to Set order and keeps the individual Set filter.

Set bonuses are now distinct and derived from currently equipped pieces; only the highest reached threshold for each Set is active:

| Set | 2 pieces | 4 pieces | 6 pieces |
|---|---|---|---|
| Obsidian | +8% DEF | +14% DEF, +7% ATK | +24% DEF, +14% ATK |
| Lunar | +8% HP | +14% HP, +6% DEF | +24% HP, +12% DEF |
| Thread | +2% CRIT | +5% CRIT, +8% SPD | +8% CRIT, +16% SPD, +10% ATK |

Thread CRIT bonuses remain subject to the existing 30% absolute CRIT cap. The gear-drop table now follows the rarity ladder (each higher tier has a lower chance); the existing campaign-band percentages were retained and the Legendary/Mythic columns were corrected. This update does not change the `awo_save_v1` key or stored item IDs, equipped slots, rarity indices, item-roll structure, enhancement levels or existing campaign progress. No reset or save migration is required. The full names, slot stats, Set bonuses, color ladder and drop percentages are documented in [EQUIPMENT_CATALOG_v1.6.0.md](EQUIPMENT_CATALOG_v1.6.0.md).

## v1.5.12 — Equipment enchantment visuals

- Removed the inner enchantment ring from equipment art at +5 and above.
- Preserved the outer rarity border and the existing rarity glow.
- Added subtle animated fire embers at +10 only, across equipment slots, inventory, comparisons and item details.
- Visual-only change: no combat values, costs, rarity rules or save data were changed.


> **Build v1.5.10:** Tela cheia para Desktop e presets de renderização 1080p/720p/480p em Configurações.

> **Build v1.5.9:** Reset Campanha em Configurações, Dungeons contínuas cronometradas de 10 minutos com boss final e loot de conclusão, limpeza dos inimigos após 1s e Ancient Tower adaptativa ao nível/PODER da Party.

# OWL GRIDBREAKERS

Idle auto-battler com gacha (Three.js). Versão reorganizada em pastas, pronta para rodar localmente.

## Como rodar (Windows)

**Opção 1 — duplo clique:** `Iniciar-Jogo.bat`

**Opção 2 — PowerShell** (dentro desta pasta):

```powershell
.\Iniciar-Jogo.ps1              # abre http://localhost:8080/
.\Iniciar-Jogo.ps1 -DebugMode   # abre com ?debug (+1.000.000 soul para testar o gacha)
.\Iniciar-Jogo.ps1 -Port 9000   # outra porta
.\Iniciar-Jogo.ps1 -NoBrowser   # não abre o navegador
```

Se o PowerShell bloquear o script:
`powershell -ExecutionPolicy Bypass -File .\Iniciar-Jogo.ps1`

Parar: `Ctrl+C`. Na 1ª execução o script baixa o `three.min.js` para `vendor/` (precisa de internet uma vez; sem ele o jogo usa a CDN).

> Não abra o `index.html` com duplo clique (file://): o navegador bloqueia texturas WebGL e áudios. Use o servidor.



## Tela cheia e resolução Desktop — v1.5.10

Em Configurações, ao escolher Desktop (ou Auto em uma janela com largura de desktop), aparece a seção **Tela · Desktop**. **Ativar tela cheia** usa a Fullscreen API do navegador e mantém a navegação inferior dentro da área de jogo; pressione `Esc` ou desmarque a opção para sair. As opções **1080p**, **720p** e **480p** definem o limite de altura do buffer interno WebGL: 1080p prioriza nitidez, 720p equilibra nitidez/desempenho e 480p reduz o uso da GPU. A aplicação web não altera a resolução física do monitor/Windows por restrições de segurança do navegador. A resolução selecionada fica salva em `owl_gfx_v1`; o estado de tela cheia é controlado pelo navegador e não é forçado novamente após reiniciar a página. No modo Mobile, os controles Desktop ficam ocultos.

## Dungeons contínuas e Ancient Tower adaptativa — v1.5.9

As Dungeons Gold, Forge e Relic são expedições contínuas com limite de 10 minutos por tentativa. As ondas intermediárias não concedem loot; o chefe final aparece aos 8 minutos e precisa ser derrotado antes do tempo acabar para liberar o pacote volumoso de recompensas do tipo de Dungeon. Morrer com toda a Party ou deixar o tempo expirar encerra a tentativa sem recompensas de conclusão. Os monstros começam mais fortes e escalam por estágio, onda e nível/PODER equipado da formação.

A Ancient Tower adapta os atributos dos inimigos à média de nível, ao POWER total somado da Party (incluindo equipamentos) e ao tamanho da formação ativa, com uma curva suavizada para evitar que o crescimento dos inimigos acompanhe cada ponto de poder de forma linear. A regra de sobrevivência sem cura/revive entre andares continua valendo. Depois da vitória final, os modelos dos inimigos desaparecem da arena após um segundo; isso não remove inimigos entre ondas intermediárias.

**Reset Campanha** fica no final do painel ⚙ Configurações. A ação pede confirmação e, ao cancelar, mantém Configurações aberta. Ao confirmar, reinicia a campanha no Stage 1, mas conserva preferências de interface, áudio e combate automático. Exporte o save antes do reset caso queira manter uma cópia do progresso anterior.

## Atualização visual RPG — interface e efeitos

A interface de batalha organiza grupo, poder, alvo/chefe, comandos, habilidades, avisos e recursos globais em painéis uniformes ao redor da arena 3D. Na v1.5.7, Party aparece como uma coluna de retratos à esquerda, Tactical Controls usa botões de ícone discretamente translúcidos e Character Skills fica centralizado na base da arena. Os contêineres translúcidos foram removidos; barras curtas de vida permanecem apenas nos retratos da Party/alvo. Placas de HP sobre a cabeça das unidades continuam ocultas. Os números de dano usam peso regular e somente a etiqueta CRÍTICO aparece em negrito. Menus, cartões, botões e navegação receberam contraste maior, estados selecionados claros e acabamento de painéis de RPG.

Os VFX foram suavizados com menor exposição, luzes e partículas mais contidas, menos composição aditiva e flashes de tela reduzidos. A direção usa apenas uma referência geral de RPG de ação; arte, layout e identidade visual são originais.

A alteração é de apresentação: não modifica o balanceamento, a campanha, o sistema de combate, o gacha nem a chave de save `awo_save_v1`. Para aplicar, substitua os arquivos pelo pacote atualizado e mantenha o mesmo navegador/endereço local. Os arquivos alterados recebem nomes versionados para evitar cache antigo; use `Ctrl+F5` após iniciar o servidor atualizado.

## Modo Desktop / Mobile — v1.4.1

Abra o botão ⚙ **Configurações** e escolha **Auto**, **Desktop** ou **Mobile** em “Modo de interface”. Auto acompanha o tamanho da janela; Desktop prioriza a apresentação ampla com painéis laterais; Mobile usa conteúdo empilhado, botões compactos e navegação adaptada. A escolha fica salva em `owl_gfx_v1`, separada do progresso da campanha (`awo_save_v1`).


## Resultados de batalha compactos — v1.4.4

Vitórias comuns da campanha não exibem mais banners, relatórios ou contagens regressivas repetitivas; recompensas, progresso e avanço automático continuam funcionando. O relatório completo fica reservado à vitória contra o chefe final da onda 33 (e ao chefe de Raid). Nessas vitórias, somente o relatório permanece visível fora da arena. Relatórios de derrota e botões de recuperação continuam disponíveis. O mini-chefe não gera relatório de vitória.

## Áudio — v1.4.5

Abra ⚙ **Configurações** para controlar a música ambiente, o volume da música, os efeitos sonoros, o volume dos efeitos e o teste de áudio. Os botões flutuantes de música/mixer e o botão de som da lateral da batalha foram removidos. Música e efeitos sonoros podem ser ativados separadamente; os volumes são salvos automaticamente.


## Character Summoner — v1.5.2

A compact **Character Summoner** is available at the top of Characters. It reuses the existing Soul Crystal summon actions and displays the current per-pull rarity rates and pity counters. Duplicate Gacha results grant one saved Echo of the rarity rolled. Collect 8 Echoes of the same rarity to invoke a guaranteed hero of the next active rarity, selected at random. The 8:1 ritual spends Echoes only; it does not consume heroes, equipment, Soul Crystals or Star upgrades.

The current active progression is Common → Uncommon → Rare → Mythic → Divine → Ancestral. Legendary has a reserved 0% rate and is folded into Mythic by the current Gacha design. Divine summons are restricted to Orion, and Ancestral summons to Aeon. Existing rarity chances remain 52.2% / 28% / 15% / 3.5% / 1% / 0.3%, with the configured 90-pull Divine and 200-pull Ancestral guarantees. Echo balances start accumulating from the new version; past pulls are not retroactively converted.

## Estrutura

```
index.html            página (só marcação + <script> em ordem)
css/                  estilos
js/00-config.js       TODO o balanceamento (gacha, soul, dificuldade) + utilitários de save
js/01..21-*.js        código do jogo (mesma ordem de carregamento do HTML original)
js/22-performance-v145.js  configurações gráficas, Auto / Desktop / Mobile, áudio, tela cheia e renderização Desktop 1080p / 720p / 480p
js/23-33-wave-campaign.js campanha v1.3: 33 ondas, mini-chefe, chefe, XP/ouro por onda e checkpoints
js/99-boot.js         botão 💾 (exportar/importar save)
assets/img/           retratos, sprites, mapas
assets/audio/         sfx, ultimates, músicas, gacha, soundtrack
assets/concept-art/   referência (não usada pelo jogo)
vendor/               three.min.js (baixado automaticamente)
tools/difficulty-sim/ simulador de dificuldade (Node.js)
```

## Campanha v1.3 — 33 ondas por estágio

Cada estágio tem 31 ondas normais, mini-chefe na onda 32 e chefe final na onda 33. XP e ouro são concedidos por encontro: ondas normais `3x estágio` XP e `5x estágio` ouro; mini-chefe `6x` XP e `15x` ouro; chefe `12x` XP e `25x` ouro. Total: `111x estágio` XP e `195x estágio` ouro.

Checkpoints: onda 10 (10% HP), onda 22 (15% HP) e após o mini-chefe na onda 32 (15% HP). Heróis derrotados podem voltar com 25% HP nesses checkpoints. O mini-chefe garante equipamento Uncommon ou superior; o chefe final garante equipamento, com piso de raridade maior para chefes regionais.

O save continua em `awo_save_v1`; a migração v1.3 é aditiva e não apaga progresso existente.

## Ajustar o balanceamento

Edite `js/00-config.js` (taxas do gacha, pity, soul por vitória, curva de dificuldade, bônus de raridade) e recarregue a página (Ctrl+F5).

Simular a dificuldade (precisa do Node.js):

```powershell
node tools\difficulty-sim\sim.js 1.6 14
```
(`1.6` = multiplicador de equipamento; mostra o menor nível dos heróis para vencer cada fase)

## Save

Fica no `localStorage` do navegador (por endereço/porta — **use sempre a mesma porta**, senão o save "some"). Botão 💾 no canto: exporta/importa um `.json`. Há backup automático a cada 5 min.

## Atualização para v1.3
Antes de atualizar, exporte seu save pelo botão 💾. A v1.3 mantém a chave `awo_save_v1` e faz uma migração aditiva; use o mesmo navegador e a mesma porta para continuar com o save existente. Consulte `MIGRATION-v1.3.md` para o procedimento de backup e rollback.


## v1.4.5 — Audio settings
- Música ambiente e volume de música/efeitos reunidos em Configurações.
- Removidos os botões flutuantes de música e mixer da tela de batalha.
- O botão de áudio da lateral da arena foi retirado; áudio é controlado no painel Configurações.
- Música e efeitos sonoros agora podem ser ativados/desativados separadamente.


## Indicador visual de personagem — v1.4.6

Removido o pequeno decalque rúnico interno que girava e pulsava sob cada unidade na arena. Permanecem a aura externa maior dos aliados e a sombra suave no chão. O sinal de ultimate pronta continua nos botões externos de habilidade e nos pequenos motes dourados, sem reintroduzir o marcador removido. Não há alteração no combate, seleção, dano, progressão ou save.


## v1.4.9 UI updates
- New Menus hub for configuration, AFK rewards and report access.
- Save/export/import tools are inside Configurações.
- Party Status is placed above the battlefield without covering the 3D scene.
- Tactical Controls use refined RPG buttons; Character skills moved to the battle side column.

### v1.5.0 visual/combat feedback
The lower navigation displays **Controle** (the internal `menus` route remains for backward compatibility). Battle and Characters show the summed active-party POWER using the same character formula as equipment comparisons. Combat damage values are displayed in an independent overlay; enemy damage and party damage received use different colors. The legacy `#hudu` layer remains hidden so health bars do not return over characters.

## v1.5.1 — Aba Controle
A aba **Controle** possui rota e manipulador de clique próprios para abrir os cartões de Configurações, Recompensas AFK e Relatórios. O ícone ☰ identifica a central Controle; o ícone ⚙ permanece reservado para Configurações e para o título do painel de ajustes.


## v1.5.4 — remoção da aba Controle
- Removed the buggy Controle hub from the bottom navigation and disabled its legacy route.
- Kept the permanent ⚙ Config entry, the original Battle/Characters/Bag/Map/Forge/Summon/Realm tabs, and the Relatórios archive.
- Removed the Control-only route and stylesheet from the package.
- Removed an accidental automated browser test snippet that clicked Config and Controle during normal startup.
- No changes to campaign saves, party power, Summoner, battle damage, reports, equipment, or rewards.


## HUD de batalha unificado — v1.5.5

Todos os indicadores de combate ficam acessíveis na tela Battle: recursos globais no cabeçalho da batalha; PARTY STATUS e PARTY POWER acima da arena; vida/escudo e nome compactos sobre aliados e inimigos; alvo/chefe e alertas; controles táticos e habilidades na lateral; números de dano, cura e MISS em camada própria. O painel central 3D não recebe painéis clicáveis, preservando a área de jogo. Valores de dano e cura usam fonte regular; somente a palavra **CRÍTICO** é negrito. O ajuste é visual e não altera dano, IA, recompensas ou save.

## v1.5.6 — HUD dentro do campo de batalha
A interface de combate foi integrada às bordas internas da própria arena. Recursos, contexto, Party Status/Power, alvo/chefe, Tactical Controls e Character Skills não ficam mais em barras externas. As placas flutuantes de nome/HP sobre a cabeça dos personagens e monstros permanecem desativadas; a vida continua visível nos cartões da Party e no painel do alvo.


### v1.5.8
- Recursos de loot agrupados no topo esquerdo da arena.
- Ancient Tower endless: avança após cada vitória e termina apenas quando toda a Party cai, sem cura/revive entre pisos.
- Personagens bloqueados sem animações; animação Ancestral restaurada nos equipamentos.
- Crítico balanceado com retornos decrescentes para equipamentos e limite total de 30%.

## v1.5.11 visual consistency

Mythic is consistently red on characters and equipment, Rare uses a deeper blue distinct from Ancestral cyan, high-tier equipment has no inner rarity rings, and the temporary shield aura no longer draws a floating torus ring above characters.


## v1.5.13 — Obsidian Core art

The approved Ancestral Obsidian Core relic sprite is stored at `assets/img/equipment/obsidian_core_ancestral.png`. It is used for Ancestral items where `set === 'Obsidian'` and `slot === 'relic'`; all other equipment continues to use its existing generated icon.
