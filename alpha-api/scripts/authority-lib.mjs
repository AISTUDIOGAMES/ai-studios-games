// Importa a chave de uma carteira para usar como autoridade de mint de TESTE (Devnet).
// Aceita: frase de 12/24 palavras (BIP39, caminho padrao da Phantom m/44'/501'/0'/0')
//         ou chave privada em base58 (64 bytes exportados da Phantom, ou 32 bytes).
// Funcoes puras, sem rede e sem gravar nada. Testadas em test/authority-lib.test.ts.
import { createHmac, pbkdf2Sync } from "node:crypto";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

export const PHANTOM_PATH = "m/44'/501'/0'/0'";

/** BIP39: frase -> semente de 64 bytes (sem senha extra). */
export function mnemonicToSeed(mnemonic, passphrase = "") {
  return pbkdf2Sync(
    mnemonic.normalize("NFKD"),
    ("mnemonic" + passphrase).normalize("NFKD"),
    2048,
    64,
    "sha512",
  );
}

/** SLIP-0010 para ed25519: deriva a chave privada de 32 bytes no caminho (so caminhos "hardened"). */
export function deriveEd25519(seed, path = PHANTOM_PATH) {
  let I = createHmac("sha512", "ed25519 seed").update(seed).digest();
  let key = I.subarray(0, 32);
  let chain = I.subarray(32);
  for (const seg of path.split("/").slice(1)) {
    if (!seg.endsWith("'")) throw new Error("caminho com indice nao 'hardened' nao e suportado");
    const idx = parseInt(seg.slice(0, -1), 10) + 0x80000000;
    const index = Buffer.from([(idx >>> 24) & 0xff, (idx >>> 16) & 0xff, (idx >>> 8) & 0xff, idx & 0xff]);
    I = createHmac("sha512", chain).update(Buffer.concat([Buffer.from([0]), key, index])).digest();
    key = I.subarray(0, 32);
    chain = I.subarray(32);
  }
  return Buffer.from(key);
}

/** Converte a entrada do usuario em Keypair. Lanca erro se o formato nao for reconhecido. */
export function keypairFromInput(input, path = PHANTOM_PATH) {
  const s = String(input).trim();
  const words = s.split(/\s+/);
  if (words.length >= 12) {
    return Keypair.fromSeed(deriveEd25519(mnemonicToSeed(s), path));
  }
  const raw = bs58.decode(s);
  if (raw.length === 64) return Keypair.fromSecretKey(raw);
  if (raw.length === 32) return Keypair.fromSeed(raw);
  throw new Error("formato nao reconhecido (esperado frase de 12/24 palavras ou chave base58)");
}
