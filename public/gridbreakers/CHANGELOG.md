# v1.6.1 — Equipment Shimmer Boundary Fix

- Replaced the translated moving sheen element on equipment with a background-gradient sweep that remains within the equipment tile.
- Applied the fix to Epic, Mythic, Divine and Ancestral rarity highlights.
- Kept +10 fire particles and their intentional overflow behavior unchanged.
- No gameplay balance, item IDs, inventory records, enhancement levels or save data changed.

# v1.6.0 — Equipment Sets & Catalog

- Added an ordered Equipment Sets codex to the Bag: Obsidian, Lunar and Thread, each with six named slots and the complete eight-tier rarity ladder.
- Renamed the 18 base equipment pieces for clearer identities while preserving the Obsidian Core Ancestral artwork and item/set/slot IDs.
- Replaced the shared set multiplier with distinct 2/4/6-piece bonuses: Obsidian specializes in DEF/ATK, Lunar in HP/DEF, and Thread in CRIT/SPD/ATK.
- Added Set-first inventory ordering and direct Set filters.
- Preserved the save key, equipment IDs, inventory, enhancement levels, equipped heroes, rarity indices and item-generation rules. Corrected the Legendary/Mythic drop-rate column order while keeping each campaign band total at 100%.

# v1.5.13 — Obsidian Core Ancestral Equipment Art

- Added the approved 2.5D cyan/gold/violet Obsidian Core sprite to the equipment art folder.
- Inventory cards, character equipment slots, equipment detail, and comparison views now show the sprite for Ancestral Obsidian Relics.
- The custom art is restricted to the Obsidian set + Relic slot + Ancestral rarity; other sets, slots, and rarities keep their existing generated icons.
- Preserved rarity frame, enhancement level display, and +10 fire-particle overlay.
- No equipment stats, loot rates, item IDs, or save schema changed.

# v1.5.12 — Equipment enchantment visuals
- Removed the inner ring from equipment artwork at +5 and above.
- Added fire ember particles at +10 only.
- Preserved outer rarity borders and all gameplay/save values.


## v1.5.10 — tela cheia e resolução Desktop
- Adicionada opção de tela cheia nas Configurações para Desktop, com saída por `Esc` ou pelo próprio controle.
- Adicionadas opções 1080p, 720p e 480p para limitar a resolução interna de renderização WebGL.
- O preset é persistido separadamente do save da campanha e recalculado ao redimensionar ou entrar/sair de tela cheia.
- A seção de tela Desktop fica oculta no modo Mobile; Auto mostra as opções quando a janela tem largura de Desktop.
- A aplicação web não altera a resolução física do monitor/Windows, limitação de segurança dos navegadores.

## v1.5.7 — HUD minimalista dentro da arena
- Removed the HOSTILE label; regular enemy groups use the shorter **FOES** indicator, while bosses retain **BOSS**.
- Changed Party Status into a slim vertical portrait rail on the left, with compact health bars and the live Party Power readout; removed translucent roster/card backgrounds and visible name clutter.
- Tactical Controls are now icon-only buttons on the left. Their individual buttons use a restrained translucent fill and strong enough borders/contrast to remain readable and clickable; accessible names and hover titles describe each action/state.
- Centered Character Skills along the bottom edge. Removed their outer panel, heading and backing boxes; only the character ability icons, cooldown overlays and readiness rings remain.
- Removed translucent plates from the resource strip, battle header, target readout, Party wrapper and tactical/skills containers. Kept result reporting readable when a battle ends.
- Kept overhead HP/name plates hidden, damage numbers visible, combat logic, saves, rewards and navigation unchanged. Added a dedicated CSS/JS version reference to avoid stale cache.

## v1.5.2 — Summoner de personagens e fusão 8:1
- Added a **Character Summoner** panel to the Characters page, retaining the existing Soul Crystal single and five-pull actions.
- Each duplicate Gacha result now grants one saved Echo of the rarity actually rolled; 8 Echoes of one active rarity guarantee one random hero at the next active rarity.
- Fusion consumes only the 8 Echoes: it does not consume owned heroes, equipment, Soul Crystals or existing Star upgrades. Duplicate fusion results continue to grant a Star (or +20 shards at the Star cap).
- Preserved current rarity probabilities (52.2% Common, 28% Uncommon, 15% Rare, 3.5% Mythic, 1% Divine, 0.3% Ancestral) and current 90/200-pull pity guarantees; the reserved Legendary rate remains 0% and is folded into Mythic.
- Kept the active rarity ladder consistent with the roster: Common → Uncommon → Rare → Mythic → Divine → Ancestral. Orion remains the only Divine hero and Aeon the only Ancestral hero.
- Added save migration fields for Echo balances and processing cursor; prior Gacha pulls are not counted retroactively.

