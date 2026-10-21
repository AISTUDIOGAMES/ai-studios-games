// Explorable top-down world. One requestAnimationFrame loop per startWorld(); stop() removes every listener.
import { MAPS, QUESTS, buildGrid, canStand } from "./world-data.js";
import { createQuests } from "./world-quests.js";
import { loadWorld, saveWorld } from "./world-save.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const KEYMAP = { w: "up", arrowup: "up", s: "down", arrowdown: "down", a: "left", arrowleft: "left", d: "right", arrowright: "right" };
const SPEED = 4.4, imgs = {};
let S = null, loops = 0; // S survives battles, so the player returns to the exact spot

const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
function img(host, file) { if (!imgs[file]) { const i = new Image(); i.src = host.img(file); imgs[file] = i; } return imgs[file].complete && imgs[file].naturalWidth ? imgs[file] : null; }
/** Squad stored in the world save, or null when none is valid (used by the title screen). */
export const savedSquad = (host) => loadWorld(host).squad;

export function startWorld(root, host, newSquad) {
  S = S || loadWorld(host);
  if (newSquad) S.squad = newSquad;
  const map = MAPS[S.map], grid = buildGrid(map);
  root.innerHTML = `<canvas id="wc" role="img" aria-label="Top-down view of the Grid. Move with WASD or arrow keys; press E to interact."></canvas>
    <div class="w-top"><div class="w-area">${esc(map.name)}</div><div class="w-obj" id="w-obj" aria-live="polite"></div></div>
    <div class="w-btns"><button class="btn tiny" id="w-pause">PAUSE</button></div>
    <div class="w-hint" id="w-hint" aria-live="polite"></div><div class="w-toasts" id="w-toasts" aria-live="polite"></div>
    <div class="w-dlg" id="w-dlg" hidden role="dialog" aria-modal="true" aria-label="Dialogue"></div>
    <div class="w-pausebox" id="w-pausebox" hidden role="dialog" aria-modal="true" aria-label="Paused"><div><h2>PAUSED</h2>
      <p class="w-keys">WASD / ARROWS move · E / ENTER interact · ESC pause</p>
      <button class="btn primary" data-p="resume">RESUME</button><button class="btn" data-p="squad">CHANGE SQUAD</button><button class="btn ghost" data-p="exit">SAVE &amp; EXIT</button></div></div>
    <div class="w-touch"><div class="w-dpad"><button data-k="up" aria-label="Up">▲</button><button data-k="left" aria-label="Left">◀</button><button data-k="down" aria-label="Down">▼</button><button data-k="right" aria-label="Right">▶</button></div><button class="w-act" data-k="act" aria-label="Interact">E</button></div>`;
  const $ = (s) => root.querySelector(s);
  const cv = $("#wc"), g = cv.getContext("2d"), dlgBox = $("#w-dlg"), hintEl = $("#w-hint"), pauseBox = $("#w-pausebox");
  const P = { x: S.x, y: S.y, dir: "down", moving: false };
  const cam = { x: 0, y: 0 }, keys = new Set(), cleanups = [];
  const rain = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8 }));
  let raf = 0, last = 0, clock = 0, paused = false, dlg = null, dead = false, vw = 300, vh = 300, T = 48, dpr = 1, near = null, nearKey = "", frames = 0;

  /* ---- quests, hud, toasts ---- */
  const toast = (msg) => { const t = document.createElement("div"); t.className = "w-toast"; t.textContent = msg; $("#w-toasts").appendChild(t); setTimeout(() => t.remove(), 3600); };
  const Q = createQuests(QUESTS, S.quests, toast);
  const persist = () => { S.x = P.x; S.y = P.y; saveWorld(S); };
  function hud() {
    const rows = Q.rows();
    $("#w-obj").innerHTML = rows.length ? rows.map((q) => `<div class="w-q ${q.ready ? "ready" : ""}"><b>${esc(q.name)}</b>${q.items.map((i) => `<span class="${i.done ? "done" : ""}">${i.done ? "✔" : "◇"} ${esc(i.text)}</span>`).join("")}</div>`).join("") : `<div class="w-q"><span>Explore the plaza. Someone may need an Operator.</span></div>`;
  }
  const afterChange = () => { hud(); persist(); };

  /* ---- entities ---- */
  const npcs = map.npcs;
  const glitch = () => (S.flags.glitchSpawned && !S.flags.glitchDone ? { id: "glitch", x: map.glitch.x, y: map.glitch.y } : null);
  const blockers = () => [...npcs, glitch()].filter(Boolean);
  function nearest() {
    const px = P.x, py = P.y - 0.3; let best = null, bd = 1.5;
    blockers().forEach((n) => { const d = Math.hypot(n.x - px, n.y - 0.3 - py); if (d < bd) { bd = d; best = { type: n.id === "glitch" ? "glitch" : "npc", ref: n }; } });
    const rectD = (o) => Math.hypot(Math.max(o.x - px, 0, px - (o.x + o.w)), Math.max(o.y - py, 0, py - (o.y + o.h)));
    map.objects.forEach((o) => { const d = rectD(o); if (d < Math.min(bd, 1.1)) { bd = d; best = { type: "obj", ref: o }; } });
    map.exits.forEach((o) => { const d = rectD(o); if (d < Math.min(bd, 1.1)) { bd = d; best = { type: "exit", ref: o }; } });
    return best;
  }

  /* ---- dialogue ---- */
  function openDlg(who, lines, o = {}) { dlg = { who, lines, i: 0, o }; keys.clear(); renderDlg(); }
  function renderDlg() {
    const d = dlg, lastPage = d.i === d.lines.length - 1;
    dlgBox.hidden = false; dlgBox.style.setProperty("--c", d.who.color);
    dlgBox.innerHTML = `<b class="w-who">${esc(d.who.name)}</b><p>${esc(d.lines[d.i])}</p><div class="w-dact">${lastPage && d.o.choice ? `<button class="btn primary tiny" data-a="yes">${d.o.yes || "ACCEPT"} [E]</button><button class="btn tiny" data-a="no">${d.o.no || "NOT NOW"} [ESC]</button>` : `<button class="btn primary tiny" data-a="next">${lastPage ? "CLOSE" : "NEXT"} [E]</button>`}</div>`;
    dlgBox.querySelector("button").focus({ preventScroll: true });
  }
  function closeDlg(ok) {
    const d = dlg; dlg = null; dlgBox.hidden = true; dlgBox.innerHTML = ""; if (!d) return;
    if (ok && d.o.choice) d.o.choice(); d.o.after?.(); afterChange();
  }
  function advance(a) {
    if (!dlg) return;
    if (a === "no") return closeDlg(false);
    if (a === "yes") return closeDlg(true);
    if (dlg.i < dlg.lines.length - 1) { dlg.i++; renderDlg(); } else closeDlg(true);
  }

  /* ---- interaction ---- */
  function talk(n) {
    Q.emit("talk:" + n.id);
    const who = { name: n.name, color: n.color }, st = n.quest && Q.status(n.quest);
    S.safe = { x: P.x, y: P.y };
    if (st === "idle") return openDlg(who, n.offer, { choice: () => Q.accept(n.quest) });
    if (st === "active") return openDlg(who, n.active);
    if (st === "ready") return openDlg(who, n.ready, { after: () => Q.complete(n.quest) });
    if (st === "done") return openDlg(who, n.done);
    const pool = n.lateIf && Q.status(n.lateIf) === "done" && n.late ? n.late : n.idle, c = S.flags.talk[n.id] || 0;
    S.flags.talk[n.id] = c + 1; openDlg(who, pool[c % pool.length]);
  }
  function interact() {
    if (!near) return;
    const { type, ref } = near;
    if (type === "npc") talk(ref);
    else if (type === "obj") { const r = ref.inspect({ Q, S }); openDlg({ name: ref.label, color: "#8f95a5" }, r.lines, { after: () => { r.effect?.(S); if (r.event) Q.emit(r.event); } }); }
    else if (type === "glitch") openDlg({ name: "STATIC GLITCH", color: "#ff5c8a" }, ["The glitch hisses and lunges. There's no talking to it."], { choice: startFight, yes: "FIGHT", no: "BACK OFF" });
    else if (type === "exit") {
      if (ref.to && MAPS[ref.to]) { S.map = ref.to; S.x = ref.spawn.x; S.y = ref.spawn.y; S.safe = { ...ref.spawn }; saveWorld(S); return host.resume(); }
      openDlg({ name: ref.label, color: "#f0cf7a" }, [ref.msg]);
    }
  }
  function startFight() {
    persist();
    host.fight(S.squad, 0, (res) => { S.pending = res; host.resume(); });
  }

  /* ---- pending battle result ---- */
  if (S.pending) {
    const res = S.pending; S.pending = null;
    if (res === "win") { S.flags.glitchDone = true; Q.emit("win:glitch"); toast("STATIC PURGED"); }
    else if (res === "lose") { P.x = S.safe.x; P.y = S.safe.y; toast("SQUAD RETURNED TO THE SAFE POINT"); }
  }
  hud(); persist();

  /* ---- loop ---- */
  function update(dt) {
    let dx = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0), dy = (keys.has("down") ? 1 : 0) - (keys.has("up") ? 1 : 0);
    P.moving = !!(dx || dy);
    if (P.moving) {
      const l = Math.hypot(dx, dy); dx = (dx / l) * SPEED * dt; dy = (dy / l) * SPEED * dt;
      P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      const free = (x, y) => canStand(grid, map, x, y) && blockers().every((b) => { const nd = Math.hypot(x - b.x, (y - b.y) * 1.4); return nd >= 0.55 || nd >= Math.hypot(P.x - b.x, (P.y - b.y) * 1.4); });
      if (free(P.x + dx, P.y)) P.x += dx;
      if (free(P.x, P.y + dy)) P.y += dy;
    }
    near = nearest();
    const nk = near ? near.type + (near.ref.id || "") : "";
    if (nk !== nearKey) { nearKey = nk; hintEl.textContent = near ? `[E] ${near.type === "npc" ? "Talk to " + near.ref.name : near.type === "glitch" ? "Engage the Static glitch" : "Inspect " + near.ref.label}` : ""; hintEl.classList.toggle("on", !!near); }
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t; clock += dt; frames++;
    if (!dlg) update(dt);
    const cw = vw / T, ch = vh / T, tx = map.w > cw ? Math.max(0, Math.min(map.w - cw, P.x - cw / 2)) : (map.w - cw) / 2, ty = map.h > ch ? Math.max(0, Math.min(map.h - ch, P.y - 0.7 - ch / 2)) : (map.h - ch) / 2;
    const k = Math.min(1, dt * 8); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    draw(dt, cw, ch);
  }
  function loop(on) { cancelAnimationFrame(raf); if (on && !dead) { last = performance.now(); raf = requestAnimationFrame(frame); loops++; } }
  function setPaused(v) {
    if (dead || paused === v) return; paused = v; pauseBox.hidden = !v; keys.clear();
    if (v) { cancelAnimationFrame(raf); loops--; pauseBox.querySelector("button").focus({ preventScroll: true }); persist(); } else loop(true);
  }

  /* ---- drawing ---- */
  function drawSprite(e, dt) {
    const x = (e.x - cam.x) * T, y = (e.y - cam.y) * T, mv = e.moving, bob = mv ? Math.abs(Math.sin(clock * 11)) * 0.07 : Math.sin(clock * 2 + e.x) * 0.015;
    g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(x, y, T * 0.3, T * 0.1, 0, 0, 7); g.fill();
    g.save(); g.translate(x, y - bob * T); if (mv) g.rotate(Math.sin(clock * 11) * 0.06); if (e.dir === "left") g.scale(-1, 1);
    const im = e.file && img(host, e.file);
    if (im) { const h = T * 1.7, w = (im.naturalWidth / im.naturalHeight) * h; g.drawImage(im, -w / 2, -h, w, h); }
    else if (e.glyph === "owl") { g.fillStyle = e.color; g.beginPath(); g.ellipse(0, -T * 0.55, T * 0.3, T * 0.45, 0, 0, 7); g.fill(); g.fillStyle = "#090b10"; [-1, 1].forEach((s) => { g.beginPath(); g.arc(s * T * 0.12, -T * 0.7, T * 0.08, 0, 7); g.fill(); }); g.fillStyle = e.color; [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(s * T * 0.12, -T * 0.95); g.lineTo(s * T * 0.3, -T * 1.12); g.lineTo(s * T * 0.28, -T * 0.82); g.fill(); }); }
    else if (e.glyph === "drone") { g.fillStyle = "#10131b"; g.strokeStyle = e.color; g.lineWidth = 2; g.beginPath(); g.ellipse(0, -T * 0.7 - Math.sin(clock * 3) * 3, T * 0.32, T * 0.24, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = e.color; g.beginPath(); g.arc(0, -T * 0.7 - Math.sin(clock * 3) * 3, T * 0.08, 0, 7); g.fill(); }
    else if (e.glyph === "glitch") { const j = Math.sin(clock * 30) * 2; g.fillStyle = "rgba(255,92,138,.85)"; g.strokeStyle = "#ff5c8a"; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; g.lineTo(Math.cos(a) * T * 0.38 + j, -T * 0.6 + Math.sin(a) * T * 0.38); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#fff"; g.beginPath(); g.arc(j, -T * 0.6, T * 0.1, 0, 7); g.fill(); }
    else { g.fillStyle = e.color; g.fillRect(-T * 0.2, -T * 1.1, T * 0.4, T * 1.1); }
    g.restore();
    if (near && near.ref.id === e.id && near.type !== "obj") bubble(x, y - T * 1.85);
  }
  function bubble(x, y) { g.fillStyle = "#b6ff3b"; g.beginPath(); g.roundRect(x - 11, y - 11 + Math.sin(clock * 5) * 2, 22, 22, 5); g.fill(); g.fillStyle = "#090b10"; g.font = "700 13px 'Space Mono',monospace"; g.textAlign = "center"; g.fillText("E", x, y + 5 + Math.sin(clock * 5) * 2); }
  function drawBuilding(b) {
    const x = (b.x - cam.x) * T, y = (b.y - cam.y) * T, w = b.w * T, h = b.h * T;
    g.fillStyle = "#171b2e"; g.fillRect(x, y, w, h * 0.42); g.fillStyle = "#0c0f1b"; g.fillRect(x, y + h * 0.42, w, h * 0.58);
    g.strokeStyle = b.c; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle = b.c; g.font = `800 ${Math.round(T * 0.4)}px 'Barlow Condensed',Impact,sans-serif`; g.textAlign = "center"; g.globalAlpha = 0.85 + Math.sin(clock * 3 + b.x) * 0.1; g.fillText(b.label, x + w / 2, y + h * 0.3); g.globalAlpha = 1;
    for (let i = 0; i < b.w * 2 - 1; i++) for (let j = 0; j < 2; j++) { const hh = hash(b.x * 9 + i, b.y * 7 + j); if (hh % 3 && Math.sin(clock * 0.7 + hh) > -0.85) { g.fillStyle = "rgba(255,217,122,.75)"; g.fillRect(x + T * 0.3 + i * T * 0.5, y + h * 0.5 + j * T * 0.9, T * 0.25, T * 0.35); } }
  }
  function drawObject(o) {
    const x = (o.x - cam.x) * T, y = (o.y - cam.y) * T, w = o.w * T, h = o.h * T, cx = x + w / 2;
    if (o.kind === "door") { g.fillStyle = "#07080f"; g.fillRect(x + 4, y - T * 0.2, w - 8, h + T * 0.2); g.strokeStyle = "#ff7a3d"; g.lineWidth = 2; g.strokeRect(x + 4, y - T * 0.2, w - 8, h + T * 0.2); }
    else if (o.kind === "terminal") { g.fillStyle = "#1a2438"; g.fillRect(x + 6, y + 4, w - 12, h - 6); const bad = S.flags.glitchSpawned && !S.flags.glitchDone; g.fillStyle = bad ? (Math.sin(clock * 20) > 0 ? "#ff5c8a" : "#4a1020") : S.flags.glitchDone ? "#5fe3a8" : "#46e0ff"; g.fillRect(x + 10, y + 8, w - 20, h * 0.4); }
    else if (o.kind === "crate") { [0, 1].forEach((i) => { g.fillStyle = "#3a2c1f"; g.fillRect(x + i * T + 4, y + 6, T - 8, T - 8); g.strokeStyle = "#46e0ff"; g.lineWidth = 1; g.strokeRect(x + i * T + 4, y + 6, T - 8, T - 8); }); }
    else if (o.kind === "statue") { g.fillStyle = "#1c2140"; g.beginPath(); g.ellipse(cx, y + h - 6, w * 0.4, T * 0.22, 0, 0, 7); g.fill(); g.globalAlpha = 0.6 + Math.sin(clock * 4) * 0.2; g.strokeStyle = "#8a72ff"; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, y + h * 0.45, T * 0.5, T * 0.7, 0, 0, 7); g.stroke(); g.fillStyle = "#b6ff3b"; [-1, 1].forEach((s) => { g.beginPath(); g.arc(cx + s * T * 0.2, y + h * 0.4, T * 0.09, 0, 7); g.fill(); }); g.globalAlpha = 1; }
    else if (o.kind === "gate") { g.fillStyle = "#14070d"; g.fillRect(x, y, w, h); g.strokeStyle = "#ff5c8a"; g.lineWidth = 3; for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(x, y + i * T * 0.5); g.lineTo(x + w, y + i * T * 0.5 + T * 0.5); g.stroke(); } }
    if (near && near.ref === o) bubble(cx, y - T * 0.5);
  }
  function draw(dt, cw, ch) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = "#07090e"; g.fillRect(0, 0, vw, vh); g.textBaseline = "alphabetic";
    const x0 = Math.max(0, Math.floor(cam.x)), x1 = Math.min(map.w, Math.ceil(cam.x + cw)), y0 = Math.max(0, Math.floor(cam.y)), y1 = Math.min(map.h, Math.ceil(cam.y + ch)), p = map.plaza;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const px = Math.round((x - cam.x) * T), py = Math.round((y - cam.y) * T), n = hash(x, y), edge = x === 0 || y === 0 || x === map.w - 1 || y === map.h - 1;
      const pl = x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h;
      g.fillStyle = edge ? "#0a0c14" : pl ? (n % 2 ? "#181d31" : "#1b2137") : n % 3 ? "#10131c" : "#12161f"; g.fillRect(px, py, T + 1, T + 1);
      if (pl) { g.strokeStyle = "rgba(138,114,255,.2)"; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, T, T); }
      else if (!edge && n % 11 === 0) { g.fillStyle = "rgba(70,224,255,.07)"; g.beginPath(); g.ellipse(px + T / 2, py + T / 2, T * 0.4, T * 0.18, 0, 0, 7); g.fill(); }
    }
    const items = [...map.buildings.map((b) => ({ y: b.y + b.h, f: () => drawBuilding(b) })), ...map.objects.map((o) => ({ y: o.y + o.h, f: () => drawObject(o) })),
      ...map.lamps.map((l) => ({ y: l.y + 1, f: () => { const x = (l.x + 0.5 - cam.x) * T, y = (l.y + 1 - cam.y) * T; g.fillStyle = "#222840"; g.fillRect(x - 2, y - T * 1.3, 4, T * 1.3); g.fillStyle = "#ffd77a"; g.beginPath(); g.arc(x, y - T * 1.3, 5, 0, 7); g.fill(); } })),
      ...map.exits.map((o) => ({ y: o.y - 5, f: () => { const x = (o.x - cam.x) * T, y = (o.y - cam.y) * T; g.fillStyle = "rgba(182,255,59,.18)"; g.fillRect(x, y, o.w * T, T); g.strokeStyle = "#b6ff3b"; g.lineWidth = 2; for (let i = 0; i < o.w; i++) { g.beginPath(); g.moveTo(x + i * T + T * 0.25, y + T * 0.2 + Math.sin(clock * 4) * 2); g.lineTo(x + i * T + T * 0.5, y + T * 0.55); g.lineTo(x + i * T + T * 0.75, y + T * 0.2 + Math.sin(clock * 4) * 2); g.stroke(); } if (near && near.ref === o) bubble(x + o.w * T / 2, y - T * 0.5); } })),
      ...npcs.map((n) => ({ y: n.y, f: () => drawSprite({ ...n, file: n.hero && host.hero(n.hero).sprite, dir: "down" }) })),
      { y: P.y, f: () => drawSprite({ ...P, id: "player", color: host.hero(S.squad[0]).color, file: host.hero(S.squad[0]).sprite }) }];
    const gl = glitch(); if (gl) items.push({ y: gl.y, f: () => drawSprite({ ...gl, glyph: "glitch", color: "#ff5c8a", dir: "down" }) });
    items.sort((a, b) => a.y - b.y).forEach((i) => i.f());
    // night tint + neon light pools
    g.fillStyle = "rgba(6,5,22,.24)"; g.fillRect(0, 0, vw, vh); g.globalCompositeOperation = "lighter";
    const light = (lx, ly, c, rad, a) => { const x = (lx - cam.x) * T, y = (ly - cam.y) * T; if (x < -rad || y < -rad || x > vw + rad || y > vh + rad) return; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, c + a); gr.addColorStop(1, c + "00"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
    const fl = 0.85 + Math.sin(clock * 3) * 0.1;
    map.lamps.forEach((l) => light(l.x + 0.5, l.y - 0.3, "#ffd77a", T * 2.6, "33")); map.buildings.forEach((b) => light(b.x + b.w / 2, b.y + b.h, b.c, T * 3.2, fl > 0.9 ? "30" : "26"));
    light(15.5 + 0.5, 12, "#8a72ff", T * 3, "33"); map.objects.filter((o) => o.kind === "terminal").forEach((o) => light(o.x + 0.5, o.y + 0.5, S.flags.glitchSpawned && !S.flags.glitchDone ? "#ff5c8a" : "#46e0ff", T * 2.2, "44"));
    light(P.x, P.y - 0.6, "#ffffff", T * 1.6, "14"); g.globalCompositeOperation = "source-over";
    // rain
    g.strokeStyle = "rgba(170,200,255,.32)"; g.lineWidth = 1; g.beginPath();
    rain.forEach((d) => { d.y += dt * d.s * 1.2; d.x -= dt * 0.04; if (d.y > 1) { d.y = -0.05; d.x = Math.random() * 1.1; } const rx = d.x * vw, ry = d.y * vh; g.moveTo(rx, ry); g.lineTo(rx - 3, ry + 12 * d.s); }); g.stroke();
  }

  /* ---- input + lifecycle ---- */
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };
  const act = () => { if (paused) return; dlg ? advance("next") : interact(); };
  on(document, "keydown", (e) => {
    const k = e.key.toLowerCase();
    if (KEYMAP[k]) { e.preventDefault(); if (!paused && !dlg) keys.add(KEYMAP[k]); return; }
    if (e.repeat) return;
    if (k === "e" || k === "enter") { e.preventDefault(); act(); }
    else if (k === "escape" || k === "p") { e.preventDefault(); if (dlg) advance("no"); else setPaused(!paused); }
  });
  on(document, "keyup", (e) => keys.delete(KEYMAP[e.key.toLowerCase()]));
  on(window, "blur", () => { keys.clear(); setPaused(true); });
  on(document, "visibilitychange", () => { if (document.hidden) setPaused(true); });
  on(dlgBox, "click", (e) => { const b = e.target.closest("[data-a]"); if (b) advance(b.dataset.a); });
  on($("#w-pause"), "click", () => setPaused(true));
  on(pauseBox, "click", (e) => { const b = e.target.closest("[data-p]"); if (!b) return; if (b.dataset.p === "resume") setPaused(false); else { persist(); b.dataset.p === "squad" ? host.pickSquad() : host.exit(); } });
  root.querySelectorAll(".w-touch [data-k]").forEach((b) => {
    const k = b.dataset.k;
    on(b, "pointerdown", (e) => { e.preventDefault(); if (k === "act") act(); else if (!paused && !dlg) keys.add(k); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => on(b, ev, () => keys.delete(k)));
  });
  on(root, "contextmenu", (e) => e.preventDefault());
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); const r = root.getBoundingClientRect(); vw = Math.max(200, r.width); vh = Math.max(200, r.height); cv.width = vw * dpr; cv.height = vh * dpr; T = Math.round(Math.max(30, Math.min(64, vw / (vw < 700 ? 11 : 18)))); if (paused) draw(0, vw / T, vh / T); };
  const ro = new ResizeObserver(resize); ro.observe(root); cleanups.push(() => ro.disconnect()); resize();
  cam.x = Math.max(0, Math.min(map.w - vw / T, P.x - vw / T / 2)); cam.y = Math.max(0, Math.min(map.h - vh / T, P.y - 0.7 - vh / T / 2));
  const auto = setInterval(() => { if (!paused && !dead) persist(); }, 8000); cleanups.push(() => clearInterval(auto));
  loop(true);

  const api = {
    stop() { if (dead) return; persist(); if (!paused) loops--; dead = true; cancelAnimationFrame(raf); cleanups.forEach((f) => f()); },
  };
  if (new URLSearchParams(location.search).has("debug")) window.__owl = { get S() { return S; }, P, Q, keys, interact, nearest: () => near, loops: () => loops, frames: () => frames, dlg: () => dlg, paused: () => paused, advance };
  return api;
}
