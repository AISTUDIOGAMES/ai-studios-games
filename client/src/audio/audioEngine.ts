// Motor de áudio do BomberIdle (música + efeitos). Regras que ele garante:
//  - UM único AudioContext, criado só depois de um gesto do jogador (política de autoplay dos navegadores);
//  - a música nunca é duplicada (iniciar de novo é inofensivo) e é independente da cena do jogo;
//  - se o áudio não existir ou falhar, tudo vira "não faz nada" e o jogo segue normal;
//  - sobreposição controlada: intervalo mínimo por efeito, máximo de vozes por efeito, teto global de vozes
//    e redução automática quando muita coisa soa ao mesmo tempo; um compressor/limitador no master evita estouro;
//  - com a aba escondida o contexto é suspenso (nada soa nem consome CPU) e volta ao reaparecer.
import { getAudioPrefs, onAudioPrefs, volToGain, type AudioPrefs } from "./audioSettings";
import { MusicPlayer, type Timer, defaultTimer } from "./music";
import { SFX, type SfxId, type VoiceOpts } from "./synth";

export type AudioStatus = "idle" | "running" | "suspended" | "unsupported" | "error";
export type Mood = "field" | "menu";

export interface Buses {
  musicIn: AudioNode;
  filter: BiquadFilterNode;
  duck: GainNode;
  mood: GainNode;
  musicGain: GainNode;
  sfxGain: GainNode;
  master: GainNode;
  comp: DynamicsCompressorNode;
}

/**
 * Curva do limitador suave: transparente até ~0,65 e satura devagar rumo a 0,95. O WaveShaper só enxerga a faixa
 * -1..1 do sinal de entrada, por isso há um ganho 0,5 antes dele (a curva cobre -2..2 do sinal real).
 */
export function limiterCurve(n = 2048) {
  const k = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) * 2 - 1) * 2; // sinal real: -2..2
    const a = Math.abs(x), knee = 0.65, room = 0.3;
    k[i] = Math.sign(x) * (a <= knee ? a : knee + room * Math.tanh((a - knee) / room));
  }
  return k;
}

/** Cadeia de saída: música (filtro > duck > mood > volume) e efeitos (volume) somam no master > compressor > limitador > saída. */
export function createBuses(c: BaseAudioContext): Buses {
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 16000;
  const duck = c.createGain();
  const mood = c.createGain();
  const musicGain = c.createGain();
  const sfxGain = c.createGain();
  const master = c.createGain();
  master.gain.value = 1;
  const comp = c.createDynamicsCompressor(); // "cola" o mix: segura rajadas de explosões sem achatar o resto
  comp.threshold.value = -12;
  comp.knee.value = 10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const pre = c.createGain();
  pre.gain.value = 0.5;
  const shaper = c.createWaveShaper();
  shaper.curve = limiterCurve();
  shaper.oversample = "2x";
  filter.connect(duck); duck.connect(mood); mood.connect(musicGain); musicGain.connect(master);
  sfxGain.connect(master);
  master.connect(comp); comp.connect(pre); pre.connect(shaper); shaper.connect(c.destination);
  return { musicIn: filter, filter, duck, mood, musicGain, sfxGain, master, comp };
}

export interface PlayOpts { pitch?: number; level?: number; rarity?: number; vol?: number }

export interface EngineDeps {
  createContext?: () => AudioContext;
  timers?: Timer;
  rnd?: () => number;
  /** Tipo mínimo de `document` (testes passam um falso). */
  doc?: Pick<Document, "addEventListener" | "removeEventListener"> & { hidden: boolean };
}

const MAX_VOICES = 18;        // teto de efeitos soando juntos (prioridade 2 pode passar até +6)
const DENSITY_WINDOW = 0.4;   // s: janela para medir "quanta coisa está tocando"

interface Voice { id: SfxId; endsAt: number; node: GainNode }

