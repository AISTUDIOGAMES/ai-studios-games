// Verificação OPCIONAL da INTERFACE de áudio no Chromium: monta o main.ts real + index.html com o Phaser trocado por um stub.
// Uso (na pasta client/): node test/audio-render/ui.mjs [pasta-de-capturas]
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)), client = resolve(here, "../..");
const req = createRequire(import.meta.url);
const G = process.env.NODE_GLOBAL ?? "/home/claude/.npm-global/lib/node_modules";
const load = (n) => { try { return req(n); } catch { return req(`${G}/${n === "esbuild" ? "tsx/node_modules/esbuild" : n}`); } };
const esbuild = load("esbuild"), { chromium } = load("playwright");
const shots = resolve(process.argv[2] ?? join(here, "out")); mkdirSync(shots, { recursive: true });
const bundle = (await esbuild.build({ entryPoints: [join(client, "src/main.ts")], bundle: true, format: "iife", write: false, target: "es2022",
  alias: { phaser: join(here, "stubs/phaser-stub.js"), "@solana/web3.js": join(here, "stubs/solana-stub.js") }, define: { "import.meta.env": "{}" }, loader: { ".png": "dataurl" } })).outputFiles[0].text;
let html = readFileSync(join(client, "index.html"), "utf8").replace(/<script type="module"[^>]*><\/script>/, "");
if (!/<script type="module"/.test(readFileSync(join(client, "index.html"), "utf8"))) throw new Error("index.html sem script module: ajuste o teste");
html = html.replace("</body>", `<script>${bundle.replace(/<\/script>/g, "<\\/script>")}</script></body>`);

const browser = await chromium.launch({ args: ["--autoplay-policy=document-user-activation-required"] });
const errors = []; let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "OK  " : "FALHA"} ${msg}`); if (!ok) fail++; };
const open = async (viewport) => {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.route("http://app.test/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: html }));
  await page.goto("http://app.test/bomber-idle/");
  return { ctx, page };
};
const btn = (page) => page.evaluate(() => { const b = document.getElementById("sound-btn"); return { lbl: b.querySelector(".lbl").textContent, ic: b.querySelector(".ic").textContent, pressed: b.getAttribute("aria-pressed"), hint: b.classList.contains("needs-unlock"), disabled: b.disabled }; });

// ---------- desktop ----------
let { ctx, page } = await open({ width: 1280, height: 800 });
let b = await btn(page);
check(b.lbl === "Ativar som" && b.hint && b.pressed === "false" && b.ic === "🔇", "1ª visita: botão pulsando \"Ativar som\" (nada toca antes do gesto)");
await page.screenshot({ path: join(shots, "ui-desktop-antes.png"), clip: { x: 0, y: 0, width: 1280, height: 120 } });
await page.click("#sound-btn"); await page.waitForTimeout(700);
b = await btn(page);
check(b.lbl === "Som" && b.ic === "🔊" && !b.hint && b.pressed === "true", "clique no botão libera o som: vira \"Som\" 🔊 sem pulsar");
await page.click('#hub button[data-hub="settings"]'); await page.waitForTimeout(200);
const rows = await page.evaluate(() => [...document.querySelectorAll("#modal .audio-row")].map((r) => ({ name: r.querySelector(".muted").textContent, tog: r.querySelector("button").textContent, pressed: r.querySelector("button").getAttribute("aria-pressed"), val: r.querySelector("input").value, label: r.querySelector("input").getAttribute("aria-label"), pct: r.querySelector(".audio-pct").textContent })));
check(rows.length === 2 && rows[0].name === "Música" && rows[0].val === "50" && rows[1].name === "Efeitos sonoros" && rows[1].val === "70" && rows.every((r) => r.tog === "Ligada" && r.label), "Configurações: Música 50% e Efeitos 70%, ligados, sliders com rótulo de acessibilidade");
check(await page.evaluate(() => document.body.scrollWidth <= innerWidth), "sem rolagem horizontal no desktop");
await page.screenshot({ path: join(shots, "ui-desktop-config.png") });
await page.evaluate(() => { const r = document.querySelector("#modal .audio-range"); r.value = "20"; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); });
await page.locator("#modal .audio-row").nth(1).locator("button").click(); // desliga efeitos
await page.waitForTimeout(200);
let saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bomber-idle:audio")));
check(saved.musicVol === 0.2 && saved.sfx === false && saved.music === true, `preferências gravadas em bomber-idle:audio (${JSON.stringify(saved)})`);
check(await page.evaluate(() => { const r = document.querySelectorAll("#modal .audio-range"); return r[1].disabled && !r[0].disabled; }), "slider de efeitos fica desabilitado quando efeitos estão desligados");
await page.screenshot({ path: join(shots, "ui-desktop-config-editado.png") });
await page.click("#modal-close");
await page.click("#sound-btn"); await page.waitForTimeout(300); // com música ligada -> silencia tudo
b = await btn(page);
check(b.lbl === "Mudo" && b.ic === "🔇" && b.pressed === "false", "botão do cabeçalho silencia tudo (Mudo)");
saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bomber-idle:audio")));
check(saved.music === false && saved.sfx === false && saved.musicVol === 0.2, "mudo mantém os volumes escolhidos");
await page.reload(); await page.waitForTimeout(300);
b = await btn(page);
check(b.lbl === "Mudo" && !b.hint, "depois de recarregar a página, o mudo continua e nada pulsa/toca sozinho");
await page.click("#sound-btn"); await page.waitForTimeout(700);
b = await btn(page);
saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bomber-idle:audio")));
check(b.lbl === "Som" && saved.music && saved.sfx && saved.musicVol === 0.2, "religar pelo botão volta ao som com o volume salvo");
await ctx.close();

// ---------- celular ----------
({ ctx, page } = await open({ width: 390, height: 780 }));
await page.screenshot({ path: join(shots, "ui-mobile-antes.png") });
const size = await page.evaluate(() => { const r = document.getElementById("sound-btn").getBoundingClientRect(); return { w: r.width, h: r.height, off: r.right > innerWidth }; });
check(size.h >= 44 && !size.off, `celular: botão de som com área de toque ${Math.round(size.w)}x${Math.round(size.h)} px e dentro da tela`);
await page.tap("#sound-btn"); await page.waitForTimeout(600);
await page.tap('#hub button[data-hub="settings"]'); await page.waitForTimeout(250);
await page.evaluate(() => document.querySelector("#modal .audio-head")?.scrollIntoView());
await page.screenshot({ path: join(shots, "ui-mobile-config.png") });
const hs = await page.evaluate(() => ({ hs: document.body.scrollWidth <= innerWidth, tg: [...document.querySelectorAll("#modal .audio-row button")].map((x) => Math.round(x.getBoundingClientRect().height)), rg: [...document.querySelectorAll("#modal .audio-range")].map((x) => Math.round(x.getBoundingClientRect().height)) }));
check(hs.hs && hs.tg.every((h) => h >= 40) && hs.rg.every((h) => h >= 24), `celular: sem rolagem horizontal, botões ${hs.tg.join("/")} px e sliders ${hs.rg.join("/")} px de altura`);
await ctx.close();
check(errors.length === 0, `sem erros de console ${errors.length ? JSON.stringify(errors) : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
