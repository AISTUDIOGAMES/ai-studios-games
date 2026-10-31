import { test } from "node:test";
import assert from "node:assert/strict";

// state.ts le o localStorage ao ser importado: cada teste monta o "navegador" e importa uma copia nova.
const mem = new Map<string, string>();
let failKeys: ((k: string) => boolean) | null = null; // simula armazenamento cheio/bloqueado para certas chaves
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { if (failKeys?.(k)) throw new Error("QuotaExceededError"); mem.set(k, v); },
  removeItem: (k: string) => void mem.delete(k),
};
let n = 0;
const load = async () => (await import(`../src/state.ts?p=${++n}`)) as typeof import("../src/state");
const KEY = "bomber-idle:v1", BAK = `${KEY}:bak`, BAD = `${KEY}:corrupt`;
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const op = (extra = {}) => ({ r: "common", n: 1, xp: 0, lv: 1, up: { stamina: 0, speed: 0, luck: 0 }, j: { s: 0, v: 0, l: 0 }, ...extra });
const reset = () => { mem.clear(); failKeys = null; };
const goodSave = () => ({ pending: 5000, chests: 7, wk: true, serial: 4, owned: [op({ n: 1, w: 1 }), op({ n: 2, r: "rare" }), op({ n: 3, r: "epic" })], map: { i: 2, n: 4, a: true } });

// ===================== save ilegivel =====================
test("save ilegível sem backup: guarda cópia, avisa e só então recomeça (nunca em silêncio)", async () => {
  reset();
  mem.set(KEY, "{isto nao e json");
  const s = await load();
  assert.equal(s.saveStatus.recovered, "fresh");
  assert.equal(mem.get(BAD), "{isto nao e json", "a cópia ilegível fica guardada para diagnóstico/recuperação manual");
  assert.equal(s.store.pending, s.START_BALANCE);
  assert.doesNotThrow(() => JSON.parse(mem.get(KEY)!), "o save principal volta a ser válido");
});

test("save ilegível com backup: recupera o backup e avisa", async () => {
  reset();
  mem.set(KEY, "\u0000\u0000lixo");
  mem.set(BAK, JSON.stringify(goodSave()));
  const s = await load();
  assert.equal(s.saveStatus.recovered, "backup");
  assert.equal(s.store.pending, 5000);
  assert.equal(s.store.collection.length, 3);
  assert.deepEqual([s.mapState.index, s.mapState.instance], [2, 4]);
  assert.equal(mem.get(BAD), "\u0000\u0000lixo");
});

test("JSON que não é um objeto (lista, número, null) conta como save ilegível", async () => {
  for (const raw of ["[]", "123", "null", '"texto"', ""]) {
    reset();
    mem.set(KEY, raw);
    const s = await load();
    assert.equal(s.saveStatus.recovered, "fresh", `raw=${JSON.stringify(raw)}`);
    assert.equal(s.store.collection.length, 1);
  }
});

test("save válido: vira o backup do início da sessão e nada é avisado", async () => {
  reset();
  const raw = JSON.stringify(goodSave());
  mem.set(KEY, raw);
  const s = await load();
  assert.equal(s.saveStatus.recovered, "none");
  assert.equal(mem.get(BAK), raw, "o backup é exatamente o save que abriu bem");
  assert.equal(mem.has(BAD), false);
});

test("sem save principal (jogo novo ou progresso apagado) o backup antigo NÃO ressuscita o progresso", async () => {
  reset();
  mem.set(BAK, JSON.stringify(goodSave()));
  const s = await load();
  assert.equal(s.saveStatus.recovered, "none");
  assert.equal(s.store.pending, s.START_BALANCE);
  assert.equal(s.store.collection.length, 1);
});

// ===================== gravacao =====================
test("backup periódico: a cada 10 min o backup acompanha o progresso", async () => {
  reset();
  mem.set(KEY, JSON.stringify(goodSave()));
  const realNow = Date.now;
  const s = await load();
  try {
    s.addReward(1234, s.store.collection[0], 3);
    assert.notEqual(JSON.parse(mem.get(BAK)!).pending, JSON.parse(mem.get(KEY)!).pending, "antes dos 10 min o backup ainda é o do início");
    const t = realNow() + 11 * 60 * 1000;
    Date.now = () => t;
    s.addReward(1, s.store.collection[0], 3);
    assert.equal(mem.get(BAK), mem.get(KEY), "depois dos 10 min o backup é atualizado");
  } finally { Date.now = realNow; }
});

