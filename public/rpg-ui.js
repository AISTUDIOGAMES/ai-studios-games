import * as E from "./rpg-engine.js";
import { enemyArt } from "./rpg-art.js";
import { sceneArt } from "./rpg-scenes.js";
import { startWorld, savedSquad } from "./world.js";
import { hasWorldSave } from "./world-save.js";

const $ = (s, r = document) => r.querySelector(s);
const root = $("#root");
const IMG = (f) => `images/${f}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ------------------------------------------------------------------ save */
const SAVE_KEY = "owl_gridbreakers_v1";
let save = { unlocked: [], clears: 0, muted: false };
try { save = { ...save, ...JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") }; } catch { /* storage unavailable */ }
if (new URLSearchParams(location.search).has("unlock")) save.unlocked = ["aeon", "orion"]; // dev switch
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ } };
const isLocked = (k) => !!E.HEROES[k].legendary && !save.unlocked.includes(k);

/* ----------------------------------------------------------------- audio */
let ac = null;
function tone(freq, to, dur, type = "square", vol = 0.05, delay = 0) {
  if (save.muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch { /* audio unavailable */ }
}
const sfx = {
  hit: () => tone(180, 60, 0.12), crit: () => { tone(260, 70, 0.16, "sawtooth"); tone(520, 120, 0.12, "square", 0.04, 0.03); },
  heal: () => { tone(520, 780, 0.18, "sine", 0.06); tone(780, 1040, 0.16, "sine", 0.05, 0.1); },
  buff: () => tone(400, 640, 0.12, "triangle", 0.05), ult: () => { tone(120, 900, 0.5, "sawtooth", 0.06); tone(240, 1200, 0.5, "square", 0.03, 0.08); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.22, "triangle", 0.06, i * 0.13)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, f * 0.9, 0.3, "sawtooth", 0.05, i * 0.2)),
  click: () => tone(600, 500, 0.05, "square", 0.03),
};

/* ----------------------------------------------------------------- state */
let run = null;       // { party, stage, mods }
let battle = null;
let speed = 1;
let epoch = 0;          // bumps on every screen change: any async loop from an older screen stops itself
let worldHandle = null; // running explorable world, stopped by setScreen
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / speed));
const unitById = (id) => (battle ? [...battle.party, ...battle.enemies].find((u) => u.id === id) : null);

const E_COLOR = (u) => (u.team === "p" ? E.HEROES[u.key] : E.ENEMIES[u.key]).color;

/* --------------------------------------------------------------- screens */
function setScreen(html, cls = "") { epoch++; keyHandler = null; if (worldHandle) { worldHandle.stop(); worldHandle = null; } root.innerHTML = `<div class="screen ${cls}">${html}</div>`; return root.firstElementChild; }
const muteLabel = () => (save.muted ? "SOUND OFF" : "SOUND ON");
function bindMute(btn) { btn.addEventListener("click", () => { save.muted = !save.muted; persist(); btn.textContent = muteLabel(); }); }

function showTitle() {
  setScreen(`
    <div class="title-wrap">
      <img class="title-badge" src="${IMG("logo-badge.webp")}" alt="" />
      <div class="eyebrow">OWL STUDIOS GAME // PROTOTYPE 0.1</div>
      <h1>OWL<span>:</span> GRIDBREAKERS</h1>
      <p class="lead">A turn-based RPG set in the Grid. Pick three Operators, push through five sectors and stand against the Static.</p>
      <div class="title-btns"><button class="btn primary" id="explore">${hasWorldSave() && savedSquad(worldHost) ? "CONTINUE EXPLORING" : "EXPLORE THE GRID"}</button><button class="btn" id="start">NEW RUN</button><a class="btn" href="/">BACK TO SITE</a><button class="btn ghost" id="mute">${muteLabel()}</button></div>
      <div class="title-meta">${save.clears ? `RUNS CLEARED: ${save.clears} // ` : ""}LEGENDARY OPERATORS UNLOCKED: ${save.unlocked.length}/2</div>
    </div>`, "title");
  $("#start").addEventListener("click", () => { sfx.click(); showSelect(); });
  $("#explore").addEventListener("click", () => { sfx.click(); const sq = savedSquad(worldHost); sq ? enterWorld(null) : showSelect("world"); });
  bindMute($("#mute"));
}

function statLine(d) { return `<span>HP <b>${d.hp}</b></span><span>ATK <b>${d.atk}</b></span><span>DEF <b>${d.def}</b></span><span>SPD <b>${d.spd}</b></span>`; }

function showSelect(mode = "run") {
  const picked = [];
  let focus = "lyra";
  setScreen(`
    <header class="page-head"><div><div class="eyebrow">${mode === "world" ? "EXPLORE // CHOOSE YOUR SQUAD" : "STEP 1 // BUILD YOUR SQUAD"}</div><h2>CHOOSE <span>3 OPERATORS</span></h2></div><button class="btn ghost" id="back">← TITLE</button></header>
    <p class="tip">Tip: mix roles. A healer or shield-giver (Lyra, Vex, Aeon) keeps the squad alive; tanks like Titan protect the fragile.</p>
    <div class="pick-grid" id="grid"></div>
    <div class="detail" id="detail"></div>
    <div class="pick-foot"><span id="count"></span><button class="btn primary" id="go" disabled>${mode === "world" ? "ENTER THE GRID" : "START RUN"}</button></div>`, "select");
  const draw = () => {
    $("#grid").innerHTML = E.HERO_ORDER.map((k) => {
      const d = E.HEROES[k], lock = isLocked(k), on = picked.includes(k);
      return `<button class="pick ${on ? "on" : ""} ${lock ? "locked" : ""}" data-k="${k}" style="--c:${d.color}">
        <div class="pick-art"><img src="${IMG(d.sprite)}" alt="${esc(d.name)}" loading="lazy" /></div>
        <b>${d.name}</b><em>${d.role}${d.legendary ? " // LEGENDARY" : ""}</em>
        <div class="mini">${statLine(d)}</div>
        ${lock ? `<div class="lock">LOCKED<br/><small>${k === "aeon" ? "Clear Sector 3" : "Clear Sector 5"}</small></div>` : ""}
        ${on ? `<div class="check">${picked.indexOf(k) + 1}</div>` : ""}
      </button>`;
    }).join("");
    const d = E.HEROES[focus];
    $("#detail").style.setProperty("--c", d.color);
    $("#detail").innerHTML = `<div class="det-l"><b>${d.name}</b> <small>${esc(d.title)} // ${d.role}</small><p class="quote">“${esc(d.quote)}”</p><p class="pas"><i>PASSIVE</i> <b>${esc(d.passive[0])}</b> — ${esc(d.passive[1])}</p></div>
      <div class="det-r">${["basic", "s1", "s2", "ult"].map((s) => `<div class="ab"><i>${s === "basic" ? "BASIC" : s === "ult" ? "ULTIMATE" : "SKILL"}${d[s].cd ? ` // CD ${d[s].cd}` : ""}</i><b>${esc(d[s].name)}</b><span>${esc(d[s].desc)}</span></div>`).join("")}</div>`;
    $("#count").textContent = `${picked.length}/3 SELECTED`;
    $("#go").disabled = picked.length !== 3;
  };
  $("#grid").addEventListener("click", (e) => {
    const el = e.target.closest(".pick"); if (!el) return;
    const k = el.dataset.k; focus = k; sfx.click();
    if (!isLocked(k)) { const i = picked.indexOf(k); if (i >= 0) picked.splice(i, 1); else if (picked.length < 3) picked.push(k); }
    draw();
  });
  $("#back").addEventListener("click", showTitle);
  $("#go").addEventListener("click", () => { sfx.click(); mode === "world" ? enterWorld(picked) : startRun(picked); });
  draw();
}

