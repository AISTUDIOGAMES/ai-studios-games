/* AI STUDIO GAMES — carteira Solana (Wallet Standard) + compra de itens. Um único arquivo para o site e TODOS os jogos.
 * Nunca pede chave privada/frase. Conectar NÃO autoriza pagamento: cada compra exige assinatura explícita na carteira.
 * O sucesso só é mostrado depois que o SERVIDOR confirma o pagamento na blockchain.
 * Uso: <script src="/shared/aisg-wallet.js"></script> ; AISGWallet.configure({api:'https://...workers.dev'}) */
(function () {
  'use strict';
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const b58 = bytes => { let z = 0; while (z < bytes.length && bytes[z] === 0) z++; const d = [];
    for (let i = z; i < bytes.length; i++) { let c = bytes[i]; for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; } while (c) { d.push(c % 58); c = (c / 58) | 0; } }
    return '1'.repeat(z) + d.reverse().map(i => A[i]).join(''); };
  const toB64 = u8 => { let s = ''; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const short = a => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '');

  const S = {cfg: {api: '', fetch: null, pollMs: 3000, pollMax: 40}, wallets: [], wallet: null, account: null, token: null, chain: null, unsub: null, handlers: {}};
  const W = window.AISGWallet = {};
  const emit = (ev, d) => (S.handlers[ev] || []).forEach(f => { try { f(d); } catch (e) { /* ouvinte com erro não derruba a carteira */ } });
  W.on = (ev, f) => { (S.handlers[ev] = S.handlers[ev] || []).push(f); };
  W.configure = o => { Object.assign(S.cfg, o || {}); return W; };
  const api = (path, opt = {}) => (S.cfg.fetch || window.fetch.bind(window))(S.cfg.api + path, {method: opt.method || 'GET',
    headers: {'content-type': 'application/json', ...(S.token ? {authorization: 'Bearer ' + S.token} : {})}, body: opt.body ? JSON.stringify(opt.body) : undefined})
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || j.error || 'http_' + r.status); e.code = j.error || 'http_' + r.status; e.status = r.status; throw e; } return j; });

  // ---- Descoberta de carteiras (protocolo Wallet Standard, sem dependências) ----
  const usable = w => w.features && w.features['standard:connect'] && w.features['solana:signMessage'] && (w.chains || []).some(c => c.startsWith('solana:'));
  const registry = {register(...ws) { ws.forEach(w => { if (!S.wallets.includes(w)) S.wallets.push(w); }); emit('wallets', W.wallets()); return () => { S.wallets = S.wallets.filter(x => !ws.includes(x)); emit('wallets', W.wallets()); }; }};
  window.addEventListener('wallet-standard:register-wallet', e => { try { e.detail(registry); } catch (x) { /* ignora */ } });
  try { window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', {detail: registry})); } catch (e) { /* ambiente sem CustomEvent */ }

  W.wallets = () => S.wallets.filter(usable).map(w => ({name: w.name, icon: w.icon}));
  W.address = () => (S.account ? S.account.address : null);
  W.short = () => short(W.address());
  W.isLoggedIn = () => !!S.token;
  W.token = () => S.token;   // os jogos usam este token para consultar /v1/inventory/:gameId

  // ---- Rede: a carteira precisa suportar a rede que a API usa (devnet em teste, mainnet em produção) ----
  async function networkOk() {
    if (!S.chain) { const h = await api('/v1/health'); S.chain = h.network === 'mainnet-beta' ? 'solana:mainnet' : 'solana:' + h.network; }
    const ok = !S.account || !S.account.chains || S.account.chains.length === 0 || S.account.chains.includes(S.chain) || S.wallet.chains.includes(S.chain);
    return ok;
  }
  W.network = () => S.chain;

  function pickAccount(accounts) { return (accounts || []).find(a => (a.chains || []).some(c => c.startsWith('solana:'))) || (accounts || [])[0] || null; }
  function onChange(p) {
    if (!p.accounts) return;
    const next = pickAccount(p.accounts), prev = S.account && S.account.address;
    S.account = next;
    if (!next) { S.token = null; emit('disconnect'); }
    else if (next.address !== prev) { S.token = null; emit('accountChanged', next.address); }   // trocou de carteira: a sessão antiga deixa de valer
  }

  W.connect = async function (name) {
    const w = S.wallets.filter(usable).find(x => !name || x.name === name);
    if (!w) {
      if (/Android|iPhone|iPad/i.test(navigator.userAgent)) location.href = 'https://phantom.app/ul/browse/' + encodeURIComponent(location.href) + '?ref=' + encodeURIComponent(location.origin);
      const e = new Error('no_wallet'); e.code = 'no_wallet'; throw e;
    }
    let r; try { r = await w.features['standard:connect'].connect(); } catch (err) { throw mapErr(err); }
    S.wallet = w; S.account = pickAccount(r.accounts || w.accounts);
    if (!S.account) { const e = new Error('no_account'); e.code = 'no_account'; throw e; }
    if (S.unsub) S.unsub();
    const ev = w.features['standard:events']; S.unsub = ev ? ev.on('change', onChange) : null;
    emit('connect', W.address()); return W.address();
  };
  W.disconnect = async function () {
    try { if (S.wallet && S.wallet.features['standard:disconnect']) await S.wallet.features['standard:disconnect'].disconnect(); } catch (e) { /* segue */ }
    if (S.unsub) S.unsub(); S.unsub = null; S.wallet = S.account = S.token = null; emit('disconnect');
  };

  function mapErr(err) {
    const m = String((err && err.message) || err), e = new Error(m);
    e.code = /reject|denied|declin|cancel|4001/i.test(m + (err && err.code)) ? 'rejected' : (err && err.code) || 'wallet_error'; return e;
  }

  // Login: assina uma mensagem (sem custo, sem pagamento) para provar que a carteira é sua.
  W.login = async function () {
    if (!S.account) { const e = new Error('wallet_not_connected'); e.code = 'wallet_not_connected'; throw e; }
    if (!(await networkOk())) { const e = new Error('wrong_network'); e.code = 'wrong_network'; throw e; }
    const ch = await api('/v1/wallet/challenge', {method: 'POST', body: {wallet: S.account.address}});
    let out; try { out = await S.wallet.features['solana:signMessage'].signMessage({account: S.account, message: new TextEncoder().encode(ch.message)}); } catch (err) { throw mapErr(err); }
    const v = await api('/v1/wallet/verify', {method: 'POST', body: {wallet: S.account.address, nonce: ch.nonce, signature: toB64(out[0].signature)}});
    S.token = v.token; emit('login', v.wallet); return v;
  };

  // Compra: pedido no servidor -> assinatura explícita na carteira -> servidor confirma on-chain -> item no inventário.
  W.buy = async function (productId, onStatus) {
    const st = (state, extra) => { const d = Object.assign({state}, extra); try { onStatus && onStatus(d); } catch (e) { /* ignora */ } return d; };
    if (!S.account) { st('wallet_not_connected'); const e = new Error('wallet_not_connected'); e.code = 'wallet_not_connected'; throw e; }
    if (!S.token) await W.login();
    let ord;
    try { ord = await api('/v1/orders', {method: 'POST', body: {product_id: productId}}); }
    catch (e) { st(e.code === 'insufficient_balance' ? 'insufficient_balance' : 'failed', {code: e.code}); throw e; }
    st('awaiting_signature', {order: ord.order});    // mostra item, valor exato e destino ANTES de pedir a assinatura
    const feat = S.wallet.features['solana:signAndSendTransaction'];
    if (!feat) { const e = new Error('wallet_unsupported'); e.code = 'wallet_unsupported'; st('failed', {code: e.code}); throw e; }
    let sig;
    try { const r = await feat.signAndSendTransaction({account: S.account, transaction: fromB64(ord.transaction.data), chain: ord.transaction.chain}); sig = b58(r[0].signature); }
    catch (err) { const e = mapErr(err); st(e.code === 'rejected' ? 'rejected' : 'failed', {code: e.code}); throw e; }
    st('pending', {signature: sig, order: ord.order});   // ainda NÃO é sucesso: falta a confirmação do servidor
    for (let i = 0; i < S.cfg.pollMax; i++) {
      let v; try { v = await api('/v1/payments/verify', {method: 'POST', body: {order_id: ord.order.id, signature: sig}}); }
      catch (e) { const late = e.code === 'payment_late'; st(late ? 'late' : 'failed', {code: e.code, reason: e.message, signature: sig}); throw e; }
      if (v.status === 'paid') return st('paid', {signature: sig, order: ord.order});
      await new Promise(r => setTimeout(r, S.cfg.pollMs));
    }
    return st('pending_timeout', {signature: sig, order: ord.order});   // continua pendente; pode verificar de novo depois, sem risco de cobrança dupla
  };
  W.inventory = gameId => api('/v1/inventory' + (gameId ? '/' + encodeURIComponent(gameId) : ''));
  W.marketplace = (qs = '') => api('/v1/marketplace' + qs);
  W.transactions = () => api('/v1/transactions');
})();
