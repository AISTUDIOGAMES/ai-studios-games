// Efeitos sonoros do BomberIdle, sintetizados com Web Audio (nenhum arquivo de som é baixado).
// Cada receita recebe o contexto, o nó de saída e o instante de início, cria seus nós, agenda o fim deles
// e devolve o instante em que o som termina. Os nós se desconectam sozinhos quando a fonte acaba.
// Os valores de "peak" são relativos: o volume final vem do ganho do efeito (SFX[...].gain), do barramento
// de efeitos, do volume do jogador e do limitador do master (veja audioEngine.ts).

export type SfxId =
  | "uiClick" | "uiOpen" | "uiClose" | "uiError" | "upgrade" | "mission" | "capsule"
  | "bombPlant" | "fuse" | "explosion" | "blockHit" | "blockBreak" | "chestHit" | "chestOpen"
  | "enemyHit" | "enemyDeath" | "coin" | "crit" | "levelUp" | "ability" | "mapClear";

export interface VoiceOpts {
  /** Multiplicador de altura (1 = normal). O motor sorteia uma pequena variação para o som não parecer "carimbo". */
  pitch: number;
  /** 0..1: intensidade (alcance da explosão, MVP, etc.). */
  level: number;
  /** 0..7: índice de raridade (baús e cápsulas soam mais ricos nas raridades altas). */
  rarity: number;
  rnd: () => number;
}

export interface SfxDef {
  play: (c: BaseAudioContext, out: AudioNode, t: number, o: VoiceOpts) => number;
  /** Intervalo mínimo entre dois disparos do mesmo efeito (rajadas viram um som só). */
  cooldownMs: number;
  /** Quantas instâncias do mesmo efeito podem soar ao mesmo tempo. */
  maxVoices: number;
  /** Ajuste de volume relativo do efeito. */
  gain: number;
  /** 0 = pode ser descartado quando há muito som; 2 = quase sempre toca. */
  priority: 0 | 1 | 2;
  /** Abaixa a música por um instante (explosões e marcos). */
  duck?: { amount: number; ms: number };
}

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- peças básicas ----------
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

/** 2 s de ruído branco, gerado uma vez por contexto com semente fixa (renders offline ficam reproduzíveis). */
export function noiseBuffer(c: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(c);
  if (b) return b;
  b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * 2)), c.sampleRate);
  const d = b.getChannelData(0);
  let s = 0x12345678;
  for (let i = 0; i < d.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
  noiseCache.set(c, b);
  return b;
}

interface ToneSpec { type: OscillatorType; f0: number; f1?: number; t: number; dur: number; peak: number; attack?: number; lp?: number }

/** Oscilador com envelope exponencial (ataque curto, queda até o silêncio). Devolve o instante final. */
function tone(c: BaseAudioContext, out: AudioNode, s: ToneSpec): number {
  const attack = Math.min(s.attack ?? 0.004, s.dur * 0.5);
  const end = s.t + s.dur;
  const o = c.createOscillator();
  o.type = s.type;
  o.frequency.setValueAtTime(s.f0, s.t);
  if (s.f1 !== undefined && s.f1 !== s.f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, s.f1), end);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, s.t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, s.peak), s.t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  if (s.lp) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = s.lp;
    o.connect(f);
    f.connect(g);
  } else o.connect(g);
  g.connect(out);
  o.start(s.t);
  o.stop(end + 0.02);
  o.onended = () => { try { g.disconnect(); } catch { /* já desconectado */ } };
  return end + 0.02;
}

interface NoiseSpec { t: number; dur: number; peak: number; type: BiquadFilterType; f0: number; f1?: number; q?: number; attack?: number; rnd: () => number }

