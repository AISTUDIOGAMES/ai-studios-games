/**
 * Interactive hero: per-element lighting on top of the flat key art.
 * The key art is a single image, so every element (Ouroboros, sphere, 4 heroes) has its own
 * silhouette mask (public/images/hero-fx, built by scripts/build-hero-masks.py). Each unit is a
 * masked clone of the art that is lit up, tinted and nudged while the pointer is over it.
 * One rAF loop drives everything and only runs while the hero is on screen.
 * Coordinates below are in the art's own 1024x572 space.
 */
const AW = 1024, AH = 572;
type Pt = [number, number];
type Kind = "gold" | "violet" | "magenta" | "cyan" | "amber";

interface Unit {
  id: string;
  bbox: [number, number, number, number]; // x0,y0,x1,y1
  c: string; c2: string; cc: string;       // outline, halo, cursor light
  origin: string;
  ground?: [number, number, number, number]; // cx, cy, rx, ry
  eyes?: [number, number, string][];
  emit: Pt[];                                // spark sources
  lines?: [number, number, number, number][]; // blade segments
  kind: Kind;
}

const UNITS: Unit[] = [
  { id: "sphere", bbox: [512, 24, 762, 280], c: "#d08bff", c2: "#8a3dff", cc: "#a45cff", origin: "50% 50%", emit: [], kind: "violet" },
  { id: "ouroboros", bbox: [329, 205, 588.5, 358.5], c: "#ffd36b", c2: "#ff9a1f", cc: "#ffc24a", origin: "30% 95%", ground: [460, 352, 125, 9],
    eyes: [[402, 258, "#ffe08a"]], emit: [[402, 250], [430, 262], [446, 292], [470, 322], [510, 314], [548, 318], [566, 322]], kind: "gold" },
  { id: "female", bbox: [595, 289, 794.5, 485.5], c: "#cf8bff", c2: "#8a3dff", cc: "#a45cff", origin: "50% 95%", ground: [690, 492, 95, 8],
    eyes: [[655, 321, "#7ff6ff"]], emit: [[650, 330], [690, 385], [660, 440], [745, 455], [775, 350]], kind: "violet" },
  { id: "samurai", bbox: [597.5, 105, 830.5, 336], c: "#ff6fe0", c2: "#b13dff", cc: "#e04cff", origin: "50% 90%", ground: [800, 350, 60, 7],
    emit: [[735, 190], [770, 250], [790, 300]], lines: [[703, 68, 802, 97], [568, 266, 656, 224]], kind: "magenta" },
  { id: "android", bbox: [826, 51.5, 997, 329.5], c: "#7ff0ff", c2: "#2aa8ff", cc: "#3dd8ff", origin: "50% 90%", ground: [852, 342, 50, 6],
    eyes: [[896, 111, "#5ff3ff"], [913, 112, "#e48bff"]], emit: [[862, 128], [950, 128], [905, 200], [942, 232], [870, 290], [900, 262]],
    lines: [[826, 53, 864, 70], [928, 61, 995, 82]], kind: "cyan" },
  { id: "hooded", bbox: [826, 295, 1024, 486], c: "#ffd36b", c2: "#ff9a1f", cc: "#ffc24a", origin: "50% 95%", ground: [935, 500, 80, 8],
    emit: [[935, 400], [960, 405], [985, 395]], lines: [[918, 380, 1000, 372]], kind: "amber" },
];
const HIT_ORDER = ["sphere", "ouroboros", "female", "samurai", "android", "hooded"];
const SPHERE = { x: 640, y: 152, r: 124 };

const pct = (v: number, t: number) => `${((v / t) * 100).toFixed(3)}%`;

