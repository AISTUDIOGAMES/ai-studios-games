// OWL: GRIDBREAKERS — battle engine (pure logic, no DOM).
export const R = { rand: Math.random };
const rnd = () => R.rand();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

/* ------------------------------------------------------------------ helpers */
const alive = (l) => l.filter((u) => u.alive);
const foesOf = (b, u) => (u.team === "p" ? b.enemies : b.party);
const friendsOf = (b, u) => (u.team === "p" ? b.party : b.enemies);
const ev = (b, e) => b.events.push(e);
const has = (u, n) => !!(u.status[n] && u.status[n].turns > 0);
const stat = (u, k) => {
  let v = u[k];
  if (k === "atk") {
    if (has(u, "atkUp")) v *= 1 + u.status.atkUp.val;
    if (has(u, "weaken")) v *= 0.7;
  }
  if (k === "def" && has(u, "defUp")) v *= 1 + u.status.defUp.val;
  return v;
};
function addS(b, u, name, turns, val = 0, label) {
  if (!u.alive) return;
  u.status[name] = { turns, val };
  ev(b, { t: "status", id: u.id, name, label: label || name.toUpperCase() });
}
function gain(u, n) { u.charge = Math.min(100, u.charge + n); }
function text(b, id, msg, cls = "") { ev(b, { t: "text", id, msg, cls }); }

function kill(b, tgt, src) {
  tgt.alive = false; tgt.hp = 0; tgt.status = {};
  ev(b, { t: "dead", id: tgt.id });
  if (src && src.alive && src.key === "kira" && src.team === "p") { addS(b, src, "stealth", 2, 0, "VANISH"); gain(src, 10); }
}

function hit(b, src, tgt, mult, o = {}) {
  if (!tgt.alive) return 0;
  if (!o.noDodge && tgt.key === "kai" && tgt.team === "p" && rnd() < 0.25) { ev(b, { t: "dodge", id: tgt.id }); return 0; }
  if (has(tgt, "invuln")) { text(b, tgt.id, "IMMUNE", "good"); return 0; }
  let dmg = stat(src, "atk") * mult;
  if (src.key === "jax" && src.team === "p") {
    if (src.last === tgt.id) src.stacks = Math.min(5, src.stacks + 1); else { src.last = tgt.id; src.stacks = 0; }
    dmg *= 1 + 0.08 * src.stacks;
  }
  if (src.key === "kira" && src.team === "p" && !src.opened) { dmg *= 2; src.opened = true; text(b, src.id, "OPENING STRIKE", "crit"); }
  if (o.bonus) dmg *= o.bonus;
  dmg *= 30 / (30 + stat(tgt, "def") * (o.pierce ? 0.5 : 1));
  if (has(tgt, "mark")) dmg *= 1.25;
  if (tgt.key === "titan" && tgt.team === "p") dmg *= 0.85;
  const crit = rnd() < (o.crit ?? 0.1);
  if (crit) dmg *= 1.5;
  dmg *= 0.92 + rnd() * 0.16;
  dmg = Math.max(1, Math.round(dmg));
  let absorbed = 0;
  const sh = tgt.status.shield;
  if (sh && sh.val > 0) { absorbed = Math.min(dmg, sh.val); sh.val -= absorbed; dmg -= absorbed; if (sh.val <= 0) delete tgt.status.shield; }
  tgt.hp -= dmg;
  if (tgt.hp <= 0 && tgt.team === "p" && !b.orionUsed && alive(b.party).some((u) => u.key === "orion")) {
    tgt.hp = 1; b.orionUsed = true; text(b, tgt.id, "ETERNAL VALUE", "gold");
  }
  ev(b, { t: "dmg", id: tgt.id, amount: dmg, absorbed, crit, hp: Math.max(0, tgt.hp), max: tgt.max });
  if (tgt.team === "p") gain(tgt, 10);
  if (src.team === "p") gain(src, o.multi ? 3 : 6);
  if (src.key === "vex" && src.team === "p" && tgt.hp > 0) addS(b, tgt, "mark", 2, 0, "MARKED");
  if (has(tgt, "counter") && !o.noCounter && src.alive && tgt.hp > 0) {
    text(b, tgt.id, "PARRY!", "good");
    hit(b, tgt, src, 0.9, { noCounter: true, noDodge: true });
  }
  if (tgt.hp <= 0) kill(b, tgt, src);
  return dmg;
}
function heal(b, src, tgt, amt) {
  if (!tgt.alive) return;
  if (src.key === "lyra") {
    if (src.healLast === tgt.id) src.healStacks = Math.min(3, src.healStacks + 1); else { src.healLast = tgt.id; src.healStacks = 0; }
    amt *= 1 + 0.1 * src.healStacks;
  }
  amt = Math.round(amt);
  tgt.hp = Math.min(tgt.max, tgt.hp + amt);
  ev(b, { t: "heal", id: tgt.id, amount: amt, hp: tgt.hp, max: tgt.max });
}
function healPct(b, src, tgt, pct) { heal(b, src, tgt, tgt.max * pct); }
function revive(b, tgt, pct) {
  if (tgt.alive) return;
  tgt.alive = true; tgt.hp = Math.max(1, Math.round(tgt.max * pct)); tgt.status = {};
  ev(b, { t: "revive", id: tgt.id, hp: tgt.hp, max: tgt.max });
}
const DEBUFFS = ["weaken", "stun", "confuse", "mark"];
function cleanse(b, u) { DEBUFFS.forEach((d) => delete u.status[d]); ev(b, { t: "status", id: u.id, name: "cleanse", label: "CLEANSED" }); }
function randomFoe(b, a) { const l = alive(foesOf(b, a)); return l.length ? pick(l) : null; }
function bossResist(t) { return t.boss && rnd() > 0.4; }

