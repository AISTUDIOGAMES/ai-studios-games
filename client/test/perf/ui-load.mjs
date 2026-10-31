// Medição OPCIONAL de desempenho da INTERFACE (Chromium headless): monta o main.ts real + index.html com o Phaser trocado por
// um stub, carrega um save com 500 operadores (15 trabalhando) e mede quanto tempo cada temporizador do jogo (render a cada
// 400 ms, economyTick a 1 s, saveNow a 10 s) gasta na thread principal, mais o custo de cada gravação do save.
// Uso (na pasta client/): node test/perf/ui-load.mjs [operadores=500]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)), client = resolve(here, "../..");
const req = createRequire(import.meta.url);
const G = process.env.NODE_GLOBAL ?? "/home/claude/.npm-global/lib/node_modules";
const load = (n) => { try { return req(n); } catch { return req(`${G}/${n === "esbuild" ? "tsx/node_modules/esbuild" : n}`); } };
const esbuild = load("esbuild"), { chromium } = load("playwright");
const N = Number(process.argv[2] ?? 500);
const stubs = join(client, "test/audio-render/stubs");
const bundle = (await esbuild.build({ entryPoints: [join(client, "src/main.ts")], bundle: true, format: "iife", write: false, target: "es2022",
  alias: { phaser: join(stubs, "phaser-stub.js"), "@solana/web3.js": join(stubs, "solana-stub.js") }, define: { "import.meta.env": "{}" }, loader: { ".png": "dataurl" } })).outputFiles[0].text;
const html = readFileSync(join(client, "index.html"), "utf8").replace(/<script type="module"[^>]*><\/script>/, "").replace("</body>", `<script>${bundle.replace(/<\/script>/g, "<\\/script>")}</script></body>`);

// save sintético: N operadores de todas as raridades, 15 trabalhando
const R = ["common", "uncommon", "rare", "epic", "mythic", "legendary", "super", "ancestral"];
const owned = Array.from({ length: N }, (_, i) => ({ r: R[i % 8], n: i + 1, xp: i % 40, lv: 1 + (i % 30), up: { stamina: i % 5, speed: i % 4, luck: i % 3 }, j: { s: 0, v: 0.05, l: 0.1 }, s: 5 + (i % 4), st: { chests: i * 3, blocks: i * 9, enemies: i, crits: i * 2, skills: i }, ...(i < 15 ? { w: 1 } : {}) }));
const save = JSON.stringify({ pending: 987654, chests: 4321, serial: N + 1, wk: true, lodging: { casulo: 2, modulo: 1, torre: 0 }, butler: { owned: true, on: true }, owned, map: { i: 3, n: 5, a: true } });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
await page.route("http://app.test/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: html }));
await page.addInitScript(({ save }) => {
  if (!localStorage.getItem("__seeded")) { localStorage.setItem("bomber-idle:v1", save); localStorage.setItem("__seeded", "1"); }
  // cronometra cada callback de setInterval (render / economyTick / saveNow) e cada gravação do save
  window.__t = {}; const rec = (k, ms) => { const a = (window.__t[k] ??= []); a.push(ms); };
  const si = window.setInterval.bind(window);
  window.setInterval = (fn, ms, ...a) => si(function () { const t = performance.now(); try { return fn.apply(this, arguments); } finally { rec(`${fn.name || "anon"}@${ms}`, performance.now() - t); } }, ms, ...a);
  const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { const t = performance.now(); try { return set.call(this, k, v); } finally { if (k === "bomber-idle:v1") { rec("localStorage.setItem(save)", performance.now() - t); window.__saveBytes = v.length; } } };
}, { save });
await page.goto("http://app.test/bomber-idle/");
await page.waitForTimeout(1500);
const open = process.env.OPEN_TAB;                       // ex.: OPEN_TAB=capsules abre uma janela por cima
if (open) { await page.click(`#hub button[data-hub="${open}"]`); await page.waitForTimeout(300); }
await page.evaluate(() => { window.__t = {}; });         // zera: só mede o regime estável
await page.waitForTimeout(Number(process.env.SECONDS ?? 12) * 1000);
const res = await page.evaluate(() => ({ t: window.__t, bytes: window.__saveBytes, cards: document.querySelectorAll("#list > *, .op, .card").length, nodes: document.getElementsByTagName("*").length }));
const stat = (a) => { const s = [...a].sort((x, y) => x - y); return { n: s.length, avg: s.reduce((x, y) => x + y, 0) / s.length, p95: s[Math.floor(s.length * 0.95)] ?? s.at(-1), max: s.at(-1) }; };
console.log(`operadores no save: ${N} | tamanho do save: ${(res.bytes / 1024).toFixed(0)} KB | elementos no DOM: ${res.nodes}${open ? ` | janela aberta: ${open}` : ""}`);
let perSec = 0;
for (const [k, a] of Object.entries(res.t)) {
  const s = stat(a), every = Number(k.split("@")[1]) || 0; const secs = Number(process.env.SECONDS ?? 12);
  console.log(`  ${k.padEnd(30)} chamadas ${String(s.n).padStart(3)} | média ${s.avg.toFixed(2).padStart(6)} ms | p95 ${s.p95.toFixed(2).padStart(6)} ms | máx ${s.max.toFixed(2).padStart(6)} ms`);
  if (!k.startsWith("localStorage")) perSec += (s.avg * s.n) / secs;
}
console.log(`  => temporizadores do jogo (fora do canvas): ~${perSec.toFixed(1)} ms de CPU por segundo (${(perSec / 10).toFixed(1)}% de um núcleo)`);
if (errors.length) console.log("ERROS:", errors);
await browser.close();