export function heroInteractiveMarkup(asset: (f: string) => string): string {
  const art = asset("hero-keyart.webp");
  const units = UNITS.map((u) => {
    const [x0, y0, x1, y1] = u.bbox, bw = x1 - x0, bh = y1 - y0;
    const box = `left:${pct(x0, AW)};top:${pct(y0, AH)};width:${pct(bw, AW)};height:${pct(bh, AH)}`;
    const clone = `background-image:url(${art});background-size:${(AW / bw) * 100}% ${(AH / bh) * 100}%;background-position:${(x0 / (AW - bw)) * 100}% ${(y0 / (AH - bh)) * 100}%`;
    const eyes = (u.eyes ?? []).map(([x, y, col]) => `<i class="hx-eye" style="left:${pct(x, AW)};top:${pct(y, AH)};--ec:${col}"></i>`).join("");
    const ground = u.ground ? `<i class="hx-ground" style="left:${pct(u.ground[0], AW)};top:${pct(u.ground[1], AH)};width:${pct(u.ground[2] * 2, AW)};height:${pct(u.ground[3] * 2, AH)}"></i>` : "";
    const extra = u.id === "sphere"
      ? `<i class="hx-halo"></i><i class="hx-core"></i>`
      : "";
    const spin = u.id === "sphere" ? `<i class="hx-spin"></i><i class="hx-ring"></i>` : "";
    return `<div class="hx-unit hx-${u.id}" data-hx="${u.id}" style="--c:${u.c};--c2:${u.c2};--origin:${u.origin};--m:url(${asset(`hero-fx/${u.id}.webp`)});--ml:url(${asset(`hero-fx/${u.id}-lit.webp`)})">
      ${ground}${extra}
      <div class="hx-body" style="${box}"><div class="hx-sway">
        <div class="hx-s"><div class="hx-clone" style="${clone}"></div><i class="hx-tint"></i><i class="hx-sheen hx-sheen-soft"></i></div>
        <div class="hx-l"><div class="hx-clone hx-clone-hot" style="${clone}"></div><i class="hx-sheen"></i>${spin}</div>
      </div></div>${eyes}
    </div>`;
  }).join("");
  return `<div class="hx-root" aria-hidden="true" data-hit="${asset("hero-fx/hit.png")}">${units}<i class="hx-cursor"></i><canvas class="hx-canvas"></canvas></div>`;
}

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; c: string; t: "dot" | "bit" | "ring" }