function startRun(keys) {
  run = { party: keys.map((k, i) => E.makeHero(k, i)), stage: 0, mods: {} };
  showStory();
}

function showStory() {
  const st = E.STAGES[run.stage];
  const quotes = run.party.slice(0, 2).map((u) => `<p class="say" style="--c:${E.HEROES[u.key].color}"><b>${u.name}</b> “${esc(E.HEROES[u.key].quote)}”</p>`).join("");
  setScreen(`
    <div class="story-wrap" style="--sky1:${st.sky[0]};--sky2:${st.sky[1]}">
      <div class="eyebrow">SECTOR ${run.stage + 1} OF ${E.STAGES.length}</div>
      <h2>${esc(st.name)}</h2>
      <p class="intro">${esc(st.intro)}</p>
      <div class="says">${quotes}</div>
      <div class="foe-preview">${st.enemies.map((k) => `<div class="fp" title="${esc(E.ENEMIES[k].name)}">${enemyArt(E.ENEMIES[k].art, E.ENEMIES[k].color)}<small>${esc(E.ENEMIES[k].name)}</small></div>`).join("")}</div>
      <button class="btn primary" id="fight">ENTER THE SECTOR</button>
    </div>`, "story");
  $("#fight").addEventListener("click", () => { sfx.click(); startBattle(); });
}