/* ------------------------------------------------------------------- heroes */
// target: 'foe' | 'ally' | 'self' | 'foes' | 'allies'
export const HEROES = {
  lyra: { name: "LYRA", title: "Bio-Mechanic", role: "SUPPORT", color: "#5fe3d8", sprite: "uni-lyra.webp", hp: 92, atk: 14, def: 8, spd: 11,
    quote: "Everything breaks. Not everything has to stay broken.",
    passive: ["Steady Hands", "Heals grow +10% stronger each time she heals the same ally (max +30%)."],
    basic: { name: "Wrench Swing", desc: "A basic strike.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.0) },
    s1: { name: "Plasma Suture", cd: 2, desc: "Heal an ally now and regenerate 8 HP for 3 turns.", target: "ally", run: (b, a, t) => { heal(b, a, t, 20 + a.atk * 1.2); addS(b, t, "regen", 3, 8, "REGEN"); } },
    s2: { name: "Stasis Pod", cd: 3, desc: "Make an ally immune to all damage and cleanse them.", target: "ally", run: (b, a, t) => { cleanse(b, t); addS(b, t, "invuln", 2, 0, "STASIS"); } },
    ult: { name: "Rebuild Protocol", desc: "Revive fallen allies, heal everyone for 45% and cleanse.", target: "allies", run: (b, a) => { b.party.forEach((u) => { if (!u.alive) revive(b, u, 0.4); else healPct(b, a, u, 0.45); if (u.alive) cleanse(b, u); }); } } },
  titan: { name: "TITAN", title: "Heavy Pilot", role: "TANK", color: "#8b6cff", sprite: "uni-titan.webp", hp: 150, atk: 16, def: 14, spd: 6,
    quote: "Stand behind me. That is the whole plan.",
    passive: ["Siege Frame", "Takes 15% less damage from every source."],
    basic: { name: "Gauntlet Jab", desc: "A basic strike.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.0) },
    s1: { name: "Anchor Stance", cd: 3, desc: "Taunt all enemies for 2 turns, gain a shield and +30% defense.", target: "self", run: (b, a) => { addS(b, a, "taunt", 2, 0, "TAUNT"); addS(b, a, "shield", 3, 40, "SHIELD"); addS(b, a, "defUp", 2, 0.3, "DEF UP"); } },
    s2: { name: "Pilot's Fist", cd: 2, desc: "Heavy hit that stuns the target for a turn.", target: "foe", run: (b, a, t) => { hit(b, a, t, 1.6); if (t.alive && !bossResist(t)) addS(b, t, "stun", 1, 0, "STUNNED"); } },
    ult: { name: "Titanfall Protocol", desc: "Slam all enemies, then gain +50% attack and defense and taunt for 3 turns.", target: "foes", run: (b, a) => { alive(b.enemies).forEach((e) => hit(b, a, e, 1.3, { multi: true })); addS(b, a, "atkUp", 3, 0.5, "ATK UP"); addS(b, a, "defUp", 3, 0.5, "DEF UP"); addS(b, a, "taunt", 3, 0, "TAUNT"); } } },
  kai: { name: "KAI", title: "Techno-Stalker", role: "SCOUT", color: "#46e0a8", sprite: "uni-kai.webp", hp: 82, atk: 15, def: 7, spd: 14,
    quote: "Every city talks. I just listen to the parts it hides.",
    passive: ["Ghost Courier", "25% chance to dodge any attack."],
    basic: { name: "Pulse Shot", desc: "A basic strike.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.0) },
    s1: { name: "Trace Pulse", cd: 2, desc: "Mark every enemy for 2 turns (they take +25% damage).", target: "foes", run: (b, a) => { alive(b.enemies).forEach((e) => { hit(b, a, e, 0.3, { multi: true, crit: 0 }); addS(b, e, "mark", 2, 0, "MARKED"); }); } },
    s2: { name: "Cable Whip", cd: 2, desc: "Hit a target and weaken it (-30% attack) for 2 turns.", target: "foe", run: (b, a, t) => { hit(b, a, t, 1.3); addS(b, t, "weaken", 2, 0, "WEAKENED"); } },
    ult: { name: "Grid Map", desc: "Allies gain +30% attack and +25 charge, every enemy is marked for 3 turns.", target: "allies", run: (b, a) => { alive(b.party).forEach((u) => { addS(b, u, "atkUp", 3, 0.3, "ATK UP"); gain(u, 25); }); alive(b.enemies).forEach((e) => addS(b, e, "mark", 3, 0, "MARKED")); } } },
  vex: { name: "VEX", title: "Neural Hacker", role: "CONTROLLER", color: "#6ab4ff", sprite: "uni-vex.webp", hp: 76, atk: 18, def: 6, spd: 12,
    quote: "Locks are just questions. I am very good at answers.",
    passive: ["Open Net", "Every enemy Vex hits is marked and takes +25% damage."],
    basic: { name: "Data Spike", desc: "A basic strike.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.0) },
    s1: { name: "Ghost Packet", cd: 2, desc: "Hijack an enemy for 2 turns: its attacks hit its own allies.", target: "foe", run: (b, a, t) => { hit(b, a, t, 0.8); if (t.alive && !bossResist(t)) addS(b, t, "confuse", 2, 0, "HIJACKED"); } },
    s2: { name: "Firewall Veil", cd: 3, desc: "Shield the whole party.", target: "allies", run: (b, a) => { alive(b.party).forEach((u) => addS(b, u, "shield", 3, Math.round(24 + a.atk * 0.8), "SHIELD")); } },
    ult: { name: "System Override", desc: "Damage every enemy and hijack them for 2 turns.", target: "foes", run: (b, a) => { alive(b.enemies).forEach((e) => { hit(b, a, e, 1.0, { multi: true }); if (e.alive && !bossResist(e)) addS(b, e, "confuse", 2, 0, "HIJACKED"); }); } } },
  kira: { name: "KIRA", title: "Sleek Rogue", role: "ASSASSIN", color: "#9d8cff", sprite: "uni-kira.webp", hp: 80, atk: 21, def: 6, spd: 16,
    quote: "If you saw me coming, I was never really here.",
    passive: ["Genesis Core", "Her first strike each battle deals double damage. After a kill she vanishes for a turn."],
    basic: { name: "Blade Flash", desc: "A basic strike.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.0) },
    s1: { name: "Data-Shuriken", cd: 2, desc: "Three ricocheting blades hit random enemies.", target: "foes", run: (b, a) => { for (let i = 0; i < 3; i++) { const t = randomFoe(b, a); if (t) hit(b, a, t, 0.8, { multi: true }); } } },
    s2: { name: "Phase Step", cd: 3, desc: "Strike hard from behind, then vanish (cannot be targeted).", target: "foe", run: (b, a, t) => { hit(b, a, t, 1.7); addS(b, a, "stealth", 2, 0, "VANISH"); } },
    ult: { name: "Zero Frame", desc: "Five unavoidable strikes, marked enemies first.", target: "foes", run: (b, a) => { for (let i = 0; i < 5; i++) { const l = alive(b.enemies); if (!l.length) break; const m = l.filter((e) => has(e, "mark")); hit(b, a, pick(m.length ? m : l), 1.0, { multi: true, crit: 0.3, noDodge: true }); } } } },
  jax: { name: "JAX", title: "Street Samurai", role: "DUELIST", color: "#ff56d6", sprite: "uni-jax.webp", hp: 108, atk: 20, def: 10, spd: 12,
    quote: "My blades only answer to my oath.",
    passive: ["Ronin's Oath", "Each consecutive hit on the same target adds +8% damage (up to 5 stacks)."],
    basic: { name: "Plasma Slash", desc: "A basic strike.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.0) },
    s1: { name: "Neon Draw", cd: 2, desc: "Fast slash that ignores half the target's defense.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.7, { pierce: true }) },
    s2: { name: "Parry Protocol", cd: 3, desc: "For 2 turns, answer every attack with a plasma shockwave.", target: "self", run: (b, a) => { addS(b, a, "counter", 2, 0, "PARRY"); addS(b, a, "defUp", 2, 0.25, "DEF UP"); } },
    ult: { name: "Thousand Cuts", desc: "Eight crossing slashes strike random enemies.", target: "foes", run: (b, a) => { for (let i = 0; i < 8; i++) { const t = randomFoe(b, a); if (t) hit(b, a, t, 0.62, { multi: true, crit: 0.2 }); } } } },
  aeon: { name: "AEON", title: "Grid Architect", role: "ARCHITECT", color: "#2ef2c0", sprite: "uni-aeon.webp", hp: 112, atk: 20, def: 11, spd: 10, legendary: true,
    quote: "The Grid is a sentence. I am still writing it.",
    passive: ["Lattice Law", "Allies regain 5 HP and gain 5 charge at the start of every round."],
    basic: { name: "Staff Pulse", desc: "A basic strike.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.0) },
    s1: { name: "Rewrite", cd: 2, desc: "Damage every enemy and weaken them for 2 turns.", target: "foes", run: (b, a) => { alive(b.enemies).forEach((e) => { hit(b, a, e, 0.8, { multi: true }); addS(b, e, "weaken", 2, 0, "WEAKENED"); }); } },
    s2: { name: "Twin Seals", cd: 3, desc: "Heal the party for 25% and grant a small shield.", target: "allies", run: (b, a) => { alive(b.party).forEach((u) => { healPct(b, a, u, 0.25); addS(b, u, "shield", 3, 18, "SHIELD"); }); } },
    ult: { name: "World Patch", desc: "Fully restore the party, revive the fallen and wipe enemy buffs.", target: "allies", run: (b, a) => { b.party.forEach((u) => { if (!u.alive) revive(b, u, 0.6); else healPct(b, a, u, 1); cleanse(b, u); }); alive(b.enemies).forEach((e) => { ["atkUp", "defUp", "shield", "taunt"].forEach((s) => delete e.status[s]); }); } } },
  orion: { name: "ORION", title: "Divine Watcher", role: "GUARDIAN", color: "#f0cf7a", sprite: "uni-orion.webp", hp: 130, atk: 23, def: 12, spd: 11, legendary: true,
    quote: "I have watched the first dawn. I will watch the next.",
    passive: ["Eternal Value", "Once per battle, a fallen ally is saved at 1 HP instead."],
    basic: { name: "Staff Strike", desc: "A basic strike.", target: "foe", run: (b, a, t) => hit(b, a, t, 1.0) },
    s1: { name: "Golden Verdict", cd: 2, desc: "Judge one enemy for heavy damage (more against bosses) and purge its buffs.", target: "foe", run: (b, a, t) => { ["atkUp", "defUp", "shield", "taunt"].forEach((s) => delete t.status[s]); hit(b, a, t, 1.9, { bonus: t.boss ? 1.2 : 1 }); } },
    s2: { name: "Wings of Dawn", cd: 3, desc: "A nova that hits every enemy and cleanses the party.", target: "foes", run: (b, a) => { alive(b.enemies).forEach((e) => hit(b, a, e, 0.8, { multi: true })); alive(b.party).forEach((u) => cleanse(b, u)); } },
    ult: { name: "Genesis Dawn", desc: "Heal the party 60%, +40% attack and +30% defense for 3 turns, and smite every enemy.", target: "foes", run: (b, a) => { alive(b.party).forEach((u) => { healPct(b, a, u, 0.6); addS(b, u, "atkUp", 3, 0.4, "ATK UP"); addS(b, u, "defUp", 3, 0.3, "DEF UP"); }); alive(b.enemies).forEach((e) => hit(b, a, e, 1.8, { multi: true })); } } },
};
export const HERO_ORDER = ["lyra", "titan", "kai", "vex", "kira", "jax", "aeon", "orion"];

/* ----------------------------------------------------------------- enemies */
// Enemy acts: {n, w, t:'one'|'all'|'self', mult, fx}
export const ENEMIES = {
  drone: { name: "Glitch Drone", art: "drone", color: "#ff5c8a", hp: 44, atk: 10, def: 3, spd: 10, acts: [{ n: "Zap", w: 1, t: "one", mult: 1.0 }] },
  wisp: { name: "Static Wisp", art: "wisp", color: "#7df9ff", hp: 32, atk: 12, def: 2, spd: 14, acts: [{ n: "Flicker Burst", w: 2, t: "one", mult: 1.0 }, { n: "White Noise", w: 1, t: "one", mult: 0.6, fx: "weaken" }] },
  leech: { name: "Signal Leech", art: "leech", color: "#b6ff3b", hp: 64, atk: 11, def: 4, spd: 11, acts: [{ n: "Drain", w: 1, t: "one", mult: 1.0, fx: "lifesteal" }] },
  copy: { name: "Hollow Copy", art: "copy", color: "#c0c4d4", hp: 84, atk: 13, def: 6, spd: 9, acts: [{ n: "Mimic Strike", w: 2, t: "one", mult: 1.15 }, { n: "Hollow Guard", w: 1, t: "self", fx: "shield", val: 28 }] },
  enforcer: { name: "Null Enforcer", art: "enforcer", color: "#ffb02e", hp: 110, atk: 15, def: 9, spd: 9, acts: [{ n: "Suppress Fire", w: 1, t: "all", mult: 0.6 }, { n: "Baton Slam", w: 1, t: "one", mult: 1.3, fx: "stun25" }] },
  colossus: { name: "Rustmaw Colossus", art: "colossus", color: "#ff7a3d", boss: true, hp: 320, atk: 17, def: 9, spd: 6, acts: [{ n: "Crush", w: 2, t: "one", mult: 1.5 }, { n: "Quake", w: 1, t: "all", mult: 0.65 }, { n: "Overclock", w: 1, t: "self", fx: "atkUp", val: 0.3 }] },
  warden: { name: "Signal Warden", art: "warden", color: "#46b4ff", boss: true, hp: 360, atk: 16, def: 8, spd: 10, acts: [{ n: "Spike", w: 2, t: "one", mult: 1.3 }, { n: "Jam", w: 1, t: "all", mult: 0.5, fx: "weaken" }, { n: "Phase Shield", w: 1, t: "self", fx: "shield", val: 60 }] },
  seraph: { name: "Hollow Seraph", art: "seraph", color: "#9aa0b8", boss: true, hp: 470, atk: 19, def: 10, spd: 11, acts: [{ n: "Wings of Silence", w: 2, t: "all", mult: 0.6, fx: "weaken" }, { n: "Hollow Verdict", w: 2, t: "one", mult: 1.7 }, { n: "Mirror Veil", w: 1, t: "self", fx: "heal", val: 0.12 }] },
  core: { name: "THE STATIC CORE", art: "core", color: "#ff3df2", boss: true, final: true, hp: 860, atk: 21, def: 11, spd: 9, acts: [{ n: "Entropy Wave", w: 2, t: "all", mult: 0.62 }, { n: "Unmake", w: 2, t: "one", mult: 1.9 }, { n: "Silence", w: 1, t: "one", mult: 0.7, fx: "stun" }, { n: "Spawn Wisps", w: 1, t: "summon" }] },
};

export const STAGES = [
  { id: 1, name: "SECTOR 01 // NIGHT CITY", sky: ["#1b1040", "#3a0f5c"], intro: "Rain hisses on neon rooftops. The first Static tremors have started to rot the billboards: Glitch Drones swarm the skyline, hungry for signal.", enemies: ["drone", "wisp", "drone"] },
  { id: 2, name: "THE FOUNDRY", sky: ["#3a1a0a", "#5a2a12"], intro: "The Foundry's machine yards groan under corrupted code. Something huge is eating the assembly lines from the inside.", enemies: ["drone", "colossus", "wisp"] },
  { id: 3, name: "THE UNDERGRID", sky: ["#0a2a2a", "#103a45"], intro: "Steam, back alleys and stolen signals. The Static is feeding on the Undergrid's hidden traffic, and a Warden listens to every packet.", enemies: ["leech", "warden", "leech"], unlock: "aeon" },
  { id: 4, name: "ZERO CATHEDRAL", sky: ["#2a2440", "#3b3358"], intro: "The Owl Concord's sanctuary is silent. Hollow copies of its watchers pace the aisles, guarding a throne that should not be empty.", enemies: ["enforcer", "seraph", "enforcer"] },
  { id: 5, name: "THE STATIC WASTES", sky: ["#2a0a30", "#10061a"], intro: "All that remains of the sectors already taken. At the heart of the noise, the Static Core pulses, waiting for someone to finally answer it.", enemies: ["wisp", "core", "wisp"], unlock: "orion" },
];

/** Per-stage difficulty scaling for enemy HP and attack. */
export const SCALE = [{ hp: 1.0, atk: 1.0 }, { hp: 1.3, atk: 1.2 }, { hp: 1.5, atk: 1.4 }, { hp: 1.5, atk: 1.35 }, { hp: 1.75, atk: 1.6 }];

/* -------------------------------------------------------------------- units */
export function makeHero(key, n) {
  const d = HEROES[key];
  return { id: `p${n}`, key, team: "p", name: d.name, hp: d.hp, max: d.hp, atk: d.atk, def: d.def, spd: d.spd, alive: true, charge: 0, cd: { s1: 0, s2: 0 }, status: {}, opened: false, last: null, stacks: 0, healLast: null, healStacks: 0 };
}
function makeEnemy(key, n, scale = { hp: 1, atk: 1 }) {
  const d = ENEMIES[key];
  const hp = Math.round(d.hp * scale.hp);
  return { id: `e${n}`, key, team: "e", name: d.name, boss: !!d.boss, final: !!d.final, hp, max: hp, atk: Math.round(d.atk * scale.atk), def: d.def, spd: d.spd, alive: true, charge: 0, cd: { s1: 0, s2: 0 }, status: {} };
}

export function createBattle(party, stageIdx, mods = {}) {
  const st = STAGES[stageIdx];
  party.forEach((u) => { u.cd = { s1: 0, s2: 0 }; u.status = {}; u.opened = false; u.last = null; u.stacks = 0; u.healLast = null; u.healStacks = 0; u.charge = Math.max(u.charge, mods.startCharge || 0); });
  const scale = SCALE[stageIdx];
  const enemies = st.enemies.map((k, i) => makeEnemy(k, i, scale));
  const b = { scale, party, enemies, stage: stageIdx, round: 0, queue: [], qi: 0, events: [], over: null, orionUsed: false, nextEid: enemies.length };
  b.mods = mods;
  return b;
}

/* --------------------------------------------------------------- turn flow */
function beginRound(b) {
  b.round += 1;
  b.queue = [...alive(b.party), ...alive(b.enemies)].sort((x, y) => (y.spd + rnd() * 3) - (x.spd + rnd() * 3));
  b.qi = 0;
  ev(b, { t: "round", n: b.round });
  const aeon = alive(b.party).find((u) => u.key === "aeon");
  if (aeon) alive(b.party).forEach((u) => { heal(b, aeon, u, 5); gain(u, 5); });
}

/** Advances to the next unit that can act. Returns {unit, skipped}. */
export function nextTurn(b) {
  b.events = [];
  for (;;) {
    if (b.qi >= b.queue.length) beginRound(b);
    const u = b.queue[b.qi++];
    if (!u || !u.alive) continue;
    ev(b, { t: "turn", id: u.id });
    if (u.cd.s1 > 0) u.cd.s1--;
    if (u.cd.s2 > 0) u.cd.s2--;
    if (has(u, "regen")) heal(b, u, u, u.status.regen.val);
    if (has(u, "stun")) { delete u.status.stun; text(b, u.id, "STUNNED", "bad"); endTurn(b, u); return { unit: u, skipped: true, events: b.events }; }
    return { unit: u, skipped: false, events: b.events };
  }
}

export function endTurn(b, u) {
  if (!u.alive) return;
  if (has(u, "stealth")) delete u.status.stealth;
  Object.keys(u.status).forEach((k) => { u.status[k].turns -= 1; if (u.status[k].turns <= 0) delete u.status[k]; });
}
function checkEnd(b) {
  if (!alive(b.enemies).length) b.over = "win";
  else if (!alive(b.party).length) b.over = "lose";
}

export function canUse(b, u, slot) {
  if (slot === "basic") return true;
  if (slot === "ult") return u.charge >= 100;
  return u.cd[slot] <= 0;
}
export function validTargets(b, u, slot) {
  const def = HEROES[u.key][slot];
  if (def.target === "foe") return alive(b.enemies);
  if (def.target === "ally") return alive(b.party);
  return [];
}

export function playerAct(b, u, slot, targetId) {
  b.events = [];
  const def = HEROES[u.key][slot];
  const all = [...b.party, ...b.enemies];
  const t = targetId ? all.find((x) => x.id === targetId) : null;
  ev(b, { t: "act", id: u.id, name: def.name, ult: slot === "ult" });
  if (slot === "ult") u.charge = 0;
  else if (slot !== "basic") { u.cd[slot] = def.cd + (b.mods.cdMinus ? 0 : 0); gain(u, 12); }
  else gain(u, 18);
  def.run(b, u, t);
  checkEnd(b);
  if (!b.over) endTurn(b, u);
  return b.events;
}

/* ------------------------------------------------------------------ enemy AI */
function enemyFoe(b, e) {
  const pool = alive(b.party).filter((u) => !has(u, "stealth"));
  if (!pool.length) return null;
  const tank = pool.filter((u) => has(u, "taunt"));
  return pick(tank.length ? tank : pool);
}
export function enemyAct(b, e) {
  b.events = [];
  const d = ENEMIES[e.key];
  let acts = d.acts;
  if (e.final && e.hp > e.max * 0.5) acts = acts.filter((a) => a.t !== "summon");
  if (e.final && alive(b.enemies).length >= 4) acts = acts.filter((a) => a.t !== "summon");
  const total = acts.reduce((s, a) => s + a.w, 0);
  let r = rnd() * total, act = acts[0];
  for (const a of acts) { r -= a.w; if (r <= 0) { act = a; break; } }
  ev(b, { t: "act", id: e.id, name: act.n });
  const confused = has(e, "confuse");
  const strike = (tgt, mult) => {
    const dmg = hit(b, e, tgt, mult);
    if (!tgt.alive || dmg === 0) return;
    if (act.fx === "weaken") addS(b, tgt, "weaken", 2, 0, "WEAKENED");
    if (act.fx === "stun" && !bossResist({ boss: false })) addS(b, tgt, "stun", 1, 0, "STUNNED");
    if (act.fx === "stun25" && rnd() < 0.25) addS(b, tgt, "stun", 1, 0, "STUNNED");
    if (act.fx === "lifesteal") { e.hp = Math.min(e.max, e.hp + Math.round(dmg * 0.7)); ev(b, { t: "heal", id: e.id, amount: Math.round(dmg * 0.7), hp: e.hp, max: e.max }); }
  };
  if (act.t === "self") {
    if (act.fx === "shield") addS(b, e, "shield", 4, act.val, "SHIELD");
    if (act.fx === "atkUp") addS(b, e, "atkUp", 3, act.val, "ATK UP");
    if (act.fx === "heal") { e.hp = Math.min(e.max, e.hp + Math.round(e.max * act.val)); ev(b, { t: "heal", id: e.id, amount: Math.round(e.max * act.val), hp: e.hp, max: e.max }); }
  } else if (act.t === "summon") {
    for (let i = 0; i < 2 && b.enemies.length < 6; i++) {
      const w = makeEnemy("wisp", b.nextEid++, b.scale); b.enemies.push(w); ev(b, { t: "spawn", unit: w });
    }
  } else if (act.t === "all") {
    const targets = confused ? alive(b.enemies).filter((x) => x !== e) : alive(b.party).filter((u) => !has(u, "stealth") || true);
    targets.forEach((tg) => strike(tg, act.mult));
  } else {
    const tg = confused ? pick(alive(b.enemies).filter((x) => x !== e).concat([e])) : enemyFoe(b, e);
    if (tg) strike(tg, act.mult);
  }
  checkEnd(b);
  if (!b.over) endTurn(b, e);
  return b.events;
}

/* ------------------------------------------------------------- run progression */
export const UPGRADES = [
  { id: "atk", name: "Overclocked Cores", desc: "All heroes gain +12% attack.", apply: (r) => r.party.forEach((u) => { u.atk = Math.round(u.atk * 1.12); }) },
  { id: "def", name: "Reinforced Plating", desc: "All heroes gain +2 defense and +10% max HP.", apply: (r) => r.party.forEach((u) => { u.def += 2; const g = Math.round(u.max * 0.1); u.max += g; u.hp += g; }) },
  { id: "heal", name: "Nanite Repair", desc: "Restore 60% HP to the whole party and revive the fallen.", apply: (r) => r.party.forEach((u) => { if (!u.alive) { u.alive = true; u.hp = 1; } u.hp = Math.min(u.max, u.hp + Math.round(u.max * 0.6)); }) },
  { id: "charge", name: "Signal Battery", desc: "Heroes start every battle with 50 ultimate charge.", apply: (r) => { r.mods.startCharge = Math.max(r.mods.startCharge || 0, 50); } },
  { id: "spd", name: "Quickened Protocols", desc: "All heroes gain +2 speed.", apply: (r) => r.party.forEach((u) => { u.spd += 2; }) },
  { id: "hp", name: "Second Core", desc: "All heroes gain +20% max HP.", apply: (r) => r.party.forEach((u) => { const g = Math.round(u.max * 0.2); u.max += g; u.hp += g; }) },
];
export function rollUpgrades(n = 3) {
  const pool = [...UPGRADES]; const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
export function betweenStages(party) {
  party.forEach((u) => {
    if (!u.alive) { u.alive = true; u.hp = Math.round(u.max * 0.5); }
    else u.hp = Math.min(u.max, u.hp + Math.round(u.max * 0.5));
    u.status = {};
  });
}
