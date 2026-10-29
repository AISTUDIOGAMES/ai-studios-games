// Verificação OPCIONAL do áudio em navegador real (Chromium headless + OfflineAudioContext).
// Renderiza cada efeito e a música sem tocar nada, mede pico/clipping/volume e grava prévias .wav.
// Requisitos: playwright + chromium instalados e esbuild (já vem com o vite).  Uso (na pasta client/):
//   node test/audio-render/render.mjs [pasta-de-saída]
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const load = (name, fallbacks = []) => { for (const p of [name, ...fallbacks]) { try { return req(p); } catch { /* tenta o próximo */ } } throw new Error(`módulo ${name} não encontrado`); };
const G = process.env.NODE_GLOBAL ?? "/home/claude/.npm-global/lib/node_modules";
const esbuild = load("esbuild", [`${G}/tsx/node_modules/esbuild`]);
const { chromium } = load("playwright", [`${G}/playwright`]);
const out = resolve(process.argv[2] ?? join(here, "out"));
mkdirSync(out, { recursive: true });

const bundle = await esbuild.build({ entryPoints: [join(here, "entry.ts")], bundle: true, format: "iife", globalName: "A", write: false, target: "es2022" });
const code = bundle.outputFiles[0].text;

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ content: code });

const result = await page.evaluate(async () => {
  const SR = 44100;
  const stats = (d, from = 0, to = d.length) => {
    let peak = 0, sum = 0, clip = 0, nan = 0, dc = 0, last = 0;
    for (let i = from; i < to; i++) { const v = d[i]; if (!Number.isFinite(v)) { nan++; continue; } const a = Math.abs(v); if (a > peak) peak = a; if (a >= 0.999) clip++; sum += v * v; dc += v; if (a > 0.001) last = i; }
    const n = Math.max(1, to - from);
    return { peak, rms: Math.sqrt(sum / n), clip, nan, dc: dc / n, tail: last / SR };
  };
  const db = (x) => (x > 0 ? 20 * Math.log10(x) : -120);
  const wavB64 = (d) => { const b = new Int16Array(d.length); for (let i = 0; i < d.length; i++) b[i] = Math.max(-1, Math.min(1, d[i])) * 32767; const h = new ArrayBuffer(44), v = new DataView(h); const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + b.byteLength, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, b.byteLength, true);
    const all = new Uint8Array(44 + b.byteLength); all.set(new Uint8Array(h), 0); all.set(new Uint8Array(b.buffer), 44); let s = ""; for (let i = 0; i < all.length; i += 0x8000) s += String.fromCharCode.apply(null, all.subarray(i, i + 0x8000)); return btoa(s); };
  const mk = (sec) => { const ctx = new OfflineAudioContext(1, Math.ceil(SR * sec), SR); const buses = A.createBuses(ctx); return { ctx, buses }; };
  const res = { sfx: {}, music: {}, stress: {}, wavs: {} };

  // 1) cada efeito sozinho, no volume padrão do jogador (efeitos 70%)
  for (const id of A.SFX_IDS) {
    const { ctx, buses } = mk(2.6);
    buses.sfxGain.gain.value = A.volToGain(0.7);
    const def = A.SFX[id]; const vg = ctx.createGain(); vg.gain.value = def.gain; vg.connect(buses.sfxGain);
    let n = 0; const rnd = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
    const end = def.play(ctx, vg, 0.01, { pitch: 1, level: id === "explosion" ? 1 : 0.5, rarity: 5, rnd });
    const buf = await ctx.startRendering(); const d = buf.getChannelData(0);
    const s = stats(d); res.sfx[id] = { ...s, peakDb: db(s.peak), rmsDb: db(s.rms), endSec: end };
    if (["explosion", "chestOpen", "levelUp", "bombPlant", "blockBreak", "mapClear", "capsule", "enemyDeath", "uiClick", "upgrade"].includes(id)) res.wavs[`sfx-${id}.wav`] = wavB64(d.subarray(0, Math.min(d.length, Math.ceil((end + 0.2) * SR))));
  }

  // 2) música: 52 s (2 voltas completas do pad/baixo) no volume padrão (música 50%)
  {
    const sec = 52; const { ctx, buses } = mk(sec);
    buses.musicGain.gain.value = A.volToGain(0.5);
    const p = new A.MusicPlayer(ctx, { input: buses.musicIn }); p.buildDelay();
    const steps = Math.ceil(sec / A.STEP_SEC); for (let i = 0; i < steps; i++) p.schedule(A.planStep(i), 0.1 + i * A.STEP_SEC);
    const buf = await ctx.startRendering(); const d = buf.getChannelData(0);
    const s = stats(d, SR * 4); // ignora os 4 s de entrada do pad
    const win = []; for (let t = 4; t + 0.25 <= sec; t += 0.25) win.push(stats(d, Math.floor(t * SR), Math.floor((t + 0.25) * SR)).rms);
    const sorted = [...win].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
    const bar = 16 * A.STEP_SEC, seamBar = A.LOOP_STEPS / 16; // compasso da emenda do loop
    const atBar = (k) => db(stats(d, Math.floor((0.1 + k * bar - 0.25) * SR), Math.floor((0.1 + k * bar + 0.25) * SR)).rms); // janela de 500 ms em volta da virada
    const others = []; for (let k = 2; k < Math.floor((sec - 1) / bar) && k !== seamBar; k++) others.push(atBar(k));
    others.sort((x, y) => x - y); const medBar = others[Math.floor(others.length / 2)];
    const seamDev = atBar(seamBar) - medBar, spread = others[others.length - 1] - others[0];
    res.music = { ...s, peakDb: db(s.peak), rmsDb: db(s.rms), medianWinDb: db(med), minWinDb: db(sorted[0]), maxWinDb: db(sorted[sorted.length - 1]), seamDevDb: seamDev, barSpreadDb: spread, loopSec: A.LOOP_STEPS * A.STEP_SEC };
    res.wavs["music-loop-30s.wav"] = wavB64(d.subarray(0, 30 * SR));
  }

  // 3) estresse: 12 explosões + chuva de outros efeitos no mesmo instante (15 operadores trabalhando)
  {
    const { ctx, buses } = mk(3);
    buses.sfxGain.gain.value = A.volToGain(1); buses.musicGain.gain.value = A.volToGain(1);
    const p = new A.MusicPlayer(ctx, { input: buses.musicIn }); p.buildDelay(); for (let i = 0; i < 20; i++) p.schedule(A.planStep(i), 0.05 + i * A.STEP_SEC);
    let n = 7; const rnd = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
    for (let k = 0; k < 12; k++) { const def = A.SFX.explosion; const vg = ctx.createGain(); vg.gain.value = def.gain; vg.connect(buses.sfxGain); def.play(ctx, vg, 1 + k * 0.01, { pitch: 0.94 + rnd() * 0.12, level: 1, rarity: 0, rnd }); }
    for (const id of ["blockBreak", "chestOpen", "enemyDeath", "levelUp", "capsule", "mapClear"]) for (let k = 0; k < 3; k++) { const def = A.SFX[id]; const vg = ctx.createGain(); vg.gain.value = def.gain; vg.connect(buses.sfxGain); def.play(ctx, vg, 1 + k * 0.02, { pitch: 1, level: 1, rarity: 7, rnd }); }
    const buf = await ctx.startRendering(); const s = stats(buf.getChannelData(0)); res.stress = { ...s, peakDb: db(s.peak), rmsDb: db(s.rms), compReduction: buses.comp.reduction };
  }
  return res;
});

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);
console.log("\n== EFEITOS (volume padrão 70%) ==");
let bad = 0;
for (const [id, s] of Object.entries(result.sfx)) {
  const flag = s.nan || s.clip || s.peak < 0.02 || s.peakDb > -0.5 ? "  <-- VERIFICAR" : "";
  if (flag) bad++;
  console.log(`${id.padEnd(11)} pico ${fmt(s.peakDb).padStart(6)} dBFS  rms ${fmt(s.rmsDb).padStart(6)}  fim ${s.endSec.toFixed(2)}s  clip ${s.clip} nan ${s.nan} dc ${s.dc.toExponential(1)}${flag}`);
}
const m = result.music;
console.log(`\n== MÚSICA (volume padrão 50%, 52 s) ==\npico ${fmt(m.peakDb)} dBFS · rms ${fmt(m.rmsDb)} dBFS · janelas de 250 ms: mediana ${fmt(m.medianWinDb)}, mín ${fmt(m.minWinDb)}, máx ${fmt(m.maxWinDb)} dBFS\nemenda do loop (${m.loopSec.toFixed(1)} s): ${fmt(m.seamDevDb)} dB em relação à mediana das outras viradas de compasso (variação normal entre compassos: ${fmt(m.barSpreadDb)} dB) · clip ${m.clip} · nan ${m.nan} · dc ${m.dc.toExponential(1)}`);
const st = result.stress;
console.log(`\n== ESTRESSE (12 explosões + 18 efeitos + música, tudo a 100%) ==\npico ${fmt(st.peakDb)} dBFS · clip ${st.clip} · nan ${st.nan} · redução do compressor ${fmt(st.compReduction)} dB`);
for (const [name, b64] of Object.entries(result.wavs)) writeFileSync(join(out, name), Buffer.from(b64, "base64"));
console.log(`\n${Object.keys(result.wavs).length} prévias .wav gravadas em ${out}`);
if (errors.length) console.log("ERROS DE CONSOLE:", errors);
await browser.close();
process.exit(errors.length || bad || st.clip || st.nan || m.clip || m.nan ? 1 : 0);
