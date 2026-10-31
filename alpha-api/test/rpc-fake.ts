// Simulador da Devnet para os testes: responde as chamadas JSON-RPC que o servidor faz. Sem rede.
import bs58 from "bs58";
// @ts-ignore - modulo de script (.mjs), sem tipos
import { MINT_ACCOUNT_SIZE, TOKEN_PROGRAM_ID } from "../scripts/mint-checks.mjs";
import { TEST_MINT_AUTHORITY } from "../src/alpha-config";

export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
// A autoridade vem de alpha-config.ts (sincronizada com docs/TEST-MINT.json), nunca fixa aqui.
export const OK_AUTHORITY = TEST_MINT_AUTHORITY;

/** Conta de mint no layout do SPL Token (82 bytes), igual ao que a rede devolve. */
export function mintBuf({ decimals = 6, auth = OK_AUTHORITY, freeze = null as string | null, init = 1 } = {}): Buffer {
  const b = Buffer.alloc(MINT_ACCOUNT_SIZE);
  b.writeUInt32LE(1, 0);
  Buffer.from(bs58.decode(auth)).copy(b, 4);
  b.writeUInt8(decimals, 44);
  b.writeUInt8(init, 45);
  if (freeze) {
    b.writeUInt32LE(1, 46);
    Buffer.from(bs58.decode(freeze)).copy(b, 50);
  }
  return b;
}

export type FakeOpts = {
  genesis?: string;
  lamports?: number;
  mint?: { owner: string; data: Uint8Array } | null; // null = conta inexistente
  fail?: boolean;                                    // simula RPC fora do ar
};

export function fakeRpcFetch(opts: FakeOpts = {}) {
  return async (_url: string, init?: { body?: string }): Promise<Response> => {
    if (opts.fail) throw new TypeError("fetch failed");
    const { method } = JSON.parse(String(init?.body));
    const mint = "mint" in opts ? opts.mint : { owner: TOKEN_PROGRAM_ID, data: mintBuf() };
    let result: unknown;
    if (method === "getGenesisHash") result = opts.genesis ?? DEVNET_GENESIS;
    else if (method === "getBalance") result = { context: { slot: 1 }, value: opts.lamports ?? 4_997_846_400 };
    else if (method === "getAccountInfo") {
      result = {
        context: { slot: 1 },
        value: mint
          ? {
              owner: mint.owner,
              lamports: 1066800,
              executable: false,
              rentEpoch: 0,
              space: mint.data.length,
              data: [Buffer.from(mint.data).toString("base64"), "base64"],
            }
          : null,
      };
    } else throw new Error(`metodo nao simulado: ${method}`);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}
