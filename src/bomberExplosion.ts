// Planejador da explosão: transforma as células atingidas numa linha do tempo de efeitos visuais.
// Função PURA (sem Phaser): só descreve o que desenhar e quando. Não altera dano, colisão nem células — a lógica
// continua em blastCells/explode. Isso permite testar limites, ordem e intensidade sem navegador.
import { SHAKE_MULT } from "./fxSettings";
import type { FxLevel } from "./fxSettings";

export type FxKind = "flash" | "ring" | "fireball" | "flame" | "halo" | "smoke" | "scorch" | "ember";
export interface FxStep {
  kind: FxKind; texture: string; x: number; y: number; tint?: number;
  scale: number; toScale: number; alpha: number; duration: number; delay: number; depth: number;
  add: boolean; dx?: number; dy?: number;
  /** 0 = essencial (sempre desenhado); 1 = enfeite (cortado quando há efeitos demais na tela). */
  prio: 0 | 1;
}
export interface ExplosionPlan { steps: FxStep[]; shake: { duration: number; intensity: number }; endMs: number }
export interface ExplosionInput {
  cells: readonly (readonly [number, number])[]; gx: number; gy: number; range: number; splash: number;
  tile: number; level: FxLevel; rng: () => number;
}

export const EXPLOSION = {
  stepMs: 32,            // atraso do fogo por célula de distância: a chama "corre" pelo corredor
  flameMs: 360,
  maxSmoke: [0, 5, 10], maxScorch: [0, 5, 12], maxEmbers: [0, 6, 16], // por nível (baixo, médio, alto)
};

/** Escolhe até `cap` itens espalhados de forma uniforme (mantém o primeiro e o último). */
function spread<T>(items: T[], cap: number): T[] {
  if (cap <= 0) return [];
  if (items.length <= cap) return items;
  const out: T[] = [];
  for (let i = 0; i < cap; i++) out.push(items[Math.round((i * (items.length - 1)) / Math.max(1, cap - 1))]);
  return out;
}

export function planExplosion(o: ExplosionInput): ExplosionPlan {
  const { gx, gy, tile, level, rng } = o;
  const cells = o.cells.length ? o.cells : ([[gx, gy]] as [number, number][]);
  const c = (v: number) => v * tile + tile / 2;
  const dist = (p: readonly [number, number]) => Math.max(Math.abs(p[0] - gx), Math.abs(p[1] - gy));
  const sorted = [...cells].sort((a, b) => dist(a) - dist(b));
  const maxD = dist(sorted[sorted.length - 1]);
  const cx = c(gx), cy = c(gy);
  const splash = o.splash > 0;
  const steps: FxStep[] = [];

  // ---- essenciais: aparecem em qualquer nível ----
  steps.push({ kind: "flash", texture: "fx_flash", x: cx, y: cy, tint: 0xfff3d0, scale: 0.8, toScale: 2.2 + o.range * 0.25, alpha: 0.9, duration: 150, delay: 0, depth: 5.2, add: true, prio: 0 });
  steps.push({ kind: "ring", texture: "fx_ring", x: cx, y: cy, tint: splash ? 0xffb15a : 0xffc04a, scale: 0.4, toScale: 0.8 + o.range * 0.45, alpha: 0.8, duration: 320, delay: 0, depth: 4.5, add: true, prio: 0 });
  steps.push({ kind: "fireball", texture: "flame", x: cx, y: cy, tint: 0xfff3b0, scale: 0.9, toScale: 2.0, alpha: 1, duration: 300, delay: 0, depth: 5.3, add: true, prio: 0 });
  for (const p of sorted) {
    const jitter = 0.9 + rng() * 0.2;
    steps.push({ kind: "flame", texture: "flame", x: c(p[0]), y: c(p[1]), scale: 0.5 * jitter, toScale: 1.4 * jitter, alpha: 1, duration: EXPLOSION.flameMs, delay: dist(p) * EXPLOSION.stepMs, depth: 5, add: false, prio: 0 });
  }

  // ---- enfeites (nível médio e alto) ----
  if (level >= 1) {
    for (const p of spread(sorted, EXPLOSION.maxSmoke[level])) {
      steps.push({ kind: "smoke", texture: "fx_smoke", x: c(p[0]) + (rng() - 0.5) * 8, y: c(p[1]), tint: 0x8d96ab, scale: 0.5, toScale: 1.5 + rng() * 0.4, alpha: 0.5,
        duration: 700 + rng() * 250, delay: dist(p) * EXPLOSION.stepMs + 120, depth: 5.6, add: false, dy: -(18 + rng() * 10), prio: 1 });
    }
    for (const p of spread(sorted, EXPLOSION.maxScorch[level])) {
      steps.push({ kind: "scorch", texture: "fx_scorch", x: c(p[0]), y: c(p[1]), scale: 1, toScale: 1.05, alpha: 0.6, duration: 1300, delay: dist(p) * EXPLOSION.stepMs, depth: 0.5, add: false, prio: 1 });
    }
    const n = level === 2 ? Math.min(8 + cells.length, EXPLOSION.maxEmbers[2]) : EXPLOSION.maxEmbers[1];
    for (let i = 0; i < n; i++) {
      const p = cells[Math.floor(rng() * cells.length)], a = rng() * Math.PI * 2, r = 18 + rng() * 34;
      steps.push({ kind: "ember", texture: "spark", x: c(p[0]), y: c(p[1]), tint: rng() < 0.5 ? 0xffc04a : 0xff7a1a, scale: 1.1, toScale: 0.2, alpha: 1,
        duration: 380 + rng() * 240, delay: dist(p) * EXPLOSION.stepMs, depth: 6, add: true, dx: Math.cos(a) * r, dy: Math.sin(a) * r, prio: 1 });
    }
  }
  // ---- só no nível alto: halo de calor no centro e nas pontas ----
  if (level >= 2) {
    const tips = sorted.filter((p) => dist(p) === maxD && maxD > 0).slice(0, 4);
    for (const p of [[gx, gy] as const, ...tips]) {
      steps.push({ kind: "halo", texture: "glow", x: c(p[0]), y: c(p[1]), tint: 0xff5a1a, scale: 1.2, toScale: 3.2, alpha: 0.7, duration: 460, delay: dist(p) * EXPLOSION.stepMs, depth: 4.8, add: true, prio: 1 });
    }
  }

  const base = splash ? { duration: 140, intensity: 0.004 } : { duration: 90, intensity: 0.002 };
  const shake = { duration: base.duration, intensity: base.intensity * (SHAKE_MULT[level] ?? 1) };
  const endMs = steps.reduce((m, s) => Math.max(m, s.delay + s.duration), 0);
  return { steps, shake, endMs };
}
