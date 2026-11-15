/* =====================================================================
   OWL GRIDBREAKERS v3.3 — VFX GOVERNOR (presentation only)
   Problem: one heal stacked ~5 effects per ally (core rune + tall beam + spiral + shock + additive emblem +
   7 additive leaves), ultimates added white beams, and flashFx washed 55% of the arena in solid color.
   Approach: every effect goes through addFx() -> FX.push(). We govern at that single choke point:
     * classify each effect (beam / flare / additive glyph / sprite / decal / group),
     * convert additive blending to normal blending (no white-out),
     * clamp opacity per kind and slim beams/flares,
     * cap concurrent effects per kind and in total (scaled by the graphics profile),
     * drop the legacy heal stack and replace it with one elegant, controlled heal effect.
   Colors, timings and shapes of each hero's skill stay as authored. No combat values are touched.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_VFX_V167__) return;
  window.__OWL_VFX_V167__ = true;

  const BASE_CAPS = { total: 90, beam: 5, flare: 8, glyph: 10, sprite: 14, decal: 14, group: 8 };
  const OPACITY = { beam: .42, flare: .5, glyph: .5, sprite: .7, decal: .55, group: .8 };
  const BEAM_WIDTH = .58, FLARE_SCALE = .72;
  const PRIORITY = { flare: 0, glyph: 1, sprite: 1, beam: 2, decal: 3, group: 3, mesh: 4 };

  const gfxK = () => { try { return Math.max(.4, Math.min(1, (window.GFX && GFX.k && GFX.k()) || 1)); } catch (e) { return 1; } };
  const capsNow = () => {
    const k = gfxK(), out = {};
    for (const key in BASE_CAPS) out[key] = Math.max(2, Math.round(BASE_CAPS[key] * k));
    return out;
  };

  /* ---------- classification ---------- */
  function classify(o) {
    if (!o) return 'mesh';
    const isGroup = o.isGroup || o.type === 'Group';
    if (isGroup) return 'group';
    const m = o.material;
    const map = m && m.map;
    const tx = (typeof TX !== 'undefined' && TX) ? TX : null;
    if (tx && map) {
      if (map === tx.beam) return 'beam';
      if (map === tx.flare) return 'flare';
      if (map === tx.rune || map === tx.wave) return 'decal';
    }
    if (o.isSprite) return (m && typeof THREE !== 'undefined' && m.blending === THREE.AdditiveBlending) ? 'glyph' : 'sprite';
    return 'mesh';
  }
  function materialsOf(o) {
    const list = [];
    if (o.material) list.push(o.material);
    if (o.children && o.children.length) o.traverse && o.traverse(n => { if (n !== o && n.material) list.push(n.material); });
    return list;
  }

  /* ---------- state ---------- */
  let healCtx = false;          // legacy heal stack suppressed while true
  let softDrop = null;          // Set of kinds dropped while a healer skill is cast
  let ownDepth = 0;             // our own effects bypass drops (they are already tame)
  const stats = { pushed: 0, dropped: 0, converted: 0 };

  function countKinds() {
    const c = { total: FX.length };
    for (let i = 0; i < FX.length; i++) { const k = FX[i].k; if (k) c[k] = (c[k] || 0) + 1; }
    return c;
  }
  function dispose(o) {
    try {
      if (o.parent) o.parent.remove(o); else if (typeof SC !== 'undefined' && SC) SC.remove(o);
      materialsOf(o).forEach(m => m.dispose && m.dispose());
    } catch (e) { /* ignore */ }
  }

  function govern(e) {
    const o = e && e.o;
    if (!o) return true;
    const kind = classify(o);
    e.k = kind;
    if (ownDepth > 0) { e.own = true; return true; }
    if (healCtx) return false;
    if (softDrop && softDrop.has(kind)) return false;
    const caps = capsNow(), counts = countKinds();
    if (counts.total >= Math.round(caps.total * 1.6)) return false;   // hard ceiling for every kind (rocks, cracks, rings...)
    if (counts.total >= caps.total && (PRIORITY[kind] || 0) <= 2) return false;
    if (caps[kind] !== undefined && (counts[kind] || 0) >= caps[kind]) return false;
    prepare(e, kind);
    return true;
  }

  function prepare(e, kind) {
    const o = e.o, mats = materialsOf(o);
    if (typeof THREE !== 'undefined') {
      mats.forEach(m => {
        if (m.blending === THREE.AdditiveBlending) { m.blending = THREE.NormalBlending; m.needsUpdate = true; stats.converted++; }
      });
    }
    const cap = OPACITY[kind];
    if (cap === undefined) return;
    const original = e.u;
    e.u = function (p) {
      original(p);
      for (let i = 0; i < mats.length; i++) if (mats[i].opacity > cap) mats[i].opacity = cap;
      if (kind === 'beam' && o.scale) o.scale.x *= BEAM_WIDTH;           // u() re-sets the scale every frame
      else if (kind === 'flare' && o.scale && o.scale.multiplyScalar) o.scale.multiplyScalar(FLARE_SCALE);
    };
  }

  function install() {
    if (FX.__owlGoverned) return;
    const nativePush = Array.prototype.push;
    FX.push = function () {
      for (let i = 0; i < arguments.length; i++) {
        const e = arguments[i];
        stats.pushed++;
        if (govern(e)) nativePush.call(this, e); else { stats.dropped++; dispose(e.o); }
      }
      return this.length;
    };
    FX.__owlGoverned = true;
  }
  install();

  /* ---------- screen flash: edge vignette instead of a solid wash ---------- */
  flashFx = function (c) {
    const a = document.querySelector('#arena');
    if (!a || a.querySelector('.fx2')) return;
    const d = document.createElement('div');
    d.className = 'fx2';
    const n = Number(c) || 0xffffff;
    d.style.setProperty('--fx-rgb', ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255));
    a.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 460);
  };

  /* ---------- premium heal ---------- */
  const ease = p => 1 - Math.pow(1 - p, 3);
  let HEALTEX = null;
  function healTexture() {
    if (HEALTEX) return HEALTEX;
    HEALTEX = new THREE.CanvasTexture(cv(64, 64, g => {
      const q = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      q.addColorStop(0, 'rgba(255,255,255,.95)'); q.addColorStop(.35, 'rgba(255,255,255,.45)'); q.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = q; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.fillRect(28, 16, 8, 32); g.fillRect(16, 28, 32, 8);
    }));
    return HEALTEX;
  }
  function own(fn) { ownDepth++; try { fn(); } finally { ownDepth--; } }

  function premiumHeal(v, amount) {
    if (!v || typeof THREE === 'undefined' || typeof SC === 'undefined' || !SC || typeof TX === 'undefined' || !TX || !CAM) return;
    const k = gfxK(), max = (v.u && v.u.max) || 1, big = amount >= max * .3;
    const c1 = big ? 0xd9f58f : 0x66e49b, c2 = big ? 0xfff2b0 : 0xa6ffc9;
    const budgetOk = FX.filter(e => e.heal).length < Math.round(8 * k);
    if (budgetOk) {
      own(() => {
        const ring = new THREE.Mesh(PG, amat(TX.rune, c1));
        ring.rotation.x = -Math.PI / 2; ring.position.set(v.x, .06, v.z);
        addFx(ring, 1.05, p => { const s = .55 + (big ? 1.15 : .8) * ease(p); ring.scale.set(s, s, s); ring.rotation.z = p * 1.4; ring.material.opacity = fade(p) * (big ? .42 : .34); });
        FX[FX.length - 1].heal = 1;

        const col = new THREE.Mesh(PG, amat(TX.beam, c2));
        col.quaternion.copy(CAM.quaternion);
        addFx(col, .9, p => { const h = 1.6 + .9 * ease(p); col.scale.set(.5 * (1 - p * .4), h, 1); col.position.set(v.x, h * .5 + .05, v.z); col.material.opacity = fade(p) * .22; });
        FX[FX.length - 1].heal = 1;

        const n = Math.max(2, Math.round((big ? 6 : 4) * k)), tex = healTexture();
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2, r0 = .35 + (i % 2) * .15;
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: i % 2 ? c1 : c2, transparent: true, blending: THREE.NormalBlending, depthWrite: false, opacity: 0 }));
          sp.scale.set(.24, .24, 1);
          addFx(sp, .85 + (i % 3) * .1, p => {
            const a = a0 + p * 1.6;
            sp.position.set(v.x + Math.cos(a) * r0, .25 + p * 1.5, v.z + Math.sin(a) * r0 * .6);
            sp.material.opacity = fade(p) * .8;
          });
          FX[FX.length - 1].heal = 1;
        }
      });
    }
    try { moteFx(v.x, v.z, c2, Math.max(2, Math.round((big ? 6 : 4) * k))); } catch (e) { /* particles are optional */ }
  }

  /* ---------- hook onFx: replace the stacked heal visuals, keep floater + sound chain ---------- */
  const previousOnFx = onFx;
  onFx = function (f) {
    if (!FX.__owlGoverned) install();
    if (f && f.k === 'h') {
      const v = V[f.u];
      healCtx = true;
      try { previousOnFx.apply(this, arguments); } finally { healCtx = false; }
      if (v && v.u && !v.u.dead) { try { premiumHeal(v, Number(f.v) || 0); } catch (e) { console.warn('[OWL v3.3] heal fx skipped', e); } }
      return;
    }
    return previousOnFx.apply(this, arguments);
  };

  /* healer skills: the per-ally heal events carry the heal visual, so drop only the tall beams of the cast */
  const HEALERS = new Set(['kai', 'orion']);
  if (typeof hero === 'function') {
    const previousHero = hero;
    hero = function (u, big) {
      const soft = u && HEALERS.has(u.id) && !big;
      if (soft) softDrop = new Set(['beam']);
      try { return previousHero.apply(this, arguments); } finally { if (soft) softDrop = null; }
    };
  }

  window.OWL_VFX = { classify, govern, capsNow, stats: () => Object.assign({}, stats, { active: FX.length }), premiumHeal, install };
  console.info('[OWL v3.3] VFX governor active (caps, opacity limits, heal consolidation).');
})();