/** Rajada de ruído filtrado, com varredura opcional de frequência. */
function noiseHit(c: BaseAudioContext, out: AudioNode, s: NoiseSpec): number {
  const attack = Math.min(s.attack ?? 0.002, s.dur * 0.5);
  const end = s.t + s.dur;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = s.type;
  f.Q.value = s.q ?? 0.8;
  f.frequency.setValueAtTime(s.f0, s.t);
  if (s.f1 !== undefined && s.f1 !== s.f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, s.f1), end);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, s.t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, s.peak), s.t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(s.t, s.rnd() * 0.95); // trecho sorteado do ruído: dois disparos nunca soam idênticos
  src.stop(end + 0.02);
  src.onended = () => { try { g.disconnect(); f.disconnect(); } catch { /* já desconectado */ } };
  return end + 0.02;
}

// Pentatônica maior (semitons) usada nos "brilhos" de baús, cápsulas e subida de nível.
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19];

/** Arpejo ascendente de sino: quanto maior a raridade, mais notas e mais brilho. */
function chime(c: BaseAudioContext, out: AudioNode, t: number, o: VoiceOpts, baseMidi: number, gap: number, vol: number): number {
  const notes = 3 + Math.floor(o.rarity / 2); // 3 (comum) a 6 (ancestral)
  let end = t;
  for (let i = 0; i < notes; i++) {
    const f = midiToFreq(baseMidi + PENTA[i]) * o.pitch;
    const at = t + i * gap;
    end = Math.max(end, tone(c, out, { type: "sine", f0: f, t: at, dur: 0.55, peak: vol, attack: 0.004 }));
    end = Math.max(end, tone(c, out, { type: "triangle", f0: f * 2, t: at, dur: 0.3, peak: vol * 0.35, attack: 0.003 }));
  }
  if (o.rarity >= 4) end = Math.max(end, noiseHit(c, out, { t: t + notes * gap * 0.5, dur: 0.5, peak: 0.05, type: "highpass", f0: 6500, f1: 9000, q: 0.5, rnd: o.rnd }));
  if (o.rarity >= 6) end = Math.max(end, tone(c, out, { type: "sine", f0: midiToFreq(baseMidi + 24) * o.pitch, t: t + notes * gap, dur: 0.9, peak: vol * 0.7, attack: 0.01 }));
  return end;
}

const max = (...v: number[]) => Math.max(...v);

// ---------- efeitos ----------
const uiClick: SfxDef["play"] = (c, out, t, o) =>
  tone(c, out, { type: "triangle", f0: 760 * o.pitch, f1: 520 * o.pitch, t, dur: 0.035, peak: 0.28 });

const uiOpen: SfxDef["play"] = (c, out, t, o) =>
  max(tone(c, out, { type: "triangle", f0: 420 * o.pitch, f1: 660 * o.pitch, t, dur: 0.1, peak: 0.26 }),
    tone(c, out, { type: "sine", f0: 840 * o.pitch, f1: 1320 * o.pitch, t: t + 0.03, dur: 0.1, peak: 0.1 }));

const uiClose: SfxDef["play"] = (c, out, t, o) =>
  tone(c, out, { type: "triangle", f0: 640 * o.pitch, f1: 380 * o.pitch, t, dur: 0.09, peak: 0.24 });

const uiError: SfxDef["play"] = (c, out, t, o) =>
  max(tone(c, out, { type: "square", f0: 160 * o.pitch, f1: 130 * o.pitch, t, dur: 0.09, peak: 0.16, lp: 700 }),
    tone(c, out, { type: "square", f0: 140 * o.pitch, f1: 110 * o.pitch, t: t + 0.12, dur: 0.12, peak: 0.16, lp: 700 }));

const upgrade: SfxDef["play"] = (c, out, t, o) => {
  let end = t;
  [64, 69, 76].forEach((m, i) => {
    end = max(end,
      tone(c, out, { type: "square", f0: midiToFreq(m) * o.pitch, t: t + i * 0.06, dur: 0.12, peak: 0.1, lp: 3200 }),
      tone(c, out, { type: "triangle", f0: midiToFreq(m + 12) * o.pitch, t: t + i * 0.06, dur: 0.16, peak: 0.12 }));
  });
  return end;
};

const mission: SfxDef["play"] = (c, out, t, o) => chime(c, out, t, { ...o, rarity: 2 }, 72, 0.075, 0.2);

