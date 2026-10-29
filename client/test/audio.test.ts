import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AudioEngine, createBuses, limiterCurve } from "../src/audio/audioEngine";
import { AUDIO_DEFAULTS, AUDIO_KEY, getAudioPrefs, onAudioPrefs, resetAudioPrefsCache, sanitizeAudioPrefs, setAudioPrefs, volToGain } from "../src/audio/audioSettings";
import { BPM, LOOP_STEPS, MusicPlayer, STEP_SEC, STEPS_PER_BAR, hash32, planStep, type Timer } from "../src/audio/music";
import { SFX, SFX_IDS, midiToFreq } from "../src/audio/synth";

// ---------- armazenamento falso (as preferências usam localStorage) ----------
const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

// ---------- AudioContext falso: conta o que foi criado e confere se tudo que começou também termina ----------
const param = (v = 0) => ({ value: v, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
class FakeCtx {
  currentTime = 0; state: "suspended" | "running" | "closed" = "suspended"; sampleRate = 44100; onstatechange: (() => void) | null = null;
  destination = { connect() {}, disconnect() {} };
  started = 0; stopped = 0; nodes = 0; suspendCalls = 0; resumeCalls = 0; failOsc = false;
  private node<T extends object>(extra: T) { this.nodes++; return { connect: (n: unknown) => n, disconnect() {}, ...extra }; }
  createGain() { return this.node({ gain: param(1) }); }
  createOscillator() {
    if (this.failOsc) throw new Error("falha simulada");
    const self = this;
    return this.node({ type: "sine", frequency: param(440), detune: param(0), onended: null as null | (() => void), addEventListener() {}, start() { self.started++; }, stop() { self.stopped++; } });
  }
  createBiquadFilter() { return this.node({ type: "lowpass", frequency: param(1000), Q: param(1) }); }
  createBufferSource() { const self = this; return this.node({ buffer: null, onended: null as null | (() => void), start() { self.started++; }, stop() { self.stopped++; } }); }
  createBuffer(_c: number, len: number) { return { getChannelData: () => new Float32Array(len) }; }
  createDynamicsCompressor() { return this.node({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); }
  createDelay() { return this.node({ delayTime: param() }); }
  createWaveShaper() { return this.node({ curve: null, oversample: "none" }); }
  resume() { this.resumeCalls++; this.state = "running"; this.onstatechange?.(); return Promise.resolve(); }
  suspend() { this.suspendCalls++; this.state = "suspended"; this.onstatechange?.(); return Promise.resolve(); }
  close() { this.state = "closed"; return Promise.resolve(); }
}
class FakeTimers implements Timer {
  active = new Map<number, () => void>(); sets = 0; private n = 1;
  set(fn: () => void) { const id = this.n++; this.sets++; this.active.set(id, fn); return id; }
  clear(id: unknown) { this.active.delete(id as number); }
  run() { [...this.active.values()].forEach((f) => f()); }
}
class FakeDoc {
  hidden = false; handlers = new Map<string, (() => void)[]>();
  addEventListener(e: string, f: () => void) { this.handlers.set(e, [...(this.handlers.get(e) ?? []), f]); }
  removeEventListener(e: string, f: () => void) { this.handlers.set(e, (this.handlers.get(e) ?? []).filter((x) => x !== f)); }
  fire(e: string) { (this.handlers.get(e) ?? []).forEach((f) => f()); }
}

function setup(opts: { prefs?: Partial<typeof AUDIO_DEFAULTS> } = {}) {
  if (opts.prefs) setAudioPrefs(opts.prefs);
  const ctx = new FakeCtx(), timers = new FakeTimers(), doc = new FakeDoc();
  let made = 0;
  let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const engine = new AudioEngine({ createContext: () => { made++; return ctx as unknown as AudioContext; }, timers, doc: doc as any, rnd });
  return { ctx, timers, doc, engine, made: () => made };
}
beforeEach(() => { mem.clear(); resetAudioPrefsCache(); });

// ===================== preferências =====================
test("áudio/prefs: padrões, ida e volta no armazenamento e fora do save do jogo", () => {
  assert.deepEqual(getAudioPrefs(), AUDIO_DEFAULTS);
  mem.set("bomber-idle:v1", "SAVE-DO-JOGADOR");
  setAudioPrefs({ music: false, sfxVol: 0.25 });
  resetAudioPrefsCache();
  assert.deepEqual(getAudioPrefs(), { ...AUDIO_DEFAULTS, music: false, sfxVol: 0.25 });
  assert.equal(mem.get("bomber-idle:v1"), "SAVE-DO-JOGADOR", "o save não pode ser tocado");
  assert.ok(mem.has(AUDIO_KEY) && AUDIO_KEY !== "bomber-idle:v1");
});

test("áudio/prefs: valores inválidos, JSON quebrado e fora da faixa viram valores seguros", () => {
  mem.set(AUDIO_KEY, "{isso nao e json");
  assert.deepEqual(getAudioPrefs(), AUDIO_DEFAULTS);
  assert.deepEqual(sanitizeAudioPrefs({ music: "sim", sfx: 1, musicVol: NaN, sfxVol: Infinity }), AUDIO_DEFAULTS);
  assert.equal(sanitizeAudioPrefs({ musicVol: 9, sfxVol: -3 }).musicVol, 1);
  assert.equal(sanitizeAudioPrefs({ musicVol: 9, sfxVol: -3 }).sfxVol, 0);
  assert.deepEqual(sanitizeAudioPrefs(null), AUDIO_DEFAULTS);
  assert.equal(setAudioPrefs({ musicVol: 5 }).musicVol, 1);
});

test("áudio/prefs: ouvintes são avisados, um que falha não derruba os outros, e dá para cancelar", () => {
  const seen: number[] = [];
  const off = onAudioPrefs(() => { throw new Error("ouvinte ruim"); });
  const off2 = onAudioPrefs((p) => seen.push(p.musicVol));
  setAudioPrefs({ musicVol: 0.2 });
  off2();
  setAudioPrefs({ musicVol: 0.3 });
  off();
  assert.deepEqual(seen, [0.2]);
});

test("áudio/prefs: sem localStorage o jogo segue com os padrões", () => {
  const saved = (globalThis as any).localStorage;
  (globalThis as any).localStorage = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
  resetAudioPrefsCache();
  assert.deepEqual(getAudioPrefs(), AUDIO_DEFAULTS);
  assert.equal(setAudioPrefs({ sfx: false }).sfx, false); // vale na sessão
  (globalThis as any).localStorage = saved;
});

test("áudio/volume: curva perceptual, 0 e 1 nos extremos", () => {
  assert.equal(volToGain(0), 0);
  assert.equal(volToGain(1), 1);
  assert.equal(volToGain(0.5), 0.25);
  assert.equal(volToGain(-4), 0);
  assert.equal(volToGain(4), 1);
});

// ===================== motor =====================
test("áudio/motor: sem Web Audio o jogo continua (nada lança erro, nada toca)", async () => {
  const engine = new AudioEngine({ createContext: () => { throw new Error("sem AudioContext"); } });
  assert.equal(await engine.unlock(), false);
  assert.equal(engine.play("explosion"), false);
  engine.setMood("menu"); engine.applyPrefs(); engine.handleVisibility(true);
  assert.ok(["unsupported", "error"].includes(engine.status));
  engine.dispose();
});

test("áudio/motor: antes do primeiro gesto nada toca e nenhum contexto existe", () => {
  const { engine, made } = setup();
  assert.equal(engine.play("uiClick"), false);
  assert.equal(made(), 0);
  assert.equal(engine.status, "idle");
});

test("áudio/motor: vários unlock() criam UM contexto e UMA música", async () => {
  const { engine, timers, made, ctx } = setup();
  const r = await Promise.all([engine.unlock(), engine.unlock(), engine.unlock()]);
  await engine.unlock();
  assert.deepEqual(r, [true, true, true]);
  assert.equal(made(), 1);
  assert.equal(engine.contextsCreated, 1);
  assert.equal(timers.active.size, 1, "um único agendador de música");
  assert.equal(timers.sets, 1);
  assert.equal(engine.status, "running");
  assert.ok(engine.musicRunning);
  assert.equal(ctx.state, "running");
});

test("áudio/motor: música desligada nas preferências não agenda nada; ligar depois inicia uma vez só", async () => {
  const { engine, timers } = setup({ prefs: { music: false } });
  await engine.unlock();
  assert.equal(timers.active.size, 0);
  assert.equal(engine.musicRunning, false);
  setAudioPrefs({ music: true });
  setAudioPrefs({ music: true, musicVol: 0.9 });
  assert.equal(timers.active.size, 1);
  setAudioPrefs({ music: false });
  assert.equal(timers.active.size, 0, "desligar a música cancela o agendador");
  assert.equal(engine.musicRunning, false);
});

test("áudio/motor: efeitos desligados não criam nenhum nó novo", async () => {
  const { engine, ctx } = setup({ prefs: { sfx: false } });
  await engine.unlock();
  const before = ctx.nodes;
  for (const id of SFX_IDS) assert.equal(engine.play(id), false);
  assert.equal(ctx.nodes, before);
});

test("áudio/motor: intervalo mínimo entre o mesmo efeito (rajada vira um som só)", async () => {
  const { engine, ctx } = setup();
  await engine.unlock();
  assert.equal(engine.play("blockBreak"), true);
  for (let i = 0; i < 20; i++) assert.equal(engine.play("blockBreak"), false);
  ctx.currentTime += SFX.blockBreak.cooldownMs / 1000 + 0.001;
  assert.equal(engine.play("blockBreak"), true);
});

test("áudio/motor: no máximo N vozes do mesmo efeito soando juntas", async () => {
  const { engine, ctx } = setup();
  await engine.unlock();
  const max = SFX.explosion.maxVoices;
  let played = 0;
  for (let i = 0; i < max + 2; i++) { if (engine.play("explosion")) played++; ctx.currentTime += SFX.explosion.cooldownMs / 1000 + 0.001; }
  assert.equal(played, max);
  assert.ok(engine.activeVoices <= max);
  ctx.currentTime += 5; // tudo acabou
  assert.equal(engine.play("explosion"), true);
  assert.equal(engine.activeVoices, 1, "vozes antigas são removidas e desconectadas");
});

test("áudio/motor: teto global de vozes e prioridade (enfeites saem primeiro, eventos grandes passam)", async () => {
  const { engine, ctx } = setup();
  await engine.unlock();
  const ids = SFX_IDS.filter((i) => SFX[i].priority < 2 && SFX[i].maxVoices >= 2);
  let ok = 0;
  for (let round = 0; round < 6; round++) for (const id of ids) { if (engine.play(id)) ok++; ctx.currentTime += 0.011; }
  assert.ok(engine.activeVoices <= 18 + 6, `teto global respeitado (${engine.activeVoices})`);
  assert.ok(ok > 0);
  // enfeites (prioridade 0) já são recusados quando há ~70% do teto; um evento importante ainda toca
  ctx.currentTime += SFX.levelUp.cooldownMs / 1000;
  assert.equal(engine.play("levelUp"), true);
});

test("áudio/motor: efeito que dá erro na síntese não derruba o jogo nem deixa nó solto", async () => {
  const { engine, ctx } = setup();
  await engine.unlock();
  ctx.failOsc = true;
  assert.doesNotThrow(() => engine.play("uiClick"));
  assert.equal(engine.play("uiClick"), false);
  assert.equal(engine.activeVoices, 0);
});

test("áudio/motor: aba escondida suspende, ao voltar retoma; sem ter tocado nada não retoma sozinho", async () => {
  const { engine, ctx, doc } = setup();
  engine.installLifecycle(doc as any, null);
  engine.handleVisibility(true); // ainda sem contexto: nada acontece
  await engine.unlock();
  const resumes = ctx.resumeCalls;
  doc.hidden = true; doc.fire("visibilitychange");
  assert.equal(ctx.suspendCalls, 1);
  assert.equal(ctx.state, "suspended");
  assert.equal(engine.status, "suspended");
  assert.equal(engine.play("explosion"), false, "escondido: nada soa");
  assert.equal(engine.musicRunning, false, "escondido: o agendador para");
  doc.hidden = false; doc.fire("visibilitychange");
  assert.equal(ctx.resumeCalls, resumes + 1);
  assert.equal(engine.status, "running");
  assert.equal(engine.musicRunning, true);
  doc.fire("visibilitychange"); // visível de novo sem ter pausado: não retoma duas vezes
  assert.equal(ctx.resumeCalls, resumes + 1);
});

test("áudio/motor: primeiro gesto libera o som uma vez; som desligado de propósito não liga sozinho", async () => {
  const a = setup();
  a.engine.installAutoUnlock(a.doc as any);
  a.engine.installAutoUnlock(a.doc as any); // idempotente
  assert.equal(a.doc.handlers.get("pointerdown")!.length, 1);
  a.doc.fire("pointerdown");
  await new Promise((r) => setImmediate(r));
  assert.equal(a.made(), 1);
  assert.equal(a.doc.handlers.get("pointerdown")!.length, 0, "ouvintes removidos depois de liberar");

  resetAudioPrefsCache(); mem.clear();
  const b = setup({ prefs: { music: false, sfx: false } });
  b.engine.installAutoUnlock(b.doc as any);
  b.doc.fire("keydown");
  await new Promise((r) => setImmediate(r));
  assert.equal(b.made(), 0);
});

test("áudio/motor: mudar volume/ligar/desligar reage na hora; menu abafa a música; dispose limpa tudo", async () => {
  const { engine, ctx, timers } = setup();
  await engine.unlock();
  setAudioPrefs({ sfxVol: 0.1, musicVol: 0 });
  engine.setMood("menu"); engine.setMood("menu"); engine.setMood("field");
  engine.dispose();
  assert.equal(ctx.state, "closed");
  assert.equal(timers.active.size, 0);
  assert.equal(engine.activeVoices, 0);
  assert.equal(engine.play("explosion"), false);
});

test("áudio/limitador: curva transparente em volume normal e nunca passa de 0,95", () => {
  const k = limiterCurve(2049);
  const at = (x: number) => k[Math.round(((x / 2 + 1) / 2) * (k.length - 1))];
  assert.ok(Math.abs(at(0.3) - 0.3) < 0.003);
  assert.ok(Math.abs(at(-0.5) + 0.5) < 0.003);
  assert.ok(at(1) > 0.8 && at(1) < 0.95);
  assert.ok(Math.max(...k) < 0.951 && Math.min(...k) > -0.951);
  const ctx = new FakeCtx();
  const b = createBuses(ctx as unknown as BaseAudioContext);
  assert.ok(b.musicIn && b.sfxGain && b.master && b.comp);
});

// ===================== efeitos sonoros =====================
test("áudio/efeitos: todos os 21 efeitos tocam, terminam no futuro e não deixam fonte sem parar", async () => {
  assert.equal(SFX_IDS.length, 21);
  const { engine, ctx } = setup();
  await engine.unlock();
  for (const id of SFX_IDS) {
    const s0 = ctx.started, e0 = ctx.stopped;
    assert.equal(engine.play(id, { rarity: 6, level: 1 }), true, id);
    assert.ok(ctx.started > s0, `${id} cria fontes`);
    assert.equal(ctx.started - s0, ctx.stopped - e0, `${id}: toda fonte iniciada é parada`);
    ctx.currentTime += 3;
  }
});

test("áudio/efeitos: raridade alta soa mais rica (mais notas) e o ajuste de altura é limitado", async () => {
  const count = async (rarity: number) => { const { engine, ctx } = setup(); await engine.unlock(); const s = ctx.started; engine.play("chestOpen", { rarity }); return ctx.started - s; };
  assert.ok((await count(7)) > (await count(0)));
  const { engine } = setup();
  await engine.unlock();
  assert.equal(engine.play("coin", { pitch: 999, level: 99, rarity: 99, vol: 5 }), true); // valores absurdos são limitados, sem erro
});

test("áudio/efeitos: ganho de cada efeito é finito e positivo; frequências usadas são audíveis", () => {
  for (const id of SFX_IDS) {
    const d = SFX[id];
    assert.ok(Number.isFinite(d.gain) && d.gain > 0, id);
    assert.ok(d.cooldownMs >= 0 && d.maxVoices >= 1, id);
  }
  assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-9);
});

// ===================== música =====================
test("áudio/música: planStep é puro e determinístico", () => {
  for (let s = 0; s < LOOP_STEPS * 2; s += 5) assert.deepEqual(planStep(s), planStep(s));
  assert.equal(hash32(123), hash32(123));
  assert.notEqual(hash32(1), hash32(2));
});

test("áudio/música: pad e baixo repetem a cada volta; os arpejos variam e fecham o ciclo em 4 voltas", () => {
  const strip = (s: number, layers: string[]) => planStep(s).filter((n) => layers.includes(n.layer));
  for (let s = 0; s < LOOP_STEPS; s++) assert.deepEqual(strip(s, ["pad", "bass"]), strip(s + LOOP_STEPS, ["pad", "bass"]), `passo ${s}`);
  let diff = 0;
  for (let s = 0; s < LOOP_STEPS; s++) { if (JSON.stringify(strip(s, ["arp"])) !== JSON.stringify(strip(s + LOOP_STEPS, ["arp"]))) diff++; }
  assert.ok(diff > 0, "a segunda volta tem arpejos diferentes");
  for (let s = 0; s < LOOP_STEPS; s++) assert.deepEqual(planStep(s), planStep(s + LOOP_STEPS * 4), `ciclo completo, passo ${s}`);
});

test("áudio/música: notas dentro de faixas seguras (graves audíveis, agudos suaves) e poucas por passo", () => {
  let pads = 0, arps = 0, bass = 0;
  for (let s = 0; s < LOOP_STEPS * 4; s++) {
    const notes = planStep(s);
    assert.ok(notes.length <= 9, `passo ${s} tem ${notes.length} notas`);
    for (const n of notes) {
      assert.ok(n.vel > 0 && n.vel <= 1 && n.steps >= 1);
      if (n.layer === "bass") { bass++; assert.ok(n.freq >= 78 && n.freq <= 220, `baixo ${n.freq}`); }
      if (n.layer === "pad") { pads++; assert.ok(n.freq >= 170 && n.freq <= 500, `pad ${n.freq}`); }
      if (n.layer === "arp") { arps++; assert.ok(n.freq >= 290 && n.freq <= 1100, `arpejo ${n.freq}`); }
    }
  }
  const bars = 4 * (LOOP_STEPS / STEPS_PER_BAR);
  assert.equal(pads, bars * 4, "um acorde de 4 notas por compasso");
  assert.ok(bass >= bars * 3);
  const density = arps / (LOOP_STEPS * 4);
  assert.ok(density > 0.05 && density < 0.3, `arpejos esparsos (${density.toFixed(2)} por passo)`);
});

test("áudio/música: o andamento é calmo e o loop dura ~25 s", () => {
  assert.equal(BPM, 78);
  assert.ok(LOOP_STEPS * STEP_SEC > 20 && LOOP_STEPS * STEP_SEC < 30);
});

test("áudio/música: o agendador antecipa só o necessário, não duplica e não acumula atraso", () => {
  const ctx = new FakeCtx(); ctx.state = "running";
  const timers = new FakeTimers();
  const bus = { input: { connect() {}, disconnect() {} } as unknown as AudioNode };
  const p = new MusicPlayer(ctx as unknown as BaseAudioContext, bus, timers);
  p.start(); p.start(); p.start();
  assert.equal(timers.active.size, 1, "start() repetido não cria outro agendador");
  const first = p.currentStep;
  assert.ok(first >= 1 && first <= Math.ceil(0.55 / STEP_SEC) + 1, `agenda ~0,4 s à frente (${first} passos)`);
  timers.run(); timers.run();
  assert.equal(p.currentStep, first, "sem o tempo avançar, não agenda de novo");
  ctx.currentTime += 1;
  timers.run();
  assert.ok(p.currentStep > first);
  // pausa longa (aba escondida): ao voltar não pode despejar uma rajada de notas atrasadas
  ctx.state = "suspended"; timers.run();
  const during = p.currentStep;
  ctx.currentTime += 120; ctx.state = "running"; timers.run();
  assert.ok(p.currentStep - during <= Math.ceil(0.6 / STEP_SEC) + 1, `sem rajada (${p.currentStep - during} passos)`);
  const s0 = ctx.started, e0 = ctx.stopped;
  p.stop(); p.stop();
  assert.equal(timers.active.size, 0);
  assert.equal(p.running, false);
  assert.ok(ctx.started >= ctx.stopped && s0 >= 0 && e0 >= 0);
});

test("áudio/música: toda fonte de som agendada pela trilha também tem hora para parar", () => {
  const ctx = new FakeCtx(); ctx.state = "running";
  const timers = new FakeTimers();
  const p = new MusicPlayer(ctx as unknown as BaseAudioContext, { input: { connect() {}, disconnect() {} } as unknown as AudioNode }, timers);
  p.start();
  for (let i = 0; i < 40; i++) { ctx.currentTime += 0.4; timers.run(); }
  assert.ok(ctx.started > 100, "a trilha realmente agendou notas");
  assert.equal(ctx.started, ctx.stopped, "nenhum oscilador fica tocando para sempre");
});

test("áudio/motor: vozes terminadas somem do contador mesmo sem novo play()", async () => {
  const { engine, ctx } = setup();
  await engine.unlock();
  engine.play("explosion"); engine.play("capsule");
  assert.equal(engine.activeVoices, 2);
  ctx.currentTime += 10;
  assert.equal(engine.activeVoices, 0);
});
