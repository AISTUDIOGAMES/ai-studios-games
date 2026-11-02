import type { Env } from "./env";
import { audit } from "./util";

// Fila de saques do BOMBERI, no formato que o payout.mjs espera.
// - Protegida por X-Admin-Key (segredo do Worker: `wrangler secret put ADMIN_KEY`). Nunca no repositorio.
// - Desligada em producao e quando ADMIN_KEY nao esta definida (responde 404).
// - Quem cria os saques e o jogo (rota de saque do jogador, ainda nao escrita). Aqui so ha transicoes de status.
// - Cada transicao e condicional (WHERE status = ...): so uma execucao consegue pegar um saque. Isso impede pagamento duplo.

type Result = { status: number; body: unknown };

const MAX_BODY_BYTES = 2048;
const ACTOR = "payout-script";
// Assinatura de transacao Solana (base58, 64 bytes -> ~87-88 caracteres).
const SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;

type Row = { id: number; wallet: string; amount_units: number; status: string };

function adminKey(env: Env): string | null {
  const k = (env as unknown as { ADMIN_KEY?: unknown }).ADMIN_KEY;
  return typeof k === "string" && k.length >= 32 ? k : null;
}

/** Comparacao sem atalho por posicao (evita vazar o segredo pelo tempo de resposta). */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const v = JSON.parse(text || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const positiveInt = (v: unknown): number | null =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;

/** Saida no formato do payout.mjs: amount em tokens (com decimais), nao em unidades. */
const toApi = (r: Row) => ({ id: r.id, wallet: r.wallet, amount: r.amount_units / 10000 });

const bad = (msg: string): Result => ({ status: 400, body: { error: msg } });

export async function adminPayouts(req: Request, env: Env, path: string, now: number): Promise<Result | null> {
  if (!path.startsWith("/admin/")) return null;

  const key = adminKey(env);
  if (env.APP_ENV === "prod" || !key) return { status: 404, body: { error: "not found" } };
  if (!sameSecret(req.headers.get("X-Admin-Key") ?? "", key)) return { status: 403, body: { error: "sem permissao" } };

  const db = env.DB;

  if (path === "/admin/queue") {
    if (req.method !== "GET") return { status: 405, body: { error: "metodo nao permitido" } };
    const rows = await db
      .prepare("SELECT id, wallet, amount_units, status FROM withdrawals WHERE status IN ('pending','review','processing') ORDER BY id LIMIT 500")
      .all<Row>();
    const list = rows.results ?? [];
    return {
      status: 200,
      body: {
        withdrawals: list.filter((r) => r.status === "pending").map(toApi),
        review: list.filter((r) => r.status === "review").map(toApi),
        processing: list.filter((r) => r.status === "processing").map(toApi),
        // Ainda nao ha fonte de queima automatica: a tesouraria nao queima nada por este caminho.
        burnPending: 0,
      },
    };
  }

  if (req.method !== "POST") return { status: 405, body: { error: "metodo nao permitido" } };
  const b = await readBody(req);
  if (!b) return bad("corpo invalido");

  if (path === "/admin/approve") {
    const id = positiveInt(b.id);
    if (!id) return bad("id invalido");
    const r = await db
      .prepare("UPDATE withdrawals SET status = 'pending', updated_at = ? WHERE id = ? AND status = 'review'")
      .bind(now, id).run();
    if ((r.meta.changes ?? 0) !== 1) return { status: 409, body: { error: "saque nao esta em revisao" } };
    await audit(db, ACTOR, "payout.approve", { id }, now);
    return { status: 200, body: { ok: true } };
  }

  if (path === "/admin/claim") {
    const id = positiveInt(b.id);
    if (!id) return bad("id invalido");
    // Reserva antes do envio: se outra execucao ja pegou, volta 409 e o script ignora.
    const r = await db
      .prepare("UPDATE withdrawals SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'pending'")
      .bind(now, id).run();
    if ((r.meta.changes ?? 0) !== 1) return { status: 409, body: { error: "ja reservado ou nao pendente" } };
    await audit(db, ACTOR, "payout.claim", { id }, now);
    return { status: 200, body: { ok: true } };
  }

  if (path === "/admin/done") {
    const id = positiveInt(b.id);
    if (!id) return bad("id invalido");
    if (typeof b.sig !== "string" || !SIG_RE.test(b.sig)) return bad("assinatura invalida");
    const r = await db
      .prepare("UPDATE withdrawals SET status = 'done', sig = ?, updated_at = ? WHERE id = ? AND status = 'processing'")
      .bind(b.sig, now, id).run();
    if ((r.meta.changes ?? 0) !== 1) return { status: 409, body: { error: "saque nao esta em processamento" } };
    await audit(db, ACTOR, "payout.done", { id, sig: b.sig }, now);
    return { status: 200, body: { ok: true } };
  }

  if (path === "/admin/failed") {
    const id = positiveInt(b.id);
    if (!id) return bad("id invalido");
    // So use quando a transacao comprovadamente NAO saiu. Nao ha ledger de saldo neste modelo:
    // o operador decide o que fazer com o saque marcado como failed.
    const r = await db
      .prepare("UPDATE withdrawals SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'processing'")
      .bind(now, id).run();
    if ((r.meta.changes ?? 0) !== 1) return { status: 409, body: { error: "saque nao esta em processamento" } };
    await audit(db, ACTOR, "payout.failed", { id }, now);
    return { status: 200, body: { ok: true } };
  }

  if (path === "/admin/burned") {
    const amount = b.amount;
    const units = typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? Math.round(amount * 10000) : 0;
    if (!Number.isSafeInteger(units) || units <= 0) return bad("quantidade invalida");
    if (typeof b.sig !== "string" || !SIG_RE.test(b.sig)) return bad("assinatura invalida");
    // sig unica: registrar a mesma queima duas vezes nao duplica o registro.
    const r = await db
      .prepare("INSERT INTO burns (amount_units, sig, at) VALUES (?, ?, ?) ON CONFLICT(sig) DO NOTHING")
      .bind(units, b.sig, now).run();
    const duplicate = (r.meta.changes ?? 0) !== 1;
    if (!duplicate) await audit(db, ACTOR, "payout.burned", { amount, sig: b.sig }, now);
    return { status: 200, body: { ok: true, duplicate } };
  }

  return { status: 404, body: { error: "not found" } };
}