/* ----------------------------------------------------------------- world */
const worldHost = {
  img: IMG, hero: (k) => E.HEROES[k], locked: isLocked,
  fight: (keys, stage, done) => fightEncounter(keys, stage, done),
  resume: () => enterWorld(null), pickSquad: () => showSelect("world"), exit: () => showTitle(),
};
function enterWorld(squad) {
  const el = setScreen("", "worldscreen");
  worldHandle = startWorld(el, worldHost, squad);
}
/** Runs one battle with the existing engine; `done("win" | "lose" | "flee")` brings the player back to the world. */
function fightEncounter(keys, stageIdx, done) {
  run = { party: keys.map((k, i) => E.makeHero(k, i)), stage: stageIdx, mods: {}, encounter: done, keys };
  startBattle();
}
function finishEncounter(res) { const cb = run.encounter; if (res === "win") sfx.win(); run = null; cb(res); }
function encounterLost() {
  sfx.lose(); const { keys, stage, encounter } = run;
  setScreen(`<div class="end-wrap lose"><div class="eyebrow">SIGNAL LOST</div><h2>THE SQUAD <span>FALLS</span></h2><p class="lead">The Static wins this round. Try again, or fall back to the last safe point.</p>
    <div class="title-btns"><button class="btn primary" id="retry">TRY AGAIN</button><button class="btn" id="safe">RETURN TO SAFE POINT</button></div></div>`, "end");
  $("#retry").addEventListener("click", () => { sfx.click(); fightEncounter(keys, stage, encounter); });
  $("#safe").addEventListener("click", () => { sfx.click(); run = { encounter }; finishEncounter("lose"); });
}

/* ---------------------------------------------------------------- battle */
const ST = { atkUp: ["ATK↑", "good"], defUp: ["DEF↑", "good"], shield: ["SHD", "good"], taunt: ["TAUNT", "good"], regen: ["REGEN", "good"], invuln: ["STASIS", "good"], counter: ["PARRY", "good"], stealth: ["VANISH", "good"], mark: ["MARK", "bad"], stun: ["STUN", "bad"], weaken: ["WEAK", "bad"], confuse: ["HIJACK", "bad"] };

