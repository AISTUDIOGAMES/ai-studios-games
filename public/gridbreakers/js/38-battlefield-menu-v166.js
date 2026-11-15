/* =====================================================================
   OWL GRIDBREAKERS v3.2 — MENU DOCKED AT THE BOTTOM OF THE BATTLEFIELD
   While the Battle tab is visible, the navigation (#nav) lives inside the arena
   HUD (#bf-menu-slot), below the timed skill row. On every other tab it returns to
   its normal place at the bottom of the page.
   Safety: the nav node is held by reference and is always re-attached to <body>
   BEFORE the view is rebuilt, so replacing #view.innerHTML can never destroy it.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_BF_MENU_V166__) return;
  window.__OWL_BF_MENU_V166__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let navEl = $('#nav');
  if (!navEl) return;

  function homeNav() {
    if (!navEl) return;
    if (navEl.parentNode !== document.body) {
      const modal = $('#modal');
      document.body.insertBefore(navEl, modal && modal.parentNode === document.body ? modal : null);
    }
    document.body.classList.remove('bf-menu-top');
  }

  function ensureSlot(overlay) {
    let slot = $('#bf-menu-slot', overlay);
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'bf-slot bf-menu-slot';
      slot.id = 'bf-menu-slot';
      slot.setAttribute('role', 'navigation');
      slot.setAttribute('aria-label', 'Menu principal');
      const skillsSlot = $('#bf-skills-slot', overlay);
      if (skillsSlot && skillsSlot.parentNode === overlay) overlay.insertBefore(slot, skillsSlot.nextSibling);
      else overlay.appendChild(slot);
    }
    return slot;
  }

  function dockNav() {
    if (view !== 'battle') return;
    const arena = $('#arena');
    const overlay = arena && $('#battlefield-hud', arena);
    if (!overlay) return;
    const slot = ensureSlot(overlay);
    if (navEl.parentNode !== slot) slot.appendChild(navEl);
    document.body.classList.add('bf-menu-top');
  }

  // 1) Never let a view rebuild swallow the nav.
  const previousDraw = draw;
  draw = function () {
    homeNav();
    const result = previousDraw.apply(this, arguments);
    if (view === 'battle') dockNav(); else homeNav();
    return result;
  };

  // 2) nav() looks up #nav by selector; guarantee it is attached when it runs.
  const previousNav = nav;
  nav = function () {
    if (!document.contains(navEl)) homeNav();
    return previousNav.apply(this, arguments);
  };

  // 3) Late/async arena creation (HUD mounts after draw) and safety net.
  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    (window.requestAnimationFrame || setTimeout)(() => {
      pending = false;
      if (!document.contains(navEl)) { homeNav(); return; }
      if (view === 'battle') dockNav();
      else if (navEl.parentNode !== document.body) homeNav();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.OWL_BF_MENU = { dock: dockNav, home: homeNav };
  try { if (view === 'battle') dockNav(); } catch (error) { console.warn('[OWL v3.2] menu dock deferred', error); }
  console.info('[OWL v3.2] battle menu docked below the timed skills at the arena footer.');
})();
