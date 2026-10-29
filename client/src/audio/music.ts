// Trilha ambiente do BomberIdle: música GERADA por código (síntese procedural), original, sem nenhum arquivo de áudio.
// Importante: isto NÃO é uma trilha gravada por músicos. É uma base ambiente discreta (pad + baixo + arpejos
// esparsos com eco) pensada para sessões longas. Se um dia houver uma trilha gravada/licenciada, basta trocar
// o MusicPlayer por um <audio>/AudioBuffer: o resto do motor (barramentos, volume, pausa) não muda.
//
// A música é uma sequência infinita de passos de 1/16 de nota. planStep(n) é uma função PURA e determinística:
// diz quais notas começam no passo n. Pad e baixo repetem a cada 8 compassos; os arpejos variam a cada volta
// (4 variações) com a mesma semente, então o ciclo completo dura ~100 s. Como o contador de passos nunca
// "volta ao zero" e as notas do pad se sobrepõem, não existe ponto de corte audível no loop.
import { midiToFreq, noiseBuffer } from "./synth";

export const BPM = 78;
export const STEPS_PER_BAR = 16;
export const BARS = 8;
export const LOOP_STEPS = STEPS_PER_BAR * BARS;
export const STEP_SEC = 60 / BPM / 4;

export type MusicLayer = "pad" | "bass" | "arp" | "hat";
export interface MusicNote { layer: MusicLayer; freq: number; /** duração em passos */ steps: number; vel: number }

interface Chord { bass: number; pad: number[]; arp: number[] }
// Lá menor: Am - F - C - G | Am - F - Dm - Em. Notas MIDI. O baixo nunca desce de ~80 Hz (alto-falantes pequenos).
const CHORDS: Chord[] = [
  { bass: 45, pad: [57, 60, 64, 69], arp: [69, 72, 76, 81, 84] },
  { bass: 41, pad: [53, 57, 60, 65], arp: [65, 69, 72, 77, 81] },
  { bass: 48, pad: [55, 60, 64, 67], arp: [67, 72, 76, 79, 84] },
  { bass: 43, pad: [55, 59, 62, 67], arp: [67, 71, 74, 79, 83] },
  { bass: 45, pad: [57, 60, 64, 69], arp: [69, 72, 76, 81, 84] },
  { bass: 41, pad: [53, 57, 60, 65], arp: [65, 69, 72, 77, 81] },
  { bass: 50, pad: [53, 57, 62, 65], arp: [62, 65, 69, 74, 77] },
  { bass: 40, pad: [55, 59, 64, 67], arp: [64, 67, 71, 76, 79] },
];

const BASS_HITS: ReadonlyArray<[number, number]> = [[0, 1], [6, 0.7], [10, 0.85]]; // [passo no compasso, intensidade]

