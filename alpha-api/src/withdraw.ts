import type { Env } from "./env";
import { sha256Hex, audit } from "./util";

// Pedido de saque do BOMBERI. Debita o saldo do ledger e cria o saque em "pending" (fila do payout.mjs).
// Nada e enviado on-chain aqui. Desligado em producao.
// As tres instrucoes rodam em um lote atomico (db.batch): ou o saldo e debitado e o saque entra, ou nada muda.

type Result = { status: number; body: unknown };

const UNIT = 10000;                // 4 casas decimais
const MIN_WITHDRAW = 10 * UNIT;    // 10 tokens
const MAX_WITHDRAW = 5000 * UNIT;  // 5.000 tokens por pedido
const DAILY_CAP = 10000 * UNIT;    // 10.000 tokens por carteira em 24h
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BODY = 1024;
const IDEM_RE = /^[A-Za-z0-9_-]{8,64}$/;

async function sessionWallet(req: Request, env: Env, now: number): Promise<string | null> {
  const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("Authorization") ?? "");
  if (!m) return null;
  const row = await env.DB.prepare("SELECT wallet, expires_at FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(m[1])).first<{ wallet: string; expires_at: number }>();
  if (!row || row.expires_at < now) return null;
  return row.wallet;
}

export async function requestWithdraw(req: Request, env: Env, now: number): Promise<Result> {
  if (env.APP_ENV === "prod") return { status: 404, body: { error: "not found" } };
  if (req.method !== "POST") return { status: 405, body: { error: "metodo nao permitido" } };

  const wallet = await sessionWallet(req, env, now);
  if (!wallet) return { status: 401, body: { error: "entre com a carteira" } };

  const text = await req.text();
  if (text.length > MAX_BODY) return { status: 400, body: { error: "corpo invalido" } };
  let b: Record<string, unknown>;
  try {
    const v = JSON.parse(text || "{}");
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("corpo");
    b = v as Record<string, unknown>;
  } catch {
    return { status: 400, body: { error: "corpo invalido" } };
  }

  const amount = b.amount;
  const units = typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? Math.round(amount * UNIT) : 0;
  if (!Number.isSafeInteger(units) || units < MIN_WITHDRAW || units > MAX_WITHDRAW) {
    return { status: 400, body: { error: "quantidade fora do limite (minimo 10, maximo 5.000 por pedido)" } };
  }
  if (typeof b.idem !== "string" || !IDEM_RE.test(b.idem)) {
    return { status: 400, body: { error: "chave de idempotencia invalida" } };
  }
  const idem = b.idem;
  const db = env.DB;

  // Mesmo pedido de novo: devolve o que ja foi registrado, sem debitar outra vez.
  const prev = await db.prepare("SELECT wallet, status, amount_units FROM withdrawals WHERE idempotency_key = ?")
    .bind(idem).first<{ wallet: string; status: string; amount_units: number }>();
  if (prev) {
    if (prev.wallet !== wallet) return { status: 409, body: { error: "chave ja usada" } };
    return { status: 200, body: { ok: true, duplicate: true, status: prev.status, amount: prev.amount_units / UNIT } };
  }

  // Limite diario por carteira (saques que nao falharam nas ultimas 24h).
  const day = await db
    .prepare("SELECT COALESCE(SUM(amount_units), 0) AS total FROM withdrawals WHERE wallet = ? AND created_at >= ? AND status <> 'failed'")
    .bind(wallet, now - DAY_MS).first<{ total: number }>();
  if ((day?.total ?? 0) + units > DAILY_CAP) return { status: 429, body: { error: "limite diario de saque atingido" } };

  // Lote atomico. As duas primeiras gravam so se o saldo atual cobre o valor; a terceira debita.
  const enough = "COALESCE((SELECT units FROM balances WHERE wallet = ?), 0) >= ?";
  let debited = 0;
  try {
    const out = await db.batch([
      db
        .prepare(`INSERT INTO withdrawals (wallet, amount_units, status, idempotency_key, created_at, updated_at) SELECT ?, ?, 'pending', ?, ?, ? WHERE ${enough}`)
        .bind(wallet, units, idem, now, now, wallet, units),
      db
        .prepare(`INSERT INTO ledger (wallet, delta_units, reason, idempotency_key, at) SELECT ?, ?, 'withdraw', ?, ? WHERE ${enough}`)
        .bind(wallet, -units, "wd:" + idem, now, wallet, units),
      db
        .prepare("UPDATE balances SET units = units - ?, updated_at = ? WHERE wallet = ? AND units >= ?")
        .bind(units, now, wallet, units),
    ]);
    debited = (out[2] as { meta?: { changes?: number } }).meta?.changes ?? 0;
  } catch {
    // Chave repetida em corrida ou erro de banco: o lote inteiro foi desfeito.
    return { status: 409, body: { error: "pedido ja registrado ou em conflito, tente de novo" } };
  }
  if (debited !== 1) return { status: 402, body: { error: "saldo insuficiente" } };

  const bal = await db.prepare("SELECT units FROM balances WHERE wallet = ?").bind(wallet).first<{ units: number }>();
  await audit(db, wallet, "withdraw.request", { units, idem }, now);
  return {
    status: 200,
    body: { ok: true, duplicate: false, status: "pending", amount: units / UNIT, balance: (bal?.units ?? 0) / UNIT },
  };
}
