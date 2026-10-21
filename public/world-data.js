// World content: maps, NPCs, investigable objects, quests. Pure data + tiny helpers (no DOM).
// To add a map: build another object like `hub`, register it in MAPS, and point an exit's `to` at it.
export const W = 32, H = 24;
const r = (x, y, w = 1, h = 1) => ({ x, y, w, h });

const hub = {
  id: "hub", name: "NIGHT CITY // CENTRAL GRID", w: W, h: H, spawn: { x: 15.5, y: 16.2 }, plaza: r(12, 9, 8, 6),
  buildings: [
    { ...r(3, 3, 7, 5), label: "FOUNDRY WORKSHOP", c: "#ff7a3d" },
    { ...r(22, 3, 7, 5), label: "NIGHT MARKET", c: "#ff3df2" },
    { ...r(3, 16, 6, 5), label: "DATA TOWER", c: "#46e0ff" },
    { ...r(23, 16, 6, 5), label: "HAB BLOCK 7", c: "#8a72ff" },
  ],
  lamps: [[12, 9], [19, 9], [12, 14], [19, 14], [5, 10], [25, 10], [5, 14], [25, 14]].map(([x, y]) => r(x, y)),
  objects: [
    { id: "door", kind: "door", ...r(6, 7), label: "WORKSHOP DOOR",
      inspect: ({ Q }) => Q.status("static_leak") === "done"
        ? { lines: ["The door scans your Concord Mark and slides open an inch.", "Inside, Lyra's bench glows. The interior isn't ready for visitors yet: it arrives in a future update."] }
        : { lines: ["Locked. A hand-painted sign reads: LYRA, WORKING. KNOCK TWICE."] } },
    { id: "statue", kind: "statue", ...r(15, 11, 2, 2), label: "HOLO-OWL",
      inspect: () => ({ lines: ["A flickering hologram of an Owl Concord watcher, wings half-folded.", "The plaque reads: WE KEEP THE SIGNAL."] }) },
    { id: "terminal", kind: "terminal", ...r(12, 19), label: "SIGNAL TERMINAL",
      inspect: ({ Q, S }) => {
        const st = Q.status("static_leak");
        if (S.flags.glitchDone) return { lines: ["The terminal is stable. Clean signal, soft green glow."] };
        if (S.flags.glitchSpawned) return { lines: ["The Static glitch is still thrashing next to the terminal."] };
        if (st === "active") return { lines: ["Raw noise pours out of the screen, thick as smoke.", "Something is crawling out of the static!"], event: "inspect:terminal", effect: (s) => { s.flags.glitchSpawned = true; } };
        return { lines: ["A dead signal terminal. Static crawls under the glass.", "Lyra, at the workshop, would know what to do with this."] };
      } },
    { id: "crate", kind: "crate", ...r(20, 20, 2, 1), label: "CRATE STACK",
      inspect: ({ Q }) => {
        const st = Q.status("spare_coil");
        if (st === "active") return { lines: ["Behind the crates, a blue power coil still hums. You pocket it."], event: "inspect:crate" };
        if (st === "idle") return { lines: ["Crates of old parts. Somebody around here might need something from them."] };
        return { lines: ["Empty crates. Dust and a few dead cables."] };
      } },
    { id: "gate", kind: "gate", ...r(31, 11, 1, 2), label: "SECTOR 02 GATE", inspect: () => ({ lines: ["SECTOR 02 // SEALED.", "Static interference blocks the way. This path opens in a future update."] }) },
  ],
  exits: [{ id: "south", ...r(15, 23, 2, 1), label: "SOUTH ROUTE", to: null, spawn: null, msg: "ROUTE TO ZERO CATHEDRAL // not connected yet. New maps plug in here." }],
  npcs: [
    { id: "lyra", name: "LYRA", x: 6.5, y: 9.4, hero: "lyra", color: "#5fe3d8", quest: "static_leak",
      offer: ["Operator! Good timing. The Static got into the signal terminal in the south alley, and it's leaking noise into my whole workshop.", "Go take a look. If something crawls out, clean it up. I'll keep the kettle warm."],
      active: ["The terminal is in the alley south of the plaza. Don't lick the wires."],
      ready: ["Quiet at last. The leak is sealed and the Grid hums a little cleaner.", "Take this Concord Mark. It opens my door whenever you need a bench."],
      done: ["Aeon would call that a stable patch. I call it Tuesday."] },
    { id: "jax", name: "JAX", x: 13.5, y: 13.6, hero: "jax", color: "#ff9d4d", quest: "spare_coil",
      offer: ["Hey, kid. My blade's power coil fried last night. Spares are in the crate stack by the Hab Block.", "Fetch me one? I'll owe you a story."],
      active: ["Crates, south of the Hab Block. Look for the blue glow."],
      ready: ["That's the one! Now I can cut Static like noodles.", "Story: I once parried a whole data storm. Don't tell Kira."],
      done: ["Plaza's quiet today. Too quiet. I love it."] },
    { id: "bit", name: "BIT", x: 24.5, y: 9.6, glyph: "drone", color: "#b6ff3b",
      idle: [["Bzzt! Bit's Spare Parts. Currently out of parts. Fully stocked on rumors."], ["Rumor: the east gate once led to Sector 02. Then the Static ate the road."], ["Rumor: the owl statue in the plaza answers back if you stare long enough. Bzzt."]] },
    { id: "mara", name: "ARCHIVIST MARA", x: 26.5, y: 14.6, glyph: "owl", color: "#f0cf7a", lateIf: "static_leak",
      idle: [["I keep the Concord's records. Eight Operators, one Grid, and a Static that never sleeps."], ["The Concord does not fight the Static. We remember what it takes, so the Operators can take it back."]],
      late: [["I saw a golden light over the cathedral roofs tonight. Someone divine is watching the Operators."], ["You sealed a leak with your own hands. The archive will note it."]] },
  ],
  glitch: { x: 13.5, y: 19.7 },
};
export const MAPS = { hub };