function unitHTML(u) {
  const p = u.team === "p";
  const d = p ? E.HEROES[u.key] : E.ENEMIES[u.key];
  const art = p ? `<img class="u-sprite" src="${IMG(d.sprite)}" alt="${esc(u.name)}" />` : enemyArt(d.art, d.color);
  return `<div class="unit ${p ? "p" : "e"} ${u.boss ? "boss" : ""} ${u.final ? "final" : ""}" id="u-${u.id}" data-id="${u.id}" style="--c:${d.color}">
    <div class="u-top"><span class="u-name">${esc(u.name)}</span><div class="u-fx"></div></div>
    <div class="bars"><span class="badge">${p ? esc(d.role.slice(0, 3).toUpperCase()) : u.boss ? "BOSS" : "FOE"}</span><div class="bcol"><div class="hp"><i></i><b></b></div>${p ? '<div class="ult"><i></i><b>ULT</b></div>' : ""}</div></div>
    <div class="u-art">${art}<div class="u-fl"></div></div>
  </div>`;
}
function setHp(id, hp, max) {
  const el = $("#u-" + id); if (!el) return;
  $(".hp i", el).style.width = `${Math.max(0, (hp / max) * 100)}%`;
  $(".hp b", el).textContent = `${hp}/${max}`;
}
function refreshUnit(u) {
  const el = $("#u-" + u.id); if (!el) return;
  el.classList.toggle("dead", !u.alive);
  setHp(u.id, u.hp, u.max);
  const ult = $(".ult i", el);
  if (ult) { ult.style.width = `${u.charge}%`; $(".ult", el).classList.toggle("ready", u.charge >= 100); }
  $(".u-fx", el).innerHTML = Object.entries(u.status).filter(([k]) => ST[k]).map(([k, v]) => `<span class="chip ${ST[k][1]}">${ST[k][0]}${v.turns < 9 ? v.turns : ""}</span>`).join("");
}
const refreshAll = () => { [...battle.party, ...battle.enemies].forEach(refreshUnit); };

