import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { devnetStatus } from "../src/solana";
import { TEST_MINT, TEST_MINT_AUTHORITY, TEST_MINT_DECIMALS } from "../src/alpha-config";
import { fakeRpcFetch, mintBuf, DEVNET_GENESIS, MAINNET_GENESIS, OK_AUTHORITY } from "./rpc-fake";
// @ts-ignore - modulo de script (.mjs), sem tipos
import { TOKEN_PROGRAM_ID } from "../scripts/mint-checks.mjs";

const RPC = "https://rpc.test";
const OTHER = "J1Py7edvZwQjwvkGvcAVr4VyAG3JGxR6W178gi4DfWUb";
const REGISTRY = join(dirname(fileURLToPath(import.meta.url)), "../../docs/TEST-MINT.json");

test("rede Devnet, saldo da autoridade e mint oficial verificados", async () => {
  const s = (await devnetStatus(RPC, fakeRpcFetch())) as any;
  assert.equal(s.rpcStatus, "ok");
  assert.equal(s.network, "devnet");
  assert.equal(s.genesis, DEVNET_GENESIS);
  assert.ok(Math.abs(s.authority.sol - 4.9978464) < 1e-9);
  assert.equal(s.mint.address, TEST_MINT);
  assert.equal(s.mint.verified, true);
  assert.deepEqual(s.mint.problems, []);
});

test("Mainnet e recusada: o mint nao e dado como verificado", async () => {
  const s = (await devnetStatus(RPC, fakeRpcFetch({ genesis: MAINNET_GENESIS }))) as any;
  assert.equal(s.network, "mainnet");
  assert.equal(s.mint.verified, false);
  assert.ok(s.mint.problems.some((p: string) => /rede nao e a Devnet \(mainnet\)/.test(p)));
});

test("conta do mint inexistente aparece como problema", async () => {
  const s = (await devnetStatus(RPC, fakeRpcFetch({ mint: null }))) as any;
  assert.equal(s.mint.verified, false);
  assert.ok(s.mint.problems.includes("conta nao existe na rede"));
});

test("autoridade diferente na conta do mint e recusada", async () => {
  const s = (await devnetStatus(RPC, fakeRpcFetch({ mint: { owner: TOKEN_PROGRAM_ID, data: mintBuf({ auth: OTHER }) } }))) as any;
  assert.equal(s.mint.verified, false);
  assert.ok(s.mint.problems.some((p: string) => /autoridade/.test(p)));
});

test("RPC fora do ar: informa o erro e nao quebra o painel", async () => {
  const s = (await devnetStatus(RPC, fakeRpcFetch({ fail: true }))) as any;
  assert.equal(s.network, "indisponivel");
  assert.match(s.rpcStatus, /^erro:/);
  assert.equal(s.mint.verified, false);
});

test("constantes do mint oficial batem com docs/TEST-MINT.json", { skip: !existsSync(REGISTRY) }, () => {
  const reg = JSON.parse(readFileSync(REGISTRY, "utf8"));
  assert.equal(reg.mint, TEST_MINT);
  assert.equal(reg.mintAuthority, TEST_MINT_AUTHORITY);
  assert.equal(reg.decimals, TEST_MINT_DECIMALS);
  assert.equal(TEST_MINT_AUTHORITY, OK_AUTHORITY);
});
