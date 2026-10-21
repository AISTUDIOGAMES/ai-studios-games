/**
 * Animated hero banner.
 * CSS handles the glow, glitch, sweep and scan-line layers. This file adds the canvas effects
 * (rising data sparks, falling code streaks, energy rings), pointer parallax and click bursts.
 * Everything pauses when the banner is off screen or the tab is hidden, and it stays
 * still for people who prefer reduced motion.
 */

/** Position of the big logo inside the banner image (0-1), used for the energy rings. */
const IMG_W = 1584;
const IMG_H = 672;
const LOGO = { x: 0.5, y: 0.22 };
const COLORS = ["#b6ff3b", "#3dffd0", "#8a72ff", "#ff4fd8", "#4fd8ff"];

interface Spark { x: number; y: number; vx: number; vy: number; s: number; c: string; a: number; ph: number; life?: number }
interface Streak { x: number; y: number; len: number; v: number; c: string; a: number }

export function initHeroBanner(): void {
  const art = document.querySelector<HTMLElement>("#heroArt");
  const canvas = art?.querySelector<HTMLCanvasElement>(".hb-fx");
  const clock = art?.querySelector<HTMLElement>("#hbClock");
  if (!art || !canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const pick = () => COLORS[(Math.random() * COLORS.length) | 0];

  let w = 0, h = 0, dpr = 1;
  let sparks: Spark[] = [];
  let streaks: Streak[] = [];
  let bursts: Spark[] = [];

  const newSpark = (initial: boolean): Spark => ({
    x: rand(0, w), y: initial ? rand(0, h) : h + 10,
    vx: rand(-0.12, 0.12), vy: -rand(0.25, 0.9), s: rand(1, 2.6), c: pick(), a: rand(0.35, 0.95), ph: rand(0, 6.28),
  });
  const newStreak = (initial: boolean): Streak => ({
    x: rand(0, w), y: initial ? rand(-h, h) : -rand(20, 200), len: rand(40, 140), v: rand(1.4, 3.6),
    c: Math.random() > 0.35 ? "#b6ff3b" : "#4fd8ff", a: rand(0.1, 0.32),
  });

  function resize(): void {
    const r = art!.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    canvas!.width = w * dpr;
    canvas!.height = h * dpr;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    const area = w * h;
    sparks = Array.from({ length: Math.min(80, Math.round(area / 7000)) }, () => newSpark(true));
    streaks = Array.from({ length: Math.min(16, Math.round(area / 32000)) }, () => newStreak(true));
  }

  /** Where the logo sits on screen (the image is scaled like object-fit: cover). */
  function logoPoint(): { x: number; y: number; r: number } {
    const k = Math.max(w / IMG_W, h / IMG_H);
    const iw = IMG_W * k, ih = IMG_H * k;
    return { x: (w - iw) / 2 + LOGO.x * iw, y: (h - ih) / 2 + LOGO.y * ih, r: iw * 0.16 };
  }

  // Pointer parallax (smoothed)
  let tx = 0, ty = 0, px = 0, py = 0;
  const hero = art.closest<HTMLElement>(".hero") ?? art;
  if (canHover && !reduced) {
    hero.addEventListener("pointermove", (e) => {
      const r = art.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    });
    hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; });
  }

  // Click / tap burst
  art.addEventListener("pointerdown", (e) => {
    if (reduced) return;
    const r = art.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = 0; i < 26; i++) {
      const ang = rand(0, Math.PI * 2), sp = rand(1.2, 4.2);
      bursts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, s: rand(1.2, 3), c: pick(), a: 1, ph: 0, life: 1 });
    }
    art.classList.remove("hb-hit");
    void art.offsetWidth;
    art.classList.add("hb-hit");
  });

  let running = false;
  let raf = 0;
  const t0 = performance.now();
  let lastClock = -1;

  function frame(now: number): void {
    if (!running) return;
    const t = now - t0;
    px += (tx - px) * 0.07;
    py += (ty - py) * 0.07;
    art!.style.setProperty("--px", `${(px * -16).toFixed(2)}px`);
    art!.style.setProperty("--py", `${(py * -4).toFixed(2)}px`);

    ctx!.clearRect(0, 0, w, h);
    ctx!.globalCompositeOperation = "lighter";
    const ox = px * 10, oy = py * 6; // the particle layer moves the other way, for depth

    // falling code streaks
    for (const s of streaks) {
      s.y += s.v;
      if (s.y - s.len > h) Object.assign(s, newStreak(false));
      const g = ctx!.createLinearGradient(0, s.y - s.len, 0, s.y);
      g.addColorStop(0, "transparent");
      g.addColorStop(1, s.c);
      ctx!.globalAlpha = s.a;
      ctx!.fillStyle = g;
      ctx!.fillRect(s.x + ox, s.y - s.len, 1.4, s.len);
    }

    // rising sparks
    for (const p of sparks) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(t / 900 + p.ph) * 0.18;
      if (p.y < -12) Object.assign(p, newSpark(false));
      ctx!.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(t / 380 + p.ph));
      ctx!.fillStyle = p.c;
      ctx!.fillRect(p.x + ox, p.y + oy, p.s, p.s);
    }

    // energy rings out of the logo (same 3.2 s beat as the CSS glow)
    const lp = logoPoint();
    for (let i = 0; i < 2; i++) {
      const ph = ((t + i * 1600) % 3200) / 3200;
      ctx!.globalAlpha = (1 - ph) * 0.3;
      ctx!.strokeStyle = i ? "#8a72ff" : "#b6ff3b";
      ctx!.lineWidth = 1.5 + (1 - ph) * 1.5;
      ctx!.beginPath();
      ctx!.arc(lp.x + px * -16, lp.y + py * -4, lp.r * (0.5 + ph * 1.05), 0, Math.PI * 2);
      ctx!.stroke();
    }

    // click bursts
    bursts = bursts.filter((b) => (b.life ?? 0) > 0);
    for (const b of bursts) {
      b.x += b.vx; b.y += b.vy; b.vx *= 0.96; b.vy *= 0.96;
      b.life = (b.life ?? 0) - 0.022;
      ctx!.globalAlpha = Math.max(0, b.life ?? 0);
      ctx!.fillStyle = b.c;
      ctx!.fillRect(b.x, b.y, b.s, b.s);
    }

    // HUD timecode
    const sec = (t / 1000) | 0;
    if (clock && sec !== lastClock) {
      lastClock = sec;
      const p2 = (n: number) => String(n).padStart(2, "0");
      clock.textContent = `${p2((sec / 3600) | 0)}:${p2(((sec / 60) | 0) % 60)}:${p2(sec % 60)}`;
    }

    ctx!.globalAlpha = 1;
    ctx!.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(frame);
  }

  function setRunning(on: boolean): void {
    if (reduced) return;
    art!.classList.toggle("is-paused", !on);
    if (on && !running) { running = true; raf = requestAnimationFrame(frame); }
    if (!on && running) { running = false; cancelAnimationFrame(raf); }
  }

  resize();
  if (reduced) {
    art.classList.add("is-still");
    // one static frame of sparks so the banner still feels alive
    ctx.globalCompositeOperation = "lighter";
    for (const p of sparks) { ctx.globalAlpha = p.a * 0.6; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); }
    new ResizeObserver(() => { resize(); }).observe(art);
    return;
  }

  new ResizeObserver(() => resize()).observe(art);
  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; setRunning(visible && !document.hidden); }, { threshold: 0.05 }).observe(art);
  document.addEventListener("visibilitychange", () => setRunning(visible && !document.hidden));
  setRunning(true);
}
