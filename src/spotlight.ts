import "./spotlight.css";
import { GAMES, safeUrl } from "./games";

/**
 * SPOTLIGHT: the rotating banner at the top of the home page.
 * To add, remove or reorder a slide, edit the SLIDES list below. Nothing else needs to change.
 *
 *  tag     small label (NEW RELEASE, UPDATE, DID YOU KNOW?...)
 *  nav     short name shown in the progress bar at the bottom
 *  image   wide background, a file inside public/images (or a full path starting with "/")
 *  poster  optional tall image shown on the right (comic covers, cards...)
 *  pos     optional object-position for the background, e.g. "50% 20%"
 *  game    optional game id from games.ts: the button then opens that game's link and counts as a Play click
 *  href    link used when there is no "game"
 */
interface Slide {
  tag: string;
  nav: string;
  kicker: string;
  title: string;
  text: string;
  image: string;
  poster?: string;
  pos?: string;
  game?: string;
  href?: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    tag: "NEW RELEASE",
    nav: "OWL: GRIDBREAKERS",
    kicker: "TURN-BASED RPG // BROWSER PROTOTYPE",
    title: "OWL: GRIDBREAKERS",
    text: "Build a squad of three Operators, fight through five sectors and unlock the legendary Aeon and Orion.",
    image: "banner-owl.webp",
    pos: "50% 30%",
    game: "gridbreakers",
    cta: "PLAY NOW",
  },
  {
    tag: "THE SAGA",
    nav: "THE OBSIDIAN SANCTUM",
    kicker: "AI WORLD OWL // VOL. 01",
    title: "THE OBSIDIAN SANCTUM",
    text: "The graphic novel series. Episodes 001 to 004. Every choice is a thread.",
    image: "hero-keyart.webp",
    poster: "hq/p0-cover.webp",
    href: "#comic",
    cta: "READ THE SAGA",
  },
  {
    tag: "IN THE ARCADE",
    nav: "BOMBER.IDLE",
    kicker: "GRID BOMBER + IDLE",
    title: "BOMBER.IDLE",
    text: "Send your Operators into the field to plant bombs, blow open chests and farm $BOMBERSI while you are away.",
    image: "banner-bomber.webp",
    game: "bomber-idle",
    cta: "PLAY BOMBER.IDLE",
  },
  {
    tag: "IN THE ARCADE",
    nav: "SLITHER.IDLE",
    kicker: "SNAKE + IDLE",
    title: "SLITHER.IDLE",
    text: "Collect coins to grow, take down rivals, or let the Auto-Bot play while you are away.",
    image: "banner-slither.webp",
    pos: "68% 50%",
    game: "slither-idle",
    cta: "PLAY SLITHER.IDLE",
  },
  {
    tag: "TRAILER",
    nav: "OFFICIAL TRAILER",
    kicker: "AI WORLD OWL // OFFICIAL",
    title: "WATCH THE TRAILER",
    text: "Step into the Grid. Vol. 01, The Obsidian Sanctum.",
    image: "/trailer/poster.jpg",
    href: "#trailer",
    cta: "WATCH NOW",
  },
  {
    tag: "DID YOU KNOW?",
    nav: "EIGHT LEGENDS",
    kicker: "THE UNIVERSE OF AI WORLD OWL",
    title: "EIGHT LEGENDS. ONE GRID.",
    text: "Meet Jax, Kira, Lyra, Kai, Titan and Vex, and the legendary Aeon and Orion.",
    image: "hero-keyart-hd.webp",
    pos: "50% 40%",
    href: "#lore",
    cta: "MEET THE LEGENDS",
  },
];

const DURATION = 7000; // ms per slide

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const asset = (file: string) => (file.startsWith("/") ? file : `${import.meta.env.BASE_URL}images/${file}`);

function linkFor(s: Slide): { href: string; newTab: boolean } {
  if (s.game) {
    const g = GAMES.find((x) => x.id === s.game);
    const href = g ? safeUrl(g.url) : null;
    if (href) return { href, newTab: true };
    return { href: `#game-${s.game}`, newTab: false };
  }
  return { href: s.href ?? "#games", newTab: false };
}

