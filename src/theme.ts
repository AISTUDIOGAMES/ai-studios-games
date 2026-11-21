/** Neon (default, dark) / Desert Marble (light) theme switch. The choice is remembered on this device.
 *  Desert Marble is a separate stylesheet loaded on demand, so the default Neon page ships without it. */
import desertCssUrl from "./desert-theme.css?url";

const KEY = "aiowl-theme-v2";
const DESERT_LINK_ID = "desert-theme-css";
type Theme = "neon" | "desert";

function read(): Theme {
  try { return localStorage.getItem(KEY) === "desert" ? "desert" : "neon"; } catch { return "neon"; }
}

function setDesertStylesheet(on: boolean): void {
  const existing = document.getElementById(DESERT_LINK_ID);
  if (on && !existing) {
    const link = document.createElement("link");
    link.id = DESERT_LINK_ID;
    link.rel = "stylesheet";
    link.href = desertCssUrl;
    document.head.appendChild(link); // appended last, so it overrides the base/neon CSS
  } else if (!on && existing) {
    existing.remove();
  }
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "desert" ? "light" : "dark";
  setDesertStylesheet(theme === "desert");
  const btn = document.querySelector<HTMLButtonElement>("#themeToggle");
  if (btn) btn.setAttribute("aria-pressed", String(theme === "desert"));
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "desert" ? "#EEE7D9" : "#090B10";
}

// Apply as early as possible to avoid a flash of the wrong theme.
apply(read());

export function initThemeToggle(): void {
  const btn = document.querySelector<HTMLButtonElement>("#themeToggle");
  apply(read());
  btn?.addEventListener("click", () => {
    const next: Theme = document.documentElement.dataset.theme === "desert" ? "neon" : "desert";
    try { localStorage.setItem(KEY, next); } catch { /* storage may be disabled */ }
    apply(next);
  });
}
