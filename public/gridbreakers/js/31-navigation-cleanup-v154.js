/* =====================================================================
   OWL GRIDBREAKERS v1.5.4 — REMOVE THE BROKEN CONTROL HUB
   - Removes the Controle/Menus destination from the bottom navigation.
   - Keeps the permanent Config gear and all original game destinations.
   - Redirects stale legacy hub routes to Battle instead of rendering the
     broken hub page. No save, combat, report, or configuration logic changes.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_NAV_CLEANUP_V154__) return;
  window.__OWL_NAV_CLEANUP_V154__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const removeControlButtons = () => {
    const host = $('#nav');
    if (!host) return;
    host.querySelectorAll(
      '[data-control-tab], [data-v="control"], [data-v="menus"], [aria-label="Controle"], [title="Controle"]'
    ).forEach(node => node.remove());
  };

  const previousNav = nav;
  nav = function () {
    const result = previousNav.apply(this, arguments);
    removeControlButtons();
    return result;
  };

  const previousDraw = draw;
  draw = function () {
    // Old links or a stale in-memory view must never reopen the removed hub.
    if (view === 'control' || view === 'menus') view = 'battle';
    const result = previousDraw.apply(this, arguments);
    removeControlButtons();
    return result;
  };

  // Defensively handle an already-rendered/stale Control button.
  document.addEventListener('click', event => {
    const legacy = event.target.closest('[data-control-tab], [data-v="control"], [data-v="menus"]');
    if (!legacy) return;
    event.preventDefault();
    event.stopPropagation();
    view = 'battle';
    draw();
  }, true);

  // The Settings entry is deliberately retained as the only gear shortcut.
  nav();
  console.info('[OWL v1.5.4] Controle hub removed; Config and game navigation preserved.');
})();
