/* =====================================================================
   OWL GRIDBREAKERS v1.5.7 — MINIMAL ICON HUD
   All battle-specific information and controls live INSIDE #arena.
   Character-overhead HP/name plates stay disabled; Party cards retain HP.
   No combat rules, rewards, saves or navigation actions are changed.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_BATTLEFIELD_UI_V157__) return;
  window.__OWL_BATTLEFIELD_UI_V157__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  let lastSync = 0;

  function ensureZones(arena) {
    let overlay = $('#battlefield-hud', arena);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'battlefield-hud';
      overlay.setAttribute('aria-label', 'Battle HUD');
      overlay.innerHTML = `
        <div class="bf-slot bf-resources-slot" id="bf-resources-slot"></div>
        <div class="bf-slot bf-header-slot" id="bf-header-slot"></div>
        <div class="bf-slot bf-party-slot" id="bf-party-slot"></div>
        <div class="bf-slot bf-target-slot" id="bf-target-slot"></div>
        <div class="bf-slot bf-controls-slot" id="bf-controls-slot"></div>
        <div class="bf-slot bf-skills-slot" id="bf-skills-slot"></div>
        <div class="bf-slot bf-result-slot" id="bf-result-slot"></div>`;
      arena.appendChild(overlay);
    }
    return overlay;
  }

  function moveTo(node, slot) {
    if (node && slot && node.parentNode !== slot) slot.appendChild(node);
  }

  function annotateIconOnlyControls(overlay) {
    const controls = $('.side', overlay);
    if (controls) {
      controls.querySelectorAll('button').forEach(button => {
        const action = String(button.dataset.a || '').toLowerCase();
        const text = (button.textContent || '').trim();
        let icon = '', label = '';
        if (action === 'pause') {
          const resume = /RESUME|▶/.test(text);
          icon = resume ? 'play' : 'pause';
          label = resume ? 'Retomar batalha' : 'Pausar batalha';
        } else if (action === 'speed') {
          icon = 'speed'; label = `Velocidade ${text.replace(/[^x0-9]/gi, '') || 'atual'}`;
        } else if (action === 'auto') {
          icon = 'skills'; label = `Habilidades automáticas ${/OFF/i.test(text) ? 'desativadas' : 'ativadas'}`;
          button.setAttribute('aria-pressed', /OFF/i.test(text) ? 'false' : 'true');
        } else if (action === 'autou') {
          icon = 'ultimate'; label = `Ultimates automáticas ${/MANUAL/i.test(text) ? 'manuais' : 'automáticas'}`;
          button.setAttribute('aria-pressed', /MANUAL/i.test(text) ? 'false' : 'true');
        } else if (action === 'autocontinue') {
          icon = 'continue'; label = `Continuação automática ${/OFF/i.test(text) ? 'desativada' : 'ativada'}`;
        } else {
          return;
        }
        button.dataset.bfIcon = icon;
        button.title = label;
        button.setAttribute('aria-label', label);
      });
    }

    const roster = $('#battle-roster', overlay);
    if (roster) {
      roster.querySelectorAll('.battle-unit').forEach(card => {
        const id = card.dataset.unitId;
        const hero = id && H[id];
        const unit = (B && B.allies || []).find(item => item.id === id);
        const name = hero ? hero.n : (unit && (unit.n || unit.id)) || id || 'Personagem';
        const level = unit && S.lv && S.lv[id] ? S.lv[id] : 1;
        const hp = unit ? `${Math.ceil(Number(unit.hp) || 0)} / ${Math.ceil(Number(unit.max) || 0)} HP` : '';
        card.title = `${name}${level ? ` · LV ${level}` : ''}${hp ? ` · ${hp}` : ''}`;
        card.setAttribute('aria-label', card.title);
        const image = $('img', card);
        if (image) { image.alt = name; image.title = card.title; }
      });
    }

    const skills = $('.battle-skills .skr', overlay);
    if (skills) {
      skills.querySelectorAll('.skb').forEach(button => {
        const id = button.dataset.v;
        const hero = id && H[id];
        const name = hero ? hero.n : id || 'Personagem';
        const skill = hero && hero.sk ? hero.sk : 'Habilidade';
        const label = `${name} · ${skill} · ativar habilidade`;
        button.title = label;
        button.setAttribute('aria-label', label);
        const image = $('img', button);
        if (image) { image.alt = label; image.title = label; }
      });
    }

    const targetType = $('#battle-target-panel .battle-target-name span', overlay);
    if (targetType && B) {
      const liveEnemies = (B.enemies || []).filter(unit => !unit.dead);
      targetType.textContent = liveEnemies.some(unit => unit.boss) ? 'BOSS' : (liveEnemies.length ? 'FOES' : '');
    }
  }

  function syncBattlefieldUI(force) {
    if (view !== 'battle') return;
    const now = performance.now();
    if (!force && now - lastSync < 180) return;
    lastSync = now;

    const arena = $('#arena');
    const shell = $('#battle-rpg-shell');
    if (!arena || !shell) return;
    const overlay = ensureZones(arena);

    // Bring every battle panel into reserved in-arena edge zones.
    moveTo($('#battle-resource-strip'), $('#bf-resources-slot', overlay));
    moveTo($('.battle-header'), $('#bf-header-slot', overlay));
    moveTo($('.battle-roster-panel'), $('#bf-party-slot', overlay));
    moveTo($('#battle-target-panel'), $('#bf-target-slot', overlay));
    moveTo($('.battle-command-panel'), $('#bf-controls-slot', overlay));
    moveTo($('.battle-skills-panel'), $('#bf-skills-slot', overlay));
    moveTo($('#battle-result-slot'), $('#bf-result-slot', overlay));
    annotateIconOnlyControls(overlay);

    // Legacy sidebar/viewport wrappers no longer reserve space outside the arena.
    shell.classList.add('battle-hud-in-arena');
    const sidebar = $('.battle-sidebar', shell);
    if (sidebar) sidebar.setAttribute('aria-hidden', 'true');

    // HP plates above individual character/enemy heads are intentionally removed.
    const overhead = $('#hudu', arena);
    if (overhead) {
      overhead.setAttribute('aria-hidden', 'true');
      overhead.style.setProperty('display', 'none', 'important');
    }
    arena.classList.add('battlefield-hud-active');
  }

  const originalDraw = draw;
  draw = function () {
    const result = originalDraw.apply(this, arguments);
    if (view === 'battle') syncBattlefieldUI(true);
    return result;
  };

  const originalRender = render;
  render = function () {
    const result = originalRender.apply(this, arguments);
    if (view === 'battle') syncBattlefieldUI(false);
    return result;
  };

  const originalBuild = build;
  build = function () {
    const result = originalBuild.apply(this, arguments);
    const arena = $('#arena');
    const overhead = arena && $('#hudu', arena);
    if (overhead) {
      overhead.setAttribute('aria-hidden', 'true');
      overhead.style.setProperty('display', 'none', 'important');
    }
    return result;
  };

  // Catch shell recreation and delayed panel/resource mounting without moving
  // nodes on every frame. syncBattlefieldUI is idempotent and throttled.
  const observer = new MutationObserver(() => {
    if (view === 'battle') syncBattlefieldUI(false);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  try { syncBattlefieldUI(true); } catch (error) {
    console.warn('[OWL v1.5.7] battlefield layout deferred', error);
  }
  console.info('[OWL v1.5.7] minimal icon-only battlefield HUD active; overhead HP plates disabled.');
})();
