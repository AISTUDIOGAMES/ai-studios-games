/* =====================================================================
   OWL GRIDBREAKERS v3.6 — TACTICAL CONTROLS: aba "ocultar para a esquerda"
   Apresentacao apenas: adiciona uma aba ao lado da caixa de icones TACTICAL
   CONTROLS que a recolhe para a esquerda (tela limpa) e a reabre.
   Nao altera combate, saves nem os botoes de controle.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_TACTICAL_TOGGLE_V169__) return;
  window.__OWL_TACTICAL_TOGGLE_V169__ = true;

  const KEY = 'owl_gridbreakers_tactical_hidden';
  const root = document.documentElement;

  function load() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* storage indisponivel */ } }

  let hidden = load();

  function apply(tab) {
    root.setAttribute('data-tactical-hidden', hidden ? '1' : '0');
    const t = tab || document.getElementById('bf-tactical-tab');
    if (!t) return;
    t.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    t.setAttribute('aria-label', hidden ? 'Mostrar controles táticos' : 'Ocultar controles táticos');
    t.title = hidden ? 'Mostrar controles' : 'Ocultar controles';
    t.textContent = hidden ? '▶' : '◀';
  }

  function ensureTab() {
    const slot = document.getElementById('bf-controls-slot');
    if (!slot) return;
    let tab = document.getElementById('bf-tactical-tab');
    if (tab && tab.parentNode === slot) return;
    if (tab) tab.remove();
    tab = document.createElement('button');
    tab.id = 'bf-tactical-tab';
    tab.type = 'button';
    tab.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      hidden = !hidden; save(hidden); apply(tab);
    });
    slot.appendChild(tab);
    apply(tab);
  }

  apply();
  ensureTab();
  setInterval(ensureTab, 400);
})();