test("falha ao gravar (armazenamento cheio) é registrada e o jogo continua; ao voltar, normaliza", async () => {
  reset();
  const s = await load();
  assert.equal(s.saveStatus.ok, true);
  failKeys = (k) => k === KEY;
  assert.doesNotThrow(() => s.addReward(100, s.store.collection[0], 1));
  assert.equal(s.saveStatus.ok, false);
  assert.ok(s.saveStatus.failures >= 1);
  assert.equal(s.store.pending, s.START_BALANCE + 100, "o jogo segue funcionando em memória");
  failKeys = null;
  s.saveNow();
  assert.equal(s.saveStatus.ok, true);
  assert.equal(JSON.parse(mem.get(KEY)!).pending, s.START_BALANCE + 100);
});

test("falha só no backup (falta de espaço) não é tratada como perda do save principal", async () => {
  reset();
  mem.set(KEY, JSON.stringify(goodSave()));
  const realNow = Date.now;
  const s = await load();
  try {
    failKeys = (k) => k === BAK;
    Date.now = () => realNow() + 11 * 60 * 1000;
    s.addReward(10, s.store.collection[0], 1);
    assert.equal(s.saveStatus.ok, true, "o principal foi gravado");
    assert.equal(JSON.parse(mem.get(KEY)!).pending, 5010);
  } finally { Date.now = realNow; failKeys = null; }
});

// ===================== campos do save invalidos =====================
test("alojamentos e zelador do save: texto, negativos e valores gigantes viram valores seguros", async () => {
  reset();
  mem.set(KEY, JSON.stringify({ ...goodSave(), lodging: { casulo: "9", modulo: -3, torre: 1e9 }, butler: { owned: "sim", on: "nao" } }));
  const s = await load();
  const L = s.store.lodging;
  assert.deepEqual([L.casulo, L.modulo], [0, 0]);
  assert.ok(L.torre >= 0 && L.torre <= s.MAX_LODGINGS);
  assert.equal(L.casulo + L.modulo + L.torre <= s.MAX_LODGINGS, true);
  assert.equal(s.store.butler.owned, false, "só `true` de verdade conta como zelador comprado");
  assert.doesNotThrow(() => s.economyTick());
});

test("o total de alojamentos do save nunca passa do limite", async () => {
  reset();
  mem.set(KEY, JSON.stringify({ ...goodSave(), lodging: { casulo: 15, modulo: 15, torre: 15 } }));
  const s = await load();
  const L = s.store.lodging;
  assert.equal(L.casulo + L.modulo + L.torre, s.MAX_LODGINGS);
});

test("progresso do dia do save: contadores inválidos e listas erradas não quebram o jogo", async () => {
  reset();
  mem.set(KEY, JSON.stringify({ ...goodSave(), daily: { day: localDay(), blocks: "x", bombs: NaN, chests: -5, maps: [1, "a", "a", null], claimed: "todas" } }));
  const s = await load();
  const d = s.store.daily;
  assert.deepEqual([d.blocks, d.bombs, d.chests], [0, 0, 0]);
  assert.deepEqual(d.maps, ["a"]);
  assert.deepEqual(d.claimed, []);
  assert.doesNotThrow(() => { s.MISSIONS.forEach((m) => { s.missionProgress(m); s.missionClaimed(m.id); }); s.track.map("b"); });
});

test("progresso de outro dia é zerado e daily inexistente também", async () => {
  reset();
  mem.set(KEY, JSON.stringify({ ...goodSave(), daily: { day: "2001-01-01", blocks: 99, bombs: 99, chests: 99, maps: ["x"], claimed: ["chests"] } }));
  assert.equal((await load()).store.daily.blocks, 0);
  reset();
  mem.set(KEY, JSON.stringify({ ...goodSave(), daily: 42 }));
  assert.equal((await load()).store.daily.chests, 0);
});

test("serial do save inválido não gera ids 'opNaN'", async () => {
  reset();
  mem.set(KEY, JSON.stringify({ ...goodSave(), serial: "abc" }));
  const s = await load();
  assert.equal(s.store.serial, 4, "maior número de operador + 1");
  mem.set(KEY, JSON.stringify({ ...goodSave(), serial: 1e30 }));
  assert.ok(Number.isFinite((await load()).store.serial));
});

test("operadores com o mesmo número: nenhum se perde, ids ficam únicos e o repetido volta para a reserva", async () => {
  reset();
  mem.set(KEY, JSON.stringify({ pending: 1, wk: true, serial: 4, owned: [op({ n: 3, w: 1 }), op({ n: 3, r: "rare", w: 1 }), op({ n: 7, r: "epic" })] }));
  const s = await load();
  const c = s.store.collection;
  assert.equal(c.length, 3, "nenhum operador foi descartado");
  assert.equal(new Set(c.map((h) => h.id)).size, 3, "ids únicos");
  assert.equal(c.filter((h) => s.isWorking(h)).length, 1, "só o primeiro continua trabalhando");
  assert.ok(s.store.serial > Math.max(...c.map((h) => h.serial)));
});

