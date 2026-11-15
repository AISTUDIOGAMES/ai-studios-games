/* =====================================================================
   OWL GRIDBREAKERS v3.1.2 — BALANCE & STABILITY LAYER
   - Aeon stat buff (was weakest hero by a wide margin).
   - Inventory cap with auto-sale of lowest items (prevents localStorage quota overflow).
   - Floater cap honoring the graphics profile (the v1.5.0 floater override bypassed it).
   - Disposes per-unit shadow geometry and boss meshes on every wave rebuild (GPU memory leak).
   Numbers live in OWL_CONFIG.balance so they can be tuned without touching code.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_BALANCE_V165__) return;
  window.__OWL_BALANCE_V165__ = true;
  const CFG = Object.assign({ invCap: 600, invTrimTo: 550, floaterCap: { high: 30, medium: 18, low: 10 } },
    (window.OWL_CONFIG && OWL_CONFIG.balance) || {});

  /* ---- Aeon: Mage / Control with the lowest survivability of the roster ---- */
  if (H.aeon && !H.aeon.__v165) {
    Object.assign(H.aeon, { hp: 490, atk: 80, def: 25, __v165: 1 });
  }

  /* Code Storm: AoE damage 0.9x -> 1.4x (extra 0.5x hit applied right after the original cast). */
  if (typeof cast === 'function' && !window.__OWL_AEON_CAST__) {
    window.__OWL_AEON_CAST__ = true;
    const previousCast = cast;
    cast = function (b, u) {
      const out = previousCast.apply(this, arguments);
      try {
        if (u && u.id === 'aeon' && !u.dead) {
          const foes = alive(b.allies.includes(u) ? b.enemies : b.allies);
          foes.forEach(e => hit(b, u, e, .5));
        }
      } catch (e) {}
      return out;
    };
    H.aeon.d = 'Hits all enemies for 1.4x damage and stuns them for 1.5s.';
  }

  /* ---- Inventory cap ---- */
  function sellValue(it) { return 15 * (it.r + 1) * (1 + (it.lv || 0)); }
  function trimInventory(protect) {
    if (!Array.isArray(S.inv) || S.inv.length <= CFG.invCap) return 0;
    const free = S.inv.filter(it => !it.eq && it !== protect)
      .sort((a, b) => (a.r - b.r) || ((a.st || 0) - (b.st || 0)) || ((a.lv || 0) - (b.lv || 0)));
    let remove = S.inv.length - CFG.invTrimTo, gold = 0, n = 0;
    const drop = new Set();
    for (const it of free) { if (remove <= 0) break; drop.add(it); gold += sellValue(it); remove--; n++; }
    if (!n) return 0;
    S.inv = S.inv.filter(it => !drop.has(it));
    S.gold += gold; S.autoSold = (S.autoSold || 0) + n;
    return n;
  }
  const previousRollItem = rollItem;
  rollItem = function () {
    const it = previousRollItem.apply(this, arguments);
    if (S.inv.length > CFG.invCap + 25) trimInventory(it);
    return it;
  };
  window.OWL_trimInventory = trimInventory;
  try { if (trimInventory(null)) save(); } catch (e) { console.warn('[OWL v3.1.2] initial trim skipped', e); }

  /* ---- Floater cap by graphics profile ---- */
  function floaterLimit() {
    try { const q = (JSON.parse(localStorage.getItem('owl_gfx_v1') || 'null') || {}).quality; return CFG.floaterCap[q] || CFG.floaterCap.high; }
    catch (e) { return CFG.floaterCap.high; }
  }
  if (typeof floater === 'function') {
    const previousFloater = floater;
    floater = function (unitView, text, color, isCritical) {
      try {
        const layer = document.querySelector('#combat-number-layer');
        if (layer && layer.childElementCount >= floaterLimit() && !isCritical && typeof text === 'number') return;
      } catch (e) {}
      return previousFloater.apply(this, arguments);
    };
  }

  /* ---- Free GPU resources of the previous wave before rebuilding ---- */
  if (typeof build === 'function') {
    const previousBuild = build;
    build = function () {
      try {
        if (typeof V !== 'undefined' && V) {
          const shared = new Set([typeof RG !== 'undefined' && RG, typeof CG !== 'undefined' && CG, typeof SG !== 'undefined' && SG, typeof BG !== 'undefined' && BG].filter(Boolean));
          for (const k in V) {
            const v = V[k];
            if (v.sh && v.sh.geometry && !shared.has(v.sh.geometry)) v.sh.geometry.dispose();
            if (v.snake && v.snake.g && v.snake.g.traverse) {
              v.snake.g.traverse(o => {
                if (o.geometry && !shared.has(o.geometry) && o.geometry.dispose) o.geometry.dispose();
                if (o.material && o.material.dispose) o.material.dispose();
              });
            }
          }
        }
      } catch (e) { console.warn('[OWL v3.1.2] dispose skipped', e); }
      return previousBuild.apply(this, arguments);
    };
  }
  console.info('[OWL v3.1.2] balance layer active (Aeon buff, inventory cap, floater cap, GPU dispose).');
})();
