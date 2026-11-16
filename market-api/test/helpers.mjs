import {readFileSync} from 'node:fs';
import {generateKeyPairSync, sign, randomBytes} from 'node:crypto';
import {makeDB} from './d1shim.mjs';
import {b58encode} from '../src/lib/base58.js';
import {TOKEN_PROGRAM, MEMO_PROGRAMS, clearMintCache} from '../src/solana.js';
import {handle} from '../src/index.js';
import {challengeMessage} from '../src/auth.js';

export const rnd58 = () => b58encode(randomBytes(32));
export const sig58 = () => b58encode(randomBytes(64));
export function keypair() {
  const {publicKey, privateKey} = generateKeyPairSync('ed25519');
  return {address: b58encode(Buffer.from(publicKey.export({format: 'jwk'}).x, 'base64url')), sign: msg => sign(null, Buffer.from(msg), privateKey).toString('base64')};
}

export function world(opts = {}) {
  clearMintCache();
  const mint = rnd58(), treasury = rnd58(), treasuryTA = rnd58(), blockhash = rnd58();
  const st = {mint, treasury, treasuryTA, blockhash, decimals: 6, mintOwner: TOKEN_PROGRAM, extensions: [], balances: {}, taccts: {}, txs: {}, fail: false, calls: 0};
  const env = {
    DB: makeDB(readFileSync(new URL('../migrations/0001_market.sql', import.meta.url), 'utf8')),
    SESSION_SECRET: 'x'.repeat(40), SOLANA_NETWORK: 'devnet', AI_STUDIO_TOKEN_MINT: opts.noConfig ? '' : mint,
    AI_STUDIO_TREASURY_WALLET: opts.noConfig ? '' : treasury, SOLANA_RPC_URL: 'https://rpc.example.invalid/KEY', ORDER_TTL_SEC: '900',
    FETCH: async (_url, init) => {
      st.calls++; if (st.fail) throw new Error('boom');
      const {method, params} = JSON.parse(init.body), res = r => ({ok: true, json: async () => ({jsonrpc: '2.0', id: 1, result: r})});
      if (method === 'getAccountInfo') return res({value: {owner: st.mintOwner, data: {parsed: {type: 'mint', info: {decimals: st.decimals, extensions: st.extensions}}}}});
      if (method === 'getTokenAccountsByOwner') {
        const owner = params[0], list = owner === st.treasury ? [{addr: st.treasuryTA, amt: '0'}] : (st.taccts[owner] ? [{addr: st.taccts[owner], amt: st.balances[owner] || '0'}] : []);
        return res({value: list.map(a => ({pubkey: a.addr, account: {owner: st.mintOwner, data: {parsed: {info: {state: 'initialized', tokenAmount: {amount: a.amt}}}}}}))});
      }
      if (method === 'getLatestBlockhash') return res({value: {blockhash, lastValidBlockHeight: 1000}});
      if (method === 'getTransaction') return res(st.txs[params[0]] ?? null);
      throw new Error('rpc method ' + method);
    }
  };
  return {env, st};
}
export function player(w, balance = '5000000000') { const k = keypair(); w.st.taccts[k.address] = rnd58(); w.st.balances[k.address] = balance; return k; }
export const call = (env, method, path, {token, body} = {}) => handle(new Request('https://api.test' + path, {method, headers: {...(token ? {authorization: 'Bearer ' + token} : {}), 'content-type': 'application/json'}, body: body ? JSON.stringify(body) : undefined}), env)
  .then(r => ({status: 200, body: r}), e => ({status: e.status || 500, body: {error: e.code, message: e.message}}));
export async function login(env, kp) {
  const ch = await call(env, 'POST', '/v1/wallet/challenge', {body: {wallet: kp.address}});
  const v = await call(env, 'POST', '/v1/wallet/verify', {body: {wallet: kp.address, nonce: ch.body.nonce, signature: kp.sign(ch.body.message)}});
  return v.body.token;
}
export function addProduct(env, w, o = {}) {
  const p = {id: 'skin-1', game_id: 'ecosystem', name: 'Legendary Skin', category: 'skins', price_raw: '500000000', rarity: 'legendary', kind: 'unique', quantity: 1, active: 1, ...o};
  env.DB.raw.prepare('INSERT INTO mk_products(id,game_id,name,description,category,price_raw,token_mint,rarity,kind,quantity,compatible_games,active,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(p.id, p.game_id, p.name, '', p.category, p.price_raw, p.token_mint || w.st.mint, p.rarity, p.kind, p.quantity, p.compat || '[]', p.active, Math.floor(Date.now() / 1000));
  return p;
}
// Transação "on-chain" coerente com o pedido; overrides sabotam um campo por teste.
export function chainTx(w, order, wallet, sig, o = {}) {
  const src = w.st.taccts[wallet], amount = o.amount ?? order.amount_raw, mint = o.mint ?? w.st.mint, dest = o.dest ?? order.treasury_token_account;
  const bt = o.blockTime ?? order.created_at + 5;
  const ixs = [{programId: TOKEN_PROGRAM, parsed: {type: 'transferChecked', info: {source: src, mint, destination: dest, authority: o.authority ?? wallet, tokenAmount: {amount, decimals: '6'}}}}];
  if (!o.noMemo) ixs.push({programId: MEMO_PROGRAMS[0], parsed: o.memo ?? order.memo});
  w.st.txs[sig] = {slot: 1, blockTime: bt, meta: {err: o.err ?? null,
    preTokenBalances: [{accountIndex: 1, mint, owner: o.srcOwner ?? wallet, uiTokenAmount: {amount: '5000000000'}}, {accountIndex: 2, mint, owner: w.st.treasury, uiTokenAmount: {amount: '0'}}],
    postTokenBalances: [{accountIndex: 1, mint, owner: wallet, uiTokenAmount: {amount: '4500000000'}}, {accountIndex: 2, mint: o.postMint ?? mint, owner: o.recipient ?? w.st.treasury, uiTokenAmount: {amount: o.delta ?? order.amount_raw}}]},
    transaction: {signatures: [o.sigInTx ?? sig], message: {accountKeys: [{pubkey: o.payer ?? wallet, signer: true}, {pubkey: src}, {pubkey: order.treasury_token_account}, {pubkey: mint}], instructions: ixs}}};
}
