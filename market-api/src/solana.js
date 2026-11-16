import {b58decode, b58encode, isAddress, b64} from './lib/base58.js';
import {HttpError} from './config.js';

export const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const MEMO_PROGRAMS = ['MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'];
// Extensões do Token-2022 que mudam o valor recebido ou dão poder sobre a conta: sempre rejeitadas.
const BANNED_EXT = new Set(['transferFeeConfig', 'transferHook', 'permanentDelegate', 'nonTransferable', 'confidentialTransferMint', 'pausable', 'defaultAccountState']);

// ---------- RPC (fallback + retentativas, sem vazar URL/credencial em erros) ----------
export async function rpc(env, cfg, method, params) {
  const f = env.FETCH || fetch;
  let last = 'rpc_unavailable';
  for (const url of cfg.rpcUrls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await f(url, {method: 'POST', headers: {'content-type': 'application/json'}, signal: ctl.signal,
          body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params})});
        clearTimeout(t);
        if (!r.ok) { last = 'http_' + r.status; continue; }
        const j = await r.json();
        if (j.error) { last = 'rpc_error_' + (j.error.code ?? 'x'); if (j.error.code === -32602) break; continue; }
        return j.result;
      } catch { clearTimeout(t); last = 'network'; }
    }
  }
  throw new HttpError(503, 'rpc_unavailable', 'Falha ao consultar a Solana (' + last + ')');
}

// ---------- Mint: decimais e programa vêm da conta real; nada é presumido ----------
const mintCache = new Map();
export async function getMintInfo(env, cfg) {
  const hit = mintCache.get(cfg.mint + cfg.network);
  if (hit && Date.now() - hit.at < 300000) return hit.v;
  const res = await rpc(env, cfg, 'getAccountInfo', [cfg.mint, {encoding: 'jsonParsed', commitment: 'confirmed'}]);
  const acc = res && res.value;
  if (!acc) throw new HttpError(503, 'mint_not_found', 'Mint não existe nesta rede');
  const program = acc.owner;
  if (program !== TOKEN_PROGRAM && !(program === TOKEN_2022_PROGRAM && cfg.allowToken2022))
    throw new HttpError(503, 'unsupported_token_program', 'Programa de token não suportado: ' + program);
  const p = acc.data && acc.data.parsed;
  if (!p || p.type !== 'mint' || !Number.isInteger(p.info.decimals)) throw new HttpError(503, 'not_a_mint', 'A conta informada não é um mint');
  if (program === TOKEN_2022_PROGRAM) {
    const bad = (p.info.extensions || []).map(e => e.extension).filter(e => BANNED_EXT.has(e));
    if (bad.length) throw new HttpError(503, 'unsupported_token_extension', 'Extensões não suportadas: ' + bad.join(','));
  }
  const v = {decimals: p.info.decimals, program};
  mintCache.set(cfg.mint + cfg.network, {at: Date.now(), v});
  return v;
}
export const clearMintCache = () => mintCache.clear();

async function tokenAccountsOf(env, cfg, owner, program) {
  const r = await rpc(env, cfg, 'getTokenAccountsByOwner', [owner, {mint: cfg.mint}, {encoding: 'jsonParsed', commitment: 'confirmed'}]);
  return (r.value || []).filter(a => a.account.owner === program && a.account.data.parsed.info.state === 'initialized')
    .map(a => ({address: a.pubkey, amount: BigInt(a.account.data.parsed.info.tokenAmount.amount)}));
}
export async function getTreasuryTokenAccount(env, cfg, program) {
  if (cfg.treasuryTokenAccountOverride) {
    if (!isAddress(cfg.treasuryTokenAccountOverride)) throw new HttpError(500, 'config', 'AI_STUDIO_TREASURY_TOKEN_ACCOUNT inválida');
    return cfg.treasuryTokenAccountOverride;
  }
  const list = await tokenAccountsOf(env, cfg, cfg.treasury, program);
  if (!list.length) throw new HttpError(503, 'treasury_token_account_missing', 'A tesouraria ainda não tem conta deste token');
  return list.sort((a, b) => (a.address < b.address ? -1 : 1))[0].address;
}
export async function getSenderTokenAccount(env, cfg, wallet, program) {
  const list = await tokenAccountsOf(env, cfg, wallet, program);
  if (!list.length) return null;
  return list.sort((a, b) => (a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1))[0];
}