const capsule: SfxDef["play"] = (c, out, t, o) => {
  const w = noiseHit(c, out, { t, dur: 0.38, peak: 0.22, type: "bandpass", f0: 220, f1: 3200, q: 1.4, attack: 0.05, rnd: o.rnd });
  const sub = tone(c, out, { type: "sine", f0: 70 * o.pitch, f1: 140 * o.pitch, t, dur: 0.4, peak: 0.25, attack: 0.08 });
  return max(w, sub, chime(c, out, t + 0.3, o, 72, 0.085, 0.2));
};

const bombPlant: SfxDef["play"] = (c, out, t, o) =>
  max(tone(c, out, { type: "sine", f0: 210 * o.pitch, f1: 78 * o.pitch, t, dur: 0.14, peak: 0.5 }),
    tone(c, out, { type: "triangle", f0: 640 * o.pitch, f1: 300 * o.pitch, t, dur: 0.05, peak: 0.14 }),
    noiseHit(c, out, { t, dur: 0.03, peak: 0.1, type: "bandpass", f0: 2600, q: 1.2, rnd: o.rnd }));

const fuse: SfxDef["play"] = (c, out, t, o) =>
  tone(c, out, { type: "square", f0: 1500 * o.pitch, t, dur: 0.03, peak: 0.07, lp: 3000 });

/** Explosão em camadas: estalo inicial, rugido de ruído que escurece, corpo grave e crepitar final. */
const explosion: SfxDef["play"] = (c, out, t, o) => {
  const len = 0.5 + 0.35 * o.level;
  let end = t;
  end = max(end,
    noiseHit(c, out, { t, dur: 0.1, peak: 0.3, type: "bandpass", f0: 2200, f1: 700, q: 0.9, rnd: o.rnd }), // estalo
    noiseHit(c, out, { t, dur: len, peak: 0.46, type: "lowpass", f0: 3200, f1: 150, q: 0.7, attack: 0.004, rnd: o.rnd }), // rugido
    tone(c, out, { type: "sine", f0: 125 * o.pitch, f1: 36 * o.pitch, t, dur: len, peak: 0.5, attack: 0.005 }), // sub
    tone(c, out, { type: "triangle", f0: 74 * o.pitch, f1: 30 * o.pitch, t, dur: len * 0.8, peak: 0.26, attack: 0.005 })); // corpo
  const crackles = 3 + Math.floor(o.rnd() * 3);
  for (let i = 0; i < crackles; i++) {
    end = max(end, noiseHit(c, out, { t: t + 0.07 + o.rnd() * (len * 0.8), dur: 0.025, peak: 0.1, type: "highpass", f0: 3000, q: 0.6, rnd: o.rnd }));
  }
  return end;
};

const blockHit: SfxDef["play"] = (c, out, t, o) =>
  max(noiseHit(c, out, { t, dur: 0.05, peak: 0.34, type: "bandpass", f0: 700 * o.pitch, q: 1, rnd: o.rnd }),
    tone(c, out, { type: "sine", f0: 150 * o.pitch, f1: 80 * o.pitch, t, dur: 0.07, peak: 0.3 }));

const blockBreak: SfxDef["play"] = (c, out, t, o) => {
  let end = max(
    noiseHit(c, out, { t, dur: 0.18, peak: 0.4, type: "lowpass", f0: 1900, f1: 400, q: 0.8, rnd: o.rnd }),
    tone(c, out, { type: "sine", f0: 115 * o.pitch, f1: 60 * o.pitch, t, dur: 0.13, peak: 0.3 }));
  for (let i = 0; i < 3; i++) end = max(end, noiseHit(c, out, { t: t + 0.04 + i * 0.035 + o.rnd() * 0.02, dur: 0.02, peak: 0.16, type: "bandpass", f0: 2200 + o.rnd() * 1200, q: 1.5, rnd: o.rnd }));
  return end;
};

