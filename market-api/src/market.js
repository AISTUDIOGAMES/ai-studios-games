import {HttpError, getConfig, requirePaymentConfig, formatUnits} from './config.js';
import {now} from './auth.js';
import {getMintInfo, getTreasuryTokenAccount, getSenderTokenAccount, rpc, buildPaymentTx, txToBase64, verifyPaymentTx} from './solana.js';

const GAME_RE = /^[a-z0-9-]{1,40}$/;
const audit = (env, type, userId, ref, meta) => env.DB.prepare('INSERT INTO mk_audit_logs(event_type, user_id, reference_id, timestamp, metadata) VALUES(?,?,?,?,?)')
  .bind(type, userId ?? null, ref ?? null, now(), JSON.stringify(meta || {}));
const pub = p => ({id: p.id, game_id: p.game_id, name: p.name, description: p.description, category: p.category, price_raw: p.price_raw,
  token_mint: p.token_mint, rarity: p.rarity, kind: p.kind, quantity: p.quantity, image_url: p.image_url,
  metadata: safeJson(p.metadata, {}), compatible_games: safeJson(p.compatible_games, [])});
const safeJson = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
function page(url) {
  const p = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1), l = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  return {p, l, off: (p - 1) * l};
}

// ---------- Marketplace (público, só dados não sensíveis) ----------
export async function listProducts(env, url) {
  const {p, l, off} = page(url), w = ['active=1'], a = [];
  const game = url.searchParams.get('game'), cat = url.searchParams.get('category'), rar = url.searchParams.get('rarity'), q = url.searchParams.get('q');
  if (game) { if (!GAME_RE.test(game)) throw new HttpError(400, 'bad_game'); w.push("(game_id=? OR game_id='ecosystem' OR compatible_games LIKE ?)"); a.push(game, `%"${game}"%`); }
  if (cat) { w.push('category=?'); a.push(cat.slice(0, 40)); }
  if (rar) { w.push('rarity=?'); a.push(rar.slice(0, 20)); }
  if (q) { w.push("(name LIKE ? ESCAPE '\\')"); a.push('%' + q.slice(0, 60).replace(/[\\%_]/g, '\\$&') + '%'); }
  const where = w.join(' AND ');
  const total = (await env.DB.prepare(`SELECT COUNT(*) n FROM mk_products WHERE ${where}`).bind(...a).first()).n;
  const rows = (await env.DB.prepare(`SELECT * FROM mk_products WHERE ${where} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`).bind(...a, l, off).all()).results;
  return {page: p, limit: l, total, items: rows.map(pub)};
}
export async function getProduct(env, id) {
  const r = await env.DB.prepare('SELECT * FROM mk_products WHERE id=? AND active=1').bind(String(id).slice(0, 80)).first();
  if (!r) throw new HttpError(404, 'not_found');
  return pub(r);
}

// ---------- Pedidos ----------
const orderView = o => ({id: o.id, status: o.status, product_id: o.product_id, game_id: o.game_id, amount_raw: o.amount_raw, decimals: o.decimals,
  amount_display: formatUnits(o.amount_raw, o.decimals), token_mint: o.token_mint, treasury_token_account: o.treasury_token_account,
  memo: o.memo, expires_at: o.expires_at, created_at: o.created_at, expired: o.status === 'pending' && now() > o.expires_at});