function floatText(id, msg, cls) {
  const el = $("#u-" + id); if (!el) return;
  const f = document.createElement("div"); f.className = `fl ${cls}`; f.textContent = msg;
  $(".u-fl", el).appendChild(f); setTimeout(() => f.remove(), 1300 / speed);
}
function pulse(id, cls, ms = 350) { const el = $("#u-" + id); if (!el) return; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms / speed); }
function logLine(msg, cls = "") {
  const l = $("#log"); if (!l) return;
  const d = document.createElement("div"); d.className = cls; d.innerHTML = msg; l.appendChild(d);
  while (l.children.length > 80) l.firstChild.remove();
  l.scrollTop = l.scrollHeight;
}
function drawTurnbar(activeId) {
  const bar = $("#turnbar"); if (!bar) return;
  const rest = battle.queue.slice(Math.max(0, battle.qi - 1)).filter((u) => u.alive);
  bar.innerHTML = rest.slice(0, 9).map((u) => {
    const c = u.team === "p" ? E.HEROES[u.key].color : E.ENEMIES[u.key].color;
    return `<span class="tb ${u.team} ${u.id === activeId ? "now" : ""}" style="--c:${c}" title="${esc(u.name)}">${esc(u.name.replace("THE ", "").slice(0, 2))}</span>`;
  }).join("");
}
function flash(color) {
  const f = $("#flash"); if (!f) return;
  f.style.setProperty("--fc", color + "99"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
}
function quake() {
  const a = $("#arena"); if (!a) return;
  a.classList.remove("quake"); void a.offsetWidth; a.classList.add("quake");
}
/* ---------------------------------------------------------- camera + hits */
/** Centre of an element in the coordinate space of `stop`, ignoring transforms (so it stays correct while the camera is zoomed). */
function ctr(el, stop) {
  let x = el.offsetWidth / 2, y = el.offsetHeight * 0.55;
  for (let n = el; n && n !== stop; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
  return [x, y];
}
/** Moves the camera to a unit (or back to the wide shot when id is null). z = zoom, sec = move time. */
function camTo(id, z = 1, sec = 0.45) {
  const a = $("#arena"); if (!a) return;
  let tx = 0, ty = 0;
  const el = id && $("#u-" + id + " .u-art");
  if (el && z > 1) {
    const W = a.clientWidth, H = a.clientHeight, [px, py] = ctr(el, a);
    tx = Math.max(-W * (z - 1) / 2, Math.min(W * (z - 1) / 2, (px - W / 2) * (0.35 - z)));
    ty = Math.max(-H * (z - 1) / 2, Math.min(H * (z - 1) / 2, (py - H / 2) * (0.35 - z)));
  }
  a.style.setProperty("--z", z); a.style.setProperty("--tx", `${tx}px`); a.style.setProperty("--ty", `${ty}px`); a.style.setProperty("--camt", `${sec / speed}s`);
}
const FX_STYLE = { kira: "slash", kai: "slash", jax: "slash", titan: "impact", vex: "beam", aeon: "beam", orion: "holy", lyra: "orb" };
const fxStyle = (u) => (u.team === "p" ? FX_STYLE[u.key] || "orb" : u.boss ? "impact" : "orb");
function fxEl(cls, x, y, c, css = "") {
  const d = document.createElement("div"); d.className = `fx ${cls}`; d.style.cssText = `left:${x}px;top:${y}px;--c:${c};${css}`; $("#cam").appendChild(d); return d;
}
function runFx(el, frames, ms, delay = 0) {
  return new Promise((res) => {
    const end = () => { el.remove(); res(); };
    if (!el.animate) return end();
    const an = el.animate(frames, { duration: ms / speed, delay: delay / speed, easing: "ease-out", fill: "both" });
    an.onfinish = end; setTimeout(end, (ms + delay) / speed + 150);
  });
}
/** Plays the visual for one hit, by attack style: orb, slash, impact, beam or holy pillar. */
async function strike(a, t, big) {
  const cam = $("#cam"), A = $("#u-" + a.id + " .u-art"), T = $("#u-" + t.id + " .u-art"); if (!cam || !A || !T) return;
  const c = E_COLOR(a), [x1, y1] = ctr(A, cam), [x2, y2] = ctr(T, cam), feet = y2 + T.offsetHeight * 0.4;
  switch (fxStyle(a)) {
    case "slash": {
      const angs = big ? [-40, 35, 90] : [-35, 35];
      await Promise.all(angs.map((g, i) => runFx(fxEl("slash", x2, y2, c), [{ transform: `rotate(${g}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${g}deg) scaleX(1.5)`, opacity: 1, offset: 0.45 }, { transform: `rotate(${g}deg) scaleX(1.6)`, opacity: 0 }], 220, i * 70)));
      break;
    }
    case "impact": quake(); await runFx(fxEl("ring", x2, feet, c), [{ transform: "scale(.3)", opacity: 1 }, { transform: `scale(${big ? 10 : 6})`, opacity: 0 }], 380); break;
    case "beam": {
      const len = Math.hypot(x2 - x1, y2 - y1), g = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      await runFx(fxEl("beam", x1, y1, c, `width:${len}px;height:${big ? 12 : 6}px`), [{ transform: `rotate(${g}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${g}deg) scaleX(1)`, opacity: 1, offset: 0.5 }, { transform: `rotate(${g}deg) scaleX(1)`, opacity: 0 }], 280);
      break;
    }
    case "holy": await runFx(fxEl("pillar", x2, feet, c), [{ transform: "scaleY(0)", opacity: 1 }, { transform: "scaleY(1)", opacity: 1, offset: 0.4 }, { transform: "scaleY(1)", opacity: 0 }], 340); break;
    default: {
      const orb = fxEl("orb", 0, 0, c);
      await runFx(orb, [{ transform: `translate(${x1}px,${y1}px) scale(.6)` }, { transform: `translate(${x2}px,${y2}px) scale(1.2)` }], 190);
    }
  }
}
async function banner(text, ult) {
  const b = $("#banner"); if (!b) return;
  b.textContent = text; b.className = `banner show ${ult ? "ult" : ""}`;
  await sleep(ult ? 800 : 480);
  b.className = "banner";
}

async function play(events) {
  const my = epoch; let actor = null, hits = 0;
  for (const e of events) {
    if (my !== epoch) return;
    const u = e.id ? unitById(e.id) : null;
    switch (e.t) {
      case "round": actor = null; $("#round").textContent = `ROUND ${e.n}`; logLine(`— ROUND ${e.n} —`, "sep"); break;
      case "turn": actor = null; drawTurnbar(e.id); document.querySelectorAll(".unit.active").forEach((x) => x.classList.remove("active")); $("#u-" + e.id)?.classList.add("active"); break;
      case "act": actor = u; hits = 0; camTo(e.id, e.ult ? 1.32 : 1.16, 0.4); logLine(`<b>${esc(u.name)}</b> uses <i>${esc(e.name)}</i>`, u.team); if (e.ult) sfx.ult(); pulse(e.id, u.team === "p" ? "lunge-up" : "lunge-down", 380);
        if (e.ult) { flash(E_COLOR(u)); $("#arena")?.classList.add("cine"); }
        await banner(e.name.toUpperCase(), e.ult); $("#arena")?.classList.remove("cine"); break;
      case "dmg":
        hits += 1; camTo(hits === 1 ? e.id : null, hits === 1 ? (e.crit ? 1.42 : 1.26) : 1.14, 0.22);
        if (actor && actor.id !== u.id && actor.alive) await strike(actor, u, !!(e.crit || actor.ult));
        if (e.crit) { quake(); await sleep(110); }
        setHp(e.id, e.hp, e.max); floatText(e.id, e.absorbed && !e.amount ? "ABSORBED" : `-${e.amount}`, e.crit ? "crit" : "dmg"); pulse(e.id, "hurt", 350);
        e.crit ? sfx.crit() : sfx.hit(); logLine(`&nbsp;&nbsp;→ ${esc(u.name)} takes <b>${e.amount}</b>${e.crit ? " (CRIT)" : ""}${e.absorbed ? ` (${e.absorbed} absorbed)` : ""}`, "dim");
        refreshUnit(u); await sleep(240); break;
      case "heal": camTo(e.id, 1.12, 0.3); setHp(e.id, e.hp, e.max); floatText(e.id, `+${e.amount}`, "heal"); sfx.heal(); logLine(`&nbsp;&nbsp;→ ${esc(u.name)} recovers <b>${e.amount}</b>`, "dim"); await sleep(180); break;
      case "dodge": floatText(e.id, "DODGE", "good"); await sleep(220); break;
      case "text": floatText(e.id, e.msg, e.cls); await sleep(260); break;
      case "status": floatText(e.id, e.label, e.name === "mark" || e.name === "weaken" || e.name === "stun" || e.name === "confuse" ? "bad" : "good"); if (u) refreshUnit(u); await sleep(110); break;
      case "dead": camTo(e.id, 1.3, 0.3); pulse(e.id, "hurt", 400); logLine(`<b>${esc(u.name)}</b> is down!`, "bad"); if (u) refreshUnit(u); await sleep(380); break;
      case "revive": setHp(e.id, e.hp, e.max); floatText(e.id, "REVIVED", "heal"); sfx.heal(); if (u) refreshUnit(u); await sleep(240); break;
      case "spawn": $("#foeSide").insertAdjacentHTML("beforeend", unitHTML(e.unit)); refreshUnit(e.unit); logLine(`<b>${esc(e.unit.name)}</b> emerges from the noise`, "bad"); sfx.buff(); await sleep(350); break;
      default: break;
    }
  }
  if (my === epoch) { refreshAll(); camTo(null, 1, 0.5); }
}

/* player input */
let pendingTarget = null;
function renderCommand(u, onPick) {
  const d = E.HEROES[u.key];
  const btn = (slot, key) => {
    const a = d[slot]; const ok = E.canUse(battle, u, slot);
    const cdTxt = slot === "ult" ? (u.charge >= 100 ? "READY" : `${u.charge}%`) : slot === "basic" ? "" : (u.cd[slot] > 0 ? `CD ${u.cd[slot]}` : `CD ${a.cd}`);
    return `<button class="cbtn ${slot} ${ok ? "" : "off"}" data-slot="${slot}" ${ok ? "" : "disabled"}><span class="k">${key}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>${cdTxt ? `<em>${cdTxt}</em>` : ""}</button>`;
  };
  $("#command").style.setProperty("--c", d.color);
  $("#command").innerHTML = `<div class="cmd-head"><div class="cmd-name"><b>${esc(u.name)}</b><small>${d.role}</small></div><div class="passive"><i>PASSIVE</i> ${esc(d.passive[0])}</div><div class="hint" id="hint">YOUR TURN — choose an action</div></div>
    <div class="cbtns">${btn("basic", 1)}${btn("s1", 2)}${btn("s2", 3)}${btn("ult", 4)}</div>`;
  $("#command").classList.add("live");
  $(".cbtns").addEventListener("click", (e) => { const b = e.target.closest(".cbtn"); if (b && !b.disabled) { sfx.click(); onPick(b.dataset.slot); } });
}
function clearCommand(msg = "") {
  $("#command").classList.remove("live");
  $("#command").innerHTML = `<div class="cmd-head"><div class="hint">${msg}</div></div>`;
  document.querySelectorAll(".targetable").forEach((x) => x.classList.remove("targetable"));
  pendingTarget = null;
}
function waitChoice(u) {
  return new Promise((resolve) => {
    const choose = (slot) => {
      const d = E.HEROES[u.key][slot];
      if (d.target === "foe" || d.target === "ally") {
        const ts = E.validTargets(battle, u, slot);
        if (ts.length === 1) { resolve({ slot, target: ts[0].id }); return; }
        ts.forEach((t) => $("#u-" + t.id)?.classList.add("targetable"));
        $("#hint").innerHTML = `SELECT A TARGET <button class="link" id="cancel">CANCEL</button>`;
        $("#cancel").addEventListener("click", () => { document.querySelectorAll(".targetable").forEach((x) => x.classList.remove("targetable")); pendingTarget = null; $("#hint").textContent = "YOUR TURN — choose an action"; });
        pendingTarget = (id) => resolve({ slot, target: id });
      } else resolve({ slot, target: null });
    };
    renderCommand(u, choose);
    keyHandler = (e) => {
      const m = { 1: "basic", 2: "s1", 3: "s2", 4: "ult" }[e.key];
      if (m && E.canUse(battle, u, m)) { sfx.click(); choose(m); }
      if (e.key === "Escape" && pendingTarget) $("#cancel")?.click();
    };
  });
}
let keyHandler = null;
document.addEventListener("keydown", (e) => keyHandler && keyHandler(e));

async function startBattle() {
  const st = E.STAGES[run.stage];
  battle = E.createBattle(run.party, run.stage, run.mods);
  const scene = sceneArt(run.stage);
  setScreen(`
    <div class="hud"><div><b>${esc(st.name)}</b> <span id="round">ROUND 1</span></div><div class="hud-r"><button id="spd" class="btn tiny">SPEED ×1</button><button id="mute" class="btn tiny">${muteLabel()}</button><button id="quit" class="btn tiny">QUIT</button></div></div>
    <div class="turnbar" id="turnbar"></div>
    <div class="arena" id="arena" style="--sky1:${st.sky[0]};--sky2:${st.sky[1]}">
      <div class="scene far">${scene.far}</div><div class="scene mid">${scene.mid}</div>
      <div class="cam" id="cam">
        <div class="floorwrap"><div class="floor"></div></div>
        <div class="side foes" id="foeSide">${battle.enemies.map(unitHTML).join("")}</div>
        <div class="side party" id="partySide">${battle.party.map(unitHTML).join("")}</div>
      </div>
      <div class="flash" id="flash"></div>
      <div class="banner" id="banner"></div>
    </div>
    <div class="command" id="command"></div>
    <div class="log" id="log"></div>`, "battle");
  const my = epoch;
  $("#spd").addEventListener("click", (e) => { speed = speed === 1 ? 2 : speed === 2 ? 3 : 1; e.target.textContent = `SPEED ×${speed}`; });
  bindMute($("#mute"));
  $("#quit").addEventListener("click", () => { if (!confirm(run.encounter ? "Flee this fight and return to the Grid?" : "Quit this run?")) return; keyHandler = null; if (run.encounter) finishEncounter("flee"); else showTitle(); });
  $("#arena").addEventListener("click", (e) => { const el = e.target.closest(".unit.targetable"); if (el && pendingTarget) { const f = pendingTarget; sfx.click(); f(el.dataset.id); } });
  battle.party.concat(battle.enemies).forEach((u) => setHp(u.id, u.hp, u.max));
  refreshAll();
  logLine(`Entering <b>${esc(st.name)}</b>`, "sep");
  await sleep(500);

  while (!battle.over && my === epoch) {
    const t = E.nextTurn(battle);
    await play(t.events);
    if (my !== epoch) return;
    if (t.skipped) { await sleep(250); continue; }
    const u = t.unit;
    let evs;
    if (u.team === "e") { clearCommand(`${esc(u.name)} is acting…`); await sleep(350); evs = E.enemyAct(battle, u); }
    else {
      const c = await waitChoice(u); if (my !== epoch) return; keyHandler = null; clearCommand("");
      evs = E.playerAct(battle, u, c.slot, c.target);
    }
    await play(evs);
    await sleep(120);
  }
  if (my !== epoch) return;
  keyHandler = null; clearCommand("");
  await sleep(500);
  if (run.encounter) { if (battle.over === "win") finishEncounter("win"); else encounterLost(); }
  else if (battle.over === "win") stageClear(); else showEnd(false);
}

/* --------------------------------------------------------- after battle */
function stageClear() {
  const st = E.STAGES[run.stage];
  let unlockMsg = "";
  if (st.unlock && !save.unlocked.includes(st.unlock)) { save.unlocked.push(st.unlock); persist(); unlockMsg = E.HEROES[st.unlock].name; }
  sfx.win();
  if (run.stage === E.STAGES.length - 1) { save.clears += 1; persist(); showEnd(true, unlockMsg); return; }
  E.betweenStages(run.party);
  const opts = E.rollUpgrades(3);
  setScreen(`
    <div class="up-wrap">
      <div class="eyebrow">SECTOR CLEARED</div><h2>${esc(st.name)} <span>IS SAFE</span></h2>
      ${unlockMsg ? `<div class="unlock">NEW OPERATOR UNLOCKED: <b>${esc(unlockMsg)}</b> — available in your next run</div>` : ""}
      <p class="lead">The squad catches its breath and recovers. Choose one upgrade for the road ahead.</p>
      <div class="ups">${opts.map((o, i) => `<button class="up" data-i="${i}"><b>${esc(o.name)}</b><span>${esc(o.desc)}</span></button>`).join("")}</div>
    </div>`, "upgrade");
  document.querySelector(".ups").addEventListener("click", (e) => {
    const b = e.target.closest(".up"); if (!b) return;
    sfx.click(); opts[Number(b.dataset.i)].apply(run); run.stage += 1; showStory();
  });
}

function showEnd(win, unlockMsg = "") {
  if (!win) sfx.lose();
  setScreen(win ? `
    <div class="end-wrap win">
      <div class="eyebrow">THE STATIC CORE HAS FALLEN</div><h2>THE GRID <span>BREATHES AGAIN</span></h2>
      <p class="lead">The noise fades from the neon, one sector at a time. Far above Zero Cathedral, a golden light turns toward the horizon: Orion has seen what the Operators can do. The Static is quiet, but it is not gone, and the Grid is much bigger than five sectors.</p>
      ${unlockMsg ? `<div class="unlock">NEW OPERATOR UNLOCKED: <b>${esc(unlockMsg)}</b></div>` : ""}
      <div class="tease">This is the first seed of a persistent online world. An MMORPG is the long-term vision for OWL Studios Game.</div>
      <div class="title-btns"><button class="btn primary" id="again">PLAY AGAIN</button><a class="btn" href="/">BACK TO SITE</a></div>
    </div>` : `
    <div class="end-wrap lose">
      <div class="eyebrow">SIGNAL LOST</div><h2>THE GRID <span>FLICKERS</span></h2>
      <p class="lead">The squad falls in ${esc(E.STAGES[run.stage].name)}. The Static presses on, but the Concord remembers every Operator who stood against it. Try another squad, a different role mix, or a stronger rhythm of skills and ultimates.</p>
      <div class="title-btns"><button class="btn primary" id="again">TRY AGAIN</button><a class="btn" href="/">BACK TO SITE</a></div>
    </div>`, "end");
  $("#again").addEventListener("click", () => { sfx.click(); showSelect(); });
}

showTitle();
