// Estado e economia de TESTE compartilhados entre site (store.html) e jogo (play.html).
// Regras espelham a economia real: teto diário com retorno decrescente, sem multiplicadores, sinks com queima.
(function () {
  const KEY = 'slitheri_save_v1', CAP = 300, FAUCET = 250, FAUCET_MS = 864e5, VIP_PRICE = 250;
  const SKINS = window.SKINS;   // catálogo em skins.js (carregar antes)
  const day = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  let mem = null;
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return mem; } };
  const write = v => { mem = v; try { localStorage.setItem(KEY, v); } catch (e) {} };
  const num = (v, d = 0) => (Number.isFinite(+v) && +v >= 0) ? +v : d;
  function load() {
    let o = null; try { o = JSON.parse(read()); } catch (e) {}
    o = Object.assign({bal: 100, vip: false, owned: [0], skin: 0, day: day(), today: 0, burned: 0, faucetAt: 0}, o || {});
    o.bal = num(o.bal, 100); o.today = num(o.today); o.burned = num(o.burned); o.faucetAt = num(o.faucetAt); o.vip = o.vip === true;
    if (!Array.isArray(o.owned) || !o.owned.includes(0)) o.owned = [0];
    if (!SKINS[o.skin] || !o.owned.includes(o.skin)) o.skin = 0;
    if (o.day !== day()) { o.day = day(); o.today = 0; }
    const nq = () => ({day: day(), coins: 0, kills: 0, boost: 0, play: 0, len: 0, done: [], pd: false});
    o.pts = num(o.pts); o.q = Object.assign(nq(), o.q || {});
    if (o.q.day !== day()) o.q = nq();
    if (!Array.isArray(o.q.done)) o.q.done = [];
    for (const k of ['coins', 'kills', 'boost', 'play', 'len']) o.q[k] = num(o.q[k]);
    return o;
  }
  const fire = () => window.dispatchEvent(new Event('savechange'));
  const S = window.Save = {s: load(), CAP, FAUCET, VIP_PRICE, SKINS};
  // ---- Modo online: o servidor é a fonte da verdade. O que mostramos = estado do servidor + estimativa do que ainda não foi enviado.
  S.online = false; S.server = null; S.pend = {val: 0, bot: 0, killVal: 0, paidBoost: 0};
  function recompute() {
    const sv = S.server, P = S.pend, cap = sv.cap || CAP, rate = Math.max(0, 1 - sv.today / cap);
    const est = Math.min((P.val + P.bot * 0.6 + P.killVal) * rate, Math.max(0, cap - sv.today)), boost = Math.min(P.paidBoost * 0.1, Math.max(0, sv.bal + est));
    S.s = Object.assign({}, sv, {bal: sv.bal + est - boost, today: sv.today + est, burned: sv.burned + boost}); fire();
  }
  S.setOnline = st => { if (!st) { S.online = false; S.server = null; S.s = load(); fire(); return; } S.online = true; S.server = st; recompute(); };
  S.pendAdd = (k, x) => { S.pend[k] += x; recompute(); };
  // Sempre relê o estado mais recente antes de gravar: duas abas não sobrescrevem uma à outra.
  function commit(fn) {
    S.s = load(); const r = fn(S.s);
    for (const k of ['bal', 'today', 'burned']) S.s[k] = Math.round(S.s[k] * 1e4) / 1e4;
    write(JSON.stringify(S.s)); fire(); return r;
  }
  // Missões diárias (3 de 5, sorteadas pela data: todos veem as mesmas). Dão PONTOS de prévia do airdrop, nunca tokens.
  const QUESTS = [{id: 'coins', t: 60}, {id: 'kills', t: 3}, {id: 'boost', t: 15}, {id: 'play', t: 300}, {id: 'len', t: 500}];
  S.pick = () => { let h = 0; for (const c of S.s.q.day) h = (h * 31 + c.charCodeAt(0)) | 0; const ids = [0, 1, 2, 3, 4], out = [];
    while (out.length < 3) { h = (h * 1103515245 + 12345) & 0x7fffffff; out.push(QUESTS[ids.splice(h % ids.length, 1)[0]]); } return out; };
  S.prog = d => commit(s => {
    const q = s.q; q.coins += d.coins; q.kills += d.kills; q.boost += d.boost; q.play += d.play; q.len = Math.max(q.len, d.len);
    const done = []; for (const x of S.pick()) if (q[x.id] >= x.t && !q.done.includes(x.id)) { q.done.push(x.id); s.pts += 5; done.push(x.id); }
    if (q.play >= 600 && !q.pd) { q.pd = true; s.pts += 10; }
    return done; });
  S.skin = () => SKINS[S.s.skin];
  S.faucetWait = () => Math.max(0, S.s.faucetAt + FAUCET_MS - Date.now());
  // Ganho com retorno decrescente: quanto mais já ganhou hoje, menor o pagamento. Nunca passa de CAP.
  S.earn = x => commit(s => { const rate = Math.max(0, 1 - s.today / CAP), paid = x * rate; s.today += paid; s.bal += paid; return {paid, rate}; });
  S.spend = c => commit(s => { if (s.bal < c) return false; s.bal -= c; s.burned += c * .5; return true; });
  S.burn = c => { if (S.online) { const b = Math.min(S.s.bal, c); S.pend.paidBoost += b / 0.1; recompute(); return b; } return commit(s => { const b = Math.min(s.bal, c); s.bal -= b; s.burned += b; return b; }); };
  S.buySkin = id => commit(s => {
    if (!s.owned.includes(id)) { const p = SKINS[id].price; if (s.bal < p) return 'poor'; s.bal -= p; s.burned += p * .5; s.owned.push(id); }
    s.skin = id; return 'ok';
  });
  S.buyVip = () => commit(s => { if (s.vip) return 'have'; if (s.bal < VIP_PRICE) return 'poor'; s.bal -= VIP_PRICE; s.burned += VIP_PRICE * .5; s.vip = true; return 'ok'; });
  S.claim = () => commit(s => { if (s.faucetAt + FAUCET_MS > Date.now()) return {ok: false}; s.bal += FAUCET; s.faucetAt = Date.now(); return {ok: true}; });
  addEventListener('storage', e => { if (e.key === KEY && !S.online) { S.s = load(); fire(); } });
})();
