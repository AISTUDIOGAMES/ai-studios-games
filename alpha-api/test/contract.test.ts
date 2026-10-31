// Contrato cliente <-> Worker: o codigo REAL de client/src/alpha-session roda contra o handle do Worker, sem rede.
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
import type { Env } from "../src/env";
import { loginWithWallet, devtestStatus, AlphaApiError, type FetchLike } from "../../client/src/alpha-session";
import { fakeRpcFetch } from "./rpc-fake";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION = readFileSync(join(here, "../migrations/0001_init.sql"), "utf8");
const BASE = "https://api.test";

const ADMIN = nacl.sign.keyPair();
const ADMIN_PUB = bs58.encode(ADMIN.publicKey);
const USER = nacl.sign.keyPair();
const USER_PUB = bs58.encode(USER.publicKey);

function setup() {
  const db = makeDB(MIGRATION);
  const env = {
    DB: db, APP_ENV: "alpha", SOLANA_CLUSTER: "devnet", VERSION: "0.1.0",
    ADMIN_WALLETS: ADMIN_PUB, ALLOW_ORIGIN: "https://aistudiosgames.vercel.app",
  } as unknown as Env;
  // Mesmo contrato do navegador: fetch(url, init) -> Response do Worker.
  const f: FetchLike = async (url, init) => {
    const req = new Request(url, { method: init?.method ?? "GET", headers: init?.headers, body: init?.body });
    const r = await handle(req, env, Date.now());
    return { ok: r.ok, status: r.status, json: () => r.json() };
  };
  return { f };
}

const signer = (kp: nacl.SignKeyPair) => async (msg: string) =>
  Buffer.from(nacl.sign.detached(new TextEncoder().encode(msg), kp.secretKey)).toString("base64");

test("usuario comum: login ok (admin=false) e DEVTEST recusado com 403", async () => {
  const { f } = setup();
  const s = await loginWithWallet(BASE, USER_PUB, f, signer(USER));
  assert.equal(s.admin, false);
  assert.equal(s.wallet, USER_PUB);
  await assert.rejects(devtestStatus(BASE, s, f), (e) => e instanceof AlphaApiError && e.status === 403);
});

test("administrador: login admin=true e DEVTEST responde com os servicos", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeRpcFetch() as any;
  try {
    const { f } = setup();
    const s = await loginWithWallet(BASE, ADMIN_PUB, f, signer(ADMIN));
    assert.equal(s.admin, true);
    const st = await devtestStatus(BASE, s, f);
    assert.equal(st.env, "alpha");
    assert.equal(st.cluster, "devnet");
    assert.deepEqual(st.services, { api: "ok", db: "ok" });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("assinatura de outra chave: servidor recusa e o cliente mostra o erro", async () => {
  const { f } = setup();
  const intruso = nacl.sign.keyPair();
  await assert.rejects(loginWithWallet(BASE, USER_PUB, f, signer(intruso)), (e) =>
    e instanceof AlphaApiError && e.status === 401 && /assinatura/.test(e.message));
});

test("o cliente assina exatamente a mensagem gerada pelo servidor (com carteira e nonce)", async () => {
  const { f } = setup();
  let signed = "";
  await loginWithWallet(BASE, USER_PUB, f, async (m) => {
    signed = m;
    return signer(USER)(m);
  });
  assert.match(signed, /BomberIdle Alpha/);
  assert.ok(signed.includes(USER_PUB));
  assert.match(signed, /Nonce: [0-9a-f]{32}/);
});