export function spotlightMarkup(): string {
  const n = SLIDES.length;
  const slides = SLIDES.map((s, i) => {
    const { href, newTab } = linkFor(s);
    const first = i === 0;
    return `
    <article class="sp-slide${first ? " is-active" : ""}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${n}"${first ? "" : " inert"}>
      <div class="sp-bg"><img src="${esc(asset(s.image))}" alt="" width="1920" height="1080" ${first ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${s.pos ? ` style="object-position:${esc(s.pos)}"` : ""} /></div>
      <div class="sp-shade"></div>
      ${s.poster ? `<div class="sp-poster"><img src="${esc(asset(s.poster))}" alt="${esc(s.title)} cover" loading="lazy" decoding="async" /></div>` : ""}
      <div class="sp-content">
        <span class="sp-tag"><i></i>${esc(s.tag)}</span>
        <div class="sp-kicker">${esc(s.kicker)}</div>
        <h2 class="sp-title">${esc(s.title)}</h2>
        <p class="sp-text">${esc(s.text)}</p>
        <div class="sp-cta"><a class="button button-primary" href="${esc(href)}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ""}${s.game ? ` data-play="${esc(s.game)}"` : ""}>${esc(s.cta)} <span>↗</span></a></div>
      </div>
    </article>`;
  }).join("");

  const segs = SLIDES.map(
    (s, i) => `<button class="sp-seg${i === 0 ? " is-active" : ""}" type="button" data-i="${i}" aria-label="Go to slide ${i + 1}: ${esc(s.nav)}"><b>${String(i + 1).padStart(2, "0")}</b><span>${esc(s.nav)}</span></button>`
  ).join("");

  return `
      <section class="spotlight" id="spotlight" aria-roledescription="carousel" aria-label="Featured releases and news">
        <h1 class="sp-sr">AI Studios Games: Play Beyond the Grid</h1>
        <div class="sp-viewport">
          ${slides}
          <button class="sp-arrow sp-prev" type="button" aria-label="Previous slide">‹</button>
          <button class="sp-arrow sp-next" type="button" aria-label="Next slide">›</button>
        </div>
        <div class="sp-bar" style="--n:${n}">
          ${segs}
          <button class="sp-pause" type="button" aria-label="Pause slideshow">❚❚</button>
        </div>
      </section>`;
}

export function initSpotlight(): void {
  const root = document.querySelector<HTMLElement>("#spotlight");
  if (!root) return;
  const slides = [...root.querySelectorAll<HTMLElement>(".sp-slide")];
  const segs = [...root.querySelectorAll<HTMLButtonElement>(".sp-seg")];
  const pauseBtn = root.querySelector<HTMLButtonElement>(".sp-pause")!;
  const viewport = root.querySelector<HTMLElement>(".sp-viewport")!;
  const n = slides.length;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let index = 0;
  let elapsed = 0;
  let last = performance.now();
  let userPaused = reduceMotion;
  let hovering = false;
  let focused = false;
  let inView = true;
  let tabHidden = document.hidden;

  const isPaused = () => userPaused || hovering || focused || !inView || tabHidden;

  function paint(): void {
    segs.forEach((seg, i) => seg.style.setProperty("--p", i < index ? "1" : i === index ? String(Math.min(1, elapsed / DURATION)) : "0"));
  }

  function go(next: number): void {
    index = (next + n) % n;
    elapsed = 0;
    slides.forEach((s, i) => {
      s.classList.toggle("is-active", i === index);
      s.toggleAttribute("inert", i !== index);
    });
    segs.forEach((seg, i) => {
      seg.classList.toggle("is-active", i === index);
      seg.toggleAttribute("aria-current", i === index);
    });
    paint();
  }

  function tick(now: number): void {
    const dt = now - last;
    last = now;
    if (!isPaused()) {
      elapsed += dt;
      if (elapsed >= DURATION) go(index + 1);
      else paint();
    }
    requestAnimationFrame(tick);
  }

  function setPaused(value: boolean): void {
    userPaused = value;
    pauseBtn.textContent = value ? "▶" : "❚❚";
    pauseBtn.setAttribute("aria-label", value ? "Play slideshow" : "Pause slideshow");
  }

  root.querySelector(".sp-prev")!.addEventListener("click", () => go(index - 1));
  root.querySelector(".sp-next")!.addEventListener("click", () => go(index + 1));
  segs.forEach((seg) => seg.addEventListener("click", () => go(Number(seg.dataset.i))));
  pauseBtn.addEventListener("click", () => setPaused(!userPaused));

  root.addEventListener("mouseenter", () => (hovering = true));
  root.addEventListener("mouseleave", () => (hovering = false));
  root.addEventListener("focusin", () => (focused = true));
  root.addEventListener("focusout", () => (focused = false));
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(index - 1);
    else if (e.key === "ArrowRight") go(index + 1);
  });
  document.addEventListener("visibilitychange", () => (tabHidden = document.hidden));
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => { inView = entries[0]?.isIntersecting ?? true; }, { threshold: 0.25 }).observe(root);
  }

  // swipe on touch screens
  let startX = 0;
  let startY = 0;
  viewport.addEventListener("pointerdown", (e) => { startX = e.clientX; startY = e.clientY; });
  viewport.addEventListener("pointerup", (e) => {
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - startY) * 1.5) go(index + (dx < 0 ? 1 : -1));
  });

  setPaused(userPaused);
  go(0);
  requestAnimationFrame(tick);
}
