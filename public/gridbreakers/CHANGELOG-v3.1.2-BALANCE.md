# v3.1.2 — Balance & stability pass (builds on v3.1.1 bug fixes)

All numbers were calibrated with a headless harness that runs the real game code
(`owl_test_harness/`). Tunables live in `js/00-config-v147.js` (`gear.stageExp`,
`difficulty.late`, `soul.*`) and `OWL_CONFIG.balance` (inventory/floater caps).

## Combat
- Gear stage scaling was linear (25.8x at stage 100), which made matched gear win 100% of every stage
  even with level-1 heroes. Now `(1+0.25*(stage-1))^0.5` (`OWL_CONFIG.gear.stageExp = 0.5`).
- Enemy pressure `x(1 + 6*(stage-1)/99)` HP/ATK (`difficulty.late`), so stage 100 is ~7x stronger than before the curve.
- The 5v5 filler enemies (10-formation) used a separate hard-coded curve, up to ~5.9x HP / 4.4x ATK of the
  main enemies at stage 100. They now use the single campaign curve (`window.OWL_DIFFICULTY`).
- Aeon: HP 330->490, ATK 60->80, DEF 15->25, Code Storm 0.9x -> 1.4x AoE damage.

## Economy
- Soul on repeated stage clears: 5 / 25 (boss) -> 0 / 1. First clears unchanged (25 / 150).
- Dungeon completion Soul: relic 120+2s -> 20+s/4, forge 35+s -> 8+s/10, gold 45+s/2 -> 5+s/20; relic base +10 -> +3.
- Tower: 15 Soul/floor -> 5 (15 every 5th floor); shards 5+floor -> 3+floor/4.
- Enhance gold cost now scales with the item's origin stage (x(1+stage/20)): a real gold sink.
- Burn gold table reduced to match sell values (Ancestral burn was 20000 vs 120 sell).

## Stability / performance
- Inventory cap 600 (auto-sells lowest rarity/stage unequipped items, never equipped ones). Prevents localStorage overflow.
- Equip Best only evaluates the top candidates per slot (was O(heroes x items x inventory); ~3 s at 6000 items).
- Floater cap honors graphics profile again.
- Per-unit shadow geometry and boss meshes are disposed on every wave rebuild (GPU memory leak). **Test in a browser.**

## Compatibility
- Save format unchanged. Existing items lose some stat value (new scale) while enemies were retuned together;
  heroes of existing saves may find late stages harder until they re-gear.
- Saves above the inventory cap are trimmed once at load.
