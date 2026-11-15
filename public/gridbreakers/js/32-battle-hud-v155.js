/* =====================================================================
   OWL GRIDBREAKERS v1.5.5 — COMPLETE, UNIFIED BATTLE HUD
   - Brings global currency/status bars into the battle shell.
   - Restores per-unit HP/shield/name plates that had been hidden in #hudu.
   - Keeps Party Status, Party Power, enemy target, boss alerts, tactical
     controls, character skills and floating combat numbers visible in
     reserved areas without covering the playable center of the arena.
   - Does not change combat math, input, rewards, save structure or navigation.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_BATTLE_HUD_V155__) return;
  window.__OWL_BATTLE_HUD_V155__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const app = $('#app');
  const viewRoot = $('#view');
  const topResources = app && app.querySelector(':scope > .top:not(.sm)');
  const secondaryResources = $('#cur');

  function restoreGlobalResources() {
    if (!app || !viewRoot) return;
    if (topResources && topResources.parentNode !== app) app.insertBefore(topResources, viewRoot);
    if (secondaryResources && secondaryResources.parentNode !== app) app.insertBefore(secondaryResources, viewRoot);
    document.body.classList.remove('owl-battle-active');
  }

  function mountGlobalResources() {
    const shell = $('#battle-rpg-shell');
    const header = shell && $('.battle-header', shell);
    if (!shell || !header) return false;
    let strip = $('#battle-resource-strip', shell);
    if (!strip) {
      strip = document.createElement('section');
      strip.id = 'battle-resource-strip';
      strip.className = 'battle-resource-strip';
      strip.setAttribute('aria-label', 'Battle resources and status');
      shell.insertBefore(strip, header);
    }
    if (topResources && topResources.parentNode !== strip) strip.appendChild(topResources);
    if (secondaryResources && secondaryResources.parentNode !== strip) strip.appendChild(secondaryResources);
    document.body.classList.add('owl-battle-active');
    return true;
  }

  function annotateUnitPlates() {
    const host = $('#arena #hudu');
    if (!host || !B || !Array.isArray(B.allies) || !Array.isArray(B.enemies)) return;
    host.setAttribute('aria-hidden', 'false');
    const units = [...B.allies, ...B.enemies];
    Array.from(host.querySelectorAll('.ub')).forEach((plate, index) => {
      const unit = units[index];
      if (!unit) return;
      plate.dataset.unitId = unit.id || '';
      plate.dataset.team = unit.ally ? 'party' : 'enemy';
      plate.dataset.boss = unit.boss ? 'true' : 'false';
      if (unit.boss) plate.classList.add('is-boss');
      else plate.classList.remove('is-boss');
    });
  }

  function applyBattleHud() {
    if (view === 'battle') {
      mountGlobalResources();
      annotateUnitPlates();
    } else {
      restoreGlobalResources();
    }
  }

  // Build recreates #hudu and its per-unit plates at every wave transition.
  const previousBuild = build;
  build = function () {
    const result = previousBuild.apply(this, arguments);
    annotateUnitPlates();
    return result;
  };

  // draw creates/replaces the battle shell when navigating between pages.
  const previousDraw = draw;
  draw = function () {
    const result = previousDraw.apply(this, arguments);
    applyBattleHud();
    return result;
  };

  // render catches in-battle wave rebuilds and ensures the resources remain
  // mounted even if another presentation module reconstructs the shell.
  const previousRender = render;
  render = function () {
    const result = previousRender.apply(this, arguments);
    if (view === 'battle') {
      mountGlobalResources();
      annotateUnitPlates();
    }
    return result;
  };

  // Shell may already be present if the module is hot-reloaded during testing.
  try { applyBattleHud(); } catch (error) { console.warn('[OWL v1.5.5] HUD mount deferred', error); }
  console.info('[OWL v1.5.5] unified battlefield HUD enabled; only CRÍTICO is bold in damage text.');
})();
