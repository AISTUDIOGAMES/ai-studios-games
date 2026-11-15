/* =====================================================================
   OWL GRIDBREAKERS v1.5.3 — SETTINGS RETURNED TO BOTTOM NAVIGATION
   - Adds a permanent Config tab with the original gear icon.
   - Keeps Settings accessible directly from the bottom navigation.
   - Opens the existing settings dialog without changing the current page.
   - Re-renders the navigation once after all extension modules load so the
     button is visible immediately on first launch.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_SETTINGS_NAV_V153__) return;
  window.__OWL_SETTINGS_NAV_V153__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const originalNav = nav;

  function syncActive() {
    const button = $('#nav [data-settings-tab]');
    if (button) button.classList.toggle('on', !!$('#gfx-settings-overlay'));
  }

  function openSettings() {
    const existing = $('#gfx-settings-overlay');
    if (existing) {
      existing.style.display = 'flex';
      const close = existing.querySelector('#gfxclose');
      if (close) close.focus();
      syncActive();
      return true;
    }
    const open = window.GFX && window.GFX.openSettings;
    if (typeof open !== 'function') {
      console.error('[OWL v1.5.3] Settings module is not available.');
      let notice = $('#owl-settings-error');
      if (!notice) {
        notice = document.createElement('div');
        notice.id = 'owl-settings-error';
        notice.className = 'owl-settings-error';
        notice.setAttribute('role', 'alert');
        notice.innerHTML = '<b>Configurações indisponíveis</b><span>O módulo não carregou corretamente. Recarregue o jogo com Ctrl + F5.</span><button type="button">Fechar</button>';
        notice.querySelector('button').addEventListener('click', () => notice.remove());
        document.body.appendChild(notice);
      }
      return false;
    }
    try {
      open();
      syncActive();
      return !!$('#gfx-settings-overlay');
    } catch (error) {
      console.error('[OWL v1.5.3] Could not open Settings:', error);
      return false;
    }
  }

  nav = function () {
    originalNav.apply(this, arguments);
    const host = $('#nav');
    if (!host) return;
    host.querySelectorAll('[data-settings-tab]').forEach(node => node.remove());
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.settingsTab = '1';
    button.className = $('#gfx-settings-overlay') ? 'on' : '';
    button.innerHTML = '<span aria-hidden="true">⚙</span>Config';
    button.title = 'Configurações';
    button.setAttribute('aria-label', 'Configurações');
    host.appendChild(button);
  };

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-settings-tab]');
    if (!button) return;
    event.preventDefault();
    openSettings();
  });

  // Keep the bottom-nav gear highlighted while the dialog is open, regardless
  // of whether Settings was opened from the nav or from Controle.
  const observer = new MutationObserver(syncActive);
  observer.observe(document.body, { childList: true, subtree: true });

  window.OWL_SETTINGS = { open: openSettings };

  // Critical: the base game draws once before this add-on is loaded. Rebuild
  // navigation now so Config is visible immediately, without requiring a tab switch.
  nav();
  console.info('[OWL v1.5.3] Config tab mounted in the bottom navigation.');
})();
