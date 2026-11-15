/* =====================================================================
   OWL GRIDBREAKERS v1.5.0 — PARTY POWER + VISIBLE COMBAT NUMBERS
   - Keeps Party Power and visible combat numbers independent from navigation hubs.
   - Shows live party POWER in Battle and Characters using existing stats.
   - Moves combat numbers to a dedicated overlay, separate from hidden HUD.
   ===================================================================== */
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const fmt = value => Math.max(0, Math.round(Number(value) || 0)).toLocaleString('pt-BR');
  let lastPowerUpdate = 0;
  let lastFloatAt = Object.create(null);
  let floatStack = Object.create(null);

  function activeParty() {
    const ids = Array.isArray(S && S.order) ? S.order.filter(id => H && H[id] && S.owned.includes(id)) : [];
    return ids;
  }

  function heroPower(id) {
    try {
      if (typeof power === 'function') return Math.max(0, Math.round(Number(power(id)) || 0));
      const s = stats(id);
      return Math.max(0, Math.round(s.atk * 2 + s.hp / 5 + s.def * 3 + s.spd + s.crit * 500));
    } catch (_) { return 0; }
  }

  function partyPowerSnapshot() {
    const ids = activeParty();
    const entries = ids.map(id => ({ id, name: H[id].n, power: heroPower(id) }));
    return { ids, entries, total: entries.reduce((sum, item) => sum + item.power, 0) };
  }

  function partyPowerMarkup(snapshot, compact) {
    const detail = snapshot.entries.map(item =>
      `<span class="party-power-member"><b>${item.name}</b><em>${fmt(item.power)}</em></span>`
    ).join('');
    return `<div class="party-power-line"><span class="party-power-label">⚔ PARTY POWER</span><strong>${fmt(snapshot.total)}</strong><small>${snapshot.entries.length}/5 ativos</small></div>` +
      `<div class="party-power-members${compact ? ' is-compact' : ''}">${detail}</div>`;
  }

  function updateBattlePower(force) {
    if (view !== 'battle') return;
    const now = performance.now();
    if (!force && now - lastPowerUpdate < 650) return;
    lastPowerUpdate = now;
    const rosterPanel = $('.battle-roster-panel');
    const roster = $('#battle-roster');
    if (!rosterPanel || !roster) return;
    let node = $('#battle-party-power', rosterPanel);
    if (!node) {
      node = document.createElement('div');
      node.id = 'battle-party-power';
      node.className = 'party-power-display battle-party-power';
      roster.parentNode.insertBefore(node, roster);
    }
    node.innerHTML = partyPowerMarkup(partyPowerSnapshot(), true);
  }

  function updateCharactersPower(force) {
    if (view !== 'heroes') return;
    const root = $('#view');
    if (!root) return;
    const snapshot = partyPowerSnapshot();
    let node = $('#characters-party-power', root);
    if (!node) {
      node = document.createElement('section');
      node.id = 'characters-party-power';
      node.className = 'party-power-display characters-party-power';
      root.insertBefore(node, root.firstChild);
    }
    node.innerHTML = `<div class="party-power-heading"><div><span>FORMAÇÃO ATIVA</span><h2>PODER DA PARTY</h2></div><b>⚔ ${fmt(snapshot.total)}</b></div>` +
      `<p>Valor calculado com nível, ascensão, estrelas, sinergias e equipamentos atualmente equipados.</p>` +
      `<div class="party-power-members">${snapshot.entries.map(item => `<span class="party-power-member"><b>${item.name}</b><em>${fmt(item.power)}</em></span>`).join('')}</div>`;
  }

  function refreshPowerDisplays(force) {
    if (view === 'battle') updateBattlePower(!!force);
    if (view === 'heroes') updateCharactersPower(!!force);
  }

  // The existing POWER formula is already equipment- and status-aware.
  // Recalculate the live combat units after save-backed stat changes, preserving
  // their current HP percentage and all transient battle state (energy, shield, cooldown).
  function syncBattleAllyStats() {
    if (typeof B === 'undefined' || !B || !Array.isArray(B.allies)) return;
    B.allies.forEach(unit => {
      if (!unit || !H[unit.id]) return;
      const next = stats(unit.id);
      const oldMax = Math.max(1, Number(unit.max) || 1);
      const hpRatio = Math.max(0, Math.min(1, (Number(unit.hp) || 0) / oldMax));
      unit.max = Math.max(1, Number(next.hp) || oldMax);
      unit.hp = Math.max(0, Math.min(unit.max, unit.max * hpRatio));
      unit.atk = Number(next.atk) || unit.atk;
      unit.def = Number(next.def) || unit.def;
      unit.spd = Number(next.spd) || unit.spd;
      unit.crit = Number(next.crit) || 0;
    });
  }

  // Recalculate after every save so equipment/level/star/ascension changes appear immediately.
  const previousSave = save;
  save = function () {
    const result = previousSave.apply(this, arguments);
    try {
      syncBattleAllyStats();
      refreshPowerDisplays(true);
    } catch (error) { console.warn('[OWL v1.5.0] party power refresh skipped', error); }
    return result;
  };

  const previousDraw = draw;
  draw = function () {
    const result = previousDraw.apply(this, arguments);
    try { refreshPowerDisplays(true); }
    catch (error) { console.warn('[OWL v1.5.0] display update skipped', error); }
    return result;
  };

  const previousRender = render;
  render = function () {
    const result = previousRender.apply(this, arguments);
    try { updateBattlePower(false); } catch (_) {}
    return result;
  };

  // Dedicated visible number layer: do not re-enable #hudu, which contains legacy
  // floating health bars that were intentionally removed from the battle viewport.
  function combatNumberLayer() {
    const arena = $('#arena');
    if (!arena) return null;
    let layer = $('#combat-number-layer', arena);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'combat-number-layer';
      layer.className = 'combat-number-layer';
      layer.setAttribute('aria-hidden', 'true');
      arena.appendChild(layer);
    }
    return layer;
  }

  // onFx() calls floater() dynamically, so replacing this one renderer makes the
  // normal attack, skill, ultimate, heal and MISS feedback visible again.
  floater = function (unitView, text, color, isCritical) {
    if (!unitView || !unitView.u) return;
    const layer = combatNumberLayer();
    if (!layer || typeof THREE === 'undefined' || !CAM) return;

    const isNumericDamage = typeof text === 'number' && Number.isFinite(text);
    const received = !!unitView.u.ally;
    const el = document.createElement('span');
    el.className = 'combat-number';
    if (isNumericDamage) {
      el.classList.add('is-damage', received ? 'damage-received' : 'damage-dealt');
      if (isCritical) el.classList.add('is-critical');
      el.textContent = `−${fmt(text)}`;
      if (isCritical) el.setAttribute('data-tag', 'CRÍTICO');
    } else {
      el.classList.add('is-feedback');
      if (String(text).startsWith('+')) el.classList.add('is-heal');
      if (String(text) === 'MISS') el.classList.add('is-miss');
      el.textContent = String(text == null ? '' : text);
      if (color) el.style.setProperty('--number-color', color);
    }

    const width = Math.max(1, Number(CW) || $('#arena').clientWidth || 1);
    const height = Math.max(1, Number(CH) || $('#arena').clientHeight || 1);
    const projected = new THREE.Vector3(
      Number(unitView.x) || 0,
      unitView.snake ? .8 : Math.max(.7, (Number(unitView.h) || 1) * 1.3),
      Number(unitView.z) || 0
    ).project(CAM);

    const uid = String(unitView.u.uid || unitView.u.id || 'unit');
    const now = performance.now();
    if (!lastFloatAt[uid] || now - lastFloatAt[uid] > 240) floatStack[uid] = 0;
    else floatStack[uid] = (floatStack[uid] || 0) + 1;
    lastFloatAt[uid] = now;
    const stack = floatStack[uid] || 0;
    const spread = ((stack % 3) - 1) * 20;
    const left = Math.max(24, Math.min(width - 24, (projected.x * .5 + .5) * width + spread));
    const top = Math.max(28, Math.min(height - 24, (-projected.y * .5 + .5) * height));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.setProperty('--number-color', color || (received ? '#ff777f' : '#ffe18c'));
    layer.appendChild(el);
    window.setTimeout(() => { if (el.parentNode) el.remove(); }, isCritical ? 1150 : 950);
  };

  try { refreshPowerDisplays(true); } catch (_) {}
  console.info('[OWL v1.5.4] live Party Power and combat damage numbers enabled');
})();
