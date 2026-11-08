// Contrato minimo do D1 e das variaveis do Worker.
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes?: number } }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}
export interface Env {
  DB: D1Database;
  APP_ENV: "dev" | "alpha" | "prod";
  SOLANA_CLUSTER: string;
  VERSION: string;
  ADMIN_WALLETS: string;
  ALLOW_ORIGIN: string;
  // Opcional: RPC da Devnet. Se ausente, usa o padrao publico (alpha-config).
  SOLANA_RPC_URL?: string;
}
