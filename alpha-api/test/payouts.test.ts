import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore - simulador local de D1 (node:sqlite), so para testes
import { makeDB } from "./d1shim.mjs";
import { handle } from "../src/index";
import type { Env } from "../src/env";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(here, "../migrations/0001_init.sql"), "utf8");
const PAYOUTS = readFileSync(join(here, "../migrations/0002_payouts.sql"), "utf8");

const KEY = "k".repeat(40);
const WALLET = "Hwe3iq7pvy8kRJqhZHT2MTf8BupMQkamTj1WkNbyrLSd";
// Assinatura de transacao em base58 (formato aceito pelo servidor); o conteudo nao e verificado on-chain aqui.
const SIG = "5".repeat(88);
const SIG2 = "6".repeat(88);

type DB = {
  prepare(sql: string): {
    bind(...a: unknown[]): {
      run(): Promise<{ meta: { changes: number } }>;
      first<T>(): Promise<T | null>;
    };
  };
};

function mkEnv(over: Record<string, unknown> = {}): { env: Env; db: DB } {
  const db = makeDB(MIGRATION, PAYOUTS) as DB;
  const env = {
    DB: db,
    APP_ENV: "alpha",
    SOLANA_CLUSTER: "devnet",
    VERSION: "0.1.0",
    ADMIN_WALLETS: "",
    ALLOW_ORIGIN: "",
    ADMIN_KEY: KEY,
    ...over,
  } as unknown as Env;
  return { env, db };
}

function req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://api.test${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: method === "GET" || body === undefined ? undefined : JSON.stringify(body),
  });
}

const auth = { "X-Admin-Key": KEY };

