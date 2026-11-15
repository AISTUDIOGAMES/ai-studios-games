/* =====================================================================
   OWL GRIDBREAKERS — RPG interface + restrained VFX pass
   Presentation-only layer. Keeps combat, saves, campaign, gacha and input
   actions owned by the original game modules.
   ===================================================================== */
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let shell = null;

  function panel(title, id, contentClass) {
    const box = document.createElement('section');
    box.className = 'rpg-panel ' + (contentClass || '');
    box.innerHTML = `<h3 class="rpg-panel-title">${title}</h3><div id="${id}"></div>`;
    return box;
  }

  function buildBattleShell() {
    if (view !== 'battle') return;
    const viewRoot = $('#view');
    const arena = $('#arena', viewRoot);
    if (!viewRoot || !arena) return;
    if (shell && shell.isConnected && shell.contains(arena)) return;

    shell = document.createElement('section');
    shell.id = 'battle-rpg-shell';
    shell.setAttribute('aria-label', 'Battle interface');

    const header = document.createElement('header');
    header.className = 'battle-header';
    header.innerHTML = `
      <div class="battle-brand"><strong>OWL GRIDBREAKERS</strong><span>TACTICAL COMBAT INTERFACE</span></div>
      <div class="battle-context"><div id="battle-context-copy" class="inf"></div><div id="battle-alert" class="battle-alert" role="status" aria-live="polite"></div></div>`;

    const grid = document.createElement('div');
    grid.className = 'battle-grid';
    const viewport = document.createElement('div');
    viewport.className = 'battle-viewport';
    const sidebar = document.createElement('aside');
    sidebar.className = 'battle-sidebar';

    const rosterPanel = panel('PARTY STATUS', 'battle-roster', 'battle-roster-panel');
    const commandPanel = panel('TACTICAL CONTROLS', 'battle-commands', 'battle-command-panel battle-commands');
    const resultSlot = document.createElement('section');
    resultSlot.id = 'battle-result-slot';
    resultSlot.className = 'battle-result-slot';

    const skillsPanel = document.createElement('section');
    skillsPanel.className = 'rpg-panel battle-bottom battle-skills-panel';
    skillsPanel.innerHTML = `<div class="battle-skills-label">Character skills · click to activate</div><div class="battle-skills"><div id="battle-skill-slot"></div><div class="battle-help">Gold gauge = ultimate ready · cyan edge = skill ready.</div></div>`;

    const info = $('#inf', arena);
    const portraits = $('.pt', arena);
    const controls = $('.side', arena);
    const skills = $('.skr', arena);
    const floaters = $('#hudu', arena);

    viewRoot.appendChild(shell);
    shell.append(header, grid, resultSlot);
    grid.append(viewport, sidebar);
    // Party status occupies a reserved strip above the battlefield, never over the 3D scene.
    viewport.append(rosterPanel, arena);
    sidebar.append(commandPanel, skillsPanel);

    if (info) $('#battle-context-copy').appendChild(info);
    if (controls) $('#battle-commands').appendChild(controls);
    if (skills) $('#battle-skill-slot').appendChild(skills);
    if (portraits) portraits.remove();
    if (floaters) floaters.setAttribute('aria-hidden', 'true');

    // Alert text (boss telegraphs) is relocated out of the 3D canvas on every render.
    const warning = $('#bwarn', arena);
    if (warning) moveWarning(warning);
    const resultBanner = $('.ban', arena);
    if (resultBanner && resultBanner.style.display !== 'none') moveResultBanner(resultBanner);
    updateBattlePanels();
  }

  function moveResultBanner(banner) {
    const target = $('#battle-result-slot');
    if (!banner || !target) return;
    if (banner.parentNode !== target) target.appendChild(banner);
  }

  function moveWarning(warning) {
    const target = $('#battle-alert');
    if (!warning || !target) return;
    if (warning.parentNode !== target) target.appendChild(warning);
    target.style.display = warning.style.display === 'none' ? 'none' : 'block';
  }

  function updateBattlePanels() {
    if (view !== 'battle' || !shell || !shell.isConnected || !B) return;
    const roster = $('#battle-roster');
    const allies = B.allies || [];
    if (roster) {
      const signature = allies.map(unit => unit.id).join('|');
      if (roster.dataset.signature !== signature) {
        roster.innerHTML = allies.map(unit => {
          const hero = H[unit.id] || { n: unit.n || unit.id };
          const portrait = SP[unit.id] || '';
          return `<div class="battle-unit" data-unit-id="${esc(unit.id)}">
            <img src="${esc(portrait)}" alt="${esc(hero.n)}">
            <div class="battle-unit-info">
              <div class="battle-unit-name"></div>
              <div class="battle-unit-hp"><i></i><s></s></div>
              <div class="battle-unit-meta"><span>HP</span><b></b></div>
            </div>
          </div>`;
        }).join('');
        roster.dataset.signature = signature;
      }
      allies.forEach((unit, index) => {
        const card = roster.children[index];
        if (!card) return;
        const hero = H[unit.id] || { n: unit.n || unit.id };
        const max = Math.max(1, Number(unit.max) || 1);
        const current = Math.max(0, Number(unit.hp) || 0);
        const hp = Math.max(0, Math.min(100, current / max * 100));
        const shield = Math.max(0, Math.min(100, Number(unit.sh) / max * 100 || 0));
        const level = S.lv && S.lv[unit.id] ? S.lv[unit.id] : 1;
        card.classList.toggle('dead', !!unit.dead);
        const name = card.querySelector('.battle-unit-name');
        const hpBar = card.querySelector('.battle-unit-hp i');
        const shieldBar = card.querySelector('.battle-unit-hp s');
        const status = card.querySelector('.battle-unit-meta span');
        const numbers = card.querySelector('.battle-unit-meta b');
        if (name) name.innerHTML = `${esc(hero.n)} <span>LV ${level}</span>`;
        if (hpBar) hpBar.style.width = hp.toFixed(1) + '%';
        if (shieldBar) shieldBar.style.width = shield.toFixed(1) + '%';
        if (status) status.textContent = unit.dead ? 'DOWN' : 'HP';
        if (numbers) numbers.textContent = `${Math.ceil(current).toLocaleString()} / ${Math.ceil(max).toLocaleString()}`;
      });
    }

    const enemies = (B.enemies || []).filter(unit => !unit.dead);
    const target = enemies.find(unit => unit.boss) || enemies.slice().sort((a, b) => (a.hp / a.max) - (b.hp / b.max))[0];
    let targetPanel = $('#battle-target-panel');
    if (target) {
      const isBoss = !!target.boss;
      const percent = Math.max(0, Math.min(100, target.hp / Math.max(1, target.max) * 100));
      if (!targetPanel) {
        targetPanel = document.createElement('div');
        targetPanel.id = 'battle-target-panel';
        targetPanel.className = 'battle-target';
        targetPanel.innerHTML = '<div class="battle-target-name"><b></b><span></span></div><div class="battle-unit-hp"><i></i></div>';
        roster && roster.parentNode.insertBefore(targetPanel, roster.nextSibling);
      }
      const targetName = targetPanel.querySelector('.battle-target-name b');
      const targetType = targetPanel.querySelector('.battle-target-name span');
      const targetBar = targetPanel.querySelector('.battle-unit-hp i');
      if (targetName) targetName.textContent = target.n || (isBoss ? 'OURO' : 'ENEMY TARGET');
      if (targetType) targetType.textContent = isBoss ? 'BOSS' : 'FOES';
      if (targetBar) targetBar.style.width = percent.toFixed(1) + '%';
    } else if (targetPanel) {
      targetPanel.remove();
    }

    const alert = $('#battle-alert');
    const warning = $('#bwarn');
    if (warning && alert) moveWarning(warning);
    const resultSlot = $('#battle-result-slot');
    const existingBanner = resultSlot && resultSlot.querySelector('.ban');
    const arenaBanner = $('#arena .ban');
    if (existingBanner) {
      if (arenaBanner && arenaBanner !== existingBanner) arenaBanner.remove();
    } else if (arenaBanner && arenaBanner.style.display !== 'none') {
      moveResultBanner(arenaBanner);
    }
    const context = $('#battle-context-copy');
    const inf = $('#inf');
    if (context && inf && inf.parentNode !== context) context.appendChild(inf);
  }

  function softenLiveScene() {
    try {
      if (typeof R3 !== 'undefined' && R3) {
        R3.toneMapping = THREE.ACESFilmicToneMapping;
        R3.toneMappingExposure = .82;
        R3.outputColorSpace = THREE.SRGBColorSpace || R3.outputColorSpace;
      }
      if (typeof SC !== 'undefined' && SC) {
        SC.traverse(object => {
          if (object.isPointLight) object.intensity = Math.min(object.intensity, .46);
          if (object.isHemisphereLight) object.intensity = Math.min(object.intensity, .66);
          if (object.isDirectionalLight) object.intensity = Math.min(object.intensity, .82);
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(material => {
              if (!material) return;
              if (material.emissiveIntensity > .72) material.emissiveIntensity = .72;
              if (material.isSpriteMaterial && material.blending === THREE.AdditiveBlending) {
                material.opacity = Math.min(material.opacity == null ? 1 : material.opacity, .48);
              }
            });
          }
        });
        if (SC.fog) {
          SC.fog.near = Math.max(SC.fog.near || 0, 16);
          SC.fog.far = Math.max(SC.fog.far || 0, 42);
        }
      }
    } catch (error) {
      console.warn('[OWL RPG UI] scene tuning skipped', error);
    }
  }

  const originalInitScene = initScene;
  initScene = function () {
    const result = originalInitScene.apply(this, arguments);
    softenLiveScene();
    return result;
  };

  const originalBuild = build;
  build = function () {
    const result = originalBuild.apply(this, arguments);
    softenLiveScene();
    return result;
  };

  const originalDraw = draw;
  draw = function () {
    const result = originalDraw.apply(this, arguments);
    if (view === 'battle') buildBattleShell();
    return result;
  };

  const originalRender = render;
  render = function () {
    const result = originalRender.apply(this, arguments);
    if (view === 'battle') {
      buildBattleShell();
      updateBattlePanels();
    }
    return result;
  };

  // FX are intentionally kept, but bright full-screen washes and additive fog are reduced.
  if (typeof flashFx === 'function') {
    const originalFlash = flashFx;
    flashFx = function (color) {
      const result = originalFlash.apply(this, arguments);
      const nodes = $('#arena') ? $('#arena').querySelectorAll('.fx2') : [];
      nodes.forEach(node => { node.style.opacity = '.12'; node.style.mixBlendMode = 'normal'; });
      return result;
    };
  }

  // Keep UI state readable after the legacy control updater changes button labels.
  const originalCtl = ctl;
  ctl = function () {
    const result = originalCtl.apply(this, arguments);
    if (view === 'battle') {
      const labels = {
        bp: paused ? '▶ RESUME' : 'Ⅱ PAUSE',
        bs: '⚡ SPEED x' + speed,
        ba: '⚔ SKILLS ' + (B && B.auto ? 'ON' : 'OFF'),
        bm: S.snd === false ? 'SOUND OFF' : 'SOUND ON',
        bu: '✦ ULTIMATES ' + (S.autoU === false ? 'MANUAL' : 'AUTO')
      };
      Object.keys(labels).forEach(id => { const button = document.getElementById(id); if (button) button.textContent = labels[id]; });
    }
    return result;
  };

  // Upgrade navigation labels without touching action identifiers or game state.
  const originalNav = nav;
  nav = function () {
    const result = originalNav.apply(this, arguments);
    const map = { battle: 'Battle', heroes: 'Characters', bag: 'Inventory', map: 'World Map', forge: 'Forge', summon: 'Recruit', realm: 'Realm' };
    document.querySelectorAll('#nav button[data-v]').forEach(button => {
      const key = button.dataset.v;
      const label = map[key];
      if (!label) return;
      const icon = button.querySelector('span');
      button.innerHTML = `${icon ? icon.outerHTML : ''}${label}`;
      button.title = label;
      button.setAttribute('aria-label', label);
    });
    return result;
  };

  // Re-locate telegraph notices if they are created during the frame loop.
  const observer = new MutationObserver(() => {
    if (!shell || !shell.isConnected) return;
    const warning = $('#bwarn');
    if (warning && !$('#battle-alert')?.contains(warning)) moveWarning(warning);
    const resultSlot = $('#battle-result-slot');
    const existingBanner = resultSlot && resultSlot.querySelector('.ban');
    const arenaBanner = $('#arena .ban');
    if (existingBanner) {
      if (arenaBanner && arenaBanner !== existingBanner) arenaBanner.remove();
    } else if (arenaBanner && arenaBanner.style.display !== 'none') {
      moveResultBanner(arenaBanner);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Apply the visual pass to the first scene already mounted by the original boot sequence.
  softenLiveScene();
  try { nav(); } catch (_) {}

  console.info('[OWL RPG UI] clean battlefield, external party/skill controls and restrained VFX enabled');
})();
