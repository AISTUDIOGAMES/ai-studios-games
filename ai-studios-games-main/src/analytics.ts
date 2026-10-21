import { ANALYTICS_DOMAIN } from "./config";

type Plausible = ((event: string, options?: { props?: Record<string, string> }) => void) & { q?: unknown[] };
declare global { interface Window { plausible?: Plausible } }

/** Loads Plausible only when ANALYTICS_DOMAIN is set and the visitor has not enabled Do-Not-Track. */
export function initAnalytics(): void {
  if (!ANALYTICS_DOMAIN || navigator.doNotTrack === "1") return;
  window.plausible =
    window.plausible ||
    (((...args: unknown[]) => {
      (window.plausible!.q = window.plausible!.q || []).push(args);
    }) as Plausible);
  const s = document.createElement("script");
  s.defer = true;
  s.dataset.domain = ANALYTICS_DOMAIN;
  s.src = "https://plausible.io/js/script.js";
  document.head.appendChild(s);
}

/** Custom event, for example track("Play Click", { game: "bomber-idle" }). Does nothing without analytics. */
export function track(name: string, props?: Record<string, string>): void {
  try { window.plausible?.(name, props ? { props } : undefined); } catch { /* analytics must never break the page */ }
}
