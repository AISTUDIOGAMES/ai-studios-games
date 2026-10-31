import { test } from "node:test";
import assert from "node:assert/strict";
import bs58 from "bs58";
// @ts-ignore - modulo de script (.mjs), sem tipos
import { validateMintAccount, parseMintData, TOKEN_PROGRAM_ID, MINT_ACCOUNT_SIZE } from "../scripts/mint-checks.mjs";

const AUTH = "HJuS1MkozoAKC4b7CjRrVQHCsyLoU1xxrFGoDEqi3Mpz";
const OTHER = "J1Py7edvZwQjwvkGvcAVr4VyAG3JGxR6W178gi4DfWUb";
const EXPECTED = { decimals: 6, mintAuthority: AUTH };

// Monta a conta de mint no layout do SPL Token (82 bytes), igual ao que a rede devolve.
function mintBuf({ decimals = 6, auth = AUTH, freeze = null as string | null, init = 1 } = {}) {
  const b = Buffer.alloc(MINT_ACCOUNT_SIZE);
  b.writeUInt32LE(1, 0);
  Buffer.from(bs58.decode(auth)).copy(b, 4);
  b.writeUInt8(decimals, 44);
  b.writeUInt8(init, 45);
  if (freeze) {
    b.writeUInt32LE(1, 46);
    Buffer.from(bs58.decode(freeze)).copy(b, 50);
  }
  return b;
}
const good = () => ({ owner: TOKEN_PROGRAM_ID, data: mintBuf() });

test("mint valido passa sem problemas", () => {
  assert.deepEqual(validateMintAccount(good(), EXPECTED), []);
});

test("le autoridade, decimais e congelamento do layout da conta", () => {
  assert.deepEqual(parseMintData(mintBuf()), {
    mintAuthority: AUTH, decimals: 6, initialized: true, freezeAuthority: null,
  });
});

test("dono da conta errado e recusado", () => {
  const p = validateMintAccount({ owner: OTHER, data: mintBuf() }, EXPECTED);
  assert.equal(p.length, 1);
  assert.match(p[0], /dono/);
});

test("decimais diferentes sao recusados", () => {
  const p = validateMintAccount({ owner: TOKEN_PROGRAM_ID, data: mintBuf({ decimals: 9 }) }, EXPECTED);
  assert.ok(p.some((x) => /decimais 9/.test(x)));
});

test("autoridade de mint diferente e recusada", () => {
  const p = validateMintAccount({ owner: TOKEN_PROGRAM_ID, data: mintBuf({ auth: OTHER }) }, EXPECTED);
  assert.ok(p.some((x) => /autoridade/.test(x)));
});

test("autoridade de congelamento presente e recusada", () => {
  const p = validateMintAccount({ owner: TOKEN_PROGRAM_ID, data: mintBuf({ freeze: OTHER }) }, EXPECTED);
  assert.ok(p.some((x) => /congelamento/.test(x)));
});

test("mint nao inicializado e recusado", () => {
  const p = validateMintAccount({ owner: TOKEN_PROGRAM_ID, data: mintBuf({ init: 0 }) }, EXPECTED);
  assert.ok(p.some((x) => /nao inicializado/.test(x)));
});

test("conta inexistente na rede e recusada (o caso que causou a confusao)", () => {
  assert.deepEqual(validateMintAccount(null, EXPECTED), ["conta nao existe na rede"]);
});

test("conta com tamanho que nao e de mint e recusada", () => {
  const p = validateMintAccount({ owner: TOKEN_PROGRAM_ID, data: Buffer.alloc(10) }, EXPECTED);
  assert.ok(p.some((x) => /tamanho/.test(x)));
});