export async function createOrder(env, user, body) {
  const productId = body && typeof body.product_id === 'string' ? body.product_id.slice(0, 80) : '';
  if (!productId) throw new HttpError(400, 'bad_request');
  const cfg = requirePaymentConfig(getConfig(env));
  const prod = await env.DB.prepare('SELECT * FROM mk_products WHERE id=? AND active=1').bind(productId).first();
  if (!prod) throw new HttpError(404, 'not_found');
  if (prod.token_mint !== cfg.mint) throw new HttpError(409, 'product_token_mismatch');          // rejeita qualquer outro token
  if (prod.kind === 'unique') {
    const own = await env.DB.prepare('SELECT 1 x FROM mk_inventory WHERE user_id=? AND product_id=?').bind(user.id, prod.id).first();
    if (own) throw new HttpError(409, 'already_owned');
  }
  const mintInfo = await getMintInfo(env, cfg);
  const t = now();
  let order = await env.DB.prepare("SELECT * FROM mk_orders WHERE user_id=? AND product_id=? AND status='pending' AND expires_at>? ORDER BY created_at DESC LIMIT 1").bind(user.id, prod.id, t).first();
  const open = (await env.DB.prepare("SELECT COUNT(*) n FROM mk_orders WHERE user_id=? AND status='pending' AND expires_at>?").bind(user.id, t).first()).n;
  if (!order && open >= 10) throw new HttpError(429, 'too_many_open_orders');
  const treasuryTA = await getTreasuryTokenAccount(env, cfg, mintInfo.program);
  const amount = BigInt(prod.price_raw);                                                          // preço vem SEMPRE do banco
  const src = await getSenderTokenAccount(env, cfg, user.wallet, mintInfo.program);
  if (!src || src.amount < amount) throw new HttpError(409, 'insufficient_balance', 'Saldo insuficiente do token');
  if (!order) {
    const id = crypto.randomUUID(), memo = 'aisg:order:' + id;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO mk_orders(id,user_id,product_id,game_id,amount_raw,token_mint,decimals,treasury_token_account,memo,status,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, user.id, prod.id, prod.game_id, prod.price_raw, cfg.mint, mintInfo.decimals, treasuryTA, memo, 'pending', t + cfg.orderTtlSec, t),
      audit(env, 'order_created', user.id, id, {product_id: prod.id, amount_raw: prod.price_raw})]);
    order = await env.DB.prepare('SELECT * FROM mk_orders WHERE id=?').bind(id).first();
  }
  const bh = (await rpc(env, cfg, 'getLatestBlockhash', [{commitment: 'confirmed'}])).value;
  const tx = buildPaymentTx({payer: user.wallet, source: src.address, dest: order.treasury_token_account, mint: cfg.mint, decimals: order.decimals,
    amount, tokenProgram: mintInfo.program, memo: order.memo, blockhash: bh.blockhash});
  return {order: {...orderView(order), treasury_wallet: cfg.treasury}, transaction: {encoding: 'base64', data: txToBase64(tx), last_valid_block_height: bh.lastValidBlockHeight, chain: cfg.chain}};
}

export async function getOrder(env, user, id) {
  const o = await env.DB.prepare('SELECT * FROM mk_orders WHERE id=? AND user_id=?').bind(String(id).slice(0, 60), user.id).first();
  if (!o) throw new HttpError(404, 'not_found');
  const cfg = getConfig(env);
  if (o.status === 'pending' && now() > o.expires_at + cfg.lateGraceSec) {
    await env.DB.batch([env.DB.prepare("UPDATE mk_orders SET status='expired' WHERE id=? AND status='pending'").bind(o.id), audit(env, 'order_expired', user.id, o.id, {})]);
    o.status = 'expired';
  }
  const pay = await env.DB.prepare('SELECT transaction_signature, verified_at FROM mk_payments WHERE order_id=?').bind(o.id).first();
  return {order: orderView(o), payment: pay || null};
}

