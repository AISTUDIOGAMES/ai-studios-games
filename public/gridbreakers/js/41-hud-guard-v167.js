/* =====================================================================
   OWL GRIDBREAKERS v3.3 — BATTLE HUD LAYOUT GUARD (presentation only)
   Keeps every battle control inside the visible arena on any screen size:
   - sizes skill buttons so they never collide with the control column,
   - shrinks the party portraits when the rail would overlap the controls,
   - compacts the top menu (icons only) when its labels do not fit,
   - reports any slot that still leaves the arena (OWL_HUD.report()).
   It only sets CSS variables / classes; combat and input logic are untouched.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_HUD_GUARD_V167__) return;
  window.__OWL_HUD_GUARD_V167__ = true;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SLOTS = ['bf-menu-slot', 'bf-resources-slot', 'bf-header-slot', 'bf-party-slot', 'bf-target-slot', 'bf-controls-slot', 'bf-skills-slot'];

  /* ---- pure sizing math (unit-tested in Node) ---- */
  function computeFit(m) {
    const gap = m.skillGap == null ? 5 : m.skillGap;
    const n = Math.max(1, m.nSkills || 1);
    // skills are centered: keep a mirrored margin equal to the control column on both sides
    const side = (m.ctrlW || 74) + 10;
    const availW = Math.max(60, m.arenaW - 2 * side);
    const skill = clamp(Math.floor((availW - gap * (n - 1)) / n), 26, 46);

    const members = Math.max(1, m.nParty || 5);
    const rowExtra = m.rowExtra == null ? 14 : m.rowExtra;           // v3.7: 3 bars (HP/SP/ULT) + gaps below each portrait
    const rowGap = m.rowGap == null ? 7 : m.rowGap;
    const availH = Math.max(40, (m.ctrlTop - m.partyTop) - (m.partyHeader || 18) - 4);
    const perRow = Math.floor((availH - rowGap * (members - 1)) / members);
    const rawPortrait = perRow - rowExtra;
    const portrait = clamp(rawPortrait, 22, 36);
    return { skill, portrait, compactMenu: !!m.menuOverflow, tightParty: rawPortrait < 22 };
  }

  /* ---- DOM measurement ---- */
  const $ = (s, r) => (r || document).querySelector(s);
  function rel(el, arenaRect) {
    const r = el.getBoundingClientRect();
    return { l: r.left - arenaRect.left, t: r.top - arenaRect.top, r: r.right - arenaRect.left, b: r.bottom - arenaRect.top, w: r.width, h: r.height };
  }
  function measure() {
    const arena = $('#arena'), hud = arena && $('#battlefield-hud', arena);
    if (!hud) return null;
    const A = arena.getBoundingClientRect();
    if (!A.width || !A.height) return null;
    const ctrl = $('#bf-controls-slot', hud), party = $('#bf-party-slot', hud), nav = $('#bf-menu-slot #nav', hud);
    const skills = hud.querySelectorAll('#bf-skills-slot .battle-skills .skb');
    const units = hud.querySelectorAll('#bf-party-slot #battle-roster .battle-unit');
    const C = ctrl ? rel(ctrl, A) : null, P = party ? rel(party, A) : null;
    return {
      hud, arena, A,
      m: {
        arenaW: A.width, arenaH: A.height,
        ctrlW: C ? C.w : 74, ctrlTop: C ? C.t : A.height - 120,
        partyTop: P ? P.t : 100, nParty: units.length || 5, nSkills: skills.length || 5,
        menuOverflow: !!(nav && nav.scrollWidth > nav.clientWidth + 2)
      }
    };
  }

  function report() {
    const ctx = measure(); if (!ctx) return [];
    const bad = [], tol = 1.5;
    SLOTS.forEach(id => {
      const el = $('#' + id, ctx.hud); if (!el) return;
      const r = rel(el, ctx.A);
      if (r.w > 0 && (r.l < -tol || r.t < -tol || r.r > ctx.A.width + tol || r.b > ctx.A.height + tol)) bad.push({ id, rect: r });
    });
    return bad;
  }

  let busy = false, lastKey = '';
  function fit() {
    if (busy) return; busy = true;
    try {
      const ctx = measure(); if (!ctx) return;
      const f = computeFit(ctx.m);
      const key = [f.skill, f.portrait, f.compactMenu, f.tightParty, Math.round(ctx.m.arenaW), Math.round(ctx.m.arenaH)].join('|');
      if (key === lastKey) return;
      lastKey = key;
      ctx.hud.setAttribute('data-fit', '1');
      ctx.hud.style.setProperty('--bf-skill', f.skill + 'px');
      ctx.hud.style.setProperty('--bf-portrait', f.portrait + 'px');
      ctx.hud.classList.toggle('bf-menu-compact', f.compactMenu);
      ctx.hud.classList.toggle('bf-party-tight', f.tightParty);
    } catch (e) { console.warn('[OWL v3.3] HUD guard skipped', e); }
    finally { busy = false; }
  }

  let raf = 0, lastRun = 0;
  const MIN_INTERVAL = 250; // ms: layout reads are throttled, combat keeps its frame budget
  const schedule = () => {
    if (raf) return;
    raf = (window.requestAnimationFrame || setTimeout)(() => {
      raf = 0;
      const now = Date.now();
      if (now - lastRun < MIN_INTERVAL) { schedule.later(); return; }
      lastRun = now;
      if (typeof view !== 'undefined' && view === 'battle') fit();
    });
  };
  schedule.later = () => { if (schedule.t) return; schedule.t = setTimeout(() => { schedule.t = 0; schedule(); }, MIN_INTERVAL); };

  window.addEventListener('resize', () => { lastKey = ''; schedule(); });
  window.addEventListener('orientationchange', () => { lastKey = ''; setTimeout(() => { lastKey = ''; schedule(); }, 250); });
  try {
    const mo = new MutationObserver(records => {
      // ignore floating combat numbers and flashes: they change constantly and never affect layout
      const relevant = records.some(r => !(r.target && r.target.closest && r.target.closest('#combat-number-layer, .fx2')));
      if (relevant) schedule();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { lastKey = ''; schedule(); });
      const watch = () => { const a = $('#arena'); if (a && a.__owlRO !== ro) { a.__owlRO = ro; ro.observe(a); } };
      setInterval(watch, 1500); watch();
    }
  } catch (e) { /* observers are best-effort */ }

  window.OWL_HUD = { computeFit, fit, report, measure };
  console.info('[OWL v3.3] HUD layout guard active.');
})();
