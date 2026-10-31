import type { Env } from "./env";
import { isWalletAddress, parseWalletList, randomHex, sha256Hex, hitRateLimit, audit } from "./util";
import { NONCE_TTL_MS, SESSION_TTL_MS, loginMessage, verifyWalletSignature } from "./auth";

const VERSION_TAG = "0.1.0";
const MAX_BODY_BYTES = 4096;

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOW_ORIGIN ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const h: Record<string, string> = { Vary: "Origin", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization" };
  if (origin && allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function json(req: Request, env: Env, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders(req, env) },
  });
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const v = JSON.parse(text || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch { return null; }
}

/** Sessao valida -> carteira. Sem sessao valida, null. */
async function sessionWallet(req: Request, env: Env, now: number): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const m = /^Bearer ([0-9a-f]{64})$/.exec(auth);
  if (!m) return null;
  const row = await env.DB.prepare("SELECT wallet, expires_at FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(m[1])).first<{ wallet: string; expires_at: number }>();
  if (!row || row.expires_at < now) return null;
  return row.wallet;
}

export async function handle(req: Request, env: Env, now: number = Date.now()): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req, env) });

  if (req.method === "GET" && path === "/health") {
    return json(req, env, 200, { ok: true, env: env.APP_ENV, cluster: env.SOLANA_CLUSTER, version: env.VERSION ?? VERSION_TAG });
  }

  if (req.method === "POST" && path === "/auth/nonce") {
    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await hitRateLimit(env.DB, `nonce:${ip}`, 10, 60, now))) return json(req, env, 429, { error: "muitas tentativas, aguarde" });
    const body = await readJson(req);
    if (!body) return json(req, env, 400, { error: "corpo invalido" });
    if (!isWalletAddress(body.wallet)) return json(req, env, 400, { error: "carteira invalida" });
    const wallet = body.wallet;
    if (!(await hitRateLimit(env.DB, `nonce-w:${wallet}`, 5, 60, now))) return json(req, env, 429, { error: "muitas tentativas, aguarde" });

    const nonce = randomHex(16);
    const expiresAt = now + NONCE_TTL_MS;
    const message = loginMessage(wallet, nonce, expiresAt);
    await env.DB.prepare("DELETE FROM nonces WHERE expires_at < ?").bind(now).run();
    await env.DB.prepare("INSERT INTO nonces (nonce, wallet, message, expires_at, used) VALUES (?, ?, ?, ?, 0)")
      .bind(nonce, wallet, message, expiresAt).run();
    return json(req, env, 200, { nonce, message, expiresAt });
  }

  if (req.method === "POST" && path === "/auth/verify") {
    const body = await readJson(req);
    if (!body || !isWalletAddress(body.wallet) || typeof body.nonce !== "string") return json(req, env, 400, { error: "corpo invalido" });
    const wallet = body.wallet;
    const row = await env.DB.prepare("SELECT message, expires_at, used FROM nonces WHERE nonce = ? AND wallet = ?")
      .bind(body.nonce, wallet).first<{ message: string; expires_at: number; used: number }>();
    if (!row || row.used !== 0 || row.expires_at < now) return json(req, env, 401, { error: "desafio invalido ou expirado" });
    // A mensagem vem do servidor (guardada no nonce), nunca do cliente.
    if (!verifyWalletSignature(wallet, row.message, body.signature)) return json(req, env, 401, { error: "assinatura invalida" });
    // Consumo atomico: so uma requisicao consegue marcar o nonce como usado (sem replay, sem corrida).
    const consumed = await env.DB.prepare("UPDATE nonces SET used = 1 WHERE nonce = ? AND used = 0").bind(body.nonce).run();
    if ((consumed.meta.changes ?? 0) !== 1) return json(req, env, 401, { error: "desafio ja usado" });

    const token = randomHex(32);
    const expiresAt = now + SESSION_TTL_MS;
    await env.DB.prepare("INSERT INTO sessions (token_hash, wallet, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(await sha256Hex(token), wallet, expiresAt, now).run();
    const isAdmin = parseWalletList(env.ADMIN_WALLETS).has(wallet);
    await audit(env.DB, wallet, "login", { admin: isAdmin }, now);
    return json(req, env, 200, { token, expiresAt, admin: isAdmin });
  }

  if (req.method === "GET" && path === "/devtest/status") {
    // Ambiente de producao: a area nao existe (404), mesmo para administradores.
    if (env.APP_ENV === "prod") return json(req, env, 404, { error: "not found" });
    const wallet = await sessionWallet(req, env, now);
    if (!wallet) return json(req, env, 401, { error: "entre com a carteira" });
    // Autorizacao no servidor: a lista de administradores e checada aqui, nao no navegador.
    if (!parseWalletList(env.ADMIN_WALLETS).has(wallet)) return json(req, env, 403, { error: "sem permissao" });
    let db = "ok";
    try { await env.DB.prepare("SELECT 1 AS ok").first(); } catch { db = "erro"; }
    await audit(env.DB, wallet, "devtest.status", { db }, now);
    return json(req, env, 200, {
      env: env.APP_ENV,
      cluster: env.SOLANA_CLUSTER,
      version: env.VERSION ?? VERSION_TAG,
      services: { api: "ok", db },
      // Ainda nao implementado (proxima etapa): mint TEST, programa Anchor, saldo do vault, RPC.
      onchain: "pendente",
      time: new Date(now).toISOString(),
    });
  }

  return json(req, env, 404, { error: "not found" });
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    return handle(req, env);
  },
};
