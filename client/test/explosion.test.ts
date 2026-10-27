import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPLOSION, planExplosion, type ExplosionInput } from "../src/game/bomberExplosion.ts";
import { blastCells, createRng } from "../src/game/bomberCombat.ts";
import { FX_KEY, getFxLevel, resetFxLevelCache, setFxLevel, SHAKE_MULT } from "../src/game/fxSettings.ts";

const T = 32;
// Mapa 11x9 com pilares (1) nas posicoes pares e um bloco (2) no caminho, como nos mapas do jogo.
const grid = (): number[][] => Array.from({ length: 9 }, (_, y) => Array.from({ length: 11 }, (_, x) => (x % 2 === 1 && y % 2 === 1 ? 1 : 0)));
const input = (over: Partial<ExplosionInput> & { range?: number; splash?: number } = {}, level: 0 | 1 | 2 = 2): ExplosionInput => {
  const g = grid(); g[4][8] = 2;
  const range = over.range ?? 3, splash = over.splash ?? 0;
  return { cells: blastCells(g, 4, 4, range, splash), gx: 4, gy: 4, range, splash, tile: T, level, rng: createRng(7), ...over };
};
const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);

test("explosao: todo passo tem numeros finitos e positivos onde importa", () => {
  for (const level of [0, 1, 2] as const) {
    const p = planExplosion(input({}, level));
    assert.ok(p.steps.length > 0);
    for (const s of p.steps) {
      for (const v of [s.x, s.y, s.scale, s.toScale, s.alpha, s.duration, s.delay, s.depth]) assert.ok(finite(v), `${s.kind} com valor invalido`);
      assert.ok(s.duration > 0 && s.delay >= 0 && s.alpha > 0 && s.alpha <= 1);
      if (s.dx !== undefined) assert.ok(finite(s.dx) && finite(s.dy));
    }
    assert.ok(finite(p.shake.duration) && finite(p.shake.intensity) && p.shake.intensity > 0);
  }
});

test("explosao: o fogo so aparece nas celulas atingidas (parede indestrutivel e o que vem depois do bloco ficam de fora)", () => {
  const g = grid(); g[4][8] = 2;
  const cells = blastCells(g, 4, 4, 5, 0);
  const keys = new Set(cells.map(([x, y]) => `${x},${y}`));
  assert.ok(!keys.has("9,4"), "depois do bloco nao ha fogo");
  const p = planExplosion(input({ cells, range: 5 }));
  for (const s of p.steps.filter((x) => x.kind === "flame")) {
    const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T);
    assert.ok(keys.has(`${cx},${cy}`), `chama fora da explosao em ${cx},${cy}`);
  }
  assert.equal(p.steps.filter((x) => x.kind === "flame").length, cells.length, "uma chama por celula atingida");
});

test("explosao: o fogo corre pelo corredor (atraso cresce com a distancia) e o centro acende primeiro", () => {
  const p = planExplosion(input({ range: 4 }));
  const flames = p.steps.filter((x) => x.kind === "flame");
  const byDist = new Map<number, number>();
  for (const f of flames) { const d = Math.max(Math.abs(Math.floor(f.x / T) - 4), Math.abs(Math.floor(f.y / T) - 4)); byDist.set(d, f.delay); assert.equal(f.delay, d * EXPLOSION.stepMs); }
  assert.equal(byDist.get(0), 0);
  const ds = [...byDist.keys()].sort((a, b) => a - b);
  for (let i = 1; i < ds.length; i++) assert.ok(byDist.get(ds[i])! > byDist.get(ds[i - 1])!);
});

