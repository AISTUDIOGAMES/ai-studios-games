#!/usr/bin/env node
// Salva a chave da autoridade de teste SO se ela gerar o endereco esperado. Nunca imprime segredo.
// Entrada: variavel AUTH_SECRET (definida pelo passo a passo, com entrada oculta).
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { keypairFromInput } from "./authority-lib.mjs";

// Autoridade do mint TEST: carteira admin do DEVTEST. Pode ser trocada com EXPECTED_ADDRESS.
const EXPECTED = process.env.EXPECTED_ADDRESS || "J1Py7edvZwQjwvkGvcAVr4VyAG3JGxR6W178gi4DfWUb";
const secret = process.env.AUTH_SECRET;
if (!secret) {
  console.error("✖ AUTH_SECRET nao definido. Siga o passo a passo com a entrada oculta.");
  process.exit(1);
}

let kp;
try {
  kp = keypairFromInput(secret);
} catch (e) {
  console.error(`✖ nao consegui ler a chave: ${e.message}. Nada foi salvo.`);
  process.exit(1);
}

const pub = kp.publicKey.toBase58();
if (pub !== EXPECTED) {
  console.error(`✖ a chave gera ${pub}, e nao ${EXPECTED}. Nada foi salvo.`);
  process.exit(1);
}

const out = join(process.env.USERPROFILE || homedir(), "bomber-mint-authority.json");
if (existsSync(out)) {
  console.error(`✖ ${out} ja existe. Nada foi salvo.`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify(Array.from(kp.secretKey)), { flag: "wx" });
console.log(`✔ a chave confere com ${EXPECTED}`);
console.log(`✔ salva em ${out} (fora do repositorio)`);
