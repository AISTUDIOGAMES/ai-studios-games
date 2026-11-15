/* =====================================================================
   OWL GRIDBREAKERS v3.3 — PREMIUM COMBAT NUMBERS (presentation only)
   Replaces floater(): same inputs, same call sites, no combat logic touched.
   - Separate visual identity for damage DEALT, damage RECEIVED, HEAL, MISS, CRIT and skill callouts.
   - Size scales with the hit relative to the target's max HP (tiers), not with raw numbers.
   - DOM pooling (no create/remove churn), animationend recycling, hard cap per graphics profile.
   - Low-priority numbers are merged/dropped under load; crits, received damage and heals are kept.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_CN_V167__) return;
  window.__OWL_CN_V167__ = true;

  const LIMITS = { high: 34, medium: 22, low: 12 };
  const POOL_MAX = 48, MERGE_MS = 90, STALE_MS = 2600;
  const PRIORITY = { miss: 0, skill: 0, dealt: 1, heal: 2, crit: 3, received: 3, hi: 4 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = (s, r) => (r || document).querySelector(s);

  function profile() {
    try { const q = (JSON.parse(localStorage.getItem('owl_gfx_v1') || 'null') || {}).quality; return LIMITS[q] ? q : 'high'; }
    catch (e) { return 'high'; }
  }
  const capNow = () => LIMITS[profile()];

  function fmtN(n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    if (n >= 1e7) return Math.round(n / 1e6) + 'M';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'M';
    if (n >= 1e5) return Math.round(n / 1e3) + 'K';
    return n.toLocaleString('pt-BR');
  }

  /* ---- classification (pure, unit-tested) ---- */
  function classify(text, isCritical, unitIsAlly, maxHp) {
    const numeric = typeof text === 'number' && Number.isFinite(text);
    const str = String(text == null ? '' : text);
    if (numeric) {
      const ratio = clamp(text / Math.max(1, maxHp || 1), 0, 5);
      if (unitIsAlly) return { kind: 'received', ratio, value: text, hi: ratio >= .18, crit: !!isCritical };
      return { kind: 'dealt', ratio, value: text, hi: ratio >= .18, crit: !!isCritical, critHi: !!isCritical && ratio >= .12 };
    }
    if (str.charAt(0) === '+') {
      const v = Number(str.slice(1).replace(/[^\d.]/g, '')) || 0;
      return { kind: 'heal', ratio: clamp(v / Math.max(1, maxHp || 1), 0, 5), value: v };
    }
    if (str === 'MISS') return { kind: 'miss', ratio: 0 };
    return { kind: 'skill', ratio: 0, label: str };
  }
  function scaleFor(c) {
    switch (c.kind) {
      case 'dealt': return clamp(.92 + Math.sqrt(c.ratio) * 1.1, .92, 1.55) * (c.crit ? 1.22 : 1);
      case 'received': return clamp(.95 + Math.sqrt(c.ratio) * 1.1, .95, 1.6);
      case 'heal': return clamp(.95 + Math.sqrt(c.ratio) * .6, .95, 1.35);
      case 'skill': return .82;
      default: return .9;
    }
  }
  function priorityFor(c) {
    if (c.kind === 'dealt') return c.critHi ? PRIORITY.hi : c.crit ? PRIORITY.crit : PRIORITY.dealt;
    if (c.kind === 'received') return c.hi ? PRIORITY.hi : PRIORITY.received;
    return PRIORITY[c.kind] || 0;
  }

  /* ---- pool ---- */
  const pool = [], active = [];
  const lastAt = {}, stackN = {}, lastNormal = {}, lastHurtFx = {};
  const stats = { spawned: 0, merged: 0, dropped: 0, evicted: 0, created: 0 };
  let projVec = null;

  function release(el) {
    const i = active.findIndex(a => a.el === el);
    if (i >= 0) active.splice(i, 1);
    if (el.parentNode) el.parentNode.removeChild(el);
    el.className = 'cn cn-off';
    if (pool.length < POOL_MAX) pool.push(el);
  }
  function acquire() {
    let el = pool.pop();
    if (!el) {
      el = document.createElement('span');
      const b = document.createElement('b');
      el.appendChild(b); el._b = b;
      el.addEventListener('animationend', ev => { if (ev.target === el) release(el); });
      stats.created++;
    }
    return el;
  }
  function layer() {
    const arena = $('#arena');
    if (!arena) return null;
    let l = $('#combat-number-layer', arena);
    if (!l) {
      l = document.createElement('div');
      l.id = 'combat-number-layer'; l.className = 'combat-number-layer';
      l.setAttribute('aria-hidden', 'true');
      arena.appendChild(l);
    }
    return l;
  }
  function evict(minPriority) {
    // remove the oldest entry whose priority is below minPriority; returns true if one was freed
    let idx = -1;
    for (let i = 0; i < active.length; i++) if (active[i].prio < minPriority) { idx = i; break; }
    if (idx < 0) return false;
    const a = active[idx];
    stats.evicted++;
    release(a.el);
    return true;
  }
  function sweepStale(now) {
    for (let i = active.length - 1; i >= 0; i--) if (now - active[i].born > STALE_MS) release(active[i].el);
  }

  /* ---- received-damage feedback on the party rail / arena (cheap, throttled) ---- */
  function hurtFeedback(unitView, c, now) {
    const uid = String(unitView.u.uid || unitView.u.id || 'u');
    if (now - (lastHurtFx[uid] || 0) < 160) return;
    lastHurtFx[uid] = now;
    try {
      const card = document.querySelector('#bf-party-slot .battle-unit[data-unit-id="' + String(unitView.u.id).replace(/"/g, '') + '"]');
      if (card) { card.classList.remove('bf-hit'); void card.offsetWidth; card.classList.add('bf-hit'); }
      if (c.hi) {
        const arena = $('#arena');
        if (arena) {
          // dedicated overlay: the arena's own :after vignette is left untouched
          let fxl = arena.querySelector('.bf-hurt-layer');
          if (!fxl) { fxl = document.createElement('div'); fxl.className = 'bf-hurt-layer'; fxl.setAttribute('aria-hidden', 'true'); arena.appendChild(fxl); }
          fxl.classList.remove('on'); void fxl.offsetWidth; fxl.classList.add('on');
        }
      }
    } catch (e) { /* cosmetic only */ }
  }

  function project(unitView, width, height) {
    if (typeof THREE === 'undefined' || typeof CAM === 'undefined' || !CAM) return null;
    projVec = projVec || new THREE.Vector3();
    projVec.set(Number(unitView.x) || 0, unitView.snake ? .8 : Math.max(.7, (Number(unitView.h) || 1) * 1.3), Number(unitView.z) || 0).project(CAM);
    return { x: (projVec.x * .5 + .5) * width, y: (-projVec.y * .5 + .5) * height };
  }

  function spawn(unitView, text, color, isCritical) {
    if (!unitView || !unitView.u) return null;
    const l = layer();
    if (!l) return null;
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    const u = unitView.u;
    const c = classify(text, isCritical, !!u.ally, u.max);
    const prio = priorityFor(c);
    sweepStale(now);

    // geometry
    const arena = $('#arena');
    const width = Math.max(1, Number(typeof CW !== 'undefined' ? CW : 0) || (arena && arena.clientWidth) || 1);
    const height = Math.max(1, Number(typeof CH !== 'undefined' ? CH : 0) || (arena && arena.clientHeight) || 1);
    const p = project(unitView, width, height);
    if (!p) return null;

    const uid = String(u.uid || u.id || 'unit');
    if (!lastAt[uid] || now - lastAt[uid] > 240) stackN[uid] = 0; else stackN[uid] = (stackN[uid] || 0) + 1;
    lastAt[uid] = now;
    const lane = stackN[uid];

    // merge rapid normal hits on the same target (multi-hit skills read as one number)
    if (c.kind === 'dealt' && !c.crit) {
      const ln = lastNormal[uid];
      if (ln && now - ln.t < MERGE_MS && active.some(a => a.el === ln.el)) {
        ln.v += c.value; ln.t = now;
        ln.el._b.textContent = fmtN(ln.v);
        stats.merged++;
        return ln.el;
      }
    }

    // capacity: make room by evicting something less important, otherwise drop the newcomer
    const cap = capNow();
    while (active.length >= cap) {
      if (!evict(prio)) { stats.dropped++; return null; }
    }

    const el = acquire();
    let dx = 0, ox = 0, oy = 0;
    if (c.kind === 'dealt') { dx = ((lane % 3) - 1) * 14; ox = ((lane % 3) - 1) * 16; oy = -(lane % 3) * 9; }
    else if (c.kind === 'received') { ox = -16 - (lane % 2) * 12; oy = -(lane % 3) * 8; dx = -6; }
    else if (c.kind === 'heal') { ox = 18 + (lane % 2) * 12; oy = 6 - (lane % 3) * 8; dx = 6; }
    else if (c.kind === 'skill') { oy = -26; }
    const left = clamp(p.x + ox, 30, width - 30);
    const top = clamp(p.y + oy, 88, height - 120);

    let cls = 'cn cn-' + c.kind;
    if (c.crit) cls += ' cn-crit';
    if (c.critHi) cls += ' cn-crit-hi';
    if (c.hi) cls += ' cn-hi';
    el.className = cls;
    el.style.left = left.toFixed(1) + 'px';
    el.style.top = top.toFixed(1) + 'px';
    el.style.setProperty('--s', scaleFor(c).toFixed(2));
    el.style.setProperty('--dx', dx + 'px');
    if (c.kind === 'skill' && color) el.style.setProperty('--c', color); else el.style.removeProperty('--c');
    if (c.crit && c.kind === 'dealt') el.setAttribute('data-tag', 'CR\u00cdTICO'); else el.removeAttribute('data-tag');
    el._b.textContent =
      c.kind === 'dealt' ? fmtN(c.value) :
      c.kind === 'received' ? '-' + fmtN(c.value) :
      c.kind === 'heal' ? '+' + fmtN(c.value) :
      c.kind === 'miss' ? 'MISS' : c.label;
    l.appendChild(el);

    active.push({ el, prio, born: now, kind: c.kind, uid });
    if (c.kind === 'dealt' && !c.crit) lastNormal[uid] = { el, v: c.value, t: now };
    if (c.kind === 'received') hurtFeedback(unitView, c, now);
    stats.spawned++;
    return el;
  }

  window.floater = spawn; // onFx() resolves floater() dynamically
  try { floater = spawn; } catch (e) { /* global binding already updated via window */ }
  window.OWL_NUMBERS = { spawn, classify, scaleFor, priorityFor, fmtN, stats: () => Object.assign({ active: active.length, pool: pool.length }, stats), LIMITS };
  console.info('[OWL v3.3] premium combat numbers active.');
})();
