#!/usr/bin/env node
// Mint do token TEST (somente Devnet). Roda SOMENTE na sua maquina, com a sua chave.
//
//   Criar (uma vez):   TEST_MINT_KEYPAIR=~/bomber-test-mint.json node scripts/create-test-mint.mjs [--dry-run]
//   Conferir na rede:  node scripts/create-test-mint.mjs --verificar
//
// Regras:
// - Nunca cria um segundo mint: se docs/TEST-MINT.json ja existe, recusa. Para criar outro de proposito,
//   apague ou renomeie esse arquivo antes.
// - So grava docs/TEST-MINT.json DEPOIS de confirmar na rede que a conta do mint existe e bate com o esperado.
// - Nunca imprime nem grava a chave privada. Recusa RPC que nao seja a Devnet (genesis hash).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { validateMintAccount } from "./mint-checks.mjs";

const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const DECIMALS = 6;
const MIN_SOL_LAMPORTS = 0.02 * 1e9;
const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const REGISTRY = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/TEST-MINT.json");
const argv = process.argv.slice(2);
const dry = argv.includes("--dry-run");
const verifyOnly = argv.includes("--verificar");
const fail = (m) => { console.error(`✖ ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readRegistry() {
  return JSON.parse(readFileSync(REGISTRY, "utf8"));
}

async function assertDevnet(conn) {
  const genesis = await conn.getGenesisHash();
  if (genesis === MAINNET_GENESIS) fail("O RPC e a Mainnet. Recusado.");
  if (genesis !== DEVNET_GENESIS) fail("O RPC nao e a Devnet. Recusado.");
}

async function readAccount(conn, address) {
  const acc = await conn.getAccountInfo(new PublicKey(address), "confirmed");
  return acc ? { owner: acc.owner.toBase58(), data: acc.data } : null;
}

// ---------- modo verificacao: nao gasta nada, so le a rede ----------
if (verifyOnly) {
  if (!existsSync(REGISTRY)) fail("docs/TEST-MINT.json nao existe. Nada para verificar.");
  const reg = readRegistry();
  const conn = new Connection(RPC, "confirmed");
  await assertDevnet(conn);
  const problems = validateMintAccount(await readAccount(conn, reg.mint), {
    decimals: DECIMALS,
    mintAuthority: reg.mintAuthority,
  });
  console.log(`Mint registrado: ${reg.mint}`);
  if (problems.length) {
    problems.forEach((p) => console.error(`✖ ${p}`));
    process.exit(1);
  }
  console.log("✔ mint confirmado na Devnet: dono, tamanho, decimais, autoridade e ausencia de congelamento conferem.");
  process.exit(0);
}

// ---------- modo criacao ----------
const keyArg = process.env.TEST_MINT_KEYPAIR;
if (!keyArg) fail("Defina TEST_MINT_KEYPAIR com o caminho do keypair de teste (fora do repositorio).");
const keyPath = resolve(keyArg.replace(/^~(?=$|\/)/, homedir()));
if (!existsSync(keyPath)) fail(`keypair nao encontrado: ${keyPath}`);
const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keyPath, "utf8"))));

// Checagem antes de qualquer chamada de rede: impede criar um segundo mint.
if (existsSync(REGISTRY)) {
  const reg = readRegistry();
  fail(`docs/TEST-MINT.json ja existe (mint ${reg.mint}). Nao vou criar outro. Use --verificar para conferir.`);
}

const conn = new Connection(RPC, "confirmed");
await assertDevnet(conn);

const lamports = await conn.getBalance(authority.publicKey);
console.log(`Rede: Devnet · autoridade: ${authority.publicKey.toBase58()} · saldo: ${lamports / 1e9} SOL`);
if (dry) {
  console.log(`--dry-run: criaria um mint TEST com ${DECIMALS} decimais; autoridade de mint = a chave acima; sem autoridade de congelamento.`);
  process.exit(0);
}
if (lamports < MIN_SOL_LAMPORTS) fail("Saldo de SOL insuficiente na Devnet (use um faucet de Devnet).");

const mint = await createMint(conn, authority, authority.publicKey, null, DECIMALS);
const address = mint.toBase58();
console.log(`transacao de criacao confirmada. Conferindo a conta ${address} na rede...`);

// So aceita a conta se ela existir e bater com o esperado. Tenta por ate 30 segundos.
const expected = { decimals: DECIMALS, mintAuthority: authority.publicKey.toBase58() };
let problems = ["ainda nao lida pela rede"];
for (let i = 0; i < 15 && problems.length; i++) {
  if (i > 0) await sleep(2000);
  problems = validateMintAccount(await readAccount(conn, address), expected);
}
if (problems.length) {
  console.error(`✖ a conta ${address} nao foi confirmada: ${problems.join("; ")}`);
  console.error("✖ docs/TEST-MINT.json NAO foi gravado. Rode 'npm run mint:verify' em alguns minutos, ou me envie este endereco.");
  process.exit(1);
}

mkdirSync(dirname(REGISTRY), { recursive: true });
writeFileSync(REGISTRY, JSON.stringify({
  cluster: "devnet",
  mint: address,
  decimals: DECIMALS,
  mintAuthority: expected.mintAuthority,
  freezeAuthority: null,
  createdAt: new Date().toISOString(),
  note: "Token TEST do Alpha. Sem valor financeiro. Nao e ativo da Mainnet.",
}, null, 2) + "\n");
console.log(`✔ mint TEST criado e confirmado na Devnet: ${address} (${DECIMALS} decimais)`);
console.log("✔ endereco registrado em docs/TEST-MINT.json");
