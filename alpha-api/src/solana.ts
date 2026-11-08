// Leitura da Devnet feita pelo servidor (Worker). So le: nao assina nem gasta nada.
// @ts-ignore - modulo de script (.mjs), sem tipos
import { validateMintAccount } from "../scripts/mint-checks.mjs";
import { DEVNET_GENESIS, MAINNET_GENESIS, TEST_MINT, TEST_MINT_AUTHORITY, TEST_MINT_DECIMALS } from "./alpha-config";

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/** Chamada JSON-RPC simples. Lanca erro se a rede responder com erro. */
export async function rpc<T>(url: string, method: string, params: unknown[], f: FetchFn): Promise<T> {
  const r = await f(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = (await r.json()) as { result?: T; error?: { message: string } };
  if (j.error) throw new Error(j.error.message);
  return j.result as T;
}

function base64ToBytes(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/** Estado on-chain para o painel DEVTEST: rede, saldo da autoridade e verificacao do mint TEST. */
export async function devnetStatus(url: string, f: FetchFn): Promise<Record<string, unknown>> {
  const mintInfo = (problems: string[]) => ({
    address: TEST_MINT,
    decimals: TEST_MINT_DECIMALS,
    verified: problems.length === 0,
    problems,
  });
  try {
    const genesis = await rpc<string>(url, "getGenesisHash", [], f);
    const network = genesis === DEVNET_GENESIS ? "devnet" : genesis === MAINNET_GENESIS ? "mainnet" : "desconhecida";
    const bal = await rpc<{ value: number }>(url, "getBalance", [TEST_MINT_AUTHORITY, { commitment: "confirmed" }], f);
    const acc = await rpc<{ value: null | { owner: string; data: [string, string] } }>(
      url, "getAccountInfo", [TEST_MINT, { encoding: "base64", commitment: "confirmed" }], f,
    );
    const info = acc.value ? { owner: acc.value.owner, data: base64ToBytes(acc.value.data[0]) } : null;
    const problems = validateMintAccount(info, { decimals: TEST_MINT_DECIMALS, mintAuthority: TEST_MINT_AUTHORITY }) as string[];
    if (network !== "devnet") problems.unshift(`rede nao e a Devnet (${network})`);
    return {
      network,
      genesis,
      rpcStatus: "ok",
      authority: { address: TEST_MINT_AUTHORITY, lamports: bal.value, sol: bal.value / 1e9 },
      mint: mintInfo(problems),
    };
  } catch (e) {
    return {
      network: "indisponivel",
      rpcStatus: `erro: ${(e as Error).message}`,
      mint: mintInfo(["RPC indisponivel: nao foi possivel verificar o mint"]),
    };
  }
}
