/** Interaction polish for the rest of the page: reveal on scroll, card tilt, pointer light on buttons. */
export function initSiteFx(): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;

  // pointer light on buttons (works with mouse and touch, costs nothing when idle)
  document.addEventListener("pointermove", (e) => {
    const b = (e.target as Element).closest?.<HTMLElement>(".button,.wallet-btn,.restart-btn,.share-btn,.roster-btn");
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty("--bx", `${e.clientX - r.left}px`);
    b.style.setProperty("--by", `${e.clientY - r.top}px`);
  }, { passive: true });

  if (reduced) return;

  // card tilt (mouse only)
  if (canHover) {
    const cards = document.querySelectorAll<HTMLElement>(".game-card,.nft-card,.dossier");
    cards.forEach((c) => {
      c.classList.add("fx-tilt");
      const max = c.classList.contains("dossier") ? 1.6 : 6;
      let raf = 0;
      c.addEventListener("pointermove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = c.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          c.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
          c.style.setProperty("--rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
          c.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
          c.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
          c.classList.add("is-tilting");
        });
      });
      c.addEventListener("pointerleave", () => { c.classList.remove("is-tilting"); c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
    });
  }

  // reveal on scroll (content stays visible if IntersectionObserver is missing)
  if (!("IntersectionObserver" in window)) return;
  const targets = Array.from(document.querySelectorAll<HTMLElement>(
    ".section-heading,.trailer-frame,.game-card,.nft-card,.dossier,.roadmap-item,.manifesto,.faq-item,.log-item,.comic-section .comic-ep,.lore-prologue"));
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  const vh = window.innerHeight;
  let i = 0;
  for (const t of targets) {
    if (t.getBoundingClientRect().top < vh) continue; // first fold stays untouched
    t.classList.add("fx-reveal");
    t.style.setProperty("--rd", `${(i++ % 4) * 0.07}s`);
    io.observe(t);
  }
  document.documentElement.classList.add("fx-on");
}
