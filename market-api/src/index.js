import {HttpError, getConfig} from './config.js';
import {createChallenge, verifyChallenge, requireUser, limit} from './auth.js';
import * as M from './market.js';

const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), {status, headers: {'content-type': 'application/json', 'cache-control': 'no-store', ...extra}});
const ip = req => req.headers.get('CF-Connecting-IP') || 'x';
async function body(req) {
  const t = await req.text(); if (t.length > 16384) throw new HttpError(413, 'too_large');
  try { return t ? JSON.parse(t) : {}; } catch { throw new HttpError(400, 'bad_json'); }
}
function cors(req, env) {
  const o = req.headers.get('Origin') || '', ok = (env.ALLOW_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  return ok.includes(o) ? {'access-control-allow-origin': o, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS', vary: 'Origin'} : {};
}

export async function handle(req, env) {
  const url = new URL(req.url), path = url.pathname, m = req.method;
  if (path === '/v1/health') return {ok: true, network: getConfig(env).network, payments_configured: !!(env.AI_STUDIO_TOKEN_MINT && env.AI_STUDIO_TREASURY_WALLET)};
  if (path === '/v1/wallet/challenge' && m === 'POST') { await limit(env, 'ch:' + ip(req), 20); return createChallenge(env, (await body(req)).wallet); }
  if (path === '/v1/wallet/verify' && m === 'POST') { await limit(env, 'vf:' + ip(req), 20); return verifyChallenge(env, await body(req)); }
  if (path === '/v1/marketplace' && m === 'GET') { await limit(env, 'mk:' + ip(req), 120); return M.listProducts(env, url); }
  let g = /^\/v1\/marketplace\/([\w.-]{1,80})$/.exec(path);
  if (g && m === 'GET') return M.getProduct(env, g[1]);
  if (!path.startsWith('/v1/')) throw new HttpError(404, 'not_found');
  const user = await requireUser(env, req);                                                       // tudo abaixo exige sessão assinada pela carteira
  if (path === '/v1/orders' && m === 'POST') { await limit(env, 'od:' + user.id, 10); return M.createOrder(env, user, await body(req)); }
  if ((g = /^\/v1\/orders\/([\w-]{1,60})$/.exec(path)) && m === 'GET') return M.getOrder(env, user, g[1]);
  if (path === '/v1/payments/verify' && m === 'POST') { await limit(env, 'pv:' + user.id, 30); return M.verifyPayment(env, user, await body(req)); }
  if (path === '/v1/inventory' && m === 'GET') return M.getInventory(env, user, null, url);
  if ((g = /^\/v1\/inventory\/([\w-]{1,40})$/.exec(path)) && m === 'GET') return M.getInventory(env, user, g[1], url);
  if (path === '/v1/transactions' && m === 'GET') return M.listTransactions(env, user, url);
  throw new HttpError(404, 'not_found');
}

export default {
  async fetch(req, env) {
    const c = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: c});
    try { const r = await handle(req, env); return r instanceof Response ? r : json(r, 200, c); }
    catch (e) {
      const he = e instanceof HttpError ? e : new HttpError(500, 'internal');
      if (!(e instanceof HttpError)) console.log(JSON.stringify({evt: 'unhandled', msg: String(e && e.message).slice(0, 200)}));   // sem segredos/URLs
      return json({error: he.code, message: he.status < 500 || he.code !== 'internal' ? he.message : 'erro interno'}, he.status, c);
    }
  }
};
