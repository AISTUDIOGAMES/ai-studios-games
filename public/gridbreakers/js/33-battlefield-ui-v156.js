/* =====================================================================
   OWL GRIDBREAKERS v1.5.6 — IN-ARENA BATTLE HUD
   All battle-specific information and controls live INSIDE #arena.
   Character-overhead HP/name plates stay disabled; Party cards retain HP.
   No combat rules, rewards, saves or navigation actions are changed.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_BATTLEFIELD_UI_V156__) return;
  window.__OWL_BATTLEFIELD_UI_V156__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let lastSync = 0;

  function ensureZones(arena) {
    let overlay = $('#battlefield-hud', arena);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'battlefield-hud';
      overlay.setAttribute('aria-label', 'Battle HUD');
      overlay.innerHTML = `
        <div class="bf-slot bf-resources-slot" id="bf-resources-slot"></div>
        <div class="bf-slot bf-header-slot" id="bf-header-slot"></div>
        <div class="bf-slot bf-party-slot" id="bf-party-slot"></div>
        <div class="bf-slot bf-controls-slot" id="bf-controls-slot"></div>
        <div class="bf-slot bf-skills-slot" id="bf-skills-slot"></div>
        <div class="bf-slot bf-result-slot" id="bf-result-slot"></div>`;
      arena.appendChild(overlay);
    }
    return overlay;
  }

  function moveTo(node, slot) {
    if (node && slot && node.parentNode !== slot) slot.appendChild(node);
  }

  function syncBattlefieldUI(force) {
    if (view !== 'battle') return;
    const now = performance.now();
    if (!force && now - lastSync < 180) return;
    lastSync = now;

    const arena = $('#arena');
    const shell = $('#battle-rpg-shell');
    if (!arena || !shell) return;
    const overlay = ensureZones(arena);

    // Bring every battle panel into reserved in-arena edge zones.
    moveTo($('#battle-resource-strip'), $('#bf-resources-slot', overlay));
    moveTo($('.battle-header'), $('#bf-header-slot', overlay));
    moveTo($('.battle-roster-panel'), $('#bf-party-slot', overlay));
    moveTo($('.battle-command-panel'), $('#bf-controls-slot', overlay));
    moveTo($('.battle-skills-panel'), $('#bf-skills-slot', overlay));
    moveTo($('#battle-result-slot'), $('#bf-result-slot', overlay));

    // Legacy sidebar/viewport wrappers no longer reserve space outside the arena.
    shell.classList.add('battle-hud-in-arena');
    const sidebar = $('.battle-sidebar', shell);
    if (sidebar) sidebar.setAttribute('aria-hidden', 'true');

    // HP plates above individual character/enemy heads are intentionally removed.
    const overhead = $('#hudu', arena);
    if (overhead) {
      overhead.setAttribute('aria-hidden', 'true');
      overhead.style.setProperty('display', 'none', 'important');
    }
    arena.classList.add('battlefield-hud-active');
  }

  const originalDraw = draw;
  draw = function () {
    const result = originalDraw.apply(this, arguments);
    if (view === 'battle') syncBattlefieldUI(true);
    return result;
  };

  const originalRender = render;
  render = function () {
    const result = originalRender.apply(this, arguments);
    if (view === 'battle') syncBattlefieldUI(false);
    return result;
  };

  const originalBuild = build;
  build = function () {
    const result = originalBuild.apply(this, arguments);
    const arena = $('#arena');
    const overhead = arena && $('#hudu', arena);
    if (overhead) {
      overhead.setAttribute('aria-hidden', 'true');
      overhead.style.setProperty('display', 'none', 'important');
    }
    return result;
  };

  // Catch shell recreation and delayed panel/resource mounting without moving
  // nodes on every frame. syncBattlefieldUI is idempotent and throttled.
  const observer = new MutationObserver(() => {
    if (view === 'battle') syncBattlefieldUI(false);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  try { syncBattlefieldUI(true); } catch (error) {
    console.warn('[OWL v1.5.6] battlefield layout deferred', error);
  }
  console.info('[OWL v1.5.6] battle HUD integrated inside arena; overhead HP plates disabled.');
})();