async function insert(db: DB, units: number, status: string, idem: string): Promise<number> {
  await db
    .prepare("INSERT INTO withdrawals (wallet, amount_units, status, idempotency_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(WALLET, units, status, idem, 1, 1)
    .run();
  const row = await db.prepare("SELECT id FROM withdrawals WHERE idempotency_key = ?").bind(idem).first<{ id: number }>();
  assert.ok(row, "saque inserido deve existir");
  return row.id;
}

async function statusOf(db: DB, id: number): Promise<string> {
  const row = await db.prepare("SELECT status FROM withdrawals WHERE id = ?").bind(id).first<{ status: string }>();
  assert.ok(row, "saque deve existir");
  return row.status;
}

const now = 1_000_000;

test("payouts: sem X-Admin-Key ou com chave errada = 403", async () => {
  const { env } = mkEnv();
  const none = await handle(req("GET", "/admin/queue"), env, now);
  assert.equal(none.status, 403);
  const wrong = await handle(req("GET", "/admin/queue", undefined, { "X-Admin-Key": "x".repeat(40) }), env, now);
  assert.equal(wrong.status, 403);
});

test("payouts: em producao a rota nao existe (404), mesmo com a chave certa", async () => {
  const { env } = mkEnv({ APP_ENV: "prod" });
  const r = await handle(req("GET", "/admin/queue", undefined, auth), env, now);
  assert.equal(r.status, 404);
});

test("payouts: sem ADMIN_KEY configurada a rota nao existe (404)", async () => {
  const { env } = mkEnv({ ADMIN_KEY: undefined });
  const r = await handle(req("GET", "/admin/queue", undefined, auth), env, now);
  assert.equal(r.status, 404);
});

test("payouts: fila lista saques pendentes em tokens (unidades / 10000)", async () => {
  const { env, db } = mkEnv();
  await insert(db, 500000, "pending", "a1");
  await insert(db, 20000, "review", "a2");
  const r = await handle(req("GET", "/admin/queue", undefined, auth), env, now);
  assert.equal(r.status, 200);
  const q = (await r.json()) as { withdrawals: { amount: number; wallet: string }[]; review: unknown[]; processing: unknown[]; burnPending: number };
  assert.equal(q.withdrawals.length, 1);
  assert.equal(q.withdrawals[0].amount, 50);
  assert.equal(q.withdrawals[0].wallet, WALLET);
  assert.equal(q.review.length, 1);
  assert.equal(q.processing.length, 0);
  assert.equal(q.burnPending, 0);
});

test("payouts: claim reserva uma vez; segunda reserva = 409 (sem pagamento duplo)", async () => {
  const { env, db } = mkEnv();
  const id = await insert(db, 500000, "pending", "b1");
  const first = await handle(req("POST", "/admin/claim", { id }, auth), env, now);
  assert.equal(first.status, 200);
  assert.equal(await statusOf(db, id), "processing");
  const second = await handle(req("POST", "/admin/claim", { id }, auth), env, now);
  assert.equal(second.status, 409);
});

test("payouts: done so vale para saque em processing, e grava a assinatura", async () => {
  const { env, db } = mkEnv();
  const id = await insert(db, 500000, "pending", "c1");
  // sem claim antes: recusado
  const early = await handle(req("POST", "/admin/done", { id, sig: SIG }, auth), env, now);
  assert.equal(early.status, 409);
  await handle(req("POST", "/admin/claim", { id }, auth), env, now);
  const ok = await handle(req("POST", "/admin/done", { id, sig: SIG }, auth), env, now);
  assert.equal(ok.status, 200);
  assert.equal(await statusOf(db, id), "done");
  // depois de done, nao pode ser marcado de novo
  const again = await handle(req("POST", "/admin/done", { id, sig: SIG2 }, auth), env, now);
  assert.equal(again.status, 409);
});

test("payouts: assinatura invalida e recusada", async () => {
  const { env, db } = mkEnv();
  const id = await insert(db, 500000, "pending", "d1");
  await handle(req("POST", "/admin/claim", { id }, auth), env, now);
  const bad = await handle(req("POST", "/admin/done", { id, sig: "nao-e-base58-0OIl" }, auth), env, now);
  assert.equal(bad.status, 400);
  assert.equal(await statusOf(db, id), "processing");
});

test("payouts: failed so vale para saque em processing", async () => {
  const { env, db } = mkEnv();
  const id = await insert(db, 500000, "pending", "e1");
  const early = await handle(req("POST", "/admin/failed", { id }, auth), env, now);
  assert.equal(early.status, 409);
  await handle(req("POST", "/admin/claim", { id }, auth), env, now);
  const ok = await handle(req("POST", "/admin/failed", { id }, auth), env, now);
  assert.equal(ok.status, 200);
  assert.equal(await statusOf(db, id), "failed");
});

test("payouts: approve so libera saque que esta em review", async () => {
  const { env, db } = mkEnv();
  const id = await insert(db, 500000, "review", "f1");
  const ok = await handle(req("POST", "/admin/approve", { id }, auth), env, now);
  assert.equal(ok.status, 200);
  assert.equal(await statusOf(db, id), "pending");
  const again = await handle(req("POST", "/admin/approve", { id }, auth), env, now);
  assert.equal(again.status, 409);
});

test("payouts: queima registra uma vez; a mesma assinatura nao duplica", async () => {
  const { env } = mkEnv();
  const a = await handle(req("POST", "/admin/burned", { amount: 10, sig: SIG }, auth), env, now);
  assert.equal(a.status, 200);
  assert.deepEqual(await a.json(), { ok: true, duplicate: false });
  const b = await handle(req("POST", "/admin/burned", { amount: 10, sig: SIG }, auth), env, now);
  assert.deepEqual(await b.json(), { ok: true, duplicate: true });
});

test("payouts: valores invalidos sao recusados (quantidade <= 0, id invalido)", async () => {
  const { env } = mkEnv();
  const zero = await handle(req("POST", "/admin/burned", { amount: 0, sig: SIG }, auth), env, now);
  assert.equal(zero.status, 400);
  const badId = await handle(req("POST", "/admin/claim", { id: -1 }, auth), env, now);
  assert.equal(badId.status, 400);
  const notJson = await handle(new Request("https://api.test/admin/claim", { method: "POST", headers: auth, body: "[]" }), env, now);
  assert.equal(notJson.status, 400);
});
