import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nacl from "tweetnacl";
import bs58 from "bs58";
// @ts-ignore - simulador local de D1 (node:sqlite), so para testes
import { makeDB } from "./d1shim.mjs";
import { handle } from "../src/index";
import { isWalletAddress, parseWalletList } from "../src/util";
import type { Env } from "../src/env";
import { fakeRpcFetch } from "./rpc-fake";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(here, "../migrations/0001_init.sql"), "utf8");
const ORIGIN_OK = "https://aistudiosgames.vercel.app";

const newWallet = () => { const kp = nacl.sign.keyPair(); return { kp, pub: bs58.encode(kp.publicKey) }; };
const ADMIN = newWallet();

function mkEnv(over: Partial<Env> = {}) {
  const db = makeDB(MIGRATION);
  const env = { DB: db, APP_ENV: "alpha", SOLANA_CLUSTER: "devnet", VERSION: "0.1.0", ADMIN_WALLETS: ADMIN.pub, ALLOW_ORIGIN: ORIGIN_OK, ...over } as unknown as Env;
  return { env, db };
}

function req(method: string, path: string, body?: unknown, opts: { token?: string; ip?: string; origin?: string; raw?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "cf-connecting-ip": opts.ip ?? "10.0.0.1" };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.origin) headers.origin = opts.origin;
  return new Request(`https://api.test${path}`, {
    method, headers,
    body: method === "GET" ? undefined : (opts.raw ?? (body === undefined ? undefined : JSON.stringify(body))),
  });
}

const sign = (kp: nacl.SignKeyPair, message: string) =>
  Buffer.from(nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey)).toString("base64");

async function challenge(env: Env, w: { pub: string }, now: number, ip?: string) {
  const r = await handle(req("POST", "/auth/nonce", { wallet: w.pub }, { ip }), env, now);
  assert.equal(r.status, 200);
  return (await r.json()) as { nonce: string; message: string; expiresAt: number };
}

async function login(env: Env, w: { kp: nacl.SignKeyPair; pub: string }, now = Date.now(), ip?: string) {
  const c = await challenge(env, w, now, ip);
  const r = await handle(req("POST", "/auth/verify", { wallet: w.pub, nonce: c.nonce, signature: sign(w.kp, c.message) }, { ip }), env, now);
  return { res: r, body: (await r.json()) as any };
}

// ---------- configuracao ----------

test("config: endereco de admin do wrangler.toml e valido e a rede e Devnet", () => {
  const toml = readFileSync(join(here, "../wrangler.toml"), "utf8");
  const admins = /ADMIN_WALLETS = "([^"]*)"/.exec(toml)?.[1] ?? "";
  assert.ok(parseWalletList(admins).has("J1Py7edvZwQjwvkGvcAVr4VyAG3JGxR6W178gi4DfWUb"));
  assert.ok(isWalletAddress("J1Py7edvZwQjwvkGvcAVr4VyAG3JGxR6W178gi4DfWUb"));
  assert.match(toml, /SOLANA_CLUSTER = "devnet"/);
  assert.match(toml, /APP_ENV = "alpha"/);
  assert.doesNotMatch(toml, /ALLOW_ORIGIN = "\*"/);
});

test("enderecos: aceita base58 de 32 bytes, recusa lixo", () => {
  assert.equal(isWalletAddress(ADMIN.pub), true);
  assert.equal(isWalletAddress("0OIl" + "1".repeat(40)), false); // caracteres fora do base58 / tamanho errado
  assert.equal(isWalletAddress("abc"), false);
  assert.equal(isWalletAddress(123), false);
  assert.equal(isWalletAddress(null), false);
});

test("health: informa ambiente e rede, sem expor segredos", async () => {
  const { env } = mkEnv();
  const r = await handle(req("GET", "/health"), env);
  const b = (await r.json()) as Record<string, unknown>;
  assert.deepEqual(Object.keys(b).sort(), ["cluster", "env", "ok", "version"]);
  assert.equal(b.env, "alpha");
  assert.equal(b.cluster, "devnet");
  assert.equal(JSON.stringify(b).includes(ADMIN.pub), false);
});

// ---------- login por assinatura ----------

test("login: carteira assina o desafio e recebe sessao; token guardado so como hash", async () => {
  const { env, db } = mkEnv();
  const w = newWallet();
  const { res, body } = await login(env, w);
  assert.equal(res.status, 200);
  assert.match(body.token, /^[0-9a-f]{64}$/);
  assert.equal(body.admin, false);
  const rows = db.raw.prepare("SELECT token_hash FROM sessions").all() as { token_hash: string }[];
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token_hash, body.token); // nao guarda o token em claro
  assert.match(rows[0].token_hash, /^[0-9a-f]{64}$/);
});

test("login: administrador recebe admin=true", async () => {
  const { env } = mkEnv();
  const { body } = await login(env, ADMIN);
  assert.equal(body.admin, true);
});

test("replay: o mesmo desafio nao funciona duas vezes", async () => {
  const { env } = mkEnv();
  const w = newWallet();
  const c = await challenge(env, w, Date.now());
  const sig = sign(w.kp, c.message);
  const a = await handle(req("POST", "/auth/verify", { wallet: w.pub, nonce: c.nonce, signature: sig }), env);
  const b = await handle(req("POST", "/auth/verify", { wallet: w.pub, nonce: c.nonce, signature: sig }), env);
  assert.equal(a.status, 200);
  assert.equal(b.status, 401);
});

test("corrida: duas verificacoes simultaneas do mesmo desafio, so uma passa", async () => {
  const { env } = mkEnv();
  const w = newWallet();
  const c = await challenge(env, w, Date.now());
  const sig = sign(w.kp, c.message);
  const go = () => handle(req("POST", "/auth/verify", { wallet: w.pub, nonce: c.nonce, signature: sig }), env);
  const [a, b] = await Promise.all([go(), go()]);
  assert.deepEqual([a.status, b.status].sort(), [200, 401]);
});