function defaultCreateContext(): AudioContext {
  const Ctor: typeof AudioContext | undefined = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio indisponível");
  return new Ctor({ latencyHint: "interactive" });
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buses: Buses | null = null;
  private music: MusicPlayer | null = null;
  private voices: Voice[] = [];
  private lastPlay = new Map<SfxId, number>();
  private recent: number[] = [];
  private mood: Mood = "field";
  private pausedByHide = false;
  private unlocking: Promise<boolean> | null = null;
  private listeners = new Set<(s: AudioStatus) => void>();
  private unsub: (() => void) | null = null;
  private autoUnlockOff: (() => void) | null = null;
  private _status: AudioStatus = "idle";
  /** Quantos AudioContext já foram criados por este motor (testes exigem que nunca passe de 1). */
  contextsCreated = 0;

  constructor(private deps: EngineDeps = {}) {
    this.unsub = onAudioPrefs(() => this.applyPrefs());
  }

  get status(): AudioStatus { return this._status; }
  get activeVoices(): number { this.prune(); return this.voices.length; }

  /** Remove (e desconecta) as vozes que já terminaram. Também roda a cada play(). */
  private prune() {
    const now = this.ctx?.currentTime ?? 0;
    this.voices = this.voices.filter((v) => { if (v.endsAt > now) return true; try { v.node.disconnect(); } catch { /* ok */ } return false; });
  }
  get musicRunning(): boolean { return !!this.music?.running; }

  onStatus(fn: (s: AudioStatus) => void): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private setStatus(s: AudioStatus) {
    if (s === this._status) return;
    this._status = s;
    this.listeners.forEach((fn) => { try { fn(s); } catch { /* ouvinte com erro não afeta o áudio */ } });
  }

  /**
   * Cria/retoma o AudioContext. Chame DENTRO de um gesto do jogador (clique, toque, tecla).
   * Pode ser chamado quantas vezes quiser: nunca cria um segundo contexto nem duplica a música.
   */
  unlock(): Promise<boolean> {
    if (this._status === "unsupported") return Promise.resolve(false);
    if (this.unlocking) return this.unlocking;
    try {
      if (!this.ctx) {
        this.ctx = (this.deps.createContext ?? defaultCreateContext)();
        this.contextsCreated++;
        this.buses = createBuses(this.ctx);
        this.music = new MusicPlayer(this.ctx, { input: this.buses.musicIn }, this.deps.timers ?? defaultTimer);
        this.ctx.onstatechange = () => this.syncState();
        this.applyGains(true);
      }
      const p = Promise.resolve(this.ctx.resume());
      this.unlocking = p.then(() => { this.syncState(); return this._status === "running"; }, () => { this.syncState(); return false; })
        .finally(() => { this.unlocking = null; });
      return this.unlocking;
    } catch {
      this.ctx = null; this.buses = null; this.music = null;
      this.setStatus(typeof (globalThis as { AudioContext?: unknown }).AudioContext === "undefined" && typeof (globalThis as { webkitAudioContext?: unknown }).webkitAudioContext === "undefined" ? "unsupported" : "error");
      return Promise.resolve(false);
    }
  }

  /** Primeiro gesto em qualquer lugar da página libera o som (se o jogador não o desligou). Retira os ouvintes sozinho. */
  installAutoUnlock(target: Pick<Document, "addEventListener" | "removeEventListener"> = this.deps.doc ?? document) {
    if (this.autoUnlockOff) return;
    const evs = ["pointerdown", "keydown", "touchend"];
    const handler = () => {
      const p = getAudioPrefs();
      if (!p.music && !p.sfx) return; // som desligado de propósito: não liga sozinho
      void this.unlock().then((ok) => { if (ok) this.autoUnlockOff?.(); });
    };
    evs.forEach((e) => target.addEventListener(e, handler, { passive: true } as AddEventListenerOptions));
    this.autoUnlockOff = () => { evs.forEach((e) => target.removeEventListener(e, handler)); this.autoUnlockOff = null; };
  }

  /** Suspende com a aba escondida (sem som e sem CPU) e retoma ao voltar. */
  installLifecycle(doc: EngineDeps["doc"] = this.deps.doc ?? document, win: Pick<Window, "addEventListener"> | null = typeof window !== "undefined" ? window : null) {
    doc.addEventListener("visibilitychange", () => this.handleVisibility(doc.hidden));
    win?.addEventListener("pagehide", () => this.handleVisibility(true));
    win?.addEventListener("pageshow", () => this.handleVisibility(doc.hidden));
  }

  handleVisibility(hidden: boolean) {
    const c = this.ctx;
    if (!c) return;
    if (hidden) {
      if (c.state === "running") { this.pausedByHide = true; void c.suspend().catch(() => undefined); }
    } else if (this.pausedByHide) {
      this.pausedByHide = false;
      void c.resume().catch(() => undefined);
    }
  }

  private syncState() {
    const c = this.ctx;
    if (!c) return;
    const s: AudioStatus = c.state === "running" ? "running" : c.state === "closed" ? "error" : "suspended";
    this.setStatus(s);
    this.applyPrefs();
  }

  /** Aplica volume/liga/desliga conforme as preferências. Chamado ao mudar a config e ao mudar o estado do contexto. */
  applyPrefs() {
    if (!this.ctx || !this.buses) return;
    const p = getAudioPrefs();
    this.applyGains(false, p);
    const running = this.ctx.state === "running";
    if (running && p.music) this.music?.start();
    else this.music?.stop();
  }

  private applyGains(immediate: boolean, p: AudioPrefs = getAudioPrefs()) {
    if (!this.ctx || !this.buses) return;
    const now = this.ctx.currentTime;
    const set = (param: AudioParam, v: number) => { if (immediate) param.setValueAtTime(v, now); else param.setTargetAtTime(v, now, 0.03); };
    set(this.buses.musicGain.gain, p.music ? volToGain(p.musicVol) : 0);
    set(this.buses.sfxGain.gain, p.sfx ? volToGain(p.sfxVol) : 0);
    this.applyMood(immediate);
  }

  /** "menu" (janela aberta): música mais abafada e baixa, sem trocar de faixa. */
  setMood(m: Mood) {
    if (m === this.mood) return;
    this.mood = m;
    this.applyMood(false);
  }
  private applyMood(immediate: boolean) {
    if (!this.ctx || !this.buses) return;
    const now = this.ctx.currentTime, menu = this.mood === "menu";
    const f = this.buses.filter.frequency, g = this.buses.mood.gain;
    if (immediate) { f.setValueAtTime(menu ? 1800 : 16000, now); g.setValueAtTime(menu ? 0.8 : 1, now); }
    else { f.setTargetAtTime(menu ? 1800 : 16000, now, 0.25); g.setTargetAtTime(menu ? 0.8 : 1, now, 0.25); }
  }

  /** Toca um efeito. Devolve true se ele realmente soou. Nunca lança erro. */
  play(id: SfxId, opts: PlayOpts = {}): boolean {
    try {
      const c = this.ctx, b = this.buses;
      if (!c || !b || c.state !== "running") return false;
      if (!getAudioPrefs().sfx) return false;
      const def = SFX[id];
      if (!def) return false;
      const now = c.currentTime;

      // limpa vozes que já acabaram (e solta os nós)
      this.prune();
      this.recent = this.recent.filter((t) => t > now - DENSITY_WINDOW);

      const last = this.lastPlay.get(id);
      if (last !== undefined && now - last < def.cooldownMs / 1000) return false;
      if (this.voices.filter((v) => v.id === id).length >= def.maxVoices) return false;
      const cap = MAX_VOICES + (def.priority === 2 ? 6 : 0);
      if (this.voices.length >= cap) return false;
      if (def.priority === 0 && this.voices.length >= MAX_VOICES * 0.7) return false; // com muito som, os de enfeite saem primeiro

      const rnd = this.deps.rnd ?? Math.random;
      const density = Math.max(0.5, 1 / (1 + 0.1 * this.recent.length)); // quanto mais som recente, menor cada novo
      const vg = c.createGain();
      vg.gain.value = def.gain * (opts.vol ?? 1) * density;
      vg.connect(b.sfxGain);
      const vo: VoiceOpts = {
        pitch: (opts.pitch ?? 1) * (0.94 + rnd() * 0.12), // variação de ±6%: sem "som carimbado"
        level: Math.min(1, Math.max(0, opts.level ?? 0.5)),
        rarity: Math.min(7, Math.max(0, Math.round(opts.rarity ?? 0))),
        rnd,
      };
      let end: number;
      try { end = def.play(c, vg, now + 0.005, vo); } catch (e) { try { vg.disconnect(); } catch { /* ok */ } throw e; }
      this.voices.push({ id, endsAt: end, node: vg });
      this.lastPlay.set(id, now);
      this.recent.push(now);

      if (def.duck) { // a música "abre espaço" para o efeito grande e volta suave
        const d = b.duck.gain;
        d.cancelScheduledValues(now);
        d.setTargetAtTime(1 - def.duck.amount, now, 0.01);
        d.setTargetAtTime(1, now + 0.06, def.duck.ms / 1000 / 3);
      }
      return true;
    } catch {
      return false; // áudio com problema nunca derruba o jogo
    }
  }

  /** Encerra tudo: música, ouvintes e contexto. */
  dispose() {
    this.music?.stop();
    this.autoUnlockOff?.();
    this.unsub?.(); this.unsub = null;
    try { void this.ctx?.close(); } catch { /* ok */ }
    this.voices = []; this.ctx = null; this.buses = null; this.music = null;
    this.setStatus("idle");
  }
}

/** Instância única do jogo. Só toca em `window`/`document` quando alguém chama unlock()/install*(). */
export const audio = new AudioEngine();