test("explosao: intensidade baixa so tem o essencial; alta e media tem enfeites", () => {
  const low = planExplosion(input({}, 0)), mid = planExplosion(input({}, 1)), high = planExplosion(input({}, 2));
  assert.ok(low.steps.every((s) => s.prio === 0), "nivel baixo: so essenciais");
  assert.ok(new Set(low.steps.map((s) => s.kind)).size <= 4);
  for (const k of ["smoke", "scorch", "ember"] as const) { assert.ok(mid.steps.some((s) => s.kind === k), `medio tem ${k}`); assert.ok(high.steps.some((s) => s.kind === k), `alto tem ${k}`); }
  assert.ok(!mid.steps.some((s) => s.kind === "halo") && high.steps.some((s) => s.kind === "halo"));
  assert.ok(low.steps.length < mid.steps.length && mid.steps.length < high.steps.length);
  assert.ok(low.shake.intensity < mid.shake.intensity && mid.shake.intensity < high.shake.intensity);
  assert.deepEqual(SHAKE_MULT.length, 3);
});

test("explosao: limites de enfeites e de passos, mesmo com bomba enorme", () => {
  const g = Array.from({ length: 17 }, () => Array.from({ length: 29 }, () => 0));
  const cells = blastCells(g, 14, 8, 12, 1);
  const p = planExplosion({ cells, gx: 14, gy: 8, range: 12, splash: 1, tile: T, level: 2, rng: createRng(3) });
  const n = (k: string) => p.steps.filter((s) => s.kind === k).length;
  assert.ok(n("smoke") <= EXPLOSION.maxSmoke[2] && n("scorch") <= EXPLOSION.maxScorch[2] && n("ember") <= EXPLOSION.maxEmbers[2]);
  assert.ok(n("halo") <= 5);
  const essential = p.steps.filter((s) => s.prio === 0).length;
  assert.equal(essential, 3 + cells.length);
  assert.ok(p.steps.length <= 3 + cells.length + 10 + 12 + 16 + 5, `${p.steps.length} passos`);
  assert.ok(p.endMs < 1600 + 12 * EXPLOSION.stepMs, `a animacao acaba (${Math.round(p.endMs)} ms)`);
});

test("explosao: determinista com a mesma semente, nao altera as celulas e aceita so o centro", () => {
  const i = input({});
  const copy = JSON.stringify(i.cells);
  const a = planExplosion({ ...i, rng: createRng(11) }), b = planExplosion({ ...i, rng: createRng(11) });
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(i.cells), copy, "as celulas nao sao alteradas");
  const solo = planExplosion({ cells: [[4, 4]], gx: 4, gy: 4, range: 0, splash: 0, tile: T, level: 2, rng: createRng(1) });
  assert.ok(solo.steps.some((s) => s.kind === "flame") && solo.steps.every((s) => finite(s.x) && finite(s.y)));
  const none = planExplosion({ cells: [], gx: 4, gy: 4, range: 0, splash: 0, tile: T, level: 1, rng: createRng(1) });
  assert.ok(none.steps.some((s) => s.kind === "flame"), "sem celulas ainda mostra o centro");
});

test("explosao: bomba com splash (Titan) usa anel mais quente e tremor maior", () => {
  const a = planExplosion(input({ splash: 0 })), b = planExplosion(input({ splash: 1 }));
  assert.notEqual(a.steps.find((s) => s.kind === "ring")!.tint, b.steps.find((s) => s.kind === "ring")!.tint);
  assert.ok(b.shake.intensity > a.shake.intensity && b.shake.duration > a.shake.duration);
});

test("efeitos: preferencia de intensidade persiste na propria chave e valores invalidos viram padrao", () => {
  const mem = new Map<string, string>();
  (globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  resetFxLevelCache();
  assert.equal(getFxLevel(), 2, "padrao = alto");
  assert.equal(setFxLevel(1), 1);
  assert.equal(mem.get(FX_KEY), "1");
  assert.ok(![...mem.keys()].includes("bomber-idle:v1"), "o save do jogo nao e tocado");
  resetFxLevelCache();
  assert.equal(getFxLevel(), 1, "lido de volta do armazenamento");
  mem.set(FX_KEY, "lixo"); resetFxLevelCache();
  assert.equal(getFxLevel(), 2, "valor invalido volta ao padrao");
  assert.equal(setFxLevel(9), 2);
  (globalThis as any).localStorage = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
  resetFxLevelCache();
  assert.equal(getFxLevel(), 2, "sem armazenamento nao quebra");
  assert.doesNotThrow(() => setFxLevel(0));
});