export const QUESTS = [
  { id: "static_leak", name: "Signal Leak", giver: "LYRA", reward: "Concord Mark earned. The workshop door now recognises you.",
    objectives: [{ id: "terminal", text: "Investigate the south-alley terminal", on: "inspect:terminal" }, { id: "fight", text: "Purge the Static glitch", on: "win:glitch" }] },
  { id: "spare_coil", name: "Spare Coil", giver: "JAX", reward: "Jax owes you a story. He already told it.",
    objectives: [{ id: "coil", text: "Find a power coil in the crate stack", on: "inspect:crate" }] },
];

/** Solid-tile grid (1 = blocked): world border, buildings, lamps and solid objects. */
export function buildGrid(map) {
  const g = new Uint8Array(map.w * map.h);
  const fill = (o) => { for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (x >= 0 && y >= 0 && x < map.w && y < map.h) g[y * map.w + x] = 1; };
  for (let x = 0; x < map.w; x++) { g[x] = 1; g[(map.h - 1) * map.w + x] = 1; }
  for (let y = 0; y < map.h; y++) { g[y * map.w] = 1; g[y * map.w + map.w - 1] = 1; }
  [...map.buildings, ...map.lamps, ...map.objects].forEach(fill);
  return g;
}
/** True when the player's feet box can stand at (x, y) in tile units. */
export function canStand(grid, map, x, y) {
  for (const [cx, cy] of [[x - 0.28, y], [x + 0.28, y], [x - 0.28, y - 0.3], [x + 0.28, y - 0.3]]) {
    const tx = Math.floor(cx), ty = Math.floor(cy);
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h || grid[ty * map.w + tx]) return false;
  }
  return true;
}
const grids = {};
export const isFree = (mapId, x, y) => { const m = MAPS[mapId]; if (!m) return false; grids[mapId] = grids[mapId] || buildGrid(m); return canStand(grids[mapId], m, x, y); };
