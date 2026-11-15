/* =====================================================================
   OWL GRIDBREAKERS v1.5.8
   - Groups all battle loot currencies in the arena's upper-left corner.
   - Ancient Tower becomes an endless survival climb: wins advance floors
     automatically; no healing or revives between floors; run ends on wipe.
   - Locked character cards remain fully static until recruited.
   - Ancestral gear animation is restored after legacy static overrides.
   - Crit chance receives diminishing returns from gear and a hard ceiling.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_TOWER_LOOT_CRIT_GEAR_V158__) return;
  window.__OWL_TOWER_LOOT_CRIT_GEAR_V158__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const int = value => Math.max(0, Math.floor(Number(value) || 0));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fmt = value => int(value).toLocaleString('pt-BR');
  const compact = value => {
    const n = int(value);
    if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace('.', ',')}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')}M`;
    if (n >= 1e4) return `${(n / 1e3).toFixed(1).replace('.', ',')}K`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2).replace('.', ',')}K`;
    return String(n);
  };

  /* ---------- Compact loot group in the upper-left of the battlefield ---------- */
  let lootStamp = '';
  function lootEntries() {
    return [
      ['🔷', 'Diamantes', S.shards],
      ['💎', 'Soul', S.soul],
      ['💰', 'Ouro', S.gold],
      ['🏺', 'Relics', S.rel],
      ['🗝', 'Keys', `${int(S.keys)}/5`],
      ['⚒', 'Forge', S.mith]
    ];
  }
  function syncLootCluster() {
    if (view !== 'battle' || typeof S === 'undefined' || !S) return;
    const slot = $('#bf-resources-slot');
    if (!slot) return;
    let cluster = $('#battle-loot-cluster', slot);
    if (!cluster) {
      cluster = document.createElement('div');
      cluster.id = 'battle-loot-cluster';
      cluster.setAttribute('role', 'group');
      cluster.setAttribute('aria-label', 'Recursos e loot da conta');
      slot.prepend(cluster);
      lootStamp = '';
    }
    const entries = lootEntries();
    const stamp = entries.map(([, label, value]) => `${label}:${value}`).join('|');
    if (stamp === lootStamp) return;
    lootStamp = stamp;
    cluster.innerHTML = entries.map(([icon, label, value]) => {
      const raw = typeof value === 'string' ? value : fmt(value);
      const short = typeof value === 'string' ? value : compact(value);
      return `<span class="battle-loot-item" title="${label}: ${raw}" aria-label="${label}: ${raw}"><i aria-hidden="true">${icon}</i><b>${short}</b></span>`;
    }).join('');
  }

  /* ---------- Crit balance: soften character base and diminishing gear returns ---------- */
  const CRIT_BALANCE = Object.freeze(Object.assign({
    baseMultiplier: 0.80,       // trims innate hero crit by 20%
    maxGearBonus: 0.10,        // gear can add at most 10 percentage points
    gearHalfSaturation: 0.25,  // raw gear crit at which half the gear cap is reached
    absoluteCap: 0.30          // hard maximum: 30% total crit chance
  }, (window.OWL_CONFIG && window.OWL_CONFIG.critBalance) || {}));
  const TOWER_BALANCE = Object.freeze(Object.assign({
    baseStageCap: 100,
    scalingStartFloor: 96,
    hpGrowthPerFloor: 0.035,
    atkGrowthPerFloor: 0.022,
    defGrowthPerFloor: 0.012
  }, (window.OWL_CONFIG && window.OWL_CONFIG.ancientTower) || {}));
  function applyCritBalance(id, statsResult) {
    if (!statsResult || !H || !H[id]) return statsResult;
    const hero = H[id];
    const rank = clamp(int(hero.rarity), 0, 6);
    const rankBonus = rank * 0.0025;
    const lensBonus = Math.max(0, Number(S.rl && S.rl.lens) || 0) * 0.005;
    const legacyBase = Math.max(0, Number(hero.crit) || 0);
    const rawGearBonus = Math.max(0, (Number(statsResult.crit) || 0) - legacyBase - rankBonus - lensBonus);
    const diminishingGearBonus = CRIT_BALANCE.maxGearBonus *
      (rawGearBonus / (rawGearBonus + CRIT_BALANCE.gearHalfSaturation || 1));
    const adjustedBase = legacyBase * CRIT_BALANCE.baseMultiplier + rankBonus + lensBonus;
    statsResult.crit = clamp(adjustedBase + diminishingGearBonus, 0, CRIT_BALANCE.absoluteCap);
    return statsResult;
  }
  const previousStats = stats;
  stats = function (id) {
    return applyCritBalance(id, previousStats.apply(this, arguments));
  };
  // Arena opponents use mkFoe rather than stats(); apply the same innate-crit trim.
  const previousMkFoe = mkFoe;
  mkFoe = function (id) {
    const unit = previousMkFoe.apply(this, arguments);
    if (unit && H[id]) {
      const rank = clamp(int(H[id].rarity), 0, 6);
      unit.crit = clamp((Math.max(0, Number(H[id].crit) || 0) * CRIT_BALANCE.baseMultiplier) + rank * 0.0025, 0, CRIT_BALANCE.absoluteCap);
    }
    return unit;
  };
  window.OWL_CRIT_BALANCE = {
    settings: CRIT_BALANCE,
    apply: (id, crit) => applyCritBalance(id, { crit }).crit
  };

  /* ---------- Locked character cards stay static; unlock restores normal rarity effects ---------- */
  const previousCharsHTML = charsHTML;
  charsHTML = function () {
    let html = previousCharsHTML.apply(this, arguments);
    const lockedIds = Object.keys(H).filter(id => !S.owned.includes(id));
    const marker = '<div class="card hc" style="opacity:.45">';
    lockedIds.forEach(id => {
      html = html.replace(marker,
        `<div class="card hc hero-locked-static" data-hero-id="${id}" style="opacity:.45">`);
    });
    return html;
  };

  /* ---------- Endless Ancient Tower ---------- */
  let requestedTowerStage = null;
  function ensureTowerRun(battle) {
    if (!battle.__owlTowerRun) {
      battle.__owlTowerRun = {
        floorsCleared: 0,
        firstFloor: Math.max(1, int(battle.stage) - 4),
        reachedFloor: Math.max(1, int(battle.stage) - 4),
        finished: false,
        rewards: { gold: 0, diamonds: 0, soul: 0, relics: 0, forge: 0, keys: 0, items: 0 }
      };
    }
    return battle.__owlTowerRun;
  }

  const previousSpawn = spawn;
  spawn = function (battle) {
    const preserveParty = !!(battle && battle.dg === 'tower' && battle.__owlTowerPreserveParty);
    const vitals = preserveParty ? (battle.allies || []).map(unit => ({
      unit,
      hp: unit.hp,
      dead: unit.dead,
      shield: unit.sh,
      energy: unit.en,
      skillTimer: unit.skT,
      attackTimer: unit.atkT,
      stun: unit.stun
    })) : null;

    const result = previousSpawn.apply(this, arguments);

    // Some legacy spawn paths recover units automatically. Tower floors are
    // deliberately an attrition run, so restore every survivor/fallen unit.
    if (vitals) {
      vitals.forEach(saved => {
        saved.unit.hp = saved.hp;
        saved.unit.dead = saved.dead;
        saved.unit.sh = saved.shield;
        saved.unit.en = saved.energy;
        saved.unit.skT = saved.skillTimer;
        saved.unit.atkT = saved.attackTimer;
        saved.unit.stun = 0; // inter-floor stun clears; HP, shields, energy and deaths do not.
      });
    }

    if (battle && battle.dg === 'tower') {
      const floor = Math.max(1, int(battle.stage) - 4);
      const overflow = Math.max(0, floor - int(TOWER_BALANCE.scalingStartFloor));
      if (overflow > 0) {
        const hpScale = Math.pow(1 + Number(TOWER_BALANCE.hpGrowthPerFloor), overflow);
        const atkScale = Math.pow(1 + Number(TOWER_BALANCE.atkGrowthPerFloor), overflow);
        const defScale = Math.pow(1 + Number(TOWER_BALANCE.defGrowthPerFloor), overflow);
        (battle.enemies || []).forEach(enemy => {
          const max = Math.max(1, Number(enemy.max) || 1);
          const ratio = clamp((Number(enemy.hp) || 0) / max, 0, 1);
          enemy.max = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(max * hpScale)));
          enemy.hp = Math.min(enemy.max, Math.round(enemy.max * ratio));
          enemy.atk = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round((Number(enemy.atk) || 1) * atkScale)));
          enemy.def = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round((Number(enemy.def) || 0) * defScale)));
        });
      }
      ensureTowerRun(battle).reachedFloor = Math.max(ensureTowerRun(battle).reachedFloor, floor);
    }
    return result;
  };

  const previousNewBattle = newBattle;
  newBattle = function (stage, dungeon, opponent) {
    if (dungeon === 'tower' && Number.isFinite(requestedTowerStage)) stage = requestedTowerStage;
    const battle = previousNewBattle.apply(this, [stage, dungeon, opponent]);
    if (dungeon === 'tower') ensureTowerRun(battle);
    return battle;
  };

  const previousStartBattle = startBattle;
  startBattle = function (stage, dungeon, opponent) {
    const priorRequest = requestedTowerStage;
    if (dungeon === 'tower') requestedTowerStage = Math.max(5, Math.floor(Number(stage) || 5));
    try { return previousStartBattle.apply(this, arguments); }
    finally { requestedTowerStage = priorRequest; }
  };

  function finalizeTowerRun(battle, reason) {
    if (!battle || battle.dg !== 'tower') return;
    const run = ensureTowerRun(battle);
    if (run.finished) return;
    run.finished = true;
    run.reachedFloor = Math.max(run.reachedFloor, Math.max(1, int(battle.stage) - 4));
    run.bestClearedFloor = Math.max(0, int(S.tower));
    run.reason = reason || 'party_defeated';
    const existing = battle.res && typeof battle.res === 'object' ? battle.res : {};
    battle.res = Object.assign({}, existing, {
      towerRun: true,
      towerRunSummary: {
        floorsCleared: run.floorsCleared,
        reachedFloor: run.reachedFloor,
        bestClearedFloor: run.bestClearedFloor,
        loot: Object.assign({}, run.rewards),
        reason: run.reason
      }
    });
    try { save(); } catch (error) { console.warn('[OWL v1.5.8] Tower run save skipped', error); }
  }

  const previousWin = win;
  win = function (battle) {
    if (!battle || battle.dg !== 'tower') return previousWin.apply(this, arguments);

    const run = ensureTowerRun(battle);
    const floor = Math.max(1, int(battle.stage) - 4);
    const before = {
      gold: int(S.gold), diamonds: int(S.shards), soul: int(S.soul),
      relics: int(S.rel), forge: int(S.mith), keys: int(S.keys), items: (S.inv || []).length
    };
    const reward = previousWin.apply(this, arguments) || {};
    const after = {
      gold: int(S.gold), diamonds: int(S.shards), soul: int(S.soul),
      relics: int(S.rel), forge: int(S.mith), keys: int(S.keys), items: (S.inv || []).length
    };
    Object.keys(run.rewards).forEach(key => {
      run.rewards[key] += Math.max(0, after[key] - before[key]);
    });
    run.floorsCleared += 1;
    run.reachedFloor = Math.max(run.reachedFloor, floor);
    run.lastClearedFloor = floor;

    // If the final foe and final party member fall in the same simulation step,
    // count the floor clear but end the run instead of spawning another floor.
    if (!alive(battle.allies || []).length) {
      battle.over = 2;
      battle.res = reward;
      finalizeTowerRun(battle, 'party_wiped_on_floor_clear');
      return reward;
    }

    battle.stage = Math.max(5, int(battle.stage) + 1);
    battle.wave = 0;
    battle.t = 0;
    battle.fx = [];
    battle.enr = 0;
    battle.pulse = 7;
    battle.over = 0;
    battle.res = null;
    battle.built = '';
    battle.__owlTowerPreserveParty = true;
    try { spawn(battle); }
    finally { battle.__owlTowerPreserveParty = false; }
    return reward;
  };

  const previousStep = step;
  step = function (battle, dt) {
    const result = previousStep.apply(this, arguments);
    if (battle && battle.dg === 'tower' && battle.over === 2) finalizeTowerRun(battle, 'party_defeated');
    return result;
  };

  // A Tower retry always begins at the floor after the persistent best clear.
  if (act && typeof act === 'object') {
    const previousRetry = act.retryBattle;
    act.retryBattle = function () {
      if (B && B.dg === 'tower' && B.over) {
        paused = 0;
        view = 'battle';
        startBattle(Math.max(5, int(S.tower) + 5), 'tower');
        return;
      }
      if (typeof previousRetry === 'function') return previousRetry.apply(this, arguments);
    };
    act.retryCurrent = function () { return act.retryBattle(); };
  }

  /* ---------- Render the compact resources, floor counter and final run summary ---------- */
  function showTowerRunSummary() {
    if (!B || B.dg !== 'tower' || B.over !== 2 || !B.__owlTowerRun || !B.__owlTowerRun.finished) return;
    const host = $('#awo-battle-results') || $('#bf-result-slot');
    if (!host) return;
    let summary = $('#owl-tower-run-summary', host);
    if (!summary) {
      summary = document.createElement('section');
      summary.id = 'owl-tower-run-summary';
      summary.className = 'owl-tower-run-summary';
      host.prepend(summary);
    }
    const run = B.__owlTowerRun;
    const rewards = run.rewards;
    summary.innerHTML = `
      <b>ANCIENT TOWER · RUN COMPLETE</b>
      <strong>FLOOR ${run.reachedFloor}</strong>
      <span>${run.floorsCleared} floor${run.floorsCleared === 1 ? '' : 's'} cleared · Best clear ${int(S.tower)}</span>
      <small>Loot gained: 🔷 ${fmt(rewards.diamonds)} · 💎 ${fmt(rewards.soul)} · 💰 ${fmt(rewards.gold)} · 🏺 ${fmt(rewards.relics)} · ⚒ ${fmt(rewards.forge)} · Gear ${fmt(rewards.items)}</small>`;
  }

  function syncTowerFloorLabel() {
    if (!B || B.dg !== 'tower' || view !== 'battle') return;
    const inf = $('#inf');
    if (!inf) return;
    const floor = Math.max(1, int(B.stage) - 4);
    const run = ensureTowerRun(B);
    const stamp = `${floor}:${run.floorsCleared}`;
    if (inf.dataset.owlTowerStamp === stamp) return;
    inf.dataset.owlTowerStamp = stamp;
    inf.innerHTML = `<b>ANCIENT TOWER</b><br>FLOOR ${floor}<br><span>${run.floorsCleared} CLEARED THIS RUN</span>`;
  }

  function moveBattleResultInsideArena() {
    if (view !== 'battle') return;
    const report = $('#awo-battle-results');
    const slot = $('#bf-result-slot');
    if (report && slot && report.parentNode !== slot) slot.appendChild(report);
  }

  const previousHead = head;
  head = function () {
    const result = previousHead.apply(this, arguments);
    syncLootCluster();
    return result;
  };

  const previousDraw = draw;
  draw = function () {
    const result = previousDraw.apply(this, arguments);
    if (view === 'battle') {
      syncLootCluster();
      syncTowerFloorLabel();
      moveBattleResultInsideArena();
      showTowerRunSummary();
    } else {
      lootStamp = '';
    }
    return result;
  };

  const previousRender = render;
  render = function () {
    const result = previousRender.apply(this, arguments);
    if (view === 'battle') {
      syncLootCluster();
      syncTowerFloorLabel();
      moveBattleResultInsideArena();
      showTowerRunSummary();
    }
    return result;
  };

  console.info('[OWL v1.5.8] loot cluster, endless Ancient Tower, static locked heroes, ancestral gear animation and crit soft cap active.');
})();
