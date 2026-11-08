import { ART_H, ART_W, DUEL, PLANET, POLYS, type RegionId } from "./heroKeyData";
import { OURO_EYE } from "./heroKeyMarkup";

/**
 * Hero key art effects: particle dust, the Nox / Dorran duel over a sphere of Echo-Ash,
 * and the hover lighting of the dragon, the sphere and every character.
 * Coordinates below are in the 2048x1144 image space (art space x2).
 */
const S = 2;
const IW = ART_W * S;
const IH = ART_H * S;

type Tint = "gold" | "violet" | "pink" | "cyan" | "amber" | "white";
const RGB: Record<Tint, [number, number, number]> = {
  gold: [255, 206, 98],
  violet: [172, 92, 255],
  pink: [255, 96, 214],
  cyan: [96, 238, 255],
  amber: [255, 168, 56],
  white: [255, 244, 214],
};
const HERO_TINT: Partial<Record<RegionId, Tint>> = { jax: "pink", kira: "cyan", lyra: "cyan", kai: "amber", nox: "violet", dorran: "amber" };

interface Particle {
  x: number; y: number; vx: number; vy: number;
  age: number; life: number; size: number; tint: Tint;
  sway: number; phase: number; square: boolean; depth: number; spin: number;
}

const inPoly = (x: number, y: number, p: [number, number][]): boolean => {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const bboxOf = (p: [number, number][]) => {
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

export function initKeyFx(): void {
  const art = document.querySelector<HTMLElement>("#heroArt.hero-key");
  const canvas = art?.querySelector<HTMLCanvasElement>(".key-canvas");
  const svg = art?.querySelector<SVGSVGElement>(".key-fx-svg");
  if (!art || !canvas || !svg) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.matchMedia("(max-width: 700px)").matches;

  // ---------- hover lighting ----------
  let lit: RegionId | null = null;
  let touchTimer = 0;
  const setLit = (id: RegionId | null): void => {
    if (lit === id) return;
    if (lit) art.classList.remove(`is-lit-${lit}`);
    lit = id;
    art.classList.toggle("is-lit", id !== null);
    if (id) art.classList.add(`is-lit-${id}`);
  };
  const regionOf = (t: EventTarget | null): RegionId | null => {
    const el = (t as Element | null)?.closest?.("[data-r]");
    return (el?.getAttribute("data-r") as RegionId | null) ?? null;
  };
  svg.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    setLit(regionOf(e.target));
  });
  svg.addEventListener("pointerleave", () => setLit(null));
  svg.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    const id = regionOf(e.target);
    if (!id) return;
    setLit(id);
    window.clearTimeout(touchTimer);
    touchTimer = window.setTimeout(() => setLit(null), 2200);
  });

  // ---------- canvas ----------
  let k = 1;
  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(canvas.clientWidth, 1), h = Math.max(canvas.clientHeight, 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    k = canvas.width / IW; // image px -> canvas px
  };
  resize();
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  const sprites = new Map<Tint, HTMLCanvasElement>();
  const spriteOf = (t: Tint): HTMLCanvasElement => {
    let s = sprites.get(t);
    if (!s) {
      s = document.createElement("canvas");
      s.width = s.height = 64;
      const g = s.getContext("2d");
      if (g) {
        const [r, gg, b] = RGB[t];
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, `rgba(255,255,255,1)`);
        grd.addColorStop(0.18, `rgba(${r},${gg},${b},0.95)`);
        grd.addColorStop(0.55, `rgba(${r},${gg},${b},0.28)`);
        grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        g.fillStyle = grd;
        g.fillRect(0, 0, 64, 64);
      }
      sprites.set(t, s);
    }
    return s;
  };

  // the duel only plays where the villains are shown (wide desktop layouts)
  const villainsEl = art.querySelector<HTMLElement>(".key-villains");
  let duelOn = true;
  const checkDuel = (): void => {
    duelOn = !villainsEl || getComputedStyle(villainsEl).display !== "none";
  };
  checkDuel();
  window.addEventListener("resize", checkDuel);

  const parts: Particle[] = [];
  const CAP = small ? 260 : 620;
  const spawn = (x: number, y: number, o: Partial<Particle> & { tint: Tint }): void => {
    if (parts.length >= CAP) return;
    parts.push({
      x, y, vx: 0, vy: -30, age: 0, life: 8, size: 2, sway: 0, phase: Math.random() * 6.28,
      square: false, depth: 1, spin: 0, ...o,
    });
  };

  const polyBoxes = Object.fromEntries(
    (Object.keys(POLYS) as (keyof typeof POLYS)[]).map((id) => [id, bboxOf(POLYS[id])]),
  ) as Record<keyof typeof POLYS, ReturnType<typeof bboxOf>>;
  const pointIn = (id: keyof typeof POLYS): [number, number] => {
    const b = polyBoxes[id];
    for (let i = 0; i < 10; i++) {
      const x = rnd(b.x0, b.x1), y = rnd(b.y0, b.y1);
      if (inPoly(x, y, POLYS[id])) return [x * S, y * S];
    }
    return [((b.x0 + b.x1) / 2) * S, ((b.y0 + b.y1) / 2) * S];
  };

  const ORB = DUEL.orb;

  // emitters (particles per second): [idle, lit]
  const acc = { amb: 0, ouro: 0, planet: 0, hero: 0, duel: 0, feet: 0 };
  const AMBIENT = small ? 7 : 16; // ~14 s life -> ~100 / 220 motes alive
  const tick = (dt: number): void => {
    acc.amb += AMBIENT * dt * (lit ? 1.15 : 1);
    while (acc.amb >= 1) {
      acc.amb -= 1;
      const depth = pick([0.55, 1, 1, 1.7]);
      spawn(rnd(0, IW), rnd(IH * 0.45, IH * 1.02), {
        tint: Math.random() < 0.82 ? "gold" : "amber",
        vy: -rnd(18, 52) * depth, vx: rnd(-6, 10), size: rnd(1.4, 3.8) * depth,
        life: rnd(9, 19), sway: rnd(8, 30), depth,
      });
    }
    // Ouroi dust: rises off the serpent's body, in a lazy spiral
    acc.ouro += (lit === "ouro" ? 70 : 9) * dt;
    while (acc.ouro >= 1) {
      acc.ouro -= 1;
      const [x, y] = pointIn("ouro");
      const hot = lit === "ouro";
      spawn(x, y, {
        tint: Math.random() < 0.7 ? "gold" : "white",
        vy: -rnd(hot ? 40 : 22, hot ? 120 : 60), vx: rnd(-10, 10), size: rnd(2, hot ? 6.5 : 4.5),
        life: rnd(5, hot ? 11 : 9), sway: rnd(14, 46), square: Math.random() < 0.28, spin: rnd(-2, 2),
      });
    }
    // sphere embers
    acc.planet += (lit === "planet" ? 46 : 2.5) * dt;
    while (acc.planet >= 1) {
      acc.planet -= 1;
      const a = rnd(0, 6.283), r = PLANET.r * S * Math.sqrt(Math.random());
      spawn(PLANET.cx * S + Math.cos(a) * r, PLANET.cy * S + Math.sin(a) * r, {
        tint: Math.random() < 0.5 ? "violet" : "pink", vx: Math.cos(a) * rnd(8, 34), vy: Math.sin(a) * rnd(8, 34) - rnd(10, 40),
        size: rnd(2, 5.5), life: rnd(2.4, 5), sway: rnd(4, 16),
      });
    }
    // character sparks
    if (lit && lit !== "planet" && lit !== "ouro") {
      acc.hero += 48 * dt;
      const tint = HERO_TINT[lit] ?? "gold";
      while (acc.hero >= 1) {
        acc.hero -= 1;
        const [x, y] = pointIn(lit as keyof typeof POLYS);
        spawn(x, y, { tint, vy: -rnd(30, 95), vx: rnd(-22, 22), size: rnd(1.8, 5), life: rnd(1.2, 2.8), sway: rnd(4, 14) });
      }
    }
    // the duel: embers fly off the sphere, dust kicks up at the villains' feet
    acc.duel += (duelOn ? (lit === "nox" || lit === "dorran" ? 34 : 13) : 0) * dt;
    while (acc.duel >= 1) {
      acc.duel -= 1;
      const a = rnd(0, 6.283), sp = rnd(30, 120);
      spawn(ORB.x + rnd(-8, 8), ORB.y + rnd(-8, 8), {
        tint: Math.random() < 0.5 ? "violet" : "gold", vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        size: rnd(1.6, 4.2), life: rnd(0.8, 2.2), sway: 0,
      });
    }
    acc.feet += (duelOn ? 6 : 0) * dt;
    while (acc.feet >= 1) {
      acc.feet -= 1;
      spawn(pick([DUEL.hand.x - 120, DUEL.chest.x + 40]) + rnd(-70, 70), 1096 + rnd(-6, 6), {
        tint: "amber", vx: rnd(-14, 14), vy: -rnd(6, 20), size: rnd(2.6, 6), life: rnd(3, 6), sway: rnd(6, 16),
      });
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(p.age * 1.4 + p.phase) * p.sway) * dt;
      p.y += p.vy * dt;
    }
  };

  // ---------- the duel over a sphere of Echo-Ash ----------
  const NOX_HAND = DUEL.hand;
  const DORRAN_CHEST = DUEL.chest;
  const bolt = (a: { x: number; y: number }, b: { x: number; y: number }, amp: number, seed: number): [number, number][] => {
    const pts: [number, number][] = [];
    const n = 9, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= n; i++) {
      const u = i / n, env = Math.sin(Math.PI * u);
      const j = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
      const r = (j - Math.floor(j) - 0.5) * 2;
      pts.push([a.x + dx * u + nx * r * amp * env, a.y + dy * u + ny * r * amp * env]);
    }
    return pts;
  };

  const glow = (x: number, y: number, r: number, t: Tint, a: number): void => {
    ctx.globalAlpha = Math.min(a, 1);
    ctx.drawImage(spriteOf(t), (x - r) * k, (y - r) * k, r * 2 * k, r * 2 * k);
  };

  const draw = (t: number): void => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";

    // particles
    for (const p of parts) {
      const u = p.age / p.life;
      const fade = Math.min(u * 6, 1) * Math.min((1 - u) * 2.2, 1);
      const a = fade * (0.35 + 0.65 * Math.min(p.depth, 1.2));
      if (p.square) {
        const [r, g, b] = RGB[p.tint];
        ctx.save();
        ctx.translate(p.x * k, p.y * k);
        ctx.rotate(p.spin * p.age);
        ctx.globalAlpha = Math.min(a * 0.95, 1);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        const s = p.size * k;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        glow(p.x, p.y, p.size * 2.6, p.tint, a);
      }
    }

    // sphere + beams
    if (!duelOn) { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; return; }
    const hotN = lit === "nox" ? 1.9 : 1, hotD = lit === "dorran" ? 1.9 : 1;
    const tug = Math.sin(t * 1.3) * 9 + Math.sin(t * 3.1) * 3;
    const ox = ORB.x + tug, oy = ORB.y + Math.sin(t * 2.1) * 4;
    const pulse = 0.85 + 0.15 * Math.sin(t * 5.2);
    glow(ox - 14, oy, 84 * hotN, "violet", 0.55 * pulse);
    glow(ox + 14, oy, 84 * hotD, "gold", 0.5 * pulse);
    glow(ox, oy, 38, "white", 0.95);

    const seed = Math.floor(t * 16);
    const beams: [typeof NOX_HAND, Tint, number][] = [[NOX_HAND, "violet", hotN], [DORRAN_CHEST, "gold", hotD]];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    beams.forEach(([from, tint, heat], i) => {
      const pts = bolt(from, { x: ox, y: oy }, 14 + 10 * heat, seed + i * 7.31);
      const [r, g, b] = RGB[tint];
      const path = (): void => {
        ctx.beginPath();
        pts.forEach(([x, y], n) => (n ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
      };
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.2 * heat})`; ctx.lineWidth = 9 * k * heat; path(); ctx.stroke();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`; ctx.lineWidth = 2.6 * k * Math.min(heat, 1.4); path(); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1 * k; path(); ctx.stroke();
      glow(from.x, from.y, 26 * heat, tint, 0.7);
    });
    // shockwave where the two forces meet
    for (let i = 0; i < 2; i++) {
      const u = ((t / 2.6 + i * 0.5) % 1);
      ctx.strokeStyle = i ? "rgba(255,206,98,1)" : "rgba(172,92,255,1)";
      ctx.globalAlpha = (1 - u) * 0.55;
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.ellipse(ox * k, oy * k, (10 + u * 80) * k, (7 + u * 58) * k, 0, 0, 6.283);
      ctx.stroke();
    }

    // the serpent's eye flares on hover (soft light, the SVG halo does the rest)
    if (lit === "ouro") {
      glow(OURO_EYE.x * S, OURO_EYE.y * S, 34 + 8 * Math.sin(t * 6), "gold", 0.9);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  // ---------- loop ----------
  let last = performance.now(), t = 0, raf = 0, visible = true;
  const frame = (now: number): void => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden || art.classList.contains("is-paused")) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    tick(dt);
    draw(t);
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(art);
  }
  if (reduced) {
    for (let i = 0; i < 80; i++) tick(0.25);
    draw(1.2);
    return;
  }
  // pre-warm so the dust is already floating when the page loads
  for (let i = 0; i < 90; i++) tick(0.15);
  raf = requestAnimationFrame(frame);
  window.addEventListener("pagehide", () => cancelAnimationFrame(raf));
}
