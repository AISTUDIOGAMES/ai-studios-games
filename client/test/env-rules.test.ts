import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAppEnv, allowsTestCheats, envLabel, assertDevnetGenesis, DEVNET_GENESIS_HASH, MAINNET_GENESIS_HASH } from "../src/env-rules";

test("VITE_ENV: valores validos e padrao pelo modo do servidor", () => {
  assert.equal(resolveAppEnv("dev", false), "dev");
  assert.equal(resolveAppEnv("alpha", false), "alpha");
  assert.equal(resolveAppEnv("prod", true), "prod");
  assert.equal(resolveAppEnv(undefined, true), "dev");   // vite dev sem VITE_ENV
  assert.equal(resolveAppEnv(undefined, false), "prod"); // build sem VITE_ENV = site atual
  assert.equal(resolveAppEnv("  alpha ", false), "alpha");
});

test("VITE_ENV invalido e recusado (nada de ambiente desconhecido)", () => {
  for (const bad of ["main", "mainnet", "ALPHA", "", "staging"]) {
    assert.throws(() => resolveAppEnv(bad, false), /VITE_ENV invalido/, bad);
  }
});

test("atalhos de teste so existem em dev local", () => {
  assert.equal(allowsTestCheats("dev", true), true);
  assert.equal(allowsTestCheats("dev", false), false); // build de dev nao vaza atalho
  assert.equal(allowsTestCheats("alpha", true), false);
  assert.equal(allowsTestCheats("alpha", false), false);
  assert.equal(allowsTestCheats("prod", true), false);
});

test("rotulo de ambiente", () => {
  assert.equal(envLabel("dev"), "DEVTEST");
  assert.equal(envLabel("alpha"), "ALPHA · DEVNET");
  assert.equal(envLabel("prod"), "");
});

test("rede: Devnet aceita, Mainnet e qualquer outra recusadas", () => {
  assert.doesNotThrow(() => assertDevnetGenesis(DEVNET_GENESIS_HASH));
  assert.throws(() => assertDevnetGenesis(MAINNET_GENESIS_HASH), /Mainnet/);
  assert.throws(() => assertDevnetGenesis("TestnetOuOutraRede1111111111111111111111"), /nao e a Devnet/);
  assert.throws(() => assertDevnetGenesis(""), /nao e a Devnet/);
});
