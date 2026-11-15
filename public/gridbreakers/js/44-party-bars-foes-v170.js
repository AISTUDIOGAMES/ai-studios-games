/* =====================================================================
   OWL GRIDBREAKERS v3.7 — Barras HP / SP / ULT nos ícones + FOES compacto
   Apresentação apenas (não altera combate, saves ou economia):
   1) Cada um dos 5 ícones à esquerda mostra HP (verde), SP (ciano) e ULT
      (amarela). Com a ULT em 100% a barra amarela pisca/brilha.
      SP = carga da habilidade (quando cheia, a skill está pronta).
   2) Os ícones agora são clicáveis (mesma ação da antiga linha inferior):
      usa a ULT se estiver cheia; senão usa a skill se estiver pronta.
   3) A linha de skills temporizadas da parte inferior foi removida (CSS).
   4) O painel FOES ficou menor e lista o HP de todos os inimigos da onda.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_PARTY_BARS_V170__) return;
  window.__OWL_PARTY_BARS_V170__ = true;

  const $ = (selector, root) => (root || document).querySelector(selector);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 1) Barras SP / ULT nos ícones da esquerda ---------- */
  function ultCooldownLeft(id) {
    // js/12-ultimate-audio.js guarda o fim da recarga de cada ultimate em B.__awoUltReadyAt
    const map = B && B.__awoUltReadyAt;
    return map ? Math.max(0, num(map[id], 0) - Date.now()) : 0;
  }

  function ensureBars(card, unit) {
    const info = $('.battle-unit-info', card);
    if (!info) return null;
    let bars = $('.bf-xbars', info);
    if (!bars) {
      bars = document.createElement('div');
      bars.className = 'bf-xbars';
      bars.innerHTML = '<div class="bf-xb bf-sp"><i></i></div><div class="bf-xb bf-ult"><i></i></div>';
      info.appendChild(bars);
    }
    // Ícone clicável: reaproveita o despachante global [data-a] (act.cast).
    if (card.dataset.a !== 'cast') {
      card.dataset.a = 'cast';
      card.dataset.v = unit.id;
      card.setAttribute('role', 'button');
    }
    return bars;
  }

  function updateParty() {
    const roster = $('#battle-roster');
    if (!roster || !B || !B.allies) return;
    B.allies.forEach(unit => {
      const card = roster.querySelector('.battle-unit[data-unit-id="' + unit.id + '"]');
      if (!card) return;
      const bars = ensureBars(card, unit);
      if (!bars) return;

      const dead = !!unit.dead;
      const cd = Math.max(1, num(unit.cd, 1));
      const skT = num(unit.skT, cd);
      const sp = dead ? 0 : (skT <= 0 ? 100 : clamp((1 - skT / cd) * 100, 0, 100));
      const en = dead ? 0 : clamp(num(unit.en, 0), 0, 100);
      const coolLeft = ultCooldownLeft(unit.id);
      const ultReady = !dead && en >= 100 && coolLeft <= 0;

      const spFill = $('.bf-sp i', bars), ultFill = $('.bf-ult i', bars);
      if (spFill) spFill.style.width = sp.toFixed(1) + '%';
      if (ultFill) ultFill.style.width = en.toFixed(1) + '%';

      card.classList.toggle('sp-ready', !dead && sp >= 100);
      card.classList.toggle('ult-ready', ultReady);
      card.classList.toggle('ult-cooling', !dead && en >= 100 && coolLeft > 0);

      const hero = (typeof H !== 'undefined' && H[unit.id]) || {};
      const name = hero.n || unit.n || unit.id;
      const hpTxt = Math.ceil(num(unit.hp, 0)) + ' / ' + Math.ceil(num(unit.max, 0));
      card.title = name + ' · HP ' + hpTxt + ' · SP ' + Math.round(sp) + '% · ULT ' +
        (coolLeft > 0 && en >= 100 ? 'recarga ' + Math.ceil(coolLeft / 1000) + 's' : Math.round(en) + '%') +
        (dead ? '' : ' — toque para usar');
    });
  }

  /* ---------- 2) Painel FOES compacto com o HP de todos os inimigos ---------- */
  function ensureFoes() {
    const slot = $('#bf-target-slot');
    if (!slot) return null;
    let panel = $('#bf-foes', slot);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'bf-foes';
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-label', 'Vida dos inimigos');
      slot.appendChild(panel);
    }
    return panel;
  }

  function updateFoes() {
    const panel = ensureFoes();
    if (!panel || !B) return;
    const foes = (B.enemies || []).slice(0, 8);
    if (!foes.length) { panel.style.display = 'none'; return; }
    panel.style.display = '';

    const signature = foes.map(e => e.uid).join('|');
    if (panel.dataset.sig !== signature) {
      const boss = foes.some(e => e.boss);
      panel.dataset.sig = signature;
      panel.classList.toggle('has-boss', boss);
      panel.innerHTML =
        '<div class="bf-foes-h"><span>' + (boss ? 'BOSS' : 'FOES') + '</span><em></em></div>' +
        foes.map(e =>
          '<div class="bf-foe' + (e.boss ? ' boss' : '') + '" data-uid="' + esc(e.uid) + '">' +
          '<span class="bf-foe-n">' + esc(e.n || e.id || 'Inimigo') + '</span>' +
          '<div class="bf-foe-hp"><i></i></div><b>100%</b></div>'
        ).join('');
    }

    let alive = 0;
    foes.forEach(e => {
      const row = panel.querySelector('.bf-foe[data-uid="' + e.uid + '"]');
      if (!row) return;
      const dead = !!e.dead || num(e.hp, 0) <= 0;
      if (!dead) alive++;
      const pct = dead ? 0 : clamp(num(e.hp, 0) / Math.max(1, num(e.max, 1)) * 100, 0, 100);
      const fill = row.querySelector('.bf-foe-hp i');
      const label = row.querySelector('b');
      if (fill) fill.style.width = pct.toFixed(1) + '%';
      // Mostra pelo menos 1% enquanto o inimigo estiver vivo (evita "0%" enganoso).
      if (label) label.textContent = dead ? '0%' : Math.max(1, Math.round(pct)) + '%';
      row.classList.toggle('dead', dead);
      row.classList.toggle('low', !dead && pct <= 30);
      row.title = (e.n || '') + ' · ' + Math.ceil(Math.max(0, num(e.hp, 0))) + ' / ' + Math.ceil(num(e.max, 0)) + ' HP';
    });
    const counter = $('.bf-foes-h em', panel);
    if (counter) counter.textContent = alive + '/' + foes.length;
  }

  /* ---------- loop leve: só roda na tela de batalha ---------- */
  function tick() {
    if (typeof view === 'undefined' || view !== 'battle' || document.hidden) return;
    try { updateParty(); updateFoes(); } catch (error) { console.warn('[OWL v3.7] HUD update skipped', error); }
  }
  setInterval(tick, 100);
  tick();

  console.info('[OWL v3.7] barras HP/SP/ULT nos ícones, FOES compacto com HP de todos os inimigos, skills inferiores removidas.');
})();
