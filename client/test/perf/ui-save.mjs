// Verificação OPCIONAL (Chromium headless) dos AVISOS de salvamento na interface real (main.ts + index.html, Phaser em stub):
// save ilegível sem backup, save ilegível com backup, falha ao gravar e "apagar progresso" (que também remove o backup).
// Uso (na pasta client/): node test/perf/ui-save.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)), client = resolve(here, "../..");
const req = createRequire(import.meta.url);
const G = process.env.NODE_GLOBAL ?? "/home/claude/.npm-global/lib/node_modules";
const load = (n) => { try { return req(n); } catch { return req(`${G}/${n === "esbuild" ? "tsx/node_modules/esbuild" : n}`); } };
const esbuild = load("esbuild"), { chromium } = load("playwright");
const stubs = join(client, "test/audio-render/stubs");
const bundle = (await esbuild.build({ entryPoints: [join(client, "src/main.ts")], bundle: true, format: "iife", write: false, target: "es2022",
  alias: { phaser: join(stubs, "phaser-stub.js"), "@solana/web3.js": join(stubs, "solana-stub.js") }, define: { "import.meta.env": "{}" }, loader: { ".png": "dataurl" } })).outputFiles[0].text;
const html = readFileSync(join(client, "index.html"), "utf8").replace(/<script type="module"[^>]*><\/script>/, "").replace("</body>", `<script>${bundle.replace(/<\/script>/g, "<\\/script>")}</script></body>`);

const browser = await chromium.launch();
let fail = 0; const errors = [];
const check = (ok, msg) => { console.log(`${ok ? "OK  " : "FALHA"} ${msg}`); if (!ok) fail++; };
const day = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
const goodSave = (pending) => JSON.stringify({ pending, chests: 3, wk: true, serial: 3, owned: [{ r: "common", n: 1, xp: 0, lv: 1, up: { stamina: 0, speed: 0, luck: 0 }, j: { s: 0, v: 0, l: 0 }, w: 1 }, { r: "rare", n: 2, xp: 0, lv: 1, up: { stamina: 0, speed: 0, luck: 0 }, j: { s: 0, v: 0, l: 0 } }], map: { i: 0, n: 1, a: true } });
async function open(seed) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.route("http://app.test/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: html }));
  await page.addInitScript((s) => { if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } }, seed);
  await page.goto("http://app.test/bomber-idle/");
  await page.waitForTimeout(600);
  return { ctx, page };
}
const toastText = (page) => page.evaluate(() => document.getElementById("toast").textContent);
const ls = (page, k) => page.evaluate((key) => localStorage.getItem(key), k);

// 1) ilegível, sem backup
let { ctx, page } = await open({ "bomber-idle:v1": "{isto nao e json" });
check(/ilegível/.test(await toastText(page)) && /jogo novo/.test(await toastText(page)), "save ilegível sem backup: avisa que começou um jogo novo");
check((await ls(page, "bomber-idle:v1:corrupt")) === "{isto nao e json", "a cópia ilegível ficou guardada");
check((await page.textContent("#pending")).replace(/\D/g, "") === "60000", "o jogo abre normalmente com o saldo inicial");
check((() => { try { JSON.parse(""); } catch { return true; } })() && await page.evaluate(() => { try { JSON.parse(localStorage.getItem("bomber-idle:v1")); return true; } catch { return false; } }), "o save principal foi regravado válido");
await ctx.close();

// 2) ilegível, com backup
({ ctx, page } = await open({ "bomber-idle:v1": "\u0000\u0000lixo", "bomber-idle:v1:bak": goodSave(12345) }));
check(/recuperei a cópia de segurança/.test(await toastText(page)), "save ilegível com backup: avisa que recuperou o backup");
check((await page.textContent("#pending")).replace(/\D/g, "") === "12345", "o saldo do backup (12.345) aparece na tela");
check(await page.evaluate(() => document.querySelectorAll("[data-hub]").length > 0) , "interface normal depois da recuperação");
await ctx.close();

// 3) falha ao gravar (armazenamento cheio) durante o jogo
({ ctx, page } = await open({ "bomber-idle:v1": goodSave(5000) }));
await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "bomber-idle:v1") throw new DOMException("cheio", "QuotaExceededError"); return set.call(this, k, v); }; });
await page.waitForFunction(() => /Não foi possível salvar/.test(document.getElementById("toast").textContent), null, { timeout: 15000 }).then(() => check(true, "falha ao gravar: o jogador é avisado"), () => check(false, "falha ao gravar: o jogador é avisado"));
await ctx.close();

// 4) apagar progresso remove save, backup e cópia
({ ctx, page } = await open({ "bomber-idle:v1": goodSave(777), "bomber-idle:v1:corrupt": "x" }));
check((await ls(page, "bomber-idle:v1:bak")) !== null, "save válido gera backup no início da sessão");
await page.click('#hub button[data-hub="settings"]');
page.once("dialog", (d) => d.accept());
await page.evaluate(() => { window.confirm = () => true; });
await page.click("#modal .danger");
await page.waitForTimeout(400);
const after = await page.evaluate(() => ({ main: JSON.parse(localStorage.getItem("bomber-idle:v1") || "null")?.pending, bak: localStorage.getItem("bomber-idle:v1:bak"), bad: localStorage.getItem("bomber-idle:v1:corrupt") }));
check(after.main === 60000 && after.bak === null && after.bad === null, `apagar progresso de verdade: recomeça com o saldo inicial (${after.main}), sem backup nem cópia antigos`);
check((await page.textContent("#pending")).replace(/\D/g, "") === "60000", "a tela mostra o saldo inicial depois do reset");
await ctx.close();

check(errors.length === 0, `sem erros de console ${errors.length ? JSON.stringify(errors) : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