// ---------- Verificação do pagamento + entrega atômica ----------
export async function verifyPayment(env, user, body) {
  const orderId = body && typeof body.order_id === 'string' ? body.order_id.slice(0, 60) : '', sig = body && typeof body.signature === 'string' ? body.signature.trim() : '';
  if (!orderId || !sig || sig.length > 100) throw new HttpError(400, 'bad_request');
  const o = await env.DB.prepare('SELECT * FROM mk_orders WHERE id=? AND user_id=?').bind(orderId, user.id).first();
  if (!o) throw new HttpError(404, 'not_found');
  const done = async () => { const p = await env.DB.prepare('SELECT transaction_signature FROM mk_payments WHERE order_id=?').bind(o.id).first();
    return p && p.transaction_signature === sig ? {status: 'paid', delivered: true, order_id: o.id} : null; };
  if (o.status === 'paid') { const r = await done(); if (r) return r; throw new HttpError(409, 'order_already_paid'); }   // idempotente
  if (o.status !== 'pending') throw new HttpError(409, 'order_not_payable', 'Pedido ' + o.status);
  const used = await env.DB.prepare('SELECT order_id FROM mk_payments WHERE transaction_signature=?').bind(sig).first();
  if (used) { await audit(env, 'signature_reuse_blocked', user.id, o.id, {other: used.order_id}).run(); throw new HttpError(409, 'signature_already_used'); }
  const cfg = requirePaymentConfig(getConfig(env));
  const mintInfo = await getMintInfo(env, cfg);
  const v = await verifyPaymentTx(env, cfg, o, user.wallet, sig, mintInfo);
  const attempt = (outcome, reason) => env.DB.prepare('INSERT INTO mk_payment_attempts(order_id, transaction_signature, outcome, reason, created_at) VALUES(?,?,?,?,?)').bind(o.id, sig, outcome, reason || null, now());
  if (v.state === 'pending') { await attempt('pending', v.reason).run(); return {status: 'pending', reason: v.reason, order_id: o.id}; }
  if (v.state === 'failed') { await env.DB.batch([attempt('failed', v.reason), audit(env, 'payment_rejected', user.id, o.id, {reason: v.reason, sig})]); throw new HttpError(422, 'payment_invalid', v.reason); }
  if (v.state === 'late') {                                                                       // pago depois do prazo: sem reembolso automático, vai para revisão
    await env.DB.batch([attempt('late', v.reason), env.DB.prepare("UPDATE mk_orders SET status='review' WHERE id=? AND status='pending'").bind(o.id), audit(env, 'payment_late_review', user.id, o.id, {sig})]);
    throw new HttpError(409, 'payment_late', 'Pagamento recebido após o prazo; em revisão manual');
  }
  const t = now(), pc = `EXISTS(SELECT 1 FROM mk_payments WHERE order_id=? AND transaction_signature=?)`;
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO mk_payments(order_id, transaction_signature, sender_wallet, treasury_wallet, token_mint, amount_raw, verification_status, block_time, verified_at)
        SELECT id, ?, ?, ?, token_mint, amount_raw, 'verified', ?, ? FROM mk_orders WHERE id=? AND status='pending'`).bind(sig, user.wallet, cfg.treasury, v.blockTime, t, o.id),
      env.DB.prepare(`UPDATE mk_orders SET status='paid' WHERE id=? AND status='pending' AND ${pc}`).bind(o.id, o.id, sig),
      env.DB.prepare(`INSERT INTO mk_inventory(user_id, product_id, game_id, purchase_id, quantity, metadata, delivery_status, acquired_at)
        SELECT o.user_id, o.product_id, o.game_id, o.id, p.quantity, p.metadata, 'delivered', ? FROM mk_orders o JOIN mk_products p ON p.id=o.product_id
        WHERE o.id=? AND o.status='paid' AND ${pc}`).bind(t, o.id, o.id, sig),
      env.DB.prepare(`INSERT INTO mk_audit_logs(event_type, user_id, reference_id, timestamp, metadata) SELECT 'payment_verified', ?, ?, ?, ? WHERE ${pc}`)
        .bind(user.id, o.id, t, JSON.stringify({sig, amount_raw: o.amount_raw}), o.id, sig)]);
  } catch (e) {                                                                                   // corrida/duplicata: a restrição UNIQUE barrou; estado real decide
    const r = await done(); if (r) return r;
    throw new HttpError(409, 'payment_conflict');
  }
  const r = await done(); if (r) return r;
  throw new HttpError(409, 'order_not_payable');
}

// ---------- Inventário e histórico ----------
export async function getInventory(env, user, gameId, url) {
  const {p, l, off} = page(url), w = ['i.user_id=?'], a = [user.id];
  if (gameId) { if (!GAME_RE.test(gameId)) throw new HttpError(400, 'bad_game');
    w.push("(i.game_id=? OR i.game_id='ecosystem' OR pr.compatible_games LIKE ?)"); a.push(gameId, `%"${gameId}"%`); }
  const where = w.join(' AND ');
  const total = (await env.DB.prepare(`SELECT COUNT(*) n FROM mk_inventory i JOIN mk_products pr ON pr.id=i.product_id WHERE ${where}`).bind(...a).first()).n;
  const rows = (await env.DB.prepare(`SELECT i.id, i.product_id, i.game_id, i.purchase_id, i.quantity, i.metadata, i.delivery_status, i.acquired_at, pr.name, pr.category, pr.rarity, pr.kind, pr.compatible_games
    FROM mk_inventory i JOIN mk_products pr ON pr.id=i.product_id WHERE ${where} ORDER BY i.acquired_at DESC, i.id DESC LIMIT ? OFFSET ?`).bind(...a, l, off).all()).results;
  return {page: p, limit: l, total, items: rows.map(r => ({...r, metadata: safeJson(r.metadata, {}), compatible_games: safeJson(r.compatible_games, [])}))};
}
export async function listTransactions(env, user, url) {
  const {p, l, off} = page(url);
  const total = (await env.DB.prepare('SELECT COUNT(*) n FROM mk_orders WHERE user_id=?').bind(user.id).first()).n;
  const rows = (await env.DB.prepare(`SELECT o.id, o.product_id, o.amount_raw, o.decimals, o.status, o.created_at, o.expires_at, p.transaction_signature
    FROM mk_orders o LEFT JOIN mk_payments p ON p.order_id=o.id WHERE o.user_id=? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`).bind(user.id, l, off).all()).results;
  return {page: p, limit: l, total, items: rows.map(r => ({...r, amount_display: formatUnits(r.amount_raw, r.decimals)}))};
}
