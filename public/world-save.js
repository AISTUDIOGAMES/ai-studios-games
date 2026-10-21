// World save: its own versioned key. The old "owl_gridbreakers_v1" save (unlocks, clears) is never written here.
import { MAPS, QUESTS, isFree } from "./world-data.js";
export const WORLD_KEY = "owl_gridworld_v1";
const STATES = ["idle", "active", "ready", "done"];

/** Always returns a usable world state, repairing or discarding anything invalid. */
export function sanitize(raw, host) {
  const o = raw && typeof raw === "object" ? raw : {};
  const map = MAPS[o.map] ? o.map : "hub", m = MAPS[map];
  const pt = (p, fb) => (p && Number.isFinite(p.x) && Number.isFinite(p.y) && isFree(map, p.x, p.y) ? { x: p.x, y: p.y } : fb);
  const safe = pt(o.safe, { ...m.spawn });
  const squad = Array.isArray(o.squad) ? [...new Set(o.squad)].filter((k) => host.hero(k) && !host.locked(k)) : [];
  const quests = {};
  QUESTS.forEach((d) => {
    const s = o.quests && o.quests[d.id];
    if (s && STATES.includes(s.s)) quests[d.id] = { s: s.s, d: (Array.isArray(s.d) ? s.d : []).filter((id) => d.objectives.some((ob) => ob.id === id)) };
  });
  const f = (o.flags && typeof o.flags === "object") ? o.flags : {};
  const talk = {}; Object.entries(f.talk || {}).forEach(([k, v]) => { if (Number.isFinite(v)) talk[k] = Math.max(0, Math.floor(v)); });
  const flags = { glitchSpawned: f.glitchSpawned === true, glitchDone: f.glitchDone === true, talk };
  if (flags.glitchDone) flags.glitchSpawned = true;
  const pos = pt(o, safe);
  return { v: 1, map, x: pos.x, y: pos.y, safe, squad: squad.length === 3 ? squad : null, quests, flags };
}
export function loadWorld(host) { let raw = null; try { raw = JSON.parse(localStorage.getItem(WORLD_KEY) || "null"); } catch { /* corrupt save: start fresh */ } return sanitize(raw, host); }
export function saveWorld(S) { try { const { pending, ...rest } = S; localStorage.setItem(WORLD_KEY, JSON.stringify(rest)); } catch { /* storage unavailable */ } }
export const hasWorldSave = () => { try { return !!localStorage.getItem(WORLD_KEY); } catch { return false; } };
