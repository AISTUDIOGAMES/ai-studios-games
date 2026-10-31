#!/usr/bin/env node
// Cria o mint do token TEST (somente Devnet). Roda SOMENTE na sua maquina, com a sua chave.
//
//   TEST_MINT_KEYPAIR=~/.config/solana/bomber-test-mint.json node scripts/create-test-mint.mjs --dry-run
//   TEST_MINT_KEYPAIR=~/.config/solana/bomber-test-mint.json node scripts/create-test-mint.mjs
//
// - Nunca imprime nem grava a chave privada. Grava so o endereco publico em docs/TEST-MINT.json.
// - Recusa qualquer RPC que nao seja a Devnet (confere o genesis hash). Nunca cria nada na Mainnet.
// - Decimais e congelamento sao escolhas de design: ver docs/FASE-G-AUDITORIA.md, secao "Token TEST".
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair } from "@solana/web3.js";
import { createMint, getMint } from "@solana/spl-token";

const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const DECIMALS = 6;
const MIN_SOL_LAMPORTS = 0.02 * 1e9;
const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const dry = process.argv.includes("--dry-run");
const fail = (m) => { console.error(`✖ ${m}`); process.exit(1); };

const keyArg = process.env.TEST_MINT_KEYPAIR;
if (!keyArg) fail("Defina TEST_MINT_KEYPAIR com o caminho do keypair de teste (fora do repositorio).");
const keyPath = resolve(keyArg.replace(/^~(?=$|\/)/, homedir()));
if (!existsSync(keyPath)) fail(`keypair nao encontrado: ${keyPath}`);
const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keyPath, "utf8"))));

const conn = new Connection(RPC, "confirmed");
const genesis = await conn.getGenesisHash();
if (genesis === MAINNET_GENESIS) fail("O RPC e a Mainnet. Recusado.");
if (genesis !== DEVNET_GENESIS) fail("O RPC nao e a Devnet. Recusado.");

const lamports = await conn.getBalance(authority.publicKey);
console.log(`Rede: Devnet · autoridade: ${authority.publicKey.toBase58()} · saldo: ${lamports / 1e9} SOL`);
if (dry) {
  console.log(`--dry-run: criaria um mint TEST com ${DECIMALS} decimais; autoridade de mint = a chave acima; sem autoridade de congelamento.`);
  process.exit(0);
}
if (lamports < MIN_SOL_LAMPORTS) fail("Saldo de SOL insuficiente na Devnet (use um faucet de Devnet).");

const mint = await createMint(conn, authority, authority.publicKey, null, DECIMALS);
const info = await getMint(conn, mint);
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/TEST-MINT.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({
  cluster: "devnet",
  mint: mint.toBase58(),
  decimals: info.decimals,
  mintAuthority: authority.publicKey.toBase58(),
  freezeAuthority: null,
  createdAt: new Date().toISOString(),
  note: "Token TEST do Alpha. Sem valor financeiro. Nao e ativo da Mainnet.",
}, null, 2) + "\n");
console.log(`✔ mint TEST criado na Devnet: ${mint.toBase58()} (${info.decimals} decimais)`);
console.log(`✔ endereco registrado em docs/TEST-MINT.json`);
