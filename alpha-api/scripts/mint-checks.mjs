// Conferencia do mint TEST contra o que o projeto espera. Funcoes puras, sem rede: testadas em alpha-api/test.
import bs58 from "bs58";

// Programa oficial de tokens SPL (Token Program) na Solana.
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
// Tamanho da conta de um mint SPL.
export const MINT_ACCOUNT_SIZE = 82;

/** Le o layout da conta de mint (82 bytes). Devolve null se o tamanho nao for o de um mint. */
export function parseMintData(data) {
  if (!data || data.length !== MINT_ACCOUNT_SIZE) return null;
  const optionalKey = (offset) =>
    data.readUInt32LE(offset) === 1 ? bs58.encode(data.subarray(offset + 4, offset + 36)) : null;
  return {
    mintAuthority: optionalKey(0),
    decimals: data[44],
    initialized: data[45] === 1,
    freezeAuthority: optionalKey(46),
  };
}

/**
 * Confere a conta do mint. `info` = { owner: base58, data: Buffer } ou null.
 * `expected` = { decimals, mintAuthority }. Devolve a lista de problemas (vazia = ok).
 */
export function validateMintAccount(info, expected) {
  if (!info) return ["conta nao existe na rede"];
  const problems = [];
  if (info.owner !== TOKEN_PROGRAM_ID) problems.push(`dono da conta e ${info.owner}, esperado ${TOKEN_PROGRAM_ID}`);
  const m = parseMintData(info.data);
  if (!m) return [...problems, `tamanho da conta e ${info.data?.length ?? 0} bytes, esperado ${MINT_ACCOUNT_SIZE}`];
  if (!m.initialized) problems.push("mint nao inicializado");
  if (m.decimals !== expected.decimals) problems.push(`decimais ${m.decimals}, esperado ${expected.decimals}`);
  if (m.mintAuthority !== expected.mintAuthority) problems.push(`autoridade ${m.mintAuthority}, esperada ${expected.mintAuthority}`);
  if (m.freezeAuthority !== null) problems.push(`tem autoridade de congelamento ${m.freezeAuthority}`);
  return problems;
}
