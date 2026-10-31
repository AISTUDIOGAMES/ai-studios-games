// Sessao do Alpha: login por assinatura de mensagem e consulta do DEVTEST.
// Sem imports e sem armazenamento: o token fica so com quem chamou (memoria da pagina).
// fetch e o assinador entram por parametro, para o mesmo codigo rodar no navegador e nos testes.

export type RequestInitLike = { method?: string; headers?: Record<string, string>; body?: string };
export type FetchLike = (
  url: string,
  init?: RequestInitLike,
) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

/** Assina um texto e devolve a assinatura em base64 (64 bytes Ed25519). */
export type SignText = (message: string) => Promise<string>;

export interface AlphaSession {
  wallet: string;
  token: string;
  expiresAt: number;
  admin: boolean;
}

export class AlphaApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AlphaApiError";
    this.status = status;
  }
}

const JSON_HEADERS = { "content-type": "application/json" };

async function call<T>(f: FetchLike, base: string, path: string, init?: RequestInitLike): Promise<T> {
  const r = await f(`${base}${path}`, init);
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new AlphaApiError(r.status, typeof data?.error === "string" ? data.error : `Erro ${r.status}`);
  return data as T;
}

/** Login: pede o desafio, a carteira assina a mensagem que o SERVIDOR gerou, e recebe a sessao. */
export async function loginWithWallet(base: string, wallet: string, f: FetchLike, sign: SignText): Promise<AlphaSession> {
  const challenge = await call<{ nonce: string; message: string }>(f, base, "/auth/nonce", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ wallet }),
  });
  const signature = await sign(challenge.message);
  const session = await call<{ token: string; expiresAt: number; admin?: boolean }>(f, base, "/auth/verify", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ wallet, nonce: challenge.nonce, signature }),
  });
  return { wallet, token: session.token, expiresAt: session.expiresAt, admin: session.admin === true };
}

/** Consulta o DEVTEST. Quem decide se pode ver e o servidor: o cliente so envia o token. */
export function devtestStatus(base: string, session: AlphaSession, f: FetchLike): Promise<Record<string, unknown>> {
  return call<Record<string, unknown>>(f, base, "/devtest/status", {
    headers: { authorization: `Bearer ${session.token}` },
  });
}
