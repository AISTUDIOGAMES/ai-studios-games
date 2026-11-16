import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {world, player, addProduct} from './helpers.mjs';
import {handle} from '../src/index.js';
import {b58encode, b58decode} from '../src/lib/base58.js';
import {chainTx} from './helpers.mjs';
import {HttpError} from '../src/config.js';

globalThis.window = new EventTarget();
// uma carteira que se registrou ANTES do app carregar (escuta app-ready)
let early = null; window.addEventListener('wallet-standard:app-ready', e => { early = e.detail; });
await import('../../public/shared/aisg-wallet.js');
const W = window.AISGWallet;

function fakeWallet(w, kp, o = {}) {
  const listeners = [];
  const account = {address: kp.address, chains: o.chains || ['solana:devnet', 'solana:mainnet'], features: []};
  const wallet = {name: o.name || 'FakeWallet', icon: 'data:,', chains: account.chains, accounts: [account], features: {
    'standard:connect': {connect: async () => ({accounts: [account]})},
    'standard:disconnect': {disconnect: async () => {}},
    'standard:events': {on: (_e, f) => { listeners.push(f); return () => listeners.splice(listeners.indexOf(f), 1); }},
    'solana:signMessage': {signMessage: async ([{message}] = [{}]) => [{signedMessage: message, signature: new Uint8Array(Buffer.from(kp.sign(message), 'base64'))}]},
    'solana:signAndSendTransaction': {signAndSendTransaction: async ({transaction}) => {
      if (o.reject) throw new Error('User rejected the request');
      const txt = Buffer.from(transaction).toString('latin1'), memo = /aisg:order:[0-9a-f-]{36}/.exec(txt)[0];
      const sigBytes = randomBytes(64), order = w.env.DB.raw.prepare('SELECT * FROM mk_orders WHERE memo=?').get(memo);
      chainTx(w, order, kp.address, b58encode(sigBytes));            // "a blockchain" passa a conter a transação
      return [{signature: new Uint8Array(sigBytes)}];
    }}}};
  // signMessage do Wallet Standard recebe um objeto {account, message}; ajusta a assinatura acima
  wallet.features['solana:signMessage'].signMessage = async input => { const m = input.message; return [{signedMessage: m, signature: new Uint8Array(Buffer.from(kp.sign(m), 'base64'))}]; };
  return {wallet, fire: accounts => listeners.forEach(f => f({accounts})), account};
}
const register = wallet => window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {detail: api => api.register(wallet)}));
function wire(w) {
  W.configure({api: 'https://api.test', pollMs: 1, pollMax: 5, fetch: async (url, init) => {
    try { const r = await handle(new Request(url, init), w.env); return {ok: true, status: 200, json: async () => r}; }
    catch (e) { const st = e instanceof HttpError ? e.status : 500; return {ok: false, status: st, json: async () => ({error: e.code, message: e.message})}; }
  }});
}
const reset = async () => { await W.disconnect(); };

test('sem carteira registrada: connect falha com no_wallet', async () => {
  await assert.rejects(() => W.connect(), e => e.code === 'no_wallet');
  assert.equal(typeof early.register, 'function');   // o registro do app-ready foi entregue
});
test('conectar, logar e comprar: só vira "paid" após o servidor confirmar; item aparece no inventário', async () => {
  const w = world(), kp = player(w); addProduct(w.env, w); wire(w);
  const fw = fakeWallet(w, kp); register(fw.wallet);
  assert.deepEqual(W.wallets().map(x => x.name), ['FakeWallet']);
  assert.equal(await W.connect('FakeWallet'), kp.address); assert.equal(W.short(), kp.address.slice(0, 4) + '…' + kp.address.slice(-4));
  const states = []; const r = await W.buy('skin-1', s => states.push(s.state));
  assert.deepEqual(states, ['awaiting_signature', 'pending', 'paid']); assert.equal(r.state, 'paid');
  assert.equal((await W.inventory('any-game')).items.length, 1);
  assert.equal((await W.transactions()).items[0].status, 'paid');
  await reset();
});
test('assinatura recusada na carteira: estado rejected, nada é entregue', async () => {
  const w = world(), kp = player(w); addProduct(w.env, w); wire(w);
  const fw = fakeWallet(w, kp, {reject: true, name: 'Rejecter'}); register(fw.wallet); await W.connect('Rejecter');
  const states = []; await assert.rejects(() => W.buy('skin-1', s => states.push(s.state)), e => e.code === 'rejected');
  assert.deepEqual(states, ['awaiting_signature', 'rejected']); assert.equal(w.env.DB.raw.prepare('SELECT COUNT(*) n FROM mk_inventory').get().n, 0);
  await reset();
});
test('saldo insuficiente: avisa antes de abrir a carteira', async () => {
  const w = world(), kp = player(w, '1'); addProduct(w.env, w); wire(w);
  const fw = fakeWallet(w, kp, {name: 'Poor'}); register(fw.wallet); await W.connect('Poor');
  const states = []; await assert.rejects(() => W.buy('skin-1', s => states.push(s.state)), e => e.code === 'insufficient_balance');
  assert.deepEqual(states, ['insufficient_balance']); await reset();
});
test('trocar de conta na carteira derruba a sessão; desconectar também', async () => {
  const w = world(), kp = player(w), kp2 = player(w); wire(w);
  const fw = fakeWallet(w, kp, {name: 'Switcher'}); register(fw.wallet); await W.connect('Switcher'); await W.login(); assert.ok(W.isLoggedIn());
  const seen = []; W.on('accountChanged', a => seen.push(a));
  fw.fire([{address: kp2.address, chains: ['solana:devnet']}]);
  assert.equal(W.isLoggedIn(), false); assert.deepEqual(seen, [kp2.address]); assert.equal(W.address(), kp2.address);
  fw.fire([]); assert.equal(W.address(), null); await reset();
});
test('carteira sem suporte à rede da API (devnet) é recusada no login', async () => {
  const w = world(), kp = player(w); wire(w);
  const fw = fakeWallet(w, kp, {name: 'MainnetOnly', chains: ['solana:mainnet']}); register(fw.wallet); await W.connect('MainnetOnly');
  await assert.rejects(() => W.login(), e => e.code === 'wrong_network'); await reset();
});
test('comprar sem conectar: erro claro', async () => {
  await assert.rejects(() => W.buy('x'), e => e.code === 'wallet_not_connected');
});
