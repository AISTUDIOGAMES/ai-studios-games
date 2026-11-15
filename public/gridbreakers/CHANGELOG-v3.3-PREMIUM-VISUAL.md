# v3.3 — Premium visual refinement (presentation only)
No combat value, balance number, skill, item, loot rule or save format was changed
(verified: the seeded combat simulation is byte-identical before/after).

## Combat numbers (js/39-combat-numbers-v167.js, css/premium-ui-v167.css)
- Separate identity: dealt (warm white-gold, rises) / received (red, slam + settle, left of the unit, portrait flash,
  edge vignette on heavy hits) / heal (soft green, right of the unit) / MISS / skill callouts / CRITICAL (gold, bigger,
  tag, pop-and-settle; extra ring for high crits).
- Size follows the hit relative to the target's max HP, not the raw number. Compact format (1.234 / 250K / 3,4M).
- Pooled DOM nodes, animationend recycling, merge of rapid multi-hits, cap per graphics profile (34 / 22 / 12),
  low-priority numbers dropped first; crits, received damage and heals are kept. Spawn area keeps clear of the menu/loot band.

## Effects (js/40-vfx-governor-v167.js)
- Root cause of the "blown-out" look: a single heal stacked ~5 effects per ally (rune + tall beam + spiral + shock +
  additive emblem + 7 additive leaves) and flashFx painted a solid 55% color wash over the whole arena.
- All effects now pass one governor: additive -> normal blending, opacity clamps per kind, slimmer beams/flares,
  per-kind and global concurrency caps scaled by the graphics profile, hard ceiling, disposal of dropped effects.
- Heal: the legacy stack is replaced by one controlled effect (ground rune ring, soft narrow column, rising cross
  particles, motes; golden-green for big heals; no additive blending, opacity <= .8).
- Healer casts (Kai / Orion) drop only the tall beams; every hero keeps its own colors and shapes.
- Screen flash is now an edge vignette (center stays readable).

## HUD (js/41-hud-guard-v167.js, css/premium-ui-v167.css)
- Layout guard sizes skill buttons and portraits from the real arena size, avoids overlap with the control column,
  compacts the menu to icons when labels do not fit, enters "tight party" mode on very short arenas,
  and exposes OWL_HUD.report() listing any slot that leaves the arena.
- Consistent button states (hover / pressed / focus-visible / disabled), touch-sized controls on coarse pointers,
  safe-area insets, legible shadows, ellipsis for long names.

## Not verified visually
This build was validated by logic tests and a real-game load only (no browser available). See the delivery notes.
