import test from 'node:test'; import assert from 'node:assert/strict'; import vm from 'node:vm'; import {read} from './harness.mjs';
// Carrega skins.js + render.js numa sandbox com um ctx/Path2D falsos que gravam chamadas e validam que todo número é finito.
function boot() {
  const stats = {path2d: 0, bad: [], calls: 0}, PM = ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'closePath', 'arc', 'ellipse', 'rect'];
  class Path2D { constructor() { stats.path2d++; } }
  for (const m of PM) Path2D.prototype[m] = function (...a) { chk(m, a); };
  const chk = (m, a) => { stats.calls++; a.forEach(v => { if (typeof v === 'number' && !Number.isFinite(v)) stats.bad.push(m + ':' + a.join(',')); }); };
  const ctx = new Proxy({}, {get: (t, k) => k in t ? t[k] : (...a) => { chk(String(k), a); return ctx; }, set: (t, k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) stats.bad.push('set ' + String(k)); t[k] = v; return true; }});
  const sb = {window: {}, module: {exports: {}}, Path2D, Math, Float32Array, Int32Array, Map, Number, Array, Object, JSON, parseInt, String, console}; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(read('skins.js'), sb); sb.Skins = sb.window.Skins; sb.SKINS = sb.window.SKINS; vm.runInContext(read('render.js'), sb);
  return {R: sb.module.exports, SKINS: sb.SKINS, ctx, stats};
}
const mkSnake = (sk, n, c0 = 1000, curve = 0.05) => { const sg = []; let x = 500, y = 500, a = 0; for (let i = 0; i < n; i++) { sg.push({x, y, c: c0 - i}); a += curve * Math.sin(i * .03); x -= Math.cos(a) * 6; y -= Math.sin(a) * 6; }
  return {segments: sg, x: sg[0].x, y: sg[0].y, px: sg[0].x - 3, py: sg[0].y, angle: 0, pa: 0, radius: 13 * (sk.thick || 1), sk, seed: .4, eatT: -1e9, turnV: 0, boosting: false, name: 'x'}; };

test('render: nenhuma skin × qualidade × tamanho produz NaN/Infinity nem exceção', () => {
  const {R, SKINS, ctx, stats} = boot();
  for (const sk of SKINS) for (const q of R.QUALITY) for (const n of [1, 2, 3, 6, 60, 600, 1500]) for (const st of [{}, {boosting: true}]) {
    const sn = Object.assign(mkSnake(sk, n), st); R.draw(ctx, sn, {q, now: 1234, alpha: .5, label: true, shield: true, cam: {x: 0, y: 0, w: 2000, h: 2000}});
    R.draw(ctx, sn, {q, now: 99, alpha: 1, am: .4, rs: .7, dead: true, flash: .5});
  }
  assert.deepEqual(stats.bad, []); assert.ok(stats.calls > 1e5);
});
test('render: objetos criados por quadro NÃO crescem com o tamanho da cobra (sem alocação por segmento)', () => {
  const {R, SKINS, ctx, stats} = boot(), sk = SKINS[0], q = R.QUALITY[2], count = n => { stats.path2d = 0; R.draw(ctx, mkSnake(sk, n), {q, now: 1, alpha: 1}); return stats.path2d; };
  const small = count(60), big = count(1500); assert.equal(small, big); assert.ok(big <= 7, 'Path2D por cobra = ' + big);
});
test('espinha: comprimento monotônico, largura afina até a ponta, buffer respeitado mesmo com 5000 segmentos', () => {
  const {R, SKINS} = boot(), sk = SKINS[0], B = R._buf;
  for (const [n, qi] of [[80, 2], [600, 2], [5000, 2], [600, 0]]) {
    const sn = mkSnake(sk, n), r = sn.radius, m = R._buildSpine(sn, sn.x, sn.y, r, 500, {q: R.QUALITY[qi]});
    assert.ok(m >= 2 && m < R.MAXP, `n=${n} m=${m}`); for (let i = 1; i < m; i++) assert.ok(B.ss[i] >= B.ss[i - 1], 'arco decrescente em ' + i);
    assert.ok(B.hw[m - 1] <= r * .25, 'ponta da cauda fina: ' + B.hw[m - 1] / r); assert.ok(B.hw[(m / 3) | 0] >= r * .85 && B.hw[(m / 3) | 0] <= r * 1.3, 'corpo ~r');
    const real = (n - 1) * 6; assert.ok(Math.abs(B.ss[m - 1] - real) / real < .06 || n < 80, `comprimento ${B.ss[m - 1]} vs ${real}`);
  }
});
test('faixas de cor: amostragem por ID absoluto — andar 1 segmento não desloca as divisas (sem tremor)', () => {
  const {R, SKINS} = boot(), sk = SKINS.find(s => s.band === 4 && s.colors.length > 1), q = R.QUALITY[1];   // q1: stride 2 → ids pares
  const ids = sn => { const m = R._buildSpine(sn, sn.x, sn.y, sn.radius, 0, {q, wave: 0}); return [...R._buf.pc.slice(1, m - 1)]; };
  const a = mkSnake(sk, 200, 1000), A = ids(a), b = mkSnake(sk, 200, 1001), Bd = ids(b);
  assert.ok(A.every(c => c % 2 === 0) && Bd.every(c => c % 2 === 0), 'ids amostrados são múltiplos do stride'); const inter = A.filter(c => Bd.includes(c)).length; assert.ok(inter >= A.length - 3, `interseção ${inter}/${A.length}`);
});
test('interpolação: cabeça desenhada entre posição anterior e atual (alpha 0, .5, 1)', () => {
  const {R, SKINS} = boot(), sn = mkSnake(SKINS[0], 40), want = a => sn.px + (sn.x - sn.px) * a, seen = [];
  for (const a of [0, .5, 1]) { const hx = (R._buildSpine(sn, want(a), sn.y, sn.radius, 0, {q: R.QUALITY[2]}), R._buf.px[0]); seen.push(hx); }
  assert.deepEqual(seen.map(v => +v.toFixed(2)), [sn.px, (sn.px + sn.x) / 2, sn.x].map(v => +v.toFixed(2)));
});
