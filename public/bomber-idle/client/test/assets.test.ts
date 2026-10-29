import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// state.ts le o localStorage ao ser importado.
const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};
const pub = (p: string) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));

test("assets: todo retrato de BOMBER existe em client/public", async () => {
  const { ARCH } = (await import("../src/state.ts")) as typeof import("../src/state");
  const entries = Object.entries(ARCH);
  assert.equal(entries.length, 8, "devem existir 8 BOMBERS");
  for (const [rarity, a] of entries) assert.ok(existsSync(pub(a.portrait)), `retrato ausente: ${a.portrait} (${rarity})`);
});

test("assets: retratos têm nomes únicos e o index.html não referencia arquivos de fora do jogo", async () => {
  const { ARCH } = (await import("../src/state.ts")) as typeof import("../src/state");
  const portraits = Object.values(ARCH).map((a) => a.portrait);
  assert.equal(new Set(portraits).size, portraits.length);
  const html = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  const abs = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]).filter((p) => !p.startsWith("/src/"));
  assert.deepEqual(abs, [], "index.html usa caminhos absolutos que quebram em /bomber-idle/");
});
