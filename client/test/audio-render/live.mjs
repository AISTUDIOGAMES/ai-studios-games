// Verificação OPCIONAL com AudioContext REAL (Chromium headless): gesto do jogador -> música audível -> estresse ->
// mudo -> aba escondida. Mede a saída real com um AnalyserNode ligado ao fim da cadeia.
// Uso (na pasta client/): node test/audio-render/live.mjs
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const G = process.env.NODE_GLOBAL ?? "/home/claude/.npm-global/lib/node_modules";
const load = (n) => { try { return req(n); } catch { return req(`${G}/${n === "esbuild" ? "tsx/node_modules/esbuild" : n}`); } };
const esbuild = load("esbuild"), { chromium } = load("playwright");
const code = (await esbuild.build({ entryPoints: [join(here, "entry.ts")], bundle: true, format: "iife", globalName: "A", write: false, target: "es2022" })).outputFiles[0].text;

const browser = await chromium.launch({ args: ["--autoplay-policy=document-user-activation-required"] }); // política REAL: exige gesto
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.setContent("<!doctype html><body><button id='b'>clique</button></body>");
await page.addScriptTag({ content: `(() => { const O = window.AudioContext; let n = 0; window.__made = () => n;
  window.AudioContext = class extends O { constructor(...a) { super(...a); n++; window.__ctx = this; const ws = this.createWaveShaper.bind(this);
    this.createWaveShaper = () => { const s = ws(); const an = this.createAnalyser(); an.fftSize = 2048; s.connect(an); window.__an = an; return s; }; } }; })();` });
await page.addScriptTag({ content: code });

const out = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const meter = async (ms) => { const buf = new Float32Array(window.__an.fftSize); let peak = 0, sum = 0, n = 0; const t0 = performance.now();
    while (performance.now() - t0 < ms) { window.__an.getFloatTimeDomainData(buf); for (const v of buf) { peak = Math.max(peak, Math.abs(v)); sum += v * v; n++; } await sleep(20); }
    return { peak, rms: Math.sqrt(sum / Math.max(1, n)) }; };
  const r = {}; const e = new A.AudioEngine(); window.__e = e; e.installAutoUnlock();
  r.before = { status: e.status, made: window.__made(), play: e.play("explosion") };
  return r;
});
await page.click("#b"); // gesto real do jogador
await page.waitForTimeout(400);
const live = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const e = window.__e, r = {};
  const meter = async (ms) => { const buf = new Float32Array(window.__an.fftSize); let peak = 0, sum = 0, n = 0; const t0 = performance.now();
    while (performance.now() - t0 < ms) { window.__an.getFloatTimeDomainData(buf); for (const v of buf) { peak = Math.max(peak, Math.abs(v)); sum += v * v; n++; } await sleep(20); }
    return { peak, rms: Math.sqrt(sum / Math.max(1, n)) }; };
  r.afterGesture = { status: e.status, made: window.__made(), contexts: e.contextsCreated, music: e.musicRunning };
  await sleep(2600); r.music = await meter(800);
  r.explosionPlayed = e.play("explosion", { level: 1 }); r.explosion = await meter(300);
  // estresse: ~600 pedidos de som aleatorios em ~3 s (15 operadores + interface)
  const ids = A.SFX_IDS; let maxVoices = 0, played = 0, asked = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 3000) { for (let k = 0; k < 4; k++) { asked++; if (e.play(ids[Math.floor(Math.random() * ids.length)], { rarity: Math.floor(Math.random() * 8), level: Math.random() })) played++; } maxVoices = Math.max(maxVoices, e.activeVoices); await sleep(5); }
  const stressPeak = await meter(200);
  r.stress = { asked, played, maxVoices, state: window.__ctx.state, peak: stressPeak.peak };
  await sleep(2500); r.afterStress = e.activeVoices; // o som mais longo (vitória de mapa) dura ~1,4 s
  // mudo geral
  A.setAudioPrefs({ music: false, sfx: false }); await sleep(600); r.muted = await meter(400); r.mutedMusic = e.musicRunning; r.mutedPlay = e.play("explosion");
  A.setAudioPrefs({ music: true, sfx: true }); await sleep(2200); r.unmuted = await meter(500); r.unmutedMusic = e.musicRunning;
  // aba escondida
  e.handleVisibility(true); await sleep(300); r.hidden = { state: window.__ctx.state, status: e.status, music: e.musicRunning, play: e.play("explosion") };
  e.handleVisibility(false); await sleep(800); r.shown = { state: window.__ctx.state, status: e.status, music: e.musicRunning };
  r.contextsAtEnd = window.__made();
  e.dispose(); r.disposed = window.__ctx.state;
  return r;
});

const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : "-inf");
let fail = 0; const check = (ok, msg) => { console.log(`${ok ? "OK  " : "FALHA"} ${msg}`); if (!ok) fail++; };
check(out.before.status === "idle" && out.before.made === 0 && out.before.play === false, "antes do gesto: nenhum AudioContext criado e nada toca");
check(live.afterGesture.status === "running" && live.afterGesture.contexts === 1 && live.afterGesture.music, "gesto real libera o áudio: 1 contexto, música ligada");
check(live.music.rms > 3e-3, `música audível na saída real (rms ${db(live.music.rms)} dBFS, pico ${db(live.music.peak)})`);
check(live.explosionPlayed && live.explosion.peak > live.music.peak * 1.5 && live.explosion.peak <= 0.951, `explosão se destaca sem passar do teto (pico ${db(live.explosion.peak)} dBFS)`);
check(live.stress.maxVoices <= 24 && live.stress.state === "running" && live.stress.peak <= 0.951, `estresse: ${live.stress.asked} pedidos -> ${live.stress.played} sons, no máx. ${live.stress.maxVoices} vozes, pico ${db(live.stress.peak)} dBFS`);
check(live.afterStress === 0, "depois do estresse todas as vozes são liberadas");
check(live.muted.rms < 1e-3 && !live.mutedMusic && live.mutedPlay === false, `mudo: saída silenciosa (rms ${db(live.muted.rms)}), música parada, efeitos não tocam`);
check(live.unmuted.rms > 3e-3 && live.unmutedMusic, "ao religar a música volta (uma só)");
check(live.hidden.state === "suspended" && !live.hidden.music && live.hidden.play === false, "aba escondida: contexto suspenso, música parada, nada toca");
check(live.shown.state === "running" && live.shown.music, "aba visível de novo: retoma sozinho");
check(live.contextsAtEnd === 1, "durante toda a sessão existiu um único AudioContext");
check(live.disposed === "closed" && errors.length === 0, `encerramento limpo e sem erros de console ${errors.length ? JSON.stringify(errors) : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
