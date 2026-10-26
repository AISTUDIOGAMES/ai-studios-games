// Intensidade dos efeitos visuais (0 = baixo, 1 = médio, 2 = alto).
// É uma preferência do aparelho: fica numa chave própria e NÃO faz parte do save do jogo (economia e progresso não são tocados).
// Tudo é lido de forma preguiçosa e dentro de try/catch: sem localStorage (modo privado, testes) o jogo segue com o padrão.
export type FxLevel = 0 | 1 | 2;
export const FX_LABELS = ["Baixo", "Médio", "Alto"] as const;
export const FX_KEY = "bomber-idle:fx";
export const SHAKE_MULT: readonly number[] = [0.4, 0.75, 1];
export const SPARK_MULT: readonly number[] = [0.5, 0.8, 1];

let level: FxLevel | null = null;

function defaultLevel(): FxLevel {
  try { return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 2; } catch { return 2; }
}
const valid = (v: unknown): v is FxLevel => v === 0 || v === 1 || v === 2;

export function getFxLevel(): FxLevel {
  if (level !== null) return level;
  let stored: unknown = null;
  try { stored = Number(localStorage.getItem(FX_KEY) ?? "x"); } catch { /* sem armazenamento */ }
  level = valid(stored) ? stored : defaultLevel();
  return level;
}

export function setFxLevel(v: number): FxLevel {
  level = valid(v) ? v : 2;
  try { localStorage.setItem(FX_KEY, String(level)); } catch { /* sem armazenamento: vale só nesta sessão */ }
  return level;
}

/** Só para testes: esquece o valor em memória. */
export function resetFxLevelCache() { level = null; }
