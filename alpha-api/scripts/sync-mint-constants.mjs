#!/usr/bin/env node
// Copia o mint e a autoridade de docs/TEST-MINT.json para src/alpha-config.ts, sem digitacao manual.
// Uso (dentro de alpha-api):  node scripts/sync-mint-constants.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const registryPath = resolve(here, "../../docs/TEST-MINT.json");
const configPath = resolve(here, "../src/alpha-config.ts");

const reg = JSON.parse(readFileSync(registryPath, "utf8"));
if (!reg.mint || !reg.mintAuthority) throw new Error("registro incompleto em docs/TEST-MINT.json");

const before = readFileSync(configPath, "utf8");
let src = before.replace(/export const TEST_MINT = ".*";/, `export const TEST_MINT = "${reg.mint}";`);
src = src.replace(/export const TEST_MINT_AUTHORITY = ".*";/, `export const TEST_MINT_AUTHORITY = "${reg.mintAuthority}";`);
if (!/export const TEST_MINT = "[^"]+";/.test(src) || !/export const TEST_MINT_AUTHORITY = "[^"]+";/.test(src)) {
  throw new Error("nao encontrei as constantes em src/alpha-config.ts");
}
writeFileSync(configPath, src);
console.log(src === before ? "ja estava certo:" : "atualizado:");
console.log(`  TEST_MINT           = ${reg.mint}`);
console.log(`  TEST_MINT_AUTHORITY = ${reg.mintAuthority}`);