/** Hash inteiro de 32 bits (determinístico): dá "aleatoriedade" repetível para os arpejos e para os testes. */
export function hash32(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

export function planStep(step: number): MusicNote[] {
  const s = ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
  const loop = Math.floor(step / LOOP_STEPS);
  const bar = Math.floor(s / STEPS_PER_BAR), inBar = s % STEPS_PER_BAR;
  const ch = CHORDS[bar];
  const notes: MusicNote[] = [];

  if (inBar === 0) for (const m of ch.pad) notes.push({ layer: "pad", freq: midiToFreq(m), steps: STEPS_PER_BAR + 8, vel: 0.5 });

  for (const [at, vel] of BASS_HITS) {
    if (inBar === at) notes.push({ layer: "bass", freq: midiToFreq(ch.bass), steps: 3, vel });
  }
  if (inBar === 14 && (bar === 3 || bar === 7)) notes.push({ layer: "bass", freq: midiToFreq(ch.bass + 12), steps: 2, vel: 0.6 }); // virada

  // arpejo esparso nas colcheias; mais presente na segunda metade do ciclo (forma A-B)
  if (inBar % 2 === 0) {
    const h = hash32(s * 7919 + (loop % 4) * 104729 + 1);
    const p = bar < 4 ? 0.34 : 0.5;
    if ((h % 1000) / 1000 < p) {
      const idx = (h >>> 10) % ch.arp.length;
      notes.push({ layer: "arp", freq: midiToFreq(ch.arp[idx]), steps: 3, vel: 0.35 + ((h >>> 20) % 100) / 100 * 0.3 });
    }
  }
  if (bar >= 4 && inBar % 4 === 2) notes.push({ layer: "hat", freq: 0, steps: 1, vel: 0.25 }); // chiado suave nas contratempos

  return notes;
}

// ---------- reprodutor ----------
export interface MusicBuses { input: AudioNode }
export interface Timer { set: (fn: () => void, ms: number) => unknown; clear: (id: unknown) => void }
export const defaultTimer: Timer = {
  set: (fn, ms) => setInterval(fn, ms),
  clear: (id) => clearInterval(id as ReturnType<typeof setInterval>),
};

const AHEAD = 0.4;     // quanto à frente (s) as notas são agendadas
const TICK_MS = 100;   // frequência do agendador

export class MusicPlayer {
  private timer: unknown = null;
  private step = 0;
  private next = 0;
  private delayIn: GainNode | null = null;
  private delay: DelayNode | null = null;
  private fb: GainNode | null = null;

  constructor(private ctx: BaseAudioContext, private buses: MusicBuses, private timers: Timer = defaultTimer) {}

  get running() { return this.timer !== null; }
  get currentStep() { return this.step; }

  start() {
    if (this.timer !== null) return; // idempotente: nunca dois agendadores (música duplicada)
    this.buildDelay();
    this.next = this.ctx.currentTime + 0.12;
    this.timer = this.timers.set(() => this.tick(), TICK_MS);
    this.tick();
  }

  stop() {
    if (this.timer !== null) { this.timers.clear(this.timer); this.timer = null; }
    try { this.delayIn?.disconnect(); this.delay?.disconnect(); this.fb?.disconnect(); } catch { /* já desconectado */ }
    this.delayIn = this.delay = this.fb = null;
  }

  /** Um agendamento: coloca na fila do Web Audio todas as notas dos próximos AHEAD segundos. */
  tick() {
    const c = this.ctx;
    if (c.state !== "running") { this.next = 0; return; } // pausado: nada de acumular notas atrasadas
    if (this.next === 0 || this.next < c.currentTime - 0.25) this.next = c.currentTime + 0.05; // voltou de pausa/aba: ressincroniza sem rajada
    while (this.next < c.currentTime + AHEAD) {
      this.schedule(planStep(this.step), this.next);
      this.next += STEP_SEC;
      this.step++;
    }
  }

  private buildDelay() {
    const c = this.ctx;
    // eco em colcheia pontuada (3 passos), escuro (filtro) e com poucas repetições
    this.delayIn = c.createGain();
    this.delay = c.createDelay(1.5);
    this.delay.delayTime.value = STEP_SEC * 3;
    this.fb = c.createGain();
    this.fb.gain.value = 0.36;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const wet = c.createGain();
    wet.gain.value = 0.5;
    this.delayIn.connect(this.delay);
    this.delay.connect(lp);
    lp.connect(this.fb);
    this.fb.connect(this.delay);
    lp.connect(wet);
    wet.connect(this.buses.input);
  }

  private schedule(notes: MusicNote[], t: number) {
    const pads = notes.filter((n) => n.layer === "pad");
    if (pads.length) this.pad(pads, t);
    for (const n of notes) {
      if (n.layer === "bass") this.bass(n, t);
      else if (n.layer === "arp") this.arp(n, t);
      else if (n.layer === "hat") this.hat(n, t);
    }
  }

  /** Acorde: dois dentes-de-serra levemente desafinados por nota, filtro que "respira" e ataque/saída lentos. */
  private pad(notes: MusicNote[], t: number) {
    const c = this.ctx;
    const dur = notes[0].steps * STEP_SEC;
    const rel = 1.6;
    const filt = c.createBiquadFilter();
    filt.type = "lowpass";
    filt.Q.value = 0.5;
    filt.frequency.setValueAtTime(520, t);
    filt.frequency.linearRampToValueAtTime(1500, t + dur * 0.45);
    filt.frequency.linearRampToValueAtTime(600, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + 1.0);
    g.gain.setValueAtTime(1, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    filt.connect(g);
    g.connect(this.buses.input);
    const oscs: OscillatorNode[] = [];
    for (const n of notes) {
      for (const det of [-7, 7]) {
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = n.freq;
        o.detune.value = det;
        const og = c.createGain();
        og.gain.value = 0.15 * n.vel;
        o.connect(og);
        og.connect(filt);
        o.start(t);
        o.stop(t + dur + rel + 0.05);
        oscs.push(o);
      }
    }
    oscs[0].onended = () => { try { g.disconnect(); filt.disconnect(); } catch { /* já desconectado */ } };
  }

  private bass(n: MusicNote, t: number) {
    const c = this.ctx;
    const dur = Math.max(0.3, n.steps * STEP_SEC);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * n.vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 480;
    lp.connect(g);
    g.connect(this.buses.input);
    const o1 = c.createOscillator(); o1.type = "sine"; o1.frequency.value = n.freq;
    const o2 = c.createOscillator(); o2.type = "triangle"; o2.frequency.value = n.freq * 2;
    const g2 = c.createGain(); g2.gain.value = 0.3;
    o1.connect(lp); o2.connect(g2); g2.connect(lp);
    for (const o of [o1, o2]) { o.start(t); o.stop(t + dur + 0.05); }
    o1.onended = () => { try { g.disconnect(); lp.disconnect(); g2.disconnect(); } catch { /* já desconectado */ } };
  }

  private arp(n: MusicNote, t: number) {
    const c = this.ctx;
    const dur = n.steps * STEP_SEC * 1.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * n.vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o1 = c.createOscillator(); o1.type = "triangle"; o1.frequency.value = n.freq;
    const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = n.freq * 2;
    const g2 = c.createGain(); g2.gain.value = 0.25;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(this.buses.input);
    let send: GainNode | null = null;
    if (this.delayIn) { send = c.createGain(); send.gain.value = 0.55; g.connect(send); send.connect(this.delayIn); }
    for (const o of [o1, o2]) { o.start(t); o.stop(t + dur + 0.05); }
    o1.onended = () => { try { g.disconnect(); g2.disconnect(); send?.disconnect(); } catch { /* já desconectado */ } };
  }

  private hat(n: MusicNote, t: number) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.085 * n.vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp); hp.connect(g); g.connect(this.buses.input);
    src.start(t, (this.step % 17) * 0.1);
    src.stop(t + 0.07);
    src.onended = () => { try { g.disconnect(); hp.disconnect(); } catch { /* já desconectado */ } };
  }
}