const chestHit: SfxDef["play"] = (c, out, t, o) =>
  max(tone(c, out, { type: "triangle", f0: 900 * o.pitch, f1: 620 * o.pitch, t, dur: 0.055, peak: 0.22 }),
    tone(c, out, { type: "sine", f0: 1800 * o.pitch, t, dur: 0.13, peak: 0.05 }),
    noiseHit(c, out, { t, dur: 0.03, peak: 0.1, type: "highpass", f0: 3000, q: 0.6, rnd: o.rnd }));

const chestOpen: SfxDef["play"] = (c, out, t, o) =>
  max(noiseHit(c, out, { t, dur: 0.09, peak: 0.16, type: "bandpass", f0: 500, f1: 1800, q: 1, rnd: o.rnd }),
    tone(c, out, { type: "sine", f0: 160 * o.pitch, f1: 90 * o.pitch, t, dur: 0.12, peak: 0.2 }),
    chime(c, out, t + 0.04, o, 72, 0.07, 0.2));

const enemyHit: SfxDef["play"] = (c, out, t, o) =>
  max(tone(c, out, { type: "sawtooth", f0: 240 * o.pitch, f1: 150 * o.pitch, t, dur: 0.06, peak: 0.26, lp: 1800 }),
    noiseHit(c, out, { t, dur: 0.04, peak: 0.18, type: "bandpass", f0: 1200, q: 1, rnd: o.rnd }));

const enemyDeath: SfxDef["play"] = (c, out, t, o) => {
  const mvp = o.level > 0.5;
  const len = mvp ? 0.55 : 0.3;
  let end = max(
    tone(c, out, { type: "sawtooth", f0: (mvp ? 260 : 340) * o.pitch, f1: 50 * o.pitch, t, dur: len, peak: 0.3, lp: 1400 }),
    noiseHit(c, out, { t, dur: len, peak: 0.28, type: "lowpass", f0: 2500, f1: 280, q: 0.8, rnd: o.rnd }));
  if (mvp) end = max(end, tone(c, out, { type: "sine", f0: 95 * o.pitch, f1: 38 * o.pitch, t, dur: 0.6, peak: 0.4 }));
  return end;
};

const coin: SfxDef["play"] = (c, out, t, o) =>
  max(tone(c, out, { type: "sine", f0: 1319 * o.pitch, t, dur: 0.07, peak: 0.2 }),
    tone(c, out, { type: "sine", f0: 1976 * o.pitch, t: t + 0.06, dur: 0.18, peak: 0.2 }),
    tone(c, out, { type: "triangle", f0: 3951 * o.pitch, t: t + 0.06, dur: 0.1, peak: 0.05 }));

const crit: SfxDef["play"] = (c, out, t, o) =>
  max(tone(c, out, { type: "sawtooth", f0: 1500 * o.pitch, f1: 2400 * o.pitch, t, dur: 0.08, peak: 0.16, lp: 5000 }),
    tone(c, out, { type: "sine", f0: 3000 * o.pitch, t, dur: 0.13, peak: 0.1 }));

const levelUp: SfxDef["play"] = (c, out, t, o) => {
  let end = t;
  [72, 76, 79, 84, 88].forEach((m, i) => {
    end = max(end,
      tone(c, out, { type: "sine", f0: midiToFreq(m) * o.pitch, t: t + i * 0.07, dur: 0.5, peak: 0.2 }),
      tone(c, out, { type: "triangle", f0: midiToFreq(m + 12) * o.pitch, t: t + i * 0.07, dur: 0.25, peak: 0.06 }));
  });
  return max(end, noiseHit(c, out, { t: t + 0.2, dur: 0.5, peak: 0.04, type: "highpass", f0: 7000, q: 0.5, rnd: o.rnd }));
};

const ability: SfxDef["play"] = (c, out, t, o) =>
  max(noiseHit(c, out, { t, dur: 0.32, peak: 0.2, type: "bandpass", f0: 250 * o.pitch, f1: 2600 * o.pitch, q: 1.2, attack: 0.05, rnd: o.rnd }),
    tone(c, out, { type: "sine", f0: 220 * o.pitch, f1: 880 * o.pitch, t, dur: 0.3, peak: 0.14, attack: 0.06 }));

