/* =====================================================================
   OWL GRIDBREAKERS v1.4.9 — MENUS HUB + BATTLE PANEL ORGANIZATION
   Adds a dedicated Menus tab, moves AFK rewards there, keeps Save actions
   inside Configurations, and cleans the tactical command strip.
   ===================================================================== */
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function menusHTML() {
    const afk = typeof afkCalc === 'function'
      ? afkCalc()
      : { min: 0, gold: 0, xp: 0, shards: 0, items: 0 };
    const minutes = Math.max(0, Math.floor(Number(afk.min) || 0));
    return `
      <section class="owl-menus-page">
        <header class="owl-menus-heading">
          <div><span>OWL GRIDBREAKERS · CENTRAL HUB</span><h1>MENUS</h1><p>Configurações, progresso e recursos do jogo em um só lugar.</p></div>
          <div class="owl-menus-emblem" aria-hidden="true">☰</div>
        </header>
        <div class="owl-menu-cards">
          <article class="owl-menu-card owl-menu-settings">
            <div class="owl-menu-icon" aria-hidden="true">⚙</div>
            <div class="owl-menu-copy"><span>INTERFACE · ÁUDIO · DESEMPENHO</span><h2>Configurações</h2><p>Escolha Desktop/Mobile, ajuste música e efeitos, qualidade gráfica e limite de FPS. O save fica dentro deste painel.</p></div>
            <button type="button" data-menu-action="settings" class="owl-menu-open">ABRIR CONFIGURAÇÕES <b>›</b></button>
          </article>
          <article class="owl-menu-card owl-menu-afk">
            <div class="owl-menu-icon" aria-hidden="true">◈</div>
            <div class="owl-menu-copy"><span>RECOMPENSAS OFFLINE</span><h2>Recompensas AFK</h2><p>${minutes.toLocaleString('pt-BR')} min acumulados · máximo de 24 horas.</p>
              <div class="owl-afk-preview"><span>💰 ${Math.floor(afk.gold || 0).toLocaleString('pt-BR')}</span><span>XP ${Math.floor(afk.xp || 0).toLocaleString('pt-BR')}</span><span>🔷 ${Math.floor(afk.shards || 0).toLocaleString('pt-BR')}</span><span>Itens ${Math.floor(afk.items || 0)}</span></div>
            </div>
            <button type="button" data-a="afk" class="owl-menu-open" ${minutes < 1 ? 'disabled' : ''}>COLETAR RECOMPENSAS <b>›</b></button>
          </article>
          <article class="owl-menu-card owl-menu-reports">
            <div class="owl-menu-icon" aria-hidden="true">▤</div>
            <div class="owl-menu-copy"><span>HISTÓRICO DE COMBATE</span><h2>Relatórios</h2><p>Consulte análises de chefes e batalhas perdidas sem ocupar a tela de combate.</p></div>
            <button type="button" data-menu-action="reports" class="owl-menu-open">ABRIR RELATÓRIOS <b>›</b></button>
          </article>
        </div>
      </section>`;
  }

  // Add a first-class Menus tab after the existing Report archive tab.
  const previousNav = nav;
  nav = function () {
    previousNav.apply(this, arguments);
    const host = $('#nav');
    if (!host) return;
    host.querySelectorAll('[data-v="menus"]').forEach(node => node.remove());
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.a = 'tab';
    button.dataset.v = 'menus';
    button.className = view === 'menus' ? 'on' : '';
    button.innerHTML = '<span>☰</span>Menus';
    button.title = 'Menus';
    button.setAttribute('aria-label', 'Menus');
    host.appendChild(button);
  };

  const previousDraw = draw;
  draw = function () {
    if (view === 'menus') {
      nav();
      head();
      const root = $('#view');
      if (root) root.innerHTML = menusHTML();
      return;
    }
    return previousDraw.apply(this, arguments);
  };

  // Open configuration from the Menus page; no standalone gear shortcut.
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-menu-action]');
    if (!action) return;
    if (action.dataset.menuAction === 'settings') {
      if (window.GFX && typeof window.GFX.openSettings === 'function') window.GFX.openSettings();
    } else if (action.dataset.menuAction === 'reports') {
      view = 'reports';
      draw();
    }
  });

  // The gift/AFK shortcut belongs in Menus, not in Tactical Controls.
  function cleanTacticalControls() {
    const side = $('#battle-commands .side');
    if (side) {
      const allowedControls = new Set(['pause', 'speed', 'auto', 'autou', 'autocontinue']);
      side.querySelectorAll('button').forEach(button => {
        const action = String(button.dataset.a || '').toLowerCase();
        // Tactical Controls contains combat controls only. Gift/AFK/reward shortcuts
        // are deliberately not allowed here; they live under the Menus tab.
        if (!allowedControls.has(action)) button.remove();
      });
    }
    // Retire any legacy floating shortcuts. Their functions are available in Menus/Config.
    document.querySelectorAll('#gfx-open, body > button[title="Export / import save"], [data-floating-menu="settings"], [data-floating-menu="save"]').forEach(node => node.remove());
  }

  const previousRender = render;
  render = function () {
    const result = previousRender.apply(this, arguments);
    cleanTacticalControls();
    return result;
  };

  // The settings panel already owns manual save/export/import. Keep this guard in
  // place in case an older module attempts to mount a floating save button later.
  const observer = new MutationObserver(cleanTacticalControls);
  observer.observe(document.body, { childList: true, subtree: true });
  cleanTacticalControls();

  console.info('[OWL RPG UI] Menus hub enabled; save tools stay in Configurations');
})();