export function initHeroInteractive(): void {
  const art = document.querySelector<HTMLElement>("#heroArt");
  const root = art?.querySelector<HTMLElement>(".hx-root");
  const zoom = art?.querySelector<HTMLElement>(".key-zoom");
  const canvas = root?.querySelector<HTMLCanvasElement>(".hx-canvas");
  if (!art || !root || !zoom || !canvas) return;
  const hero = art.closest<HTMLElement>(".hero") ?? art;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) root.classList.add("hx-reduced");
  const unitEl = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>(".hx-unit").forEach((el) => unitEl.set(el.dataset.hx!, el));
  const cursor = root.querySelector<HTMLElement>(".hx-cursor")!;
  const cfg = new Map(UNITS.map((u) => [u.id, u]));
  const a = new Map<string, number>(UNITS.map((u) => [u.id, 0]));

  // hover map: index image (value = id * 40). Falls back to bounding boxes if the canvas is tainted.
  let hit: Uint8ClampedArray | null = null;
  const hm = new Image();
  hm.onload = () => {
    try {
      const c = document.createElement("canvas"); c.width = hm.naturalWidth; c.height = hm.naturalHeight;
      const x = c.getContext("2d", { willReadFrequently: true })!; x.drawImage(hm, 0, 0);
      hit = x.getImageData(0, 0, c.width, c.height).data; hitW = c.width; hitH = c.height;
    } catch { hit = null; }
  };
  let hitW = 512, hitH = 286;
  hm.src = root.dataset.hit ?? "";

  const hitTest = (u: number, v: number): string | null => {
    if (hit) {
      const px = Math.min(hitW - 1, Math.max(0, Math.floor((u / AW) * hitW)));
      const py = Math.min(hitH - 1, Math.max(0, Math.floor((v / AH) * hitH)));
      const idx = Math.round(hit[(py * hitW + px) * 4] / 40);
      return idx > 0 ? HIT_ORDER[idx - 1] ?? null : null;
    }
    for (let i = UNITS.length - 1; i >= 0; i--) {
      const [x0, y0, x1, y1] = UNITS[i].bbox;
      if (u >= x0 && u <= x1 && v >= y0 && v <= y1) return UNITS[i].id;
    }
    return null;
  };

  let target: string | null = null;
  let holdTimer = 0;
  let mu = -1, mv = -1, inside = false, nx = 0, ny = 0, snx = 0, sny = 0;
  let curA = 0, curX = 0, curY = 0;

  const locate = (e: PointerEvent): boolean => {
    const r = zoom.getBoundingClientRect();
    mu = ((e.clientX - r.left) / r.width) * AW;
    mv = ((e.clientY - r.top) / r.height) * AH;
    const hr = hero.getBoundingClientRect();
    nx = ((e.clientX - hr.left) / hr.width - 0.5) * 2;
    ny = ((e.clientY - hr.top) / hr.height - 0.5) * 2;
    inside = mu >= 0 && mu <= AW && mv >= 0 && mv <= AH;
    return !(e.target as Element).closest?.("a,button,input,select,textarea");
  };

  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const ok = locate(e);
    target = ok && inside ? hitTest(mu, mv) : null;
    wake();
  });
  hero.addEventListener("pointerleave", (e) => { if (e.pointerType !== "mouse") return; target = null; inside = false; wake(); });
  hero.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;   // mouse already handled by hover
    if (!locate(e) || !inside) return;
    const id = hitTest(mu, mv);
    if (!id) return;
    target = id;
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => { target = null; inside = false; wake(); }, 2600);
    wake();
  }, { passive: true });

  // ----- particles -----
  const parts: P[] = [];
  const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
  const push = (p: P) => { if (parts.length < 240) parts.push(p); };
  const ambient = {
    dust: Array.from({ length: 26 }, () => ({ x: rnd(0, AW), y: rnd(300, AH), s: rnd(0.8, 1.9), v: rnd(0.08, 0.3), d: rnd(0.4, 1), ph: rnd(0, 6.28) })),
    violet: Array.from({ length: 12 }, () => ({ ang: rnd(0, 6.28), rr: rnd(128, 175), sp: rnd(0.0002, 0.0006) * (Math.random() < 0.5 ? -1 : 1), s: rnd(0.9, 1.8), ph: rnd(0, 6.28) })),
    gold: Array.from({ length: 10 }, () => ({ x: rnd(330, 590), y: rnd(210, 350), s: rnd(0.9, 1.6), ph: rnd(0, 6.28) })),
  };
  const emitFor = (id: string, k: number, dt: number) => {
    const u = cfg.get(id)!;
    const rate = (id === "sphere" ? 26 : 20) * k * (dt / 1000);
    let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
    while (n-- > 0) {
      if (id === "sphere") {
        const ang = rnd(0, 6.28), rr = SPHERE.r * rnd(0.2, 1);
        const x = SPHERE.x + Math.cos(ang) * rr, y = SPHERE.y + Math.sin(ang) * rr;
        push({ x, y, vx: Math.cos(ang) * 0.12, vy: Math.sin(ang) * 0.12 - 0.1, life: 0, max: rnd(700, 1400), s: rnd(0.9, 1.8), c: Math.random() < 0.3 ? "#ffffff" : "#c78bff", t: "dot" });
      } else if (id === "android" && Math.random() < 0.18) {
        const j = u.emit[(Math.random() * u.emit.length) | 0];
        push({ x: j[0], y: j[1], vx: 0, vy: 0, life: 0, max: 700, s: 2, c: "#7ff0ff", t: "ring" });
      } else if (id === "hooded") {
        const x = rnd(918, 996), y = rnd(386, 436);
        push({ x, y, vx: rnd(-0.03, 0.03), vy: -rnd(0.18, 0.5), life: 0, max: rnd(900, 1700), s: rnd(1.5, 3.2), c: "#ffd36b", t: "bit" });
      } else if (u.lines && Math.random() < 0.8) {
        const l = u.lines[(Math.random() * u.lines.length) | 0], f = Math.random();
        push({ x: l[0] + (l[2] - l[0]) * f, y: l[1] + (l[3] - l[1]) * f, vx: rnd(-0.15, 0.15), vy: -rnd(0.05, 0.3), life: 0, max: rnd(500, 1100), s: rnd(0.9, 1.9), c: u.c, t: "dot" });
      } else {
        const p = u.emit[(Math.random() * u.emit.length) | 0];
        push({ x: p[0] + rnd(-6, 6), y: p[1] + rnd(-6, 6), vx: rnd(-0.08, 0.08), vy: -rnd(0.06, 0.28), life: 0, max: rnd(800, 1500), s: rnd(0.9, 1.8), c: u.c, t: "dot" });
      }
    }
  };

  let cw = 0, ch = 0, k = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cw = Math.max(2, Math.round(r.width * dpr)); ch = Math.max(2, Math.round(r.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    k = cw / AW;
  };
  resize();
  new ResizeObserver(resize).observe(art);

  // ----- loop -----
  let visible = true, running = false, last = 0;
  const wake = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } };
  if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }).observe(art);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

  function frame(now: number): void {
    const dt = Math.min(64, now - last); last = now;
    if (!visible || document.hidden) { running = false; return; }
    let busy = false;
    let strongest: Unit | null = null, sa = 0;
    for (const u of UNITS) {
      const t = u.id === target ? 1 : 0;
      const cur = a.get(u.id)!;
      const tau = t > cur ? 170 : 340;
      let nxt = cur + (t - cur) * (1 - Math.exp(-dt / tau));
      if (Math.abs(t - nxt) < 0.015) nxt = t;
      a.set(u.id, nxt);
      if (nxt !== t) busy = true;
      const el = unitEl.get(u.id)!;
      const on = nxt > 0.002;
      if (on !== el.classList.contains("is-on")) el.classList.toggle("is-on", on);
      if (on) {
        el.style.setProperty("--a", nxt.toFixed(3));
        el.style.setProperty("--mx", snx.toFixed(3));
        el.style.setProperty("--my", sny.toFixed(3));
        busy = true;
        if (!reduced) emitFor(u.id, nxt, dt);
        if (nxt > sa) { sa = nxt; strongest = u; }
      }
    }
    snx += (nx - snx) * 0.08; sny += (ny - sny) * 0.08;
    // cursor light
    const wantA = inside ? (strongest ? 0.55 : 0.32) : 0;
    curA += (wantA - curA) * 0.12;
    curX += ((mu < 0 ? AW / 2 : mu) - curX) * 0.2; curY += ((mv < 0 ? AH / 2 : mv) - curY) * 0.2;
    cursor.style.setProperty("--ca", curA.toFixed(3));
    cursor.style.setProperty("--cx", pct(curX, AW)); cursor.style.setProperty("--cy", pct(curY, AH));
    cursor.style.setProperty("--cc", strongest ? strongest.cc : "#b6ff3b");
    if (curA > 0.01) busy = true;

    if (!reduced && ctx) {
      ctx.clearRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "lighter";
      const T = now;
      // ambient: dust far/near layers drift with the pointer at different depths
      for (const d of ambient.dust) {
        d.x += d.v * 0.6 + Math.sin(T / 1800 + d.ph) * 0.05; d.y -= d.v * 0.08;
        if (d.x > AW + 6) d.x = -6; if (d.y < 250) d.y = AH + 4;
        ctx.globalAlpha = 0.16 * d.d * (0.6 + 0.4 * Math.sin(T / 900 + d.ph));
        ctx.fillStyle = "#e9c8a0";
        ctx.fillRect((d.x + snx * -10 * d.d) * k, (d.y + sny * -4 * d.d) * k, d.s * k, d.s * k);
      }
      for (const v of ambient.violet) {
        v.ang += v.sp * dt;
        const x = SPHERE.x + Math.cos(v.ang) * v.rr, y = SPHERE.y + Math.sin(v.ang) * v.rr * 0.92;
        ctx.globalAlpha = 0.25 + 0.3 * Math.sin(T / 700 + v.ph) ** 2;
        ctx.fillStyle = "#b77bff";
        ctx.fillRect((x + snx * -6) * k, (y + sny * -3) * k, v.s * k, v.s * k);
      }
      for (const g of ambient.gold) {
        ctx.globalAlpha = 0.5 * Math.max(0, Math.sin(T / 1100 + g.ph)) ** 3;
        ctx.fillStyle = "#ffd36b";
        ctx.fillRect(g.x * k, g.y * k, g.s * k, g.s * k);
      }
      // emitted particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        const f = p.life / p.max;
        p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06;
        ctx.globalAlpha = (1 - f) * (f < 0.1 ? f * 10 : 1) * 0.9;
        ctx.fillStyle = p.c; ctx.strokeStyle = p.c;
        if (p.t === "ring") { ctx.lineWidth = 1.2 * k; ctx.beginPath(); ctx.arc(p.x * k, p.y * k, (2 + f * 14) * k, 0, 6.283); ctx.stroke(); }
        else if (p.t === "bit") ctx.fillRect(p.x * k, p.y * k, p.s * 1.8 * k, p.s * 0.6 * k);
        else ctx.fillRect(p.x * k, p.y * k, p.s * k, p.s * k);
      }
      busy = true; // ambient motion keeps the loop alive while visible
    }
    if (busy) requestAnimationFrame(frame); else running = false;
  }
  wake();
}
