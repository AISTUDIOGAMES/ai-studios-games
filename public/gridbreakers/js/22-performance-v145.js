/* =====================================================================
   OWL GRIDBREAKERS 1.5.10 - DESKTOP DISPLAY + RESOLUTION + AUDIO SETTINGS
   Graphics profile (HIGH/MEDIUM/LOW), FPS limit, live FPS counter.
   Defaults reproduce the previous behaviour exactly: HIGH quality, FPS unlimited, counter hidden.
   Settings are saved in localStorage ('owl_gfx_v1'); nothing here touches the game save.
   ===================================================================== */
(function () {
  'use strict';
  window.OWL_BUILD_VERSION = '1.5.10';
  document.documentElement.setAttribute('data-owl-build', '1.5.10');
  const KEY = 'owl_gfx_v1';
  // k  = multiplier for the particle caps (HIGH = the original 140/170)
  // pr = max device pixel ratio for the WebGL canvas (HIGH = the original 2)
  const PROFILES = {
    high:   { label: 'HIGH',   k: 1,   pr: 2,   floaters: 32, lights: true,  shadows: true  },
    medium: { label: 'MEDIUM', k: .65, pr: 1.5, floaters: 18, lights: true,  shadows: true  },
    low:    { label: 'LOW',    k: .35, pr: 1,   floaters: 10, lights: false, shadows: false }
  };
  const FPS_CHOICES = [0, 30, 45, 60];                 // 0 = unlimited (display rate)
  let cfg = { quality: 'high', fps: 0, show: false, ui: 'auto', resolution: 1080 };
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (o && PROFILES[o.quality]) cfg.quality = o.quality;
    if (o && FPS_CHOICES.includes(Number(o.fps))) cfg.fps = Number(o.fps);
    if (o) cfg.show = !!o.show;
    if (o && ['auto', 'desktop', 'mobile'].includes(o.ui)) cfg.ui = o.ui;
    if (o && [1080, 720, 480].includes(Number(o.resolution))) cfg.resolution = Number(o.resolution);
  } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} };
  const prof = () => PROFILES[cfg.quality] || PROFILES.high;
  const RESOLUTION_CHOICES = [1080, 720, 480];
  function desktopLayoutActive() {
    if (cfg.ui === 'desktop') return true;
    if (cfg.ui === 'mobile') return false;
    return window.matchMedia ? window.matchMedia('(min-width: 821px)').matches : window.innerWidth >= 821;
  }
  function renderPixelRatio() {
    const dpr = Math.max(.25, Number(window.devicePixelRatio) || 1);
    const profileCap = prof().pr;
    const arena = document.getElementById('arena');
    const cssHeight = Math.max(1, (arena && arena.clientHeight) || (R3 && R3.domElement && R3.domElement.parentElement && R3.domElement.parentElement.clientHeight) || window.innerHeight || 1);
    // The web app cannot change the monitor's physical resolution. This caps
    // the internal WebGL drawing buffer to the selected output height instead.
    const targetCap = Math.max(.25, (Number(cfg.resolution) || 1080) / cssHeight);
    return Math.max(.25, Math.min(dpr, profileCap, targetCap));
  }
  function applyRenderResolution() {
    try {
      if (typeof R3 !== 'undefined' && R3 && R3.setPixelRatio) R3.setPixelRatio(renderPixelRatio());
    } catch (error) { console.warn('[OWL] render resolution apply', error); }
  }
  function fullscreenStatus(message) {
    const checkbox = document.getElementById('gfxfullscreen');
    const status = document.getElementById('gfxfullscreen-status');
    const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (checkbox) checkbox.checked = active;
    if (status) status.textContent = message || (active ? 'Tela cheia ativada · pressione Esc para sair.' : 'Janela normal · tela cheia desativada.');
    return active;
  }
  function setFullscreen(enabled) {
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (enabled) {
      if (document.fullscreenElement || document.webkitFullscreenElement) { fullscreenStatus(); return; }
      if (!request) { fullscreenStatus('Tela cheia não é suportada neste navegador.'); return; }
      // requestFullscreen must be invoked directly from the user's click.
      try {
        Promise.resolve(request.call(root, { navigationUI: 'hide' })).then(() => fullscreenStatus()).catch(error => {
          console.warn('[OWL] fullscreen request was rejected', error);
          fullscreenStatus('O navegador não permitiu tela cheia. Use F11 ou permita a ação.');
        });
      } catch (error) {
        console.warn('[OWL] fullscreen request failed', error);
        fullscreenStatus('Não foi possível ativar tela cheia. Use F11 no navegador.');
      }
      return;
    }
    if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
      try { Promise.resolve(exit.call(document)).then(() => fullscreenStatus()).catch(error => { console.warn('[OWL] exit fullscreen', error); fullscreenStatus(); }); }
      catch (error) { console.warn('[OWL] exit fullscreen', error); fullscreenStatus(); }
    } else fullscreenStatus();
  }
  document.addEventListener('fullscreenchange', () => { fullscreenStatus(); applyRenderResolution(); });
  document.addEventListener('webkitfullscreenchange', () => { fullscreenStatus(); applyRenderResolution(); });
  window.addEventListener('resize', () => { applyRenderResolution(); });

  /* ---- frame limiter: advances the schedule by whole intervals, so 45 FPS on a 60 Hz display averages 45 ---- */
  const last = { battle: 0, map: 0 };
  let mCount = 0, mAt = 0, measured = 0;
  function frameOK(ts, ch) {
    if (document.hidden) return false;
    ts = ts || performance.now();
    if (cfg.fps) {
      const interval = 1000 / cfg.fps, l = last[ch] || 0;
      if (ts - l < interval - .5) return false;
      const adv = l + Math.max(1, Math.floor((ts - l + .5) / interval)) * interval;
      last[ch] = (ts - adv > interval) ? ts : adv;
    }
    mCount++; if (!mAt) mAt = ts;
    if (ts - mAt >= 500) {
      measured = Math.round(mCount * 1000 / (ts - mAt)); mCount = 0; mAt = ts;
      const el = document.getElementById('gfx-fps');
      if (el) el.textContent = measured + ' FPS \u00b7 ' + prof().label;
    }
    return true;
  }

  /* ---- apply the profile to the live renderer ---- */
  function apply() {
    const p = prof(), root = document.documentElement;
    if (cfg.ui === 'auto') root.removeAttribute('data-ui-mode');
    else root.setAttribute('data-ui-mode', cfg.ui);
    root.classList.toggle('gfx-low', cfg.quality === 'low');
    root.classList.toggle('gfx-medium', cfg.quality === 'medium');
    try {
      applyRenderResolution();
      if (typeof SC !== 'undefined' && SC) {
        SC.traverse(o => { if (o.isPointLight) o.visible = p.lights; });
        if (R3 && R3.shadowMap && R3.shadowMap.enabled !== p.shadows) {
          R3.shadowMap.enabled = p.shadows;
          SC.traverse(o => { if (o.isDirectionalLight) o.castShadow = p.shadows; if (o.material) { const m = o.material; (Array.isArray(m) ? m : [m]).forEach(x => x.needsUpdate = true); } });
        }
      }
    } catch (e) { console.warn('[OWL] graphics apply', e); }
    let el = document.getElementById('gfx-fps');
    if (cfg.show && !el) { el = document.createElement('div'); el.id = 'gfx-fps'; el.textContent = '-- FPS \u00b7 ' + p.label; document.body.appendChild(el); }
    if (!cfg.show && el) el.remove();
  }

  window.GFX = { cfg: () => cfg, k: () => prof().k, frameOK, apply, measured: () => measured, resolution: () => cfg.resolution, setFullscreen, isFullscreen: () => !!(document.fullscreenElement || document.webkitFullscreenElement) };

  /* ---- re-apply when the 3D scene is (re)created ---- */
  if (typeof initScene === 'function') {
    const _is = initScene;
    initScene = function () { const r = _is.apply(this, arguments); try { apply(); } catch (e) {} return r; };
  }

  /* ---- floating damage numbers: cap per profile; crits, heals and skill numbers are never dropped ---- */
  if (typeof floater === 'function') {
    const _fl = floater;
    floater = function (v, txt, col, big) {
      const hu = document.getElementById('hudu');
      if (hu) {
        const n = hu.getElementsByClassName('fl').length, cap = prof().floaters, t = String(txt);
        const important = col === '#ffd34a' || t[0] === '+' || big;
        if (n >= cap && !important) return;
        if (n >= cap * 2) return;
      }
      return _fl.apply(this, arguments);
    };
  }

  /* ---- settings button + panel ---- */
  function panel() {
    const existing = document.getElementById('gfx-settings-overlay');
    if (existing) {
      existing.style.display = 'flex';
      const existingClose = existing.querySelector('#gfxclose');
      if (existingClose) existingClose.focus();
      return existing;
    }
    const p = document.createElement('div');
    p.id = 'gfx-settings-overlay';
    p.className = 'gfx-settings-overlay';
    const btn = (attr, val, text, on) => `<button type="button" class="gfx-choice${on ? ' is-active' : ''}" ${attr}="${val}" aria-pressed="${on ? 'true' : 'false'}">${text}</button>`;
    const draw = () => {
      p.innerHTML = '<div class="gfx-settings-card" role="dialog" aria-modal="true" aria-labelledby="gfx-settings-title">'
        + '<div class="gfx-settings-heading"><b id="gfx-settings-title">⚙ CONFIGURAÇÕES</b><span>OWL GRIDBREAKERS · v1.5.10</span></div>'
        + '<section class="gfx-setting-group gfx-ui-mode-group"><div class="gfx-setting-label">Layout da tela · escolha seu dispositivo</div><div class="gfx-choice-row">'
        + btn('data-ui', 'auto', 'AUTO', cfg.ui === 'auto')
        + btn('data-ui', 'desktop', 'DESKTOP · PC', cfg.ui === 'desktop')
        + btn('data-ui', 'mobile', 'MOBILE · CELULAR', cfg.ui === 'mobile')
        + '</div><p class="gfx-setting-current" data-ui-current>Modo ativo: <strong>' + ({ auto: 'AUTO · adaptação automática', desktop: 'DESKTOP · computador', mobile: 'MOBILE · celular' }[cfg.ui] || 'AUTO') + '</strong></p><p class="gfx-setting-help">Escolha como os painéis e controles serão organizados. Auto detecta a largura da tela; Desktop mantém painéis laterais; Mobile empilha o conteúdo e amplia os controles de toque.</p></section>'
        + (desktopLayoutActive() ? '<section class="gfx-setting-group gfx-display-group"><div class="gfx-setting-label">Tela · Desktop</div><label class="gfx-check-row gfx-fullscreen-row"><input type="checkbox" id="gfxfullscreen" ' + ((document.fullscreenElement || document.webkitFullscreenElement) ? 'checked' : '') + '> Ativar tela cheia</label><p class="gfx-setting-current" id="gfxfullscreen-status">' + ((document.fullscreenElement || document.webkitFullscreenElement) ? 'Tela cheia ativada · pressione Esc para sair.' : 'Janela normal · tela cheia desativada.') + '</p><div class="gfx-setting-label gfx-resolution-label">Resolução de renderização</div><div class="gfx-choice-row gfx-resolution-choices">' + RESOLUTION_CHOICES.map(h => btn('data-res', h, h + 'p', Number(cfg.resolution) === h)).join('') + '</div><p class="gfx-setting-help">1080p prioriza nitidez; 720p equilibra qualidade e desempenho; 480p reduz o uso de GPU. A escolha limita a resolução interna do jogo, sem alterar a resolução do Windows/monitor.</p></section>' : '')
        + '<section class="gfx-setting-group gfx-audio-group"><div class="gfx-setting-label">Áudio · música e efeitos</div>'
        + '<label class="gfx-check-row"><input type="checkbox" id="gfxmusic" ' + ((window.AWO_MENU_MUSIC ? window.AWO_MENU_MUSIC.isEnabled() : S.music !== false) ? 'checked' : '') + '> Música ambiente</label>'
        + '<div class="gfx-audio-slider"><label for="gfxmusicvol"><span>🎵 Volume da música</span><b id="mvv">' + Math.round((S.mv === undefined ? 1 : S.mv) * 100) + '%</b></label><input id="gfxmusicvol" type="range" min="0" max="100" value="' + Math.round((S.mv === undefined ? 1 : S.mv) * 100) + '" data-mix="mv"></div>'
        + '<label class="gfx-check-row"><input type="checkbox" id="gfxsfx" ' + (S.snd !== false ? 'checked' : '') + '> Efeitos sonoros</label>'
        + '<div class="gfx-audio-slider"><label for="gfxsfxvol"><span>💥 Volume dos efeitos</span><b id="svv">' + Math.round((S.sv === undefined ? 1 : S.sv) * 100) + '%</b></label><input id="gfxsfxvol" type="range" min="0" max="100" value="' + Math.round((S.sv === undefined ? 1 : S.sv) * 100) + '" data-mix="sv"></div>'
        + '<button type="button" class="gfx-audio-test" data-a="mixtest">🔊 Testar efeitos sonoros</button>'
        + '<p class="gfx-setting-help">Os níveis são salvos automaticamente. A música e os efeitos podem ser ligados ou desligados separadamente.</p></section>'
        + '<section class="gfx-setting-group"><div class="gfx-setting-label">Qualidade gráfica</div><div class="gfx-choice-row">'
        + Object.keys(PROFILES).map(k => btn('data-q', k, PROFILES[k].label, cfg.quality === k)).join('')
        + '</div><p class="gfx-setting-help">Qualidade menor melhora o desempenho em dispositivos modestos.</p></section>'
        + '<section class="gfx-setting-group"><div class="gfx-setting-label">Limite de FPS</div><div class="gfx-choice-row">'
        + FPS_CHOICES.map(f => btn('data-f', f, f ? String(f) : 'Auto', cfg.fps === f)).join('')
        + '</div></section>'
        + '<label class="gfx-check-row"><input type="checkbox" id="gfxshow" ' + (cfg.show ? 'checked' : '') + '> Mostrar contador de FPS</label>'
        + '<section class="gfx-setting-group gfx-save-group"><div class="gfx-setting-label">Save · progresso e backup</div>'
        + '<p class="gfx-setting-help">O progresso também é salvo automaticamente. Use estas opções para salvar manualmente ou criar/restaurar uma cópia do arquivo.</p>'
        + '<div class="gfx-save-actions"><button type="button" data-save-action="save">Salvar agora</button><button type="button" data-save-action="export">Exportar save (.json)</button><button type="button" data-save-action="import">Importar save (.json)</button></div></section>'
        + '<section class="gfx-setting-group gfx-danger-group"><div class="gfx-setting-label">Reset campanha</div><p class="gfx-setting-help">Apaga o progresso desta campanha neste navegador: níveis, personagens, equipamentos, moedas, invocações e avanço. Esta ação não pode ser desfeita; exporte o save antes para guardar uma cópia.</p><button type="button" class="gfx-danger-button" data-a="resetCampaign">↻ RESETAR CAMPANHA</button></section>'
        + '<button type="button" id="gfxclose" class="gfx-close-button">Fechar</button></div>';
    };
    draw();
    p.addEventListener('click', e => {
      const ui = e.target.closest('[data-ui]'), q = e.target.closest('[data-q]'), f = e.target.closest('[data-f]'), res = e.target.closest('[data-res]');
      if (ui) { cfg.ui = ui.dataset.ui; save(); apply(); draw(); return; }
      if (res) { cfg.resolution = Number(res.dataset.res); save(); applyRenderResolution(); draw(); return; }
      if (q) { cfg.quality = q.dataset.q; save(); apply(); draw(); return; }
      if (f) { cfg.fps = Number(f.dataset.f); save(); draw(); return; }
      const saveAction = e.target.closest('[data-save-action]');
      if (saveAction) {
        const action = saveAction.dataset.saveAction;
        if (action === 'save') {
          try { if (typeof window.save === 'function') window.save(); saveAction.textContent = 'Salvo ✓'; setTimeout(() => { if (saveAction.isConnected) saveAction.textContent = 'Salvar agora'; }, 1400); }
          catch (error) { console.warn('[OWL] manual save failed', error); }
        } else if (action === 'export' && window.OWL && typeof window.OWL.exportSave === 'function') {
          window.OWL.exportSave();
        } else if (action === 'import' && window.OWL && typeof window.OWL.importSave === 'function') {
          window.OWL.importSave();
        }
        return;
      }
      const fullscreenToggle = e.target.closest && e.target.closest('#gfxfullscreen');
      if (fullscreenToggle) { setFullscreen(fullscreenToggle.checked); return; }
      if (e.target.id === 'gfxshow') { cfg.show = e.target.checked; save(); apply(); return; }
      if (e.target.id === 'gfxmusic') {
        if (window.AWO_MENU_MUSIC) window.AWO_MENU_MUSIC.setEnabled(e.target.checked);
        else { S.music = e.target.checked; try { save(); } catch (err) {} }
        return;
      }
      if (e.target.id === 'gfxsfx') {
        S.snd = e.target.checked;
        try { if (!S.snd && window.__AWO_GACHA_ROLL_AUDIO) window.__AWO_GACHA_ROLL_AUDIO.stop(); save(); if (S.snd && typeof audioInit === 'function') audioInit(); if (typeof MG !== 'undefined' && MG) MG.gain.value = S.snd ? .5 : 0; if (typeof ctl === 'function') ctl(); } catch (err) { console.warn('[OWL] audio setting', err); }
        return;
      }
      if (e.target.id === 'gfxclose' || e.target === p) p.remove();
    });
    document.body.appendChild(p);
    const close = p.querySelector('#gfxclose');
    if (close) close.focus();
    p.addEventListener('keydown', e => {
      if (e.key === 'Escape') { p.remove(); }
    });
    return p;
  }
  // Settings are opened from the permanent Config tab in the bottom navigation.
  window.GFX.openSettings = panel;
  apply();

})();