/** Vitória de mapa: fanfarra curta de 5 notas sobre um pad suave. */
const mapClear: SfxDef["play"] = (c, out, t, o) => {
  let end = t;
  [67, 72, 76, 79, 84].forEach((m, i) => {
    const last = i === 4;
    end = max(end,
      tone(c, out, { type: "triangle", f0: midiToFreq(m) * o.pitch, t: t + i * 0.12, dur: last ? 0.9 : 0.22, peak: 0.2, attack: 0.006 }),
      tone(c, out, { type: "sine", f0: midiToFreq(m + 12) * o.pitch, t: t + i * 0.12, dur: last ? 0.7 : 0.18, peak: 0.07 }));
  });
  end = max(end,
    tone(c, out, { type: "sine", f0: midiToFreq(60) * o.pitch, t, dur: 1.4, peak: 0.12, attack: 0.25 }),
    tone(c, out, { type: "sine", f0: midiToFreq(67) * o.pitch, t, dur: 1.4, peak: 0.1, attack: 0.25 }));
  return end;
};

export const SFX: Record<SfxId, SfxDef> = {
  uiClick:    { play: uiClick,    cooldownMs: 40,  maxVoices: 3, gain: 1.74, priority: 1 },
  uiOpen:     { play: uiOpen,     cooldownMs: 120, maxVoices: 2, gain: 1.77,  priority: 1 },
  uiClose:    { play: uiClose,    cooldownMs: 120, maxVoices: 2, gain: 2.01,  priority: 1 },
  uiError:    { play: uiError,    cooldownMs: 250, maxVoices: 2, gain: 1.46,  priority: 1 },
  upgrade:    { play: upgrade,    cooldownMs: 120, maxVoices: 2, gain: 1.79,  priority: 1 },
  mission:    { play: mission,    cooldownMs: 150, maxVoices: 2, gain: 1.33,  priority: 1 },
  capsule:    { play: capsule,    cooldownMs: 200, maxVoices: 2, gain: 1.64, priority: 2 },
  bombPlant:  { play: bombPlant,  cooldownMs: 70,  maxVoices: 3, gain: 2.20,  priority: 0 },
  fuse:       { play: fuse,       cooldownMs: 260, maxVoices: 2, gain: 2.78,  priority: 0 },
  explosion:  { play: explosion,  cooldownMs: 140, maxVoices: 3, gain: 1.95, priority: 2, duck: { amount: 0.45, ms: 380 } },
  blockHit:   { play: blockHit,   cooldownMs: 70,  maxVoices: 3, gain: 2.11,  priority: 0 },
  blockBreak: { play: blockBreak, cooldownMs: 90,  maxVoices: 3, gain: 2.94,  priority: 0 },
  chestHit:   { play: chestHit,   cooldownMs: 70,  maxVoices: 3, gain: 2.14, priority: 0 },
  chestOpen:  { play: chestOpen,  cooldownMs: 80,  maxVoices: 3, gain: 1.39,  priority: 2 },
  enemyHit:   { play: enemyHit,   cooldownMs: 70,  maxVoices: 3, gain: 2.66, priority: 0 },
  enemyDeath: { play: enemyDeath, cooldownMs: 100, maxVoices: 2, gain: 3.31,  priority: 1 },
  coin:       { play: coin,       cooldownMs: 90,  maxVoices: 2, gain: 1.63,  priority: 1 },
  crit:       { play: crit,       cooldownMs: 100, maxVoices: 2, gain: 3.00,  priority: 0 },
  levelUp:    { play: levelUp,    cooldownMs: 200, maxVoices: 2, gain: 1.42,  priority: 2 },
  ability:    { play: ability,    cooldownMs: 130, maxVoices: 2, gain: 2.06, priority: 1 },
  mapClear:   { play: mapClear,   cooldownMs: 800, maxVoices: 1, gain: 1.36, priority: 2, duck: { amount: 0.5, ms: 1400 } },
};

export const SFX_IDS = Object.keys(SFX) as SfxId[];
