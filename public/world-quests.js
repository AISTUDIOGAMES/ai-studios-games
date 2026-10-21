// Tiny data-driven quest log. State per quest: idle -> active -> ready -> done.
// Objectives complete when emit("<event>") matches their `on`. Quests are plain objects in world-data.js.
export function createQuests(defs, state, notify) {
  const q = (id) => state[id] || (state[id] = { s: "idle", d: [] });
  const def = (id) => defs.find((d) => d.id === id);
  return {
    status: (id) => q(id).s,
    accept(id) { const o = q(id); if (o.s !== "idle") return; o.s = "active"; o.d = []; notify(`QUEST ACCEPTED: ${def(id).name}`); },
    emit(ev) {
      defs.forEach((d) => {
        const o = q(d.id); if (o.s !== "active") return;
        d.objectives.forEach((ob) => { if (ob.on === ev && !o.d.includes(ob.id)) { o.d.push(ob.id); notify(`OBJECTIVE DONE: ${ob.text}`); } });
        if (d.objectives.every((ob) => o.d.includes(ob.id))) { o.s = "ready"; notify(`RETURN TO ${d.giver}`); }
      });
    },
    complete(id) { const o = q(id); if (o.s === "ready") { o.s = "done"; notify(`QUEST COMPLETE: ${def(id).name}. ${def(id).reward}`); } },
    rows: () => defs.filter((d) => ["active", "ready"].includes(q(d.id).s)).map((d) => {
      const ready = q(d.id).s === "ready";
      return { name: d.name, ready, items: ready ? [{ text: `Return to ${d.giver}`, done: false }] : d.objectives.map((o) => ({ text: o.text, done: q(d.id).d.includes(o.id) })) };
    }),
  };
}