# OWL GRIDBREAKERS — Changelog

## v1.5.9 — Dungeons contínuas, dificuldade adaptativa e Reset em Configurações
- Moved **Reset Campanha** into the scrollable Configurações panel; removed its Campaign Map entry. Confirmation now appears above Settings, Cancel keeps the player in Settings, and Confirm starts a fresh Stage 1 campaign.
- Reset clears campaign progression, heroes, equipment, inventory, currencies and summon pity/history while preserving display, audio and automatic-combat preferences. Updated the starter-roster copy to match the actual fresh save (Lyra, Jax, Kira and Kai).
- Gold, Forge and Relic Dungeons now run continuously for up to **10 minutes**. Intermediate victories only advance the expedition; no currency, XP or gear is granted until the final boss is defeated.
- A dungeon final boss appears at 08:00, leaving two minutes for the boss encounter. Enemies have a stronger baseline and scale with stage, wave and party level/equipment-aware POWER. Timeout or a full party wipe ends the run with no completion rewards.
- Dungeon completion grants a substantial reward bundle appropriate to its type: Gold/XP/Soul/diamonds, Forge materials and multiple gear drops, or Relics/Soul/diamonds and gear.
- Defeated enemy visuals and nameplates are removed one second after the final battle victory; intermediate dungeon waves are not cleaned up.
- Ancient Tower difficulty adapts to active party average level, summed equipment-aware team POWER and active roster size using soft scaling, in addition to floor-based growth. Tower attrition behavior from v1.5.8 remains intact.
- Save key `awo_save_v1` and existing save migration remain compatible; reset is explicit and confirmation-protected.



## v1.5.3 — Settings navigation repair
- Restored a dedicated **Config** entry with the original gear icon in the persistent bottom navigation.
- The Config button opens the existing settings dialog directly; the Control hub card uses the same entry point.
- Settings dialog opening is idempotent, preventing duplicate overlays.
- Rebuilds the navigation once after add-on scripts load so Config is visible on the initial screen.
- Preserves existing campaign save, control hub, reports, audio, graphics and device-layout settings.

## v1.4.7 — correção do contorno na aba Characters
- Removed the smaller rarity frame and its pulse from the inner character portrait in Characters.
- Kept rarity color, glow and selected-state styling on the larger outer character card only.
- Kept portrait drop-shadow for character readability; no changes to the battle marker or combat aura.
- Versioned the changed script references to avoid stale browser cache.

## v1.4.4 — relatórios em menu e remoção das notificações de vitória
- Added a dedicated **Relatório** navigation menu with a compact archive of boss victories and defeat reports.
- Moved report data out of the battle screen; the main page no longer displays the report panel.
- Removed all visual victory banners, victory copy, post-win action rows and success countdown notices from the battle screen, including boss/raid clears.
- Kept defeat recovery controls (retry and campaign map) while moving the defeat report into the report archive.
- Stored the report history independently in `awo_battle_report_history_v1`, without changing campaign saves or reward/progression logic.
- Kept ordinary campaign victories silent and without reports; boss victories and defeats remain available in the archive.

# OWL GRIDBREAKERS — Changelog

## v1.4.3 — resultados compactos e relatório apenas para chefes
- Versioned the updated JavaScript/CSS asset filenames to avoid stale browser caches after replacement.
- Removed repeated victory banners, reports and countdown messages after ordinary campaign clears; rewards and auto-continue logic are unchanged.
- Reserved the full battle report for the final boss of wave 33 (and the raid boss). Mini-boss and routine encounters do not produce victory reports.
- Boss victories show the report alone, outside the arena; defeat reports and retry/map recovery controls remain available.
- Kept side-activity reward notices while suppressing unnecessary performance reports for non-boss wins.
- Tightened spacing below the battlefield and preserved the existing save keys.

## v1.4.2 — correção de carregamento das configurações
- Renamed the performance/settings script and stylesheet so browsers cannot reuse the previous cached assets.
- Made the Desktop / Mobile / Auto selector the first and most prominent section of Configurações.
- Added the build version to the settings panel and local server startup output for easy verification.
- Kept the saved mode in `owl_gfx_v1`, independently from campaign progress.


