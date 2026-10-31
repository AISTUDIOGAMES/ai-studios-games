import { test } from "node:test";
import assert from "node:assert/strict";
import { loginWithWallet, devtestStatus, AlphaApiError, type FetchLike } from "../src/alpha-session";

type Call = { url: string; method?: string; headers?: Record<string, string>; body?: string };
type Reply = { status: number; body: unknown };

function fakeFetch(routes: Record<string, (c: Call) => Reply>) {
  const calls: Call[] = [];
  const f: FetchLike = async (url, init) => {
    const c: Call = { url, ...init };
    calls.push(c);
    const r = routes[new URL(url).pathname]!(c);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  };
  return { f, calls };
}
const BASE = "https://api.test";
const W = "J1Py7edvZwQjwvkGvcAVr4VyAG3JGxR6W178gi4DfWUb";

test("login: pede desafio, assina a mensagem do servidor e recebe a sessao", async () => {
  const { f, calls } = fakeFetch({
    "/auth/nonce": () => ({ status: 200, body: { nonce: "n1", message: "msg-do-servidor", expiresAt: 5 } }),
    "/auth/verify": () => ({ status: 200, body: { token: "tok", expiresAt: 9, admin: true } }),
  });
  const s = await loginWithWallet(BASE, W, f, async (m) => {
    assert.equal(m, "msg-do-servidor");
    return "SIG";
  });
  assert.deepEqual(s, { wallet: W, token: "tok", expiresAt: 9, admin: true });
  const verify = JSON.parse(calls[1].body!);
  assert.deepEqual(verify, { wallet: W, nonce: "n1", signature: "SIG" });
});

test("login: admin ausente na resposta vira false (padrao seguro)", async () => {
  const { f } = fakeFetch({
    "/auth/nonce": () => ({ status: 200, body: { nonce: "n", message: "m", expiresAt: 1 } }),
    "/auth/verify": () => ({ status: 200, body: { token: "t", expiresAt: 2 } }),
  });
  const s = await loginWithWallet(BASE, W, f, async () => "x");
  assert.equal(s.admin, false);
});

test("erro do servidor vira AlphaApiError com status e mensagem", async () => {
  const { f } = fakeFetch({ "/auth/nonce": () => ({ status: 429, body: { error: "muitas tentativas, aguarde" } }) });
  await assert.rejects(loginWithWallet(BASE, W, f, async () => "x"), (e) =>
    e instanceof AlphaApiError && e.status === 429 && e.message === "muitas tentativas, aguarde");
});

test("DEVTEST: envia o token no cabecalho Authorization", async () => {
  const { f, calls } = fakeFetch({ "/devtest/status": () => ({ status: 200, body: { env: "alpha" } }) });
  const out = await devtestStatus(BASE, { wallet: W, token: "abc", expiresAt: 1, admin: true }, f);
  assert.deepEqual(out, { env: "alpha" });
  assert.equal(calls[0].headers?.authorization, "Bearer abc");
});