// ---------- Montagem da transação (legacy, sem assinatura): TransferChecked + Memo ----------
const shortvec = n => { const o = []; for (;;) { let b = n & 0x7f; n >>= 7; if (n) o.push(b | 0x80); else { o.push(b); return o; } } };
export function buildPaymentTx({payer, source, dest, mint, decimals, amount, tokenProgram, memo, blockhash}) {
  const keys = [payer, source, dest, mint, tokenProgram, MEMO_PROGRAMS[0]];   // writable-signer, writable x2, readonly x3
  const data1 = new Uint8Array(10); data1[0] = 12;                           // TransferChecked
  new DataView(data1.buffer).setBigUint64(1, BigInt(amount), true); data1[9] = decimals;
  const memoBytes = new TextEncoder().encode(memo);
  const out = [1, 0, 3, ...shortvec(keys.length)];
  for (const k of keys) out.push(...b58decode(k));
  out.push(...b58decode(blockhash), ...shortvec(2));
  out.push(4, ...shortvec(4), 1, 3, 2, 0, ...shortvec(data1.length), ...data1);   // token: source, mint, dest, owner
  out.push(5, ...shortvec(1), 0, ...shortvec(memoBytes.length), ...memoBytes);    // memo assinado pelo pagador
  const message = Uint8Array.from(out);
  return Uint8Array.from([...shortvec(1), ...new Uint8Array(64), ...message]);    // 1 assinatura vazia + mensagem
}
export const txToBase64 = b64;

// ---------- Verificação independente do pagamento ----------
// Devolve {state:'verified'|'pending'|'failed'|'late', reason, ...dados}. Nunca confia em dados do cliente.
export async function verifyPaymentTx(env, cfg, order, wallet, signature, mintInfo) {
  try { if (b58decode(signature).length !== 64) throw 0; } catch { return {state: 'failed', reason: 'bad_signature_format'}; }
  const tx = await rpc(env, cfg, 'getTransaction', [signature, {encoding: 'jsonParsed', commitment: cfg.commitment, maxSupportedTransactionVersion: 0}]);
  if (!tx) return {state: 'pending', reason: 'not_found_yet'};
  if (!tx.meta) return {state: 'pending', reason: 'no_meta'};
  if (tx.meta.err) return {state: 'failed', reason: 'tx_failed_on_chain'};
  const msg = tx.transaction.message, keys = msg.accountKeys.map(k => (typeof k === 'string' ? {pubkey: k} : k));
  if (tx.transaction.signatures[0] !== signature) return {state: 'failed', reason: 'signature_mismatch'};
  if (keys[0].pubkey !== wallet) return {state: 'failed', reason: 'wrong_sender'};            // pagador/assinante = jogador logado
  const memoOk = msg.instructions.some(i => MEMO_PROGRAMS.includes(i.programId) && i.parsed === order.memo);
  if (!memoOk) return {state: 'failed', reason: 'order_memo_missing'};                        // amarra a transação a ESTE pedido
  const xfer = msg.instructions.filter(i => i.programId === mintInfo.program && i.parsed && i.parsed.type === 'transferChecked' &&
    i.parsed.info.mint === order.token_mint && i.parsed.info.destination === order.treasury_token_account &&
    (i.parsed.info.authority === wallet) && i.parsed.info.tokenAmount.amount === order.amount_raw &&
    Number(i.parsed.info.tokenAmount.decimals) === order.decimals);
  if (xfer.length !== 1) return {state: 'failed', reason: 'transfer_not_matching'};
  // Conferência cruzada pelos saldos reais (mint certo, dono certo, variação exata na tesouraria)
  const idx = a => keys.findIndex(k => k.pubkey === a);
  const di = idx(order.treasury_token_account), si = idx(xfer[0].parsed.info.source);
  const bal = (list, i) => (list || []).find(b => b.accountIndex === i);
  const pre = bal(tx.meta.preTokenBalances, di), post = bal(tx.meta.postTokenBalances, di), srcPre = bal(tx.meta.preTokenBalances, si);
  if (!post || post.mint !== order.token_mint) return {state: 'failed', reason: 'wrong_mint'};
  if (!srcPre || srcPre.owner !== wallet || srcPre.mint !== order.token_mint) return {state: 'failed', reason: 'wrong_source_account'};
  const delta = BigInt(post.uiTokenAmount.amount) - BigInt(pre ? pre.uiTokenAmount.amount : '0');
  if (delta !== BigInt(order.amount_raw)) return {state: 'failed', reason: 'amount_mismatch'};
  if (post.owner !== cfg.treasury) return {state: 'failed', reason: 'wrong_recipient'};
  const bt = tx.blockTime;
  if (!bt) return {state: 'pending', reason: 'no_block_time'};
  if (bt < order.created_at - 30) return {state: 'failed', reason: 'tx_older_than_order'};
  if (bt > order.expires_at) return {state: 'late', reason: 'paid_after_expiry', blockTime: bt};
  return {state: 'verified', blockTime: bt, slot: tx.slot};
}
export {b58encode};
