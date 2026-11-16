import test from 'node:test';
import assert from 'node:assert/strict';
import {world, player, call, login, addProduct, chainTx, sig58, rnd58, keypair} from './helpers.mjs';
import {b58decode} from '../src/lib/base58.js';
import {buildPaymentTx} from '../src/solana.js';

async function setup(opts) { const w = world(opts), kp = player(w), token = await login(w.env, kp); addProduct(w.env, w); return {w, kp, token}; }
async function order(w, token, pid = 'skin-1') { const r = await call(w.env, 'POST', '/v1/orders', {token, body: {product_id: pid}}); return r; }
const dbOrder = (w, id) => w.env.DB.raw.prepare('SELECT * FROM mk_orders WHERE id=?').get(id);
const count = (w, t) => w.env.DB.raw.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;

test('login: assinatura válida cria sessão; nonce não pode ser reutilizado (replay)', async () => {
  const w = world(), kp = keypair();
  const ch = await call(w.env, 'POST', '/v1/wallet/challenge', {body: {wallet: kp.address}});
  const sig = kp.sign(ch.body.message), body = {wallet: kp.address, nonce: ch.body.nonce, signature: sig};
  const ok = await call(w.env, 'POST', '/v1/wallet/verify', {body}); assert.equal(ok.status, 200); assert.ok(ok.body.token);
  const again = await call(w.env, 'POST', '/v1/wallet/verify', {body}); assert.equal(again.status, 401);
});
test('login: assinatura de outra chave é rejeitada e consome o nonce', async () => {
  const w = world(), kp = keypair(), evil = keypair();
  const ch = await call(w.env, 'POST', '/v1/wallet/challenge', {body: {wallet: kp.address}});
  const bad = await call(w.env, 'POST', '/v1/wallet/verify', {body: {wallet: kp.address, nonce: ch.body.nonce, signature: evil.sign(ch.body.message)}});
  assert.equal(bad.status, 401);
  const good = await call(w.env, 'POST', '/v1/wallet/verify', {body: {wallet: kp.address, nonce: ch.body.nonce, signature: kp.sign(ch.body.message)}});
  assert.equal(good.status, 401);
});
test('endpoints protegidos exigem sessão válida', async () => {
  const w = world();
  for (const [m, p] of [['POST', '/v1/orders'], ['GET', '/v1/inventory'], ['GET', '/v1/transactions'], ['POST', '/v1/payments/verify']])
    assert.equal((await call(w.env, m, p)).status, 401);
  assert.equal((await call(w.env, 'GET', '/v1/inventory', {token: 'aaa.bbb'})).status, 401);
});
test('marketplace: paginação, filtro por jogo e por categoria; produtos inativos não aparecem', async () => {
  const w = world(); addProduct(w.env, w, {id: 'a', game_id: 'ecosystem', category: 'skins'});
  addProduct(w.env, w, {id: 'b', game_id: 'ecosystem', category: 'pets'}); addProduct(w.env, w, {id: 'c', game_id: 'ecosystem', active: 0});
  const all = await call(w.env, 'GET', '/v1/marketplace?limit=1&page=2'); assert.equal(all.body.total, 2); assert.equal(all.body.items.length, 1);
  assert.equal((await call(w.env, 'GET', '/v1/marketplace?category=pets')).body.items[0].id, 'b');
  assert.equal((await call(w.env, 'GET', '/v1/marketplace?game=../x')).status, 400);
  assert.equal((await call(w.env, 'GET', '/v1/marketplace/c')).status, 404);
});
test('pedido: preço vem do banco (cliente não define), tx é decodificável e carrega o memo do pedido', async () => {
  const {w, token, kp} = await setup();
  const r = await call(w.env, 'POST', '/v1/orders', {token, body: {product_id: 'skin-1', price: 1, amount_raw: '1'}});
  assert.equal(r.status, 200); assert.equal(r.body.order.amount_raw, '500000000'); assert.equal(r.body.order.amount_display, '500');
  const raw = Buffer.from(r.body.transaction.data, 'base64'); assert.equal(raw[0], 1); assert.equal(raw.length > 200, true);
  assert.ok(raw.includes(Buffer.from(r.body.order.memo)));
  assert.ok(raw.includes(Buffer.from(b58decode(kp.address))));
  const again = await call(w.env, 'POST', '/v1/orders', {token, body: {product_id: 'skin-1'}}); assert.equal(again.body.order.id, r.body.order.id);   // reaproveita pedido aberto
});
test('pedido: saldo insuficiente, mint diferente, pagamentos não configurados, item único já possuído', async () => {
  const w = world(), kp = player(w, '10'), token = await login(w.env, kp); addProduct(w.env, w);
  assert.equal((await order(w, token)).body.error, 'insufficient_balance');
  addProduct(w.env, w, {id: 'other', token_mint: rnd58()}); assert.equal((await order(w, token, 'other')).body.error, 'product_token_mismatch');
  const n = world({noConfig: true}), k2 = player(n), t2 = await login(n.env, k2); addProduct(n.env, n); assert.equal((await order(n, t2)).body.error, 'payments_not_configured');
});
test('RPC fora do ar: pedido falha com 503 e nada é criado', async () => {
  const {w, token} = await setup(); w.st.fail = true;
  const r = await order(w, token); assert.equal(r.status, 503); assert.equal(count(w, 'mk_orders'), 0);
  assert.ok(!JSON.stringify(r.body).includes('KEY'));    // credencial do RPC nunca aparece na resposta
});
test('Token-2022 com extensão de taxa é rejeitado; decimais vêm do mint', async () => {
  const {w, token} = await setup(); w.st.mintOwner = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'; w.env.ALLOW_TOKEN_2022 = '1'; w.st.extensions = [{extension: 'transferFeeConfig'}];
  assert.equal((await order(w, token)).body.error, 'unsupported_token_extension');
  const w2 = world(); w2.st.decimals = 9; const k = player(w2), t = await login(w2.env, k); addProduct(w2.env, w2, {price_raw: '1500000000'});
  assert.equal((await order(w2, t)).body.order.amount_display, '1.5');
});
test('fluxo completo: pagamento verificado entrega o item uma vez; repetição é idempotente', async () => {
  const {w, token, kp} = await setup(); const o = (await order(w, token)).body.order, sig = sig58(); chainTx(w, dbOrder(w, o.id), kp.address, sig);
  const v = await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: sig}});
  assert.equal(v.status, 200); assert.equal(v.body.status, 'paid');
  assert.equal(count(w, 'mk_inventory'), 1); assert.equal(dbOrder(w, o.id).status, 'paid');
  const v2 = await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: sig}}); assert.equal(v2.status, 200); assert.equal(count(w, 'mk_inventory'), 1);
  const inv = await call(w.env, 'GET', '/v1/inventory/some-game', {token}); assert.equal(inv.body.items.length, 1);   // 'ecosystem' vale em qualquer jogo
  assert.equal((await call(w.env, 'GET', '/v1/transactions', {token})).body.items[0].transaction_signature, sig);
  assert.equal((await order(w, token)).body.error, 'already_owned');
});
test('fraudes: cada campo errado é recusado e nenhum item é entregue', async () => {
  const cases = {
    wrong_mint: [{mint: rnd58()}, 'transfer_not_matching'], wrong_destination: [{dest: rnd58()}, 'transfer_not_matching'], wrong_recipient: [{recipient: rnd58()}, 'wrong_recipient'],
    amount_mismatch: [{delta: '1'}, 'amount_mismatch'], transfer_amount: [{amount: '1'}, 'transfer_not_matching'], wrong_authority: [{authority: rnd58()}, 'transfer_not_matching'],
    order_memo_missing: [{noMemo: true}, 'order_memo_missing'], other_order_memo: [{memo: 'aisg:order:other'}, 'order_memo_missing'], wrong_sender: [{payer: rnd58()}, 'wrong_sender'],
    tx_failed_on_chain: [{err: {InstructionError: [0, 'x']}}, 'tx_failed_on_chain'], signature_mismatch: [{sigInTx: sig58()}, 'signature_mismatch'],
    wrong_source_account: [{srcOwner: rnd58()}, 'wrong_source_account'], wrong_post_mint: [{postMint: rnd58()}, 'wrong_mint'], tx_older_than_order: [{blockTime: 1}, 'tx_older_than_order']
  };
  for (const [name, [ov, reason]] of Object.entries(cases)) {
    const {w, token, kp} = await setup(); const o = (await order(w, token)).body.order, sig = sig58(); chainTx(w, dbOrder(w, o.id), kp.address, sig, ov);
    const v = await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: sig}});
    assert.ok(v.status === 422 && v.body.message === reason, `${name}: esperava 422/${reason}, veio ${v.status} ${JSON.stringify(v.body)}`);
    assert.equal(count(w, 'mk_inventory'), 0, name); assert.equal(dbOrder(w, o.id).status, 'pending', name); assert.equal(count(w, 'mk_payments'), 0, name);
  }
});
test('assinatura/tx ainda não confirmada fica pendente; assinatura malformada é recusada', async () => {
  const {w, token} = await setup(); const o = (await order(w, token)).body.order;
  const p = await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: sig58()}}); assert.equal(p.body.status, 'pending');
  assert.equal((await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: 'abc'}})).status, 422);
  assert.equal(count(w, 'mk_inventory'), 0);
});
test('a mesma assinatura não paga dois pedidos (replay entre pedidos)', async () => {
  const {w, token, kp} = await setup(); addProduct(w.env, w, {id: 'skin-2'});
  const o1 = (await order(w, token)).body.order, o2 = (await order(w, token, 'skin-2')).body.order, sig = sig58();
  chainTx(w, dbOrder(w, o1.id), kp.address, sig);
  assert.equal((await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o1.id, signature: sig}})).status, 200);
  const r = await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o2.id, signature: sig}});
  assert.equal(r.body.error, 'signature_already_used'); assert.equal(count(w, 'mk_inventory'), 1);
});
test('pagamento de outro usuário não vale; pedido alheio é 404', async () => {
  const {w, token, kp} = await setup(); const o = (await order(w, token)).body.order;
  const k2 = player(w), t2 = await login(w.env, k2), sig = sig58();
  assert.equal((await call(w.env, 'GET', '/v1/orders/' + o.id, {token: t2})).status, 404);
  assert.equal((await call(w.env, 'POST', '/v1/payments/verify', {token: t2, body: {order_id: o.id, signature: sig}})).status, 404);
  chainTx(w, dbOrder(w, o.id), kp.address, sig); assert.equal((await call(w.env, 'POST', '/v1/payments/verify', {token: t2, body: {order_id: o.id, signature: sig}})).status, 404);
});
test('pagamento após o prazo vai para revisão, sem entrega e sem reembolso automático', async () => {
  const {w, token, kp} = await setup(); const o = (await order(w, token)).body.order, sig = sig58(), row = dbOrder(w, o.id);
  chainTx(w, row, kp.address, sig, {blockTime: row.expires_at + 60});
  const r = await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: sig}});
  assert.equal(r.body.error, 'payment_late'); assert.equal(dbOrder(w, o.id).status, 'review'); assert.equal(count(w, 'mk_inventory'), 0);
});
test('verificações simultâneas da mesma compra entregam exatamente um item', async () => {
  const {w, token, kp} = await setup(); const o = (await order(w, token)).body.order, sig = sig58(); chainTx(w, dbOrder(w, o.id), kp.address, sig);
  const rs = await Promise.all(Array.from({length: 6}, () => call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: sig}})));
  assert.ok(rs.every(r => r.status === 200 && r.body.status === 'paid'), JSON.stringify(rs.map(r => r.body)));
  assert.equal(count(w, 'mk_inventory'), 1); assert.equal(count(w, 'mk_payments'), 1);
});
test('consumível: pode comprar de novo e a quantidade do produto é entregue', async () => {
  const {w, token, kp} = await setup(); addProduct(w.env, w, {id: 'pack', kind: 'consumable', quantity: 5, price_raw: '1000000'});
  for (let i = 0; i < 2; i++) { const o = (await order(w, token, 'pack')).body.order, sig = sig58(); chainTx(w, dbOrder(w, o.id), kp.address, sig);
    assert.equal((await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: sig}})).status, 200); }
  assert.equal(w.env.DB.raw.prepare('SELECT SUM(quantity) s FROM mk_inventory').get().s, 10);
});
test('auditoria é append-only (UPDATE/DELETE bloqueados) e registra o pagamento', async () => {
  const {w, token, kp} = await setup(); const o = (await order(w, token)).body.order, sig = sig58(); chainTx(w, dbOrder(w, o.id), kp.address, sig);
  await call(w.env, 'POST', '/v1/payments/verify', {token, body: {order_id: o.id, signature: sig}});
  assert.ok(w.env.DB.raw.prepare("SELECT 1 FROM mk_audit_logs WHERE event_type='payment_verified'").get());
  assert.throws(() => w.env.DB.raw.exec("UPDATE mk_audit_logs SET event_type='x'")); assert.throws(() => w.env.DB.raw.exec('DELETE FROM mk_audit_logs'));
});
test('rate limit: a 21ª requisição de challenge no minuto responde 429', async () => {
  const w = world(); let last;
  for (let i = 0; i < 25; i++) last = await call(w.env, 'POST', '/v1/wallet/challenge', {body: {wallet: rnd58()}});
  assert.equal(last.status, 429);
});
test('montagem da tx: tamanho e posições fixas', () => {
  const k = () => rnd58(), tx = buildPaymentTx({payer: k(), source: k(), dest: k(), mint: k(), decimals: 6, amount: 500000000n, tokenProgram: k(), memo: 'aisg:order:x', blockhash: k()});
  assert.equal(tx[0], 1); assert.equal(tx.subarray(1, 65).every(b => b === 0), true); assert.deepEqual([...tx.subarray(65, 69)], [1, 0, 3, 6]);
});
test('login: duas verificações simultâneas com o mesmo nonce geram só UMA sessão', async () => {
  const w = world(), kp = keypair();
  const ch = await call(w.env, 'POST', '/v1/wallet/challenge', {body: {wallet: kp.address}});
  const body = {wallet: kp.address, nonce: ch.body.nonce, signature: kp.sign(ch.body.message)};
  const rs = await Promise.all(Array.from({length: 5}, () => call(w.env, 'POST', '/v1/wallet/verify', {body})));
  assert.equal(rs.filter(r => r.status === 200).length, 1);
});
