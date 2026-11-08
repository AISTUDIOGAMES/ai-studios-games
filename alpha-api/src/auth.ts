import nacl from "tweetnacl";
import bs58 from "bs58";

export const NONCE_TTL_MS = 5 * 60 * 1000;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Texto que a carteira assina para provar a posse da chave.
 * Nao autoriza transferencias: e so login. O servidor guarda o texto e nao aceita o que o cliente enviar.
 */
export function loginMessage(wallet: string, nonce: string, expiresAt: number): string {
  return [
    "BomberIdle Alpha",
    `Entrar com a carteira: ${wallet}`,
    `Nonce: ${nonce}`,
    `Valido ate: ${new Date(expiresAt).toISOString()}`,
    "Esta assinatura nao move fundos nem autoriza transacoes.",
  ].join("\n");
}

/** Confere assinatura ed25519 (base64) da mensagem pela chave publica da carteira. */
export function verifyWalletSignature(wallet: string, message: string, signatureB64: unknown): boolean {
  if (typeof signatureB64 !== "string") return false;
  try {
    const sig = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
    if (sig.length !== nacl.sign.signatureLength) return false;
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, bs58.decode(wallet));
  } catch {
    return false;
  }
}
