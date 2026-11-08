import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
// @ts-ignore - modulo de script (.mjs), sem tipos
import { mnemonicToSeed, deriveEd25519, keypairFromInput } from "../scripts/authority-lib.mjs";

test("BIP39: frase de teste oficial gera a semente esperada (com senha TREZOR)", () => {
  const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const seed = mnemonicToSeed(phrase, "TREZOR").toString("hex");
  assert.ok(seed.startsWith("c55257c360c07c72029aebc1b53c05ed"));
});

test("SLIP-0010 ed25519: vetor oficial do caminho m/0' bate", () => {
  const seed = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
  assert.equal(deriveEd25519(seed, "m/0'").toString("hex"),
    "68e0fe46dfb67e368c75379acec591dad19df3cde26e63b93a8e704f1dade7a3");
});

test("chave base58 de 64 bytes (formato exportado pela Phantom) gera a mesma carteira", () => {
  const kp = Keypair.generate();
  const back = keypairFromInput(bs58.encode(kp.secretKey));
  assert.equal(back.publicKey.toBase58(), kp.publicKey.toBase58());
});

test("chave base58 de 32 bytes tambem e aceita", () => {
  const kp = Keypair.generate();
  const back = keypairFromInput(bs58.encode(kp.secretKey.subarray(0, 32)));
  assert.equal(back.publicKey.toBase58(), kp.publicKey.toBase58());
});

test("frase de 12 palavras gera uma carteira deterministica", () => {
  const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const a = keypairFromInput(phrase).publicKey.toBase58();
  const b = keypairFromInput(phrase).publicKey.toBase58();
  assert.equal(a, b);
});

test("entrada invalida e recusada sem vazar a entrada na mensagem", () => {
  assert.throws(() => keypairFromInput("nao-e-chave-valida!"), (e: Error) => !/nao-e-chave/.test(e.message));
});