## v1.4.1 — desktop/mobile display setting
- Added Auto, Desktop and Mobile interface modes in the existing Settings (gear) panel.
- Saved the selected interface mode in `owl_gfx_v1`, independently from campaign progress.
- Added compact mobile navigation and a wider desktop layout, with a fallback for narrow screens.
- Localized the settings panel to Portuguese and improved focus/selected states.

## v1.4.0 — RPG interface + restrained VFX
- Added an original RPG-style presentation layer with a wide desktop layout and responsive panels.
- Moved party status, target health, tactical controls, skill buttons, boss telegraphs and victory/defeat summaries outside the 3D battlefield.
- Hid in-world projected health bars and floating combat text while preserving the combat model and action handlers.
- Increased menu/button contrast, selected states, panel hierarchy and navigation visibility.
- Reduced renderer exposure, scene lighting, additive sprite effects, particle density and full-screen flash intensity.
- Preserved the `awo_save_v1` save key and all existing game systems.

## v1.3.0 — 33-wave campaign (prepared)
- Campaign stages now contain 31 normal waves, a mini-boss at wave 32, and a stage boss at wave 33.
- Added per-wave XP/gold, mini-boss and wave-22 chest rewards, and guaranteed stage-boss equipment.
- Added checkpoint healing/revival and within-stage difficulty ramp.
- Reduced campaign stage-scaling coefficients.
- Save key `awo_save_v1` is unchanged; migration is additive.

# Changelog

## 1.2.0 — desempenho e correções (sem mudar layout, tamanho de tela ou balanceamento)
- **Novo `js/22-performance.js` + `css/performance.css`:** botão ⚙ (canto inferior esquerdo, acima do 💾) com perfil gráfico HIGH/MEDIUM/LOW, limite de FPS (Auto/30/45/60) e contador de FPS. Padrão = comportamento anterior (HIGH, FPS livre, contador oculto). Salvo em `owl_gfx_v1`, separado do save do jogo.
  - LOW: resolução interna 1x, luzes pontuais e sombras desligadas, menos partículas/números flutuantes, sem o desfoque de tela cheia (`.tilt`). MEDIUM: resolução até 1,5x e partículas reduzidas.
- **Simulação com tempo real (delta time):** o combate rodava em passos fixos a cada 100 ms de timer (ficava lento sob carga e rodava 1,4 s a cada 1,5 s com a aba oculta). Agora usa acumulador por tempo real, pausa com a aba oculta e salva ao ocultar/sair.
- **Pool de partículas:** faíscas e motes reutilizam sprites (antes criavam/destruíam um material por partícula).
- **Bug corrigido:** `ReferenceError: hero is not defined` em `16-visual-polish.js` (a função `hero()` ficava presa dentro do bloco do arquivo 02). Isso abortava o restante do arquivo 16 (emblemas por herói nas skills e halos de escudo nunca rodavam). Agora `hero` é exposto em `02-obsidian-age-3d-map-vfx.js`.
- **Backups de save:** antes do reset único `awo_fresh_campaign_20261110_v1` (`awo_save_v1_before_fresh_reset`) e antes da migração `partyGrowthVersion` (`awo_save_v1_bak_partygrowth`).
- `vendor/three.min.js` (r128) incluído: o jogo funciona offline.

## 1.1.0 — reorganização + correções
- HTML único de 13 MB dividido em `index.html` + `css/` + `js/` (21 arquivos) + `assets/` (75 arquivos). Ordem de carregamento idêntica à original.
- Imagens e áudios embutidos em base64 viraram arquivos. Código ficou com ~440 KB.
- Servidor local em PowerShell (`Iniciar-Jogo.ps1`) com suporte a Range (áudio) e porta automática.
- **Gacha:** Divine/Orion 0,005% -> 1%; Ancestral/Aeon 0,001% -> 0,3%; pity 20.000/100.000 -> 90/200 puxadas. Mythic 0,5% -> 3,5%.
- **Raridade dos heróis:** bônus de status 1,04/1,08/1,13 -> 1,05/1,10/1,18 (Divine 1,28; Ancestral 1,38).
- **Soul:** 1ª vitória da fase +25 (chefe +150); repetição +5 (chefe +25). Antes: 3 por vitória.
- **Dificuldade:** curva de HP/ATK/DEF suavizada (ver `00-config.js`). Antes a fase 60+ era impossível mesmo no nível 60 sem itens.
- **Save:** mesclagem profunda (campos novos não somem), backup automático, aviso se o armazenamento falhar, exportar/importar.
- Concessão de 1.000.000 de soul só com `?debug`.


