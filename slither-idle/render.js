// render.js — renderizador de cobras (Fase 3). Só desenha: não conhece física, rede nem economia.
// Corpo = UMA fita contínua sobre uma espinha suavizada (largura variável, contorno, luz, textura), cabeça com focinho/olhos/língua
// e cauda afilada. Buffers pré-alocados: nenhum objeto novo por segmento/quadro (só 1 Path2D por cobra).
// Contrato de `sn`: {segments:[{x,y,c}], x,y, px,py (posição do tick anterior), angle, pa, radius, sk, seed, eatT, turnV, boosting, name}
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, MAXP = 1024;
  // Níveis de qualidade. stride = amostragem da espinha (em segmentos); smooth = passes de suavização; demais = efeitos opcionais.
  const QUALITY = [
    {level: 0, maxDpr: 1,   stride: 3, smooth: 1, shadow: false, glow: false, hi: true,  tex: false, tongue: false, bands: true},   // q0 mantém faixas de cor, suavização e realce: só perde sombra, brilho, escamas e língua
    {level: 1, maxDpr: 1.5, stride: 2, smooth: 1, shadow: true,  glow: false, hi: true,  tex: false, tongue: true,  bands: true},
    {level: 2, maxDpr: 2,   stride: 1, smooth: 2, shadow: true,  glow: true,  hi: true,  tex: true,  tongue: true,  bands: true},
  ];
  // ---- buffers (um conjunto só: desenhamos uma cobra por vez) ----
  const F = () => new Float32Array(MAXP), I = () => new Int32Array(MAXP);
  const px = F(), py = F(), tx = F(), ty = F(), ss = F(), hw = F(), pc = I(), ax = F(), ay = F();
  const mkE = () => ({lx: F(), ly: F(), rx: F(), ry: F()}), E0 = mkE(), E1 = mkE();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, sq = v => v * v, sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerpAng = (a, b, t) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; };
  const cache = new Map();   // sombras de cor memorizadas (sem alocar strings por quadro)
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function shade(hex, a) {
    const key = hex + a; let v = cache.get(key); if (v) return v;
    if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex;
    const [r, g, b] = hexToRgb(hex), t = a < 0 ? 0 : 255, q = Math.abs(a);
    v = 'rgb(' + [r, g, b].map(c => Math.round((t - c) * q + c)).join(',') + ')'; if (cache.size > 600) cache.clear(); cache.set(key, v); return v;
  }
  const multi = sk => sk.colors.length > 1 || !!sk.anim;   // skins de faixas/animadas precisam de cor por trecho
  const outlineOf = sk => sk._ol || (sk._ol = shade(sk.colors[0], -.72));

  // ---------- espinha: pontos suavizados e perfil de largura ----------
  // Amostra por ID ABSOLUTO do segmento (c % stride), então as bandas de cor não "tremem" quando a cobra anda.
  function buildSpine(sn, hx, hy, r, now, o) {
    const sg = sn.segments, n = sg.length, q = o.q, sk = sn.sk; let stride = q.stride;
    if (multi(sk) && q.bands) while (stride > 1 && sk.band % stride) stride--;
    stride = Math.max(stride, Math.ceil(n / (MAXP - 4)));
    let m = 0; const head = sg[0], gapMin = Math.max(2, r * .22);
    px[0] = hx; py[0] = hy; pc[0] = head.c + 1; m = 1;
    const first = ((head.c % stride) + stride) % stride;
    for (let i = first; i < n; i += stride) {
      const s = sg[i], dx = s.x - px[m - 1], dy = s.y - py[m - 1];
      if (dx * dx + dy * dy < gapMin * gapMin && i !== n - 1) continue;
      px[m] = s.x; py[m] = s.y; pc[m] = s.c; m++; if (m >= MAXP - 1) break;
    }
    const last = sg[n - 1]; if (m < MAXP && (px[m - 1] !== last.x || py[m - 1] !== last.y)) { px[m] = last.x; py[m] = last.y; pc[m] = last.c; m++; }
    if (m < 2) return m;
    for (let pass = 0; pass < q.smooth; pass++) {   // [1 2 1]/4 em pontos internos (a cabeça e a ponta da cauda ficam fixas)
      ax[0] = px[0]; ay[0] = py[0]; ax[m - 1] = px[m - 1]; ay[m - 1] = py[m - 1];
      for (let i = 1; i < m - 1; i++) { ax[i] = (px[i - 1] + 2 * px[i] + px[i + 1]) * .25; ay[i] = (py[i - 1] + 2 * py[i] + py[i + 1]) * .25; }
      for (let i = 1; i < m - 1; i++) { px[i] = ax[i]; py[i] = ay[i]; }
    }
    ss[0] = 0; for (let i = 1; i < m; i++) ss[i] = ss[i - 1] + Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]);
    const total = ss[m - 1];
    tangents(m);
    // ondulação lateral procedural (só visual: amplitude ~2px, não afeta colisões)
    const wl = r * 8, boost = sn.boosting ? 1.7 : 1, ph = now * .0075 * boost + (sn.seed || 0) * 10, amp0 = r * (sn.boosting ? .1 : .15) * (o.wave === 0 ? 0 : 1);
    if (amp0 > 0) {
      for (let i = 1; i < m; i++) { const env = sstep(r * 2, r * 8, ss[i]) * (.55 + .45 * Math.min(1, ss[i] / (total || 1))), off = amp0 * env * Math.sin(TAU * ss[i] / wl - ph); ax[i] = px[i] - ty[i] * off; ay[i] = py[i] + tx[i] * off; }
      for (let i = 1; i < m; i++) { px[i] = ax[i]; py[i] = ay[i]; }
      tangents(m);
    }
    // perfil de largura: pescoço, corpo, afinamento da cauda, "bolo" da refeição descendo pelo corpo
    const taperLen = Math.min(total * .55, r * 14), eatAge = now - (sn.eatT || -1e9), sb = eatAge * .2, bulge = eatAge < total / .2 ? 1 : 0;
    for (let i = 0; i < m; i++) {
      const s = ss[i], k = clamp((total - s) / (taperLen || 1), 0, 1), e = k * k * (3 - 2 * k);
      let w = r * (.09 + .91 * Math.pow(e, .75));
      w *= 1 - .1 * Math.exp(-sq((s - r * 2.1) / (r * 1.3)));
      if (bulge) w *= 1 + .22 * Math.exp(-sq((s - sb) / (r * 1.1))) * (1 - s / (total + 1) * .5);
      hw[i] = w * (sn.boosting ? .94 : 1);
    }
    return m;
  }
  function tangents(m) {
    for (let i = 0; i < m; i++) {
      const a = i ? i - 1 : 0, b = i < m - 1 ? i + 1 : m - 1; let dx = px[b] - px[a], dy = py[b] - py[a]; const l = Math.hypot(dx, dy) || 1; tx[i] = dx / l; ty[i] = dy / l;
    }
  }
  // bordas esquerda/direita; (ox,oy) desloca o eixo (usado nos realces) e `sc` escala a largura
  function edges(E, m, sc, ox, oy) {
    for (let i = 0; i < m; i++) {
      const w = hw[i] * sc, cx = px[i] + ox * (hw[i] / (hw[0] || 1)), cy = py[i] + oy * (hw[i] / (hw[0] || 1));
      E.lx[i] = cx - ty[i] * w; E.ly[i] = cy + tx[i] * w; E.rx[i] = cx + ty[i] * w; E.ry[i] = cy - tx[i] * w;
    }
  }
  // curva suave passando pelos pontos médios (quadráticas) — sem "quinas" entre segmentos
  function curve(P, X, Y, a, b, first) {
    const d = b >= a ? 1 : -1; if (first) P.moveTo(X[a], Y[a]); else P.lineTo(X[a], Y[a]);
    const cnt = Math.abs(b - a); if (cnt < 2) { P.lineTo(X[b], Y[b]); return; }
    P.lineTo((X[a] + X[a + d]) / 2, (Y[a] + Y[a + d]) / 2);
    for (let i = a + d; i !== b - d; i += d) P.quadraticCurveTo(X[i], Y[i], (X[i] + X[i + d]) / 2, (Y[i] + Y[i + d]) / 2);
    P.lineTo(X[b], Y[b]);
  }
  function ribbon(P, E, m, smooth) {
    if (smooth) { curve(P, E.lx, E.ly, 0, m - 1, true); curve(P, E.rx, E.ry, m - 1, 0, false); }
    else { P.moveTo(E.lx[0], E.ly[0]); for (let i = 1; i < m; i++) P.lineTo(E.lx[i], E.ly[i]); for (let i = m - 1; i >= 0; i--) P.lineTo(E.rx[i], E.ry[i]); }
    P.closePath();
  }

  // ---------- filtro de visibilidade usado pelos espinhos das skins (coords do mundo) ----------
  let vx0 = -1e9, vy0 = -1e9, vx1 = 1e9, vy1 = 1e9;
  const visFn = s => s.x > vx0 && s.x < vx1 && s.y > vy0 && s.y < vy1;

  // ---------- desenho ----------
  // o = {q, now, alpha (0..1 interpolação), am (opacidade), rs (escala do raio), isPlayer, shield, dead, flash, label, invZ, cam:{x,y,w,h}}
  function draw(ctx, sn, o) {
    const sg = sn.segments, n = sg.length; if (!n) return;
    const q = o.q, now = o.now, a = o.alpha === undefined ? 1 : o.alpha, sk = sn.sk, r = sn.radius * (o.rs || 1);
    const hx = sn.px === undefined ? sn.x : sn.px + (sn.x - sn.px) * a, hy = sn.py === undefined ? sn.y : sn.py + (sn.y - sn.py) * a;
    if (o.cam) { const c = o.cam, m3 = r * 3 + 60; vx0 = c.x - m3; vy0 = c.y - m3; vx1 = c.x + c.w + m3; vy1 = c.y + c.h + m3; if (Math.hypot(hx - c.x - c.w / 2, hy - c.y - c.h / 2) > Math.hypot(c.w, c.h) / 2 + n * 6 + 150) return; }
    const am = o.am === undefined ? 1 : o.am, ha = sn.pa === undefined ? sn.angle : lerpAng(sn.pa, sn.angle, a);
    const m = buildSpine(sn, hx, hy, r, now, o), col0 = Skins.colorAt(sk, sg[0].c, now), ol = outlineOf(sk);
    ctx.globalAlpha = am; ctx.lineJoin = ctx.lineCap = 'round';
    if (m >= 3) {
      edges(E0, m, 1, 0, 0); const P = new Path2D(); ribbon(P, E0, m, q.smooth > 0);
      if (q.shadow) { ctx.save(); ctx.translate(r * .22, r * .38); ctx.globalAlpha = am * .28; ctx.fillStyle = '#000'; ctx.fill(P); ctx.restore(); }
      if (q.glow && (sn.boosting || sk.fx || sk.anim)) { ctx.globalAlpha = am * (sn.boosting ? .3 : .12); ctx.lineWidth = r * 1.2; ctx.strokeStyle = col0; ctx.stroke(P); ctx.globalAlpha = am; }
      if (sk.tail && m > 4) { ctx.save(); ctx.translate(px[m - 1], py[m - 1]); ctx.rotate(Math.atan2(py[m - 1] - py[m - 3], px[m - 1] - px[m - 3])); Skins.drawTail(ctx, sk, r * .8, now); ctx.restore(); }
      ctx.lineWidth = Math.max(2, r * .24); ctx.strokeStyle = ol; ctx.stroke(P);               // contorno
      const mid = pc[(m / 2) | 0]; ctx.fillStyle = Skins.colorAt(sk, mid, now); ctx.fill(P);  // base
      if (q.bands && multi(sk)) bands(ctx, sk, m, now);
      if (q.hi) {   // luz de cima-esquerda: lado escuro, realce largo e brilho estreito (3 fitas finas, sem filtros)
        edges(E1, m, .62, r * .26, r * .32); const S = new Path2D(); ribbon(S, E1, m, true); ctx.fillStyle = 'rgba(0,0,0,.17)'; ctx.fill(S);
        edges(E1, m, .5, -r * .24, -r * .3); const H = new Path2D(); ribbon(H, E1, m, true); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill(H);
        edges(E1, m, .22, -r * .3, -r * .38); const G = new Path2D(); ribbon(G, E1, m, true); ctx.fillStyle = 'rgba(255,255,255,' + (sk.tier >= 3 ? .34 : .22) + ')'; ctx.fill(G);
      }
      if (q.tex) {   // escamas: meias-luas a cada ~12px
        ctx.beginPath(); const st = Math.max(1, Math.round(12 / Math.max(5, ss[m - 1] / (m - 1))));
        for (let i = 2; i < m - 2; i += st) { const w = hw[i] * .62, cx = px[i], cy = py[i]; ctx.moveTo(cx - ty[i] * w, cy + tx[i] * w); ctx.quadraticCurveTo(cx - tx[i] * w * .9, cy - ty[i] * w * .9, cx + ty[i] * w, cy - tx[i] * w); }
        ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(0,0,0,.17)'; ctx.stroke();
      }
    }
    if (sk.spikes) Skins.drawSpikes(ctx, sk, sg, r, visFn);
    head(ctx, sn, hx, hy, ha, r, col0, ol, o);
    if (o.shield) { ctx.globalAlpha = .35 + .2 * Math.sin(now / 120); ctx.beginPath(); ctx.arc(hx, hy, r * 2.1, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = '#14f195'; ctx.stroke(); }
    if (o.flash > 0) { ctx.globalAlpha = o.flash * .6; ctx.fillStyle = '#fff'; if (m >= 3) { const F2 = new Path2D(); ribbon(F2, E0, m, true); ctx.fill(F2); } }
    if (o.label && sn.name) { ctx.globalAlpha = am * .8; ctx.font = 'bold ' + (13 * (o.invZ || 1)) + 'px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(sn.name, hx, hy + r + 22 * (o.invZ || 1)); }
    ctx.globalAlpha = 1;
  }
  // faixas de cor: polígonos curtos que cobrem exatamente a fita-base (bordas coincidem, sem costuras visíveis)
  function bands(ctx, sk, m, now) {
    let i0 = 0, cur = Skins.colorAt(sk, pc[0], now);
    for (let i = 1; i <= m; i++) {
      const col = i < m ? Skins.colorAt(sk, pc[i], now) : null;
      if (col === cur) continue;
      const a = i0 ? i0 - .5 : 0, b = i < m ? i - .5 : m - 1;   // a divisa fica no meio entre duas amostras
      ctx.beginPath(); pt(E0.lx, E0.ly, a, true); for (let k = Math.ceil(a); k <= Math.floor(b); k++) pt(E0.lx, E0.ly, k, false); pt(E0.lx, E0.ly, b, false);
      pt(E0.rx, E0.ry, b, false); for (let k = Math.floor(b); k >= Math.ceil(a); k--) pt(E0.rx, E0.ry, k, false); pt(E0.rx, E0.ry, a, false);
      ctx.closePath(); ctx.fillStyle = ctx.strokeStyle = cur; ctx.lineWidth = .8; ctx.fill(); ctx.stroke();
      i0 = i; cur = col;
    }
    function pt(X, Y, t, mv) { const k = Math.floor(t), f = t - k, x = k < m - 1 ? X[k] + (X[k + 1] - X[k]) * f : X[k], y = k < m - 1 ? Y[k] + (Y[k + 1] - Y[k]) * f : Y[k]; if (mv) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  }
  function head(ctx, sn, hx, hy, ha, r, col, ol, o) {
    const sk = sn.sk, now = o.now, ep = clamp(1 - (now - (sn.eatT || -1e9)) / 280, 0, 1), seed = sn.seed || 0;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ha + clamp((sn.turnV || 0) * 1.4, -.22, .22)); const hs = 1 + .08 * ep; ctx.scale(hs, hs);
    const L = r * 1.75, W = r * 1.22;
    ctx.beginPath(); ctx.moveTo(-r * .85, -W * .8);
    ctx.bezierCurveTo(r * .2, -W * 1.28, r * 1.2, -W * .95, L, -W * .3); ctx.quadraticCurveTo(L + r * .22, 0, L, W * .3);
    ctx.bezierCurveTo(r * 1.2, W * .95, r * .2, W * 1.28, -r * .85, W * .8); ctx.quadraticCurveTo(-r * 1.5, 0, -r * .85, -W * .8); ctx.closePath();   // traseira arredondada: sem corte reto no pescoço
    ctx.lineWidth = Math.max(2, r * .24); ctx.strokeStyle = ol; ctx.stroke(); ctx.fillStyle = col; ctx.fill();
    if (o.q.hi) { ctx.save(); ctx.clip(); ctx.beginPath(); ctx.ellipse(r * .1, -W * .42, r * 1.2, W * .38, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); ctx.beginPath(); ctx.ellipse(r * .3, W * .6, r * 1.5, W * .5, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fill(); ctx.restore(); }
    ctx.fillStyle = 'rgba(0,0,0,.55)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(L - r * .24, s * r * .16, r * .07, 0, TAU); ctx.fill(); }   // narinas
    if (ep > 0) { ctx.beginPath(); ctx.ellipse(L - r * .1, 0, r * .28 * ep, r * .42 * ep, 0, 0, TAU); ctx.fillStyle = '#2a0610'; ctx.fill(); }   // boca abrindo ao comer
    else if (o.q.tongue && !o.dead) { const ph = ((now + seed * 3000) % 3800) / 380; if (ph < 1) { const l = r * 1.1 * Math.sin(ph * Math.PI); ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = r * .13; ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L + l, 0); ctx.moveTo(L + l, 0); ctx.lineTo(L + l + r * .22, -r * .16); ctx.moveTo(L + l, 0); ctx.lineTo(L + l + r * .22, r * .16); ctx.stroke(); } }
    Skins.drawHead(ctx, sk, r, now);
    if (sk.eyes === 'robot' || sk.eyes === 'alien' || sk.eyes === 'none') Skins.eyes(ctx, sk, r);
    else eyes(ctx, sn, r, now, seed, ol, o);
    ctx.restore();
  }
  function eyes(ctx, sn, r, now, seed, ol, o) {
    const bph = ((now + seed * 5000) % 4300), blink = bph < 120 ? .14 : 1, look = clamp((sn.turnV || 0) * 4, -.12, .12) * r, ex = r * .6, ey = r * .6, er = r * .4;
    for (const s of [-1, 1]) {
      if (o.dead) { ctx.strokeStyle = '#fff'; ctx.lineWidth = r * .12; ctx.beginPath(); ctx.moveTo(ex - er * .6, s * ey - er * .6); ctx.lineTo(ex + er * .6, s * ey + er * .6); ctx.moveTo(ex + er * .6, s * ey - er * .6); ctx.lineTo(ex - er * .6, s * ey + er * .6); ctx.stroke(); continue; }
      ctx.beginPath(); ctx.ellipse(ex, s * ey, er, er * blink, 0, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = Math.max(1, r * .07); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.stroke();
      if (blink === 1) {
        ctx.beginPath(); ctx.arc(ex + r * .12, s * ey + look, er * .55, 0, TAU); ctx.fillStyle = '#05060a'; ctx.fill();
        ctx.beginPath(); ctx.arc(ex + r * .2, s * ey + look - r * .09, er * .2, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
        if (sn.boosting) { ctx.beginPath(); ctx.moveTo(ex - er * 1.2, s * (ey + er * 1.2)); ctx.lineTo(ex + er * 1.1, s * (ey - er * .1)); ctx.lineWidth = r * .16; ctx.strokeStyle = ol; ctx.stroke(); }   // sobrancelha brava ao acelerar
      }
    }
  }

  // ---------- miniatura da loja (mesmo pipeline do jogo) ----------
  const fake = {segments: [], x: 0, y: 0, angle: 0, radius: 11, sk: null, seed: .3, name: ''};
  function preview(cv, sk, now) {
    const dpr = Math.min(2, root.devicePixelRatio || 1), W = cv._w || (cv._w = cv.width), H = cv._h || (cv._h = cv.height);
    if (cv._dpr !== dpr) { cv._dpr = dpr; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = 'auto'; cv.style.aspectRatio = W + '/' + H; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const r = 11 * (sk.thick || 1), n = Math.floor((W - 56) / 5), sg = fake.segments; sg.length = 0;
    const X = i => W - 38 - i * 5, Y = i => H / 2 + Math.sin((n - i) * .13 + .6) * (H * .2);
    for (let i = 0; i < n; i++) { if (!sg[i]) sg[i] = {x: 0, y: 0, c: 0}; sg[i].x = X(i); sg[i].y = Y(i); sg[i].c = n - i + 20; }
    fake.sk = sk; fake.radius = r; fake.x = sg[0].x; fake.y = sg[0].y; fake.angle = Math.atan2(sg[0].y - sg[2].y, sg[0].x - sg[2].x); fake.px = fake.x; fake.py = fake.y; fake.pa = fake.angle; fake.eatT = -1e9;
    draw(c, fake, {q: QUALITY[2], now: now || 0, alpha: 1, wave: now ? 1 : 0});
  }
  const api = {VERSION: '3.2', QUALITY, draw, preview, shade, _buildSpine: buildSpine, _edges: edges, _buf: {px, py, ss, hw, pc, E0}, MAXP};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else { root.SnakeRender = api; if (root.Skins) root.Skins.preview = preview; }   // a loja usa o MESMO renderer do jogo
})(typeof window !== 'undefined' ? window : globalThis);
