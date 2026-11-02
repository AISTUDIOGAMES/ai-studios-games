// Regras de ambiente do BomberIdle (funcoes puras, testaveis no Node).
// dev   = DEVTEST local (vite dev): atalhos de teste liberados, rede Devnet.
// alpha = build de teste publicada: sem atalhos, rede Devnet, rotulo ALPHA.
// prod  = site atual: sem blockchain nesta fase, sem atalhos.

export type AppEnv = "dev" | "alpha" | "prod";

/** Genesis hash publico da Devnet: o RPC precisa devolver exatamente este valor. */
export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
/** Genesis hash da Mainnet: recusado em todos os ambientes desta fase. */
export const MAINNET_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

export function resolveAppEnv(raw: string | undefined, isDevServer: boolean): AppEnv {
  const v = (raw ?? (isDevServer ? "dev" : "prod")).trim();
  if (v === "dev" || v === "alpha" || v === "prod") return v;
  throw new Error(`VITE_ENV invalido: "${v}" (use dev, alpha ou prod)`);
}

/** Atalhos de teste (ex.: stamina infinita) so existem no servidor de desenvolvimento. */
export function allowsTestCheats(env: AppEnv, isDevServer: boolean): boolean {
  return isDevServer && env === "dev";
}

/** Texto do selo de ambiente exibido na tela; vazio em producao. */
export function envLabel(env: AppEnv): string {
  if (env === "dev") return "DEVTEST";
  if (env === "alpha") return "ALPHA · DEVNET";
  return "";
}

/** Falha fechada: qualquer genesis diferente do da Devnet e recusado. */
export function assertDevnetGenesis(genesisHash: string): void {
  if (genesisHash === MAINNET_GENESIS_HASH) throw new Error("RPC aponta para a Mainnet: recusado nesta fase.");
  if (genesisHash !== DEVNET_GENESIS_HASH) throw new Error("RPC nao e a Devnet: recusado.");
}
