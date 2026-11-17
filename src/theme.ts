/** Light (Desert Marble, default) / dark theme switch. The choice is remembered on this device. */
const KEY = "aiowl-theme";
type Theme = "light" | "dark";

function read(): Theme {
  try { return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; } catch { return "light"; }
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const btn = document.querySelector<HTMLButtonElement>("#themeToggle");
  if (btn) btn.setAttribute("aria-pressed", String(theme === "dark"));
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#14110d" : "#EEE7D9";
}

// Apply as early as possible to avoid a flash of the wrong theme.
apply(read());

export function initThemeToggle(): void {
  const btn = document.querySelector<HTMLButtonElement>("#themeToggle");
  apply(read());
  btn?.addEventListener("click", () => {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch { /* storage may be disabled */ }
    apply(next);
  });
}