test("assinatura de outra chave e recusada", async () => {
  const { env } = mkEnv();
  const w = newWallet(), intruso = newWallet();
  const c = await challenge(env, w, Date.now());
  const r = await handle(req("POST", "/auth/verify", { wallet: w.pub, nonce: c.nonce, signature: sign(intruso.kp, c.message) }), env);
  assert.equal(r.status, 401);
});

test("mensagem trocada pelo cliente e recusada (o servidor usa a mensagem guardada)", async () => {
  const { env } = mkEnv();
  const w = newWallet();
  const c = await challenge(env, w, Date.now());
  const r = await handle(req("POST", "/auth/verify", { wallet: w.pub, nonce: c.nonce, signature: sign(w.kp, "outra coisa") }), env);
  assert.equal(r.status, 401);
});

test("desafio expirado e recusado", async () => {
  const { env } = mkEnv();
  const w = newWallet();
  const t0 = Date.now();
  const c = await challenge(env, w, t0);
  const r = await handle(req("POST", "/auth/verify", { wallet: w.pub, nonce: c.nonce, signature: sign(w.kp, c.message) }), env, t0 + 6 * 60 * 1000);
  assert.equal(r.status, 401);
});

test("desafio de uma carteira nao serve para outra", async () => {
  const { env } = mkEnv();
  const w = newWallet(), outra = newWallet();
  const c = await challenge(env, w, Date.now());
  const r = await handle(req("POST", "/auth/verify", { wallet: outra.pub, nonce: c.nonce, signature: sign(outra.kp, c.message) }), env);
  assert.equal(r.status, 401);
});

test("entradas invalidas: carteira mal formada e corpo grande demais", async () => {
  const { env } = mkEnv();
  assert.equal((await handle(req("POST", "/auth/nonce", { wallet: "nao-e-carteira" }), env)).status, 400);
  assert.equal((await handle(req("POST", "/auth/nonce", undefined, { raw: "{ruim" }), env)).status, 400);
  const grande = JSON.stringify({ wallet: ADMIN.pub, x: "a".repeat(5000) });
  assert.equal((await handle(req("POST", "/auth/nonce", undefined, { raw: grande }), env)).status, 400);
});

test("limite de taxa: pedidos de desafio demais por IP sao barrados", async () => {
  const { env } = mkEnv();
  let last = 0;
  for (let i = 0; i < 11; i++) {
    const w = newWallet();
    last = (await handle(req("POST", "/auth/nonce", { wallet: w.pub }, { ip: "9.9.9.9" }), env)).status;
  }
  assert.equal(last, 429);
});

// ---------- DEVTEST: autorizacao no servidor ----------

test("devtest: sem sessao = 401; sessao de jogador comum = 403", async () => {
  const { env } = mkEnv();
  assert.equal((await handle(req("GET", "/devtest/status"), env)).status, 401);
  const w = newWallet();
  const { body } = await login(env, w);
  assert.equal((await handle(req("GET", "/devtest/status", undefined, { token: body.token }), env)).status, 403);
});

test("devtest: token inventado e sessao expirada = 401", async () => {
  const { env } = mkEnv();
  const forjado = "a".repeat(64);
  assert.equal((await handle(req("GET", "/devtest/status", undefined, { token: forjado }), env)).status, 401);
  const { body } = await login(env, ADMIN, Date.now() - 13 * 60 * 60 * 1000); // login ha 13h: sessao de 12h ja venceu
  assert.equal((await handle(req("GET", "/devtest/status", undefined, { token: body.token }), env)).status, 401);
});

test("devtest: administrador ve o status, a Devnet e o mint, e o acesso e registrado na auditoria", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeRpcFetch() as any;
  try {
    const { env, db } = mkEnv();
    const { body } = await login(env, ADMIN);
    const r = await handle(req("GET", "/devtest/status", undefined, { token: body.token }), env);
    assert.equal(r.status, 200);
    const b = (await r.json()) as any;
    assert.equal(b.env, "alpha");
    assert.equal(b.cluster, "devnet");
    assert.equal(b.services.db, "ok");
    assert.equal(b.onchain.network, "devnet");
    assert.equal(b.onchain.mint.verified, true);
    assert.ok(Math.abs(b.onchain.authority.sol - 4.9978464) < 1e-9);
    const log = db.raw.prepare("SELECT action, actor FROM audit_log ORDER BY id").all() as any[];
    assert.deepEqual(log.map((x) => x.action), ["login", "devtest.status"]);
    assert.equal(log[1].actor, ADMIN.pub);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("devtest: em producao a area nao existe, mesmo para o administrador", async () => {
  const { env } = mkEnv({ APP_ENV: "prod" } as Partial<Env>);
  const { body } = await login(env, ADMIN);
  assert.equal((await handle(req("GET", "/devtest/status", undefined, { token: body.token }), env)).status, 404);
});

test("CORS: so a origem autorizada recebe Access-Control-Allow-Origin", async () => {
  const { env } = mkEnv();
  const ok = await handle(req("GET", "/health", undefined, { origin: ORIGIN_OK }), env);
  assert.equal(ok.headers.get("Access-Control-Allow-Origin"), ORIGIN_OK);
  const no = await handle(req("GET", "/health", undefined, { origin: "https://site-malicioso.example" }), env);
  assert.equal(no.headers.get("Access-Control-Allow-Origin"), null);
});

test("rota desconhecida = 404", async () => {
  const { env } = mkEnv();
  assert.equal((await handle(req("GET", "/nada"), env)).status, 404);
});
