import { COMIC_PAGES } from "./comic";

/** On-site reader for the graphic novel: any element with data-read="<page index>" opens it. */
export function initComicReader(imgUrl: (f: string) => string): void {
  const triggers = () => document.querySelectorAll<HTMLElement>("[data-read]");
  if (!triggers().length) return;

  const root = document.createElement("div");
  root.className = "cr";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "AI World Owl, Vol. 01 reader");
  root.innerHTML = `
    <div class="cr-bar">
      <span class="cr-title">AI WORLD OWL <b>/</b> VOL. 01</span>
      <span class="cr-label" id="crLabel" aria-live="polite"></span>
      <button class="cr-close" type="button" aria-label="Close reader">✕</button>
    </div>
    <div class="cr-stage">
      <button class="cr-nav cr-prev" type="button" aria-label="Previous page">‹</button>
      <img class="cr-img" alt="" decoding="async" />
      <button class="cr-nav cr-next" type="button" aria-label="Next page">›</button>
    </div>
    <div class="cr-foot"><span id="crCount"></span><div class="cr-dots"></div></div>`;
  document.body.appendChild(root);

  const image = root.querySelector<HTMLImageElement>(".cr-img")!;
  const label = root.querySelector<HTMLElement>("#crLabel")!;
  const count = root.querySelector<HTMLElement>("#crCount")!;
  const dots = root.querySelector<HTMLElement>(".cr-dots")!;
  const prev = root.querySelector<HTMLButtonElement>(".cr-prev")!;
  const next = root.querySelector<HTMLButtonElement>(".cr-next")!;
  dots.innerHTML = COMIC_PAGES.map((p, i) => `<button type="button" data-go="${i}" aria-label="${p.label}"></button>`).join("");

  let cur = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number) => {
    cur = Math.max(0, Math.min(COMIC_PAGES.length - 1, i));
    const p = COMIC_PAGES[cur];
    image.classList.add("is-loading");
    image.onload = () => image.classList.remove("is-loading");
    image.src = imgUrl(p.file);
    image.alt = p.alt;
    label.textContent = p.label;
    count.textContent = `${cur + 1} / ${COMIC_PAGES.length}`;
    prev.disabled = cur === 0;
    next.disabled = cur === COMIC_PAGES.length - 1;
    dots.querySelectorAll("button").forEach((b, k) => b.classList.toggle("on", k === cur));
    root.querySelector(".cr-stage")!.scrollTop = 0;
    const n = COMIC_PAGES[cur + 1];
    if (n) new Image().src = imgUrl(n.file); // warm the next page
  };
  const open = (i: number, from: HTMLElement | null) => {
    opener = from;
    root.hidden = false;
    document.documentElement.classList.add("cr-lock");
    show(i);
    root.querySelector<HTMLButtonElement>(".cr-close")!.focus();
  };
  const close = () => {
    root.hidden = true;
    document.documentElement.classList.remove("cr-lock");
    opener?.focus();
  };

  document.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("[data-read]");
    if (t) { e.preventDefault(); open(Number(t.dataset.read) || 0, t); }
  });
  root.querySelector(".cr-close")!.addEventListener("click", close);
  prev.addEventListener("click", () => show(cur - 1));
  next.addEventListener("click", () => show(cur + 1));
  dots.addEventListener("click", (e) => { const b = (e.target as Element).closest<HTMLElement>("[data-go]"); if (b) show(Number(b.dataset.go)); });
  root.addEventListener("click", (e) => { if (e.target === root || (e.target as Element).classList.contains("cr-stage")) close(); });
  document.addEventListener("keydown", (e) => {
    if (root.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(cur + 1);
    else if (e.key === "ArrowLeft") show(cur - 1);
    else if (e.key === "Tab") { // keep focus inside the dialog
      const f = Array.from(root.querySelectorAll<HTMLElement>("button:not([disabled])"));
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let sx = 0, sy = 0;
  root.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  root.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });
}