## v1.4.5 — Audio settings consolidation
- Moved music toggle and music/SFX volume sliders into the global Config panel.
- Removed the floating Music ON/OFF control and battle-side mixer button.
- Removed the battle HUD sound toggle; audio controls are managed from Config.
- Separated the background music preference from the SFX enable switch.
- Gacha roll/reveal audio now respects the SFX toggle and effects volume.


## v1.4.6 — visual cleanup: character selection marker
- Removed the smaller rotating/pulsing rune decal directly beneath combat units.
- Retained the larger ally aura and soft ground shadow; ultimate-ready feedback remains in the external skill UI and readiness motes.
- No changes to combat logic, targeting, damage, progression, or campaign save data.
- Renamed the core script to `js/01-core-v146.js` and updated `index.html` to avoid stale browser cache.

## v1.4.9 — Menus hub + battle layout
- Added a dedicated Menus tab for Configurações, AFK rewards and Relatórios access.
- Kept manual save, export and import actions inside Configurações; retired floating shortcuts.
- Moved Character skills into the Tactical Controls side column.
- Repositioned Party Status to a compact strip above the battlefield on the upper-left, outside the 3D canvas.
- Refined Tactical Controls button materials, contrast and active states; removed gift/AFK shortcuts from the tactical panel.

## v1.5.0 — Party Power, combat damage feedback and Control hub label
- Renamed the visible Menus tab and hub heading to **Controle** while preserving the internal route for compatibility.
- Added aggregate **Party Power** to Battle and Characters, calculated from the existing live character POWER formula (gear, level, ascension, stars, sets and synergies).
- Refreshes the party total immediately after save-backed stat or equipment changes.
- Restored visible floating combat feedback in a dedicated arena overlay, separate from the intentionally hidden legacy HUD layer.
- Damage numbers now show damage dealt to enemies and damage received by party members; critical hits are larger and color-coded. Healing/MISS feedback is also visible.
- No combat damage formula, progression, reward, or save schema changes.

## v1.5.1 — Controle hub navigation fix
- Replaced the legacy Menus tab route with a dedicated Controle button and explicit click handler.
- Restored the menu glyph for Controle and reserved the gear icon for Configurações.
- Ensured Controle opens cards for Configurações, Recompensas AFK and Relatórios.
- Kept save/export/import actions inside Configurações.


## v1.5.4 — remoção da aba Controle
- Removed the Controle hub and its navigation destination because it was unreliable.
- Kept the dedicated Config gear button in the bottom navigation.
- Preserved Battle, Characters, Bag, Map, Forge, Summon, Realm and Reports destinations.
- Removed the production-page test harness that automatically clicked Config and Controle during launch.
- No changes to campaign save data or game systems.


## v1.5.5 — HUD de batalha completo
- Recursos globais movidos para a moldura do campo de batalha.
- Placas compactas de nome, HP e escudo de cada unidade restauradas na arena.
- Party Status/Power, alvo e chefe, alertas, controles táticos, habilidades e feedback de combate mantidos em posições reservadas.
- Números de dano e cura em peso regular; somente a etiqueta CRÍTICO em negrito.
- Sem alterações no save, combate, recompensas ou progressão.

## v1.5.6 — HUD integral dentro da arena
- Todos os painéis e controles específicos da batalha ficam dentro das bordas do campo 3D.
- Recursos e contexto de fase no topo interno; Party Status no alto à esquerda; comandos e skills nos cantos inferiores internos.
- A barra de HP/nome sobre a cabeça de cada personagem e monstro foi removida permanentemente.
- Vida e escudo continuam disponíveis nos cartões compactos de Party Status e no painel do alvo/chefe.
- Centro da arena preservado para movimento e leitura do combate; suporte Desktop/Mobile.

## v1.5.8
- Agrupamento de Diamantes, Soul, Ouro, Relics, Keys e Forge no canto superior esquerdo da arena.
- Ancient Tower agora é uma escalada contínua até a derrota completa da Party, preservando recursos vitais entre andares e escalando a dificuldade acima do piso 96.
- Personagens bloqueados sem animação de raridade até serem recrutados.
- Animação de equipamentos Ancestral restaurada.
- Balanceamento de crítico: base de herói reduzida em 20%, bônus de equipamento com retornos decrescentes (+10 pp máximo) e teto total de 30%.
