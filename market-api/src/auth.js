import {b58decode, isAddress} from './lib/base58.js';
import {HttpError} from './config.js';

const enc = new TextEncoder();
const b64u = u8 => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export const now = () => Math.floor(Date.now() / 1000);
const NONCE_TTL = 300, SESSION_TTL = 3600;

export const challengeMessage = (wallet, nonce, exp) =>
  `AI STUDIO GAMES\nSign in to the marketplace. This does NOT send a payment and costs no fee.\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${new Date(exp * 1000).toISOString()}`;

async function hmacKey(env, usage) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new HttpError(500, 'config', 'SESSION_SECRET ausente ou curto');
  return crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), {name: 'HMAC', hash: 'SHA-256'}, false, usage);
}
async function edVerify(pk, sig, data) {
  for (const alg of [{name: 'Ed25519'}, {name: 'NODE-ED25519', namedCurve: 'NODE-ED25519'}]) {
    try { const k = await crypto.subtle.importKey('raw', pk, alg, false, ['verify']); return await crypto.subtle.verify(alg, k, sig, data); } catch { /* tenta o próximo */ }
  }
  return false;
}

export async function createChallenge(env, wallet) {
  if (!isAddress(wallet)) throw new HttpError(400, 'bad_wallet');
  const t = now(), exp = t + NONCE_TTL, nonce = b64u(crypto.getRandomValues(new Uint8Array(24)));
  await env.DB.prepare('DELETE FROM mk_nonces WHERE exp < ?').bind(t).run();
  const c = await env.DB.prepare('SELECT COUNT(*) n FROM mk_nonces WHERE wallet=?').bind(wallet).first();
  if (c.n >= 10) throw new HttpError(429, 'too_many_challenges');
  await env.DB.prepare('INSERT INTO mk_nonces(wallet, nonce, exp) VALUES(?,?,?)').bind(wallet, nonce, exp).run();
  return {nonce, expires_at: exp, message: challengeMessage(wallet, nonce, exp)};
}

// Nonce de uso único: consumido ANTES de checar a assinatura, então não pode ser reaproveitado (replay).
export async function verifyChallenge(env, {wallet, nonce, signature}) {
  if (!isAddress(wallet) || typeof nonce !== 'string' || typeof signature !== 'string') throw new HttpError(400, 'bad_request');
  const row = await env.DB.prepare('SELECT exp FROM mk_nonces WHERE wallet=? AND nonce=?').bind(wallet, nonce).first();
  if (!row || row.exp < now()) throw new HttpError(401, 'invalid_nonce');
  const del = await env.DB.prepare('DELETE FROM mk_nonces WHERE wallet=? AND nonce=?').bind(wallet, nonce).run();
  if (del.meta.changes !== 1) throw new HttpError(401, 'invalid_nonce');
  let sig; try { sig = Uint8Array.from(atob(signature), c => c.charCodeAt(0)); } catch { throw new HttpError(401, 'invalid_signature'); }
  if (sig.length !== 64 || !(await edVerify(b58decode(wallet), sig, enc.encode(challengeMessage(wallet, nonce, row.exp))))) throw new HttpError(401, 'invalid_signature');
  const t = now();
  await env.DB.prepare('INSERT INTO mk_users(wallet_address, created_at, last_login) VALUES(?,?,?) ON CONFLICT(wallet_address) DO UPDATE SET last_login=excluded.last_login').bind(wallet, t, t).run();
  const user = await env.DB.prepare('SELECT id, wallet_address FROM mk_users WHERE wallet_address=?').bind(wallet).first();
  await env.DB.prepare("INSERT INTO mk_audit_logs(event_type, user_id, reference_id, timestamp, metadata) VALUES('login',?,?,?,'{}')").bind(user.id, wallet, t).run();
  const body = b64u(enc.encode(JSON.stringify({u: user.id, w: wallet, exp: t + SESSION_TTL})));
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env, ['sign']), enc.encode(body)));
  return {token: body + '.' + b64u(mac), expires_at: t + SESSION_TTL, wallet};
}

export async function requireUser(env, req) {
  const h = req.headers.get('Authorization') || '', m = /^Bearer ([\w-]+)\.([\w-]+)$/.exec(h);
  if (!m) throw new HttpError(401, 'unauthorized');
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', await hmacKey(env, ['verify']), unb64u(m[2]), enc.encode(m[1])); } catch { /* inválido */ }
  if (!ok) throw new HttpError(401, 'unauthorized');
  let p; try { p = JSON.parse(new TextDecoder().decode(unb64u(m[1]))); } catch { throw new HttpError(401, 'unauthorized'); }
  if (!p || p.exp < now()) throw new HttpError(401, 'session_expired');
  return {id: p.u, wallet: p.w};
}

export async function limit(env, key, max, windowSec = 60) {
  const win = Math.floor(now() / windowSec);
  const r = await env.DB.prepare('INSERT INTO mk_rl(k, win, n) VALUES(?,?,1) ON CONFLICT(k, win) DO UPDATE SET n = n + 1 RETURNING n').bind(key, win).first();
  if (r.n > max) throw new HttpError(429, 'rate_limited');
}
