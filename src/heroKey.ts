/**
 * Cinematic hero key art.
 * The slow zoom, the golden threads and the dust are pure CSS. This file only adds:
 *  - a soft pointer parallax (desktop with a mouse, and only if motion is allowed),
 *  - pausing every animation while the hero is off screen or the tab is hidden.
 */
export function initHeroKey(): void {
  const art = document.querySelector<HTMLElement>("#heroArt.hero-key");
  if (!art) return;

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      art.classList.toggle("is-paused", !entry.isIntersecting);
    }).observe(art);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) art.classList.add("is-paused");
  });

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  if (reduced || !canHover) return;

  const hero = art.closest<HTMLElement>(".hero") ?? art;
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

  const tick = (): void => {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    art.style.setProperty("--px", `${cx.toFixed(2)}px`);
    art.style.setProperty("--py", `${cy.toFixed(2)}px`);
    raf = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(tick) : 0;
  };
  const kick = (): void => { if (!raf) raf = requestAnimationFrame(tick); };

  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * -18;
    ty = ((e.clientY - r.top) / r.height - 0.5) * -10;
    kick();
  });
  hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
}
