import type { Env } from "./env";
import { isWalletAddress, parseWalletList, sha256Hex, audit } from "./util";

// Credito de saldo do BOMBERI, so para administradores logados com a carteira.
// Desligado em producao. Cada lancamento tem chave de idempotencia (nao credita duas vezes).

type Result = { status: number; body: unknown };
const MAX_CREDIT_UNITS = 10_000 * 10_000; // 10.000 tokens por lancamento
const IDEM_RE = /^[A-Za-z0-9_-]{8,64}$/;

async function sessionWallet(req: Request, env: Env, now: number): Promise<string | null> {
  const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("Authorization") ?? "");
  if (!m) return null;
  const row = await env.DB.prepare("SELECT wallet, expires_at FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(m[1])).first<{ wallet: string; expires_at: number }>();
  if (!row || row.expires_at < now) return null;
  return row.wallet;
}

export async function adminCredit(req: Request, env: Env, now: number): Promise<Result> {
  if (env.APP_ENV === "prod") return { status: 404, body: { error: "not found" } };
  if (req.method !== "POST") return { status: 405, body: { error: "metodo nao permitido" } };

  const actor = await sessionWallet(req, env, now);
  if (!actor) return { status: 401, body: { error: "entre com a carteira" } };
  if (!parseWalletList(env.ADMIN_WALLETS).has(actor)) return { status: 403, body: { error: "sem permissao" } };

  let b: Record<string, unknown>;
  try {
    const v = JSON.parse(await req.text());
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("corpo");
    b = v as Record<string, unknown>;
  } catch {
    return { status: 400, body: { error: "corpo invalido" } };
  }

  if (!isWalletAddress(b.wallet)) return { status: 400, body: { error: "carteira invalida" } };
  const wallet = b.wallet;
  const amount = b.amount;
  const units = typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? Math.round(amount * 10000) : 0;
  if (!Number.isSafeInteger(units) || units <= 0 || units > MAX_CREDIT_UNITS) {
    return { status: 400, body: { error: "quantidade invalida (maximo 10.000 por lancamento)" } };
  }
  if (typeof b.idem !== "string" || !IDEM_RE.test(b.idem)) return { status: 400, body: { error: "chave de idempotencia invalida" } };

  // Primeiro o lancamento: se a chave ja existe, nada e creditado de novo.
  const ins = await env.DB.prepare(
    "INSERT INTO ledger (wallet, delta_units, reason, idempotency_key, at) VALUES (?, ?, 'admin_credit', ?, ?) ON CONFLICT(idempotency_key) DO NOTHING",
  ).bind(wallet, units, b.idem, now).run();
  if ((ins.meta.changes ?? 0) !== 1) return { status: 200, body: { ok: true, duplicate: true } };

  await env.DB.prepare(
    "INSERT INTO balances (wallet, units, updated_at) VALUES (?, ?, ?) ON CONFLICT(wallet) DO UPDATE SET units = units + excluded.units, updated_at = excluded.updated_at",
  ).bind(wallet, units, now).run();

  await audit(env.DB, actor, "ledger.credit", { wallet, units, idem: b.idem }, now);
  const bal = await env.DB.prepare("SELECT units FROM balances WHERE wallet = ?").bind(wallet).first<{ units: number }>();
  return { status: 200, body: { ok: true, duplicate: false, balance: (bal?.units ?? 0) / 10000 } };
}