test("save com campos desconhecidos (versão futura) é lido sem erro", async () => {
  reset();
  mem.set(KEY, JSON.stringify({ ...goodSave(), novidade: { a: 1 }, owned: goodSave().owned.map((o) => ({ ...o, extra: true })) }));
  const s = await load();
  assert.equal(s.store.collection.length, 3);
  assert.equal(s.saveStatus.recovered, "none");
});

// ===================== economia: entradas invalidas =====================
test("cápsulas: quantidade inválida é recusada e o saldo não muda (antes, -5 AUMENTAVA o saldo)", async () => {
  reset();
  const s = await load();
  const before = s.store.pending;
  for (const bad of [-5, 0, 1.5, NaN, Infinity, 1e9, "3" as unknown as number]) {
    assert.equal(typeof s.buyCapsule(bad), "string", String(bad));
    assert.equal(s.store.pending, before, `saldo intacto com ${String(bad)}`);
  }
  assert.equal(s.store.collection.length, 1);
  const r = s.buyCapsule(1);
  assert.ok(Array.isArray(r));
  assert.equal(s.store.pending, before - s.CAPSULE_PRICE);
});

test("recompensas inválidas (NaN, negativo, infinito) não mexem no saldo; o saldo respeita o teto", async () => {
  reset();
  const s = await load();
  const h = s.store.collection[0], before = s.store.pending;
  for (const v of [NaN, -100, Infinity, -Infinity]) { s.addReward(v, h, 1); s.addEnemyReward(v, h); }
  assert.equal(s.store.pending, before);
  assert.ok(Number.isFinite(h.xp) && h.xp >= 0);
  mem.set(KEY, JSON.stringify({ ...goodSave(), pending: 1e15 }));
  const t = await load();
  t.addReward(5e14, t.store.collection[0], 1);
  assert.equal(t.store.pending, 1e15, "teto de saldo");
  assert.equal(JSON.parse(mem.get(KEY)!).pending, 1e15, "o que se grava é o que a carga aceita de volta");
});

test("melhorias, alojamentos e missões: argumentos inválidos são recusados sem corromper o saldo", async () => {
  reset();
  const s = await load();
  const h = s.store.collection[0], before = s.store.pending;
  assert.equal(s.upgrade(h, "inexistente" as any), false);
  assert.equal(s.upgrade(h, "__proto__" as any), false);
  assert.equal(s.buyLodging("nada" as any), "Alojamento inválido");
  assert.equal(s.claimMission("nao-existe"), false);
  assert.equal(s.store.pending, before);
  assert.ok(Number.isFinite(s.store.pending));
});

test("a economia segue igual: preços e custos de referência não mudaram", async () => {
  reset();
  const s = await load();
  assert.equal(s.CAPSULE_PRICE, 30000);
  assert.equal(s.START_BALANCE, 60000);
  assert.equal(s.BUTLER_PRICE, 1000000);
  assert.equal(s.REWARD_SCALE, 100);
  const h = s.store.collection[0];
  assert.equal(s.upgradeCost(h, "stamina"), 10000);
  h.up.stamina = 3;
  const growth = (s as { UPGRADE_GROWTH?: number }).UPGRADE_GROWTH ?? 1.5; // segue a constante do jogo (a sua versão usa 1,4)
  assert.equal(s.upgradeCost(h, "stamina"), Math.round(10000 * growth ** 3));
  assert.deepEqual(s.MISSIONS.map((m) => m.reward), [4000, 3000, 3000, 6000]);
});

test("apagar progresso: remove save, backup e cópia e NADA é regravado depois (o pagehide do reload regravava o progresso antigo)", async () => {
  reset();
  mem.set(KEY, JSON.stringify(goodSave()));
  mem.set(BAD, "x");
  const s = await load();
  assert.ok(mem.has(KEY) && mem.has(BAK));
  s.eraseSave();
  assert.equal(mem.has(KEY) || mem.has(BAK) || mem.has(BAD), false);
  s.saveNow();                                   // o que o "pagehide" faz ao recarregar
  s.addReward(500, s.store.collection[0], 1);    // e qualquer recompensa que ainda caia antes do reload
  s.track.map("campo");
  assert.equal(mem.has(KEY) || mem.has(BAK), false, "nada foi regravado");
  const novo = await load();                     // depois do reload: jogo novo de verdade
  assert.equal(novo.store.pending, novo.START_BALANCE);
  assert.equal(novo.store.collection.length, 1);
});
