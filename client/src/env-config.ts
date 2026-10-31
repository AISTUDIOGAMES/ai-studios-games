// Ligacao das regras de ambiente com o Vite (valores vindos de VITE_* na build).
import { resolveAppEnv, allowsTestCheats, envLabel, AppEnv } from "./env-rules";

export const APP_ENV: AppEnv = resolveAppEnv(import.meta.env.VITE_ENV as string | undefined, import.meta.env.DEV);
export const TEST_CHEATS = allowsTestCheats(APP_ENV, import.meta.env.DEV);
export const ENV_LABEL = envLabel(APP_ENV);
export const RPC_URL: string = (import.meta.env.VITE_RPC_URL as string | undefined) || "https://api.devnet.solana.com";

/** Worker do Alpha. Vazio em producao: o site atual nao faz login Alpha. */
const alphaUrl = ((import.meta.env.VITE_ALPHA_API_URL as string | undefined) ?? "").trim().replace(/\/+$/, "");
export const ALPHA_API_URL: string = APP_ENV === "prod" ? "" : alphaUrl;

/**
 * Confere no RPC configurado do jogo que a rede e a Devnet.
 * ATENCAO: nao le a rede selecionada na Phantom (a API antiga window.solana nao expoe isso).
 */
export async function assertRpcIsDevnet(rpcUrl: string = RPC_URL): Promise<void> {
  const { Connection } = await import("@solana/web3.js");
  const { assertDevnetGenesis } = await import("./env-rules");
  assertDevnetGenesis(await new Connection(rpcUrl, "confirmed").getGenesisHash());
}
