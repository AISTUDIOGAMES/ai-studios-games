import bs58 from "bs58";

/** Endereco Solana valido: base58 que decodifica para exatamente 32 bytes. */
export function isWalletAddress(s: unknown): s is string {
  if (typeof s !== "string" || s.length < 32 || s.length > 44) return false;
  try { return bs58.decode(s).length === 32; } catch { return false; }
}

export function randomHex(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Lista de carteiras (separadas por virgula) como conjunto de enderecos validos. */
export function parseWalletList(raw: string | undefined): Set<string> {
  return new Set((raw ?? "").split(",").map((w) => w.trim()).filter(isWalletAddress));
}

/** Limite de taxa por janela fixa, guardado no D1 (vale para todas as instancias do Worker). */
export async function hitRateLimit(
  db: import("./env").D1Database, key: string, limit: number, windowSec: number, nowMs: number
): Promise<boolean> {
  const win = Math.floor(nowMs / 1000 / windowSec);
  const k = `${key}:${win}`;
  await db.prepare("INSERT INTO rate_limits (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1").bind(k).run();
  const row = await db.prepare("SELECT n FROM rate_limits WHERE k = ?").bind(k).first<{ n: number }>();
  return (row?.n ?? 0) <= limit;
}

export async function audit(db: import("./env").D1Database, actor: string, action: string, detail: unknown, nowMs: number) {
  await db.prepare("INSERT INTO audit_log (at, actor, action, detail) VALUES (?, ?, ?, ?)")
    .bind(nowMs, actor, action, JSON.stringify(detail ?? null)).run();
}
