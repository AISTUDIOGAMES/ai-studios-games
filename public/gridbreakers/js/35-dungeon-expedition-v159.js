/* =====================================================================
   OWL GRIDBREAKERS v1.5.9 — DUNGEON EXPEDITIONS + TOWER POWER SCALING
   - Reset Campaign is exposed only through Settings (markup in gfx panel).
   - Gold / Forge / Relic dungeons run continuously for up to 10 real minutes.
   - A final boss appears at 08:00; no dungeon loot is granted before its defeat.
   - Dungeon enemies scale above the normal dungeon baseline and with party power.
   - Ancient Tower enemy stats adapt to active party level and equipment-aware POWER.
   - Final battle enemies fade out of the arena after one second.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_DUNGEON_EXPEDITION_V159__) return;
  window.__OWL_DUNGEON_EXPEDITION_V159__ = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const DUNGEONS = new Set(['gold', 'forge', 'relic']);
  const DUNGEON_LIMIT = 600;
  const BOSS_AT = 480; // last two minutes reserved for the dungeon boss
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));
  const n = value => Math.max(0, Math.floor(Number(value) || 0));
  const number = value => Math.max(0, Number(value) || 0);
  const fmt = value => n(value).toLocaleString('pt-BR');
  const isDungeon = battle => !!(battle && DUNGEONS.has(battle.dg));

  /* ---------- Team power model: includes level, ascension, stars, synergies and gear ---------- */
  function baseHeroPower(id) {
    const h = H && H[id];
    if (!h) return 1;
    return Math.max(1, h.atk * 2 + h.hp / 5 + h.def * 3 + h.spd + h.crit * 500);
  }

  function partyMetrics() {
    const ids = (Array.isArray(S.order) ? S.order : [])
      .filter(id => H[id] && Array.isArray(S.owned) && S.owned.includes(id));
    const roster = ids.length ? ids : (S.owned || []).filter(id => H[id]).slice(0, 5);
    if (!roster.length) return { level: 1, power: 1, basePower: 1, powerRatio: 1, scale: 1 };
    const level = roster.reduce((sum, id) => sum + Math.max(1, n(S.lv && S.lv[id]) || 1), 0) / roster.length;
    const powers = roster.map(id => {
      try { return typeof power === 'function' ? Math.max(1, number(power(id))) : baseHeroPower(id); }
      catch (_) { return baseHeroPower(id); }
    });
    const bases = roster.map(baseHeroPower);
    // Keep absolute team POWER as a sum. The ratio isolates investment from the
    // hero base kit, while a gentle roster-size factor accounts for a 5th active slot.
    const currentPower = powers.reduce((sum, value) => sum + value, 0);
    const basePower = bases.reduce((sum, value) => sum + value, 0);
    const powerRatio = Math.max(1, currentPower / Math.max(1, basePower));
    // Soft scaling: level, equipment/ascension POWER and active team size all matter,
    // but none is mirrored linearly (which would create runaway difficulty).
    const levelTerm = Math.pow(Math.max(1, level), 0.16);
    const powerTerm = Math.pow(powerRatio, 0.18);
    const teamSizeTerm = Math.pow(roster.length / 4, 0.14);
    const scale = clamp(Math.sqrt(levelTerm * powerTerm) * teamSizeTerm, 1, 2.25);
    return { level, power: currentPower, basePower, powerRatio, teamSize: roster.length, scale };
  }

  /* ---------- Enemy scaling ---------- */
  const previousSpawn = spawn;
  spawn = function (battle) {
    const result = previousSpawn.apply(this, arguments);
    if (!battle || !Array.isArray(battle.enemies)) return result;
    const metrics = partyMetrics();
    const stage = Math.max(1, n(battle.stage) || 1);

    if (battle.dg === 'tower') {
      const floor = Math.max(1, stage - 4);
      const floorHp = 1 + Math.min(0.55, (floor - 1) * 0.0055);
      const floorAtk = 1 + Math.min(0.42, (floor - 1) * 0.0042);
      const floorDef = 1 + Math.min(0.32, (floor - 1) * 0.0032);
      const hpScale = Math.pow(metrics.scale, 0.90) * floorHp;
      const atkScale = Math.pow(metrics.scale, 0.72) * floorAtk;
      const defScale = Math.pow(metrics.scale, 0.55) * floorDef;
      battle.enemies.forEach(enemy => {
        const hpRatio = clamp((number(enemy.hp) || 0) / Math.max(1, number(enemy.max)), 0, 1);
        enemy.max = Math.max(1, Math.round(number(enemy.max) * hpScale));
        enemy.hp = Math.min(enemy.max, Math.round(enemy.max * hpRatio));
        enemy.atk = Math.max(1, Math.round(number(enemy.atk) * atkScale));
        enemy.def = Math.max(0, Math.round(number(enemy.def) * defScale));
        enemy.__owlTowerAdaptive = true;
      });
      battle.__owlTowerPowerScale = metrics.scale;
      battle.__owlTowerPartyLevel = metrics.level;
      return result;
    }

    if (isDungeon(battle)) {
      const wave = Math.max(0, n(battle.wave));
      const hpScale = 1.72 + 0.30 * (metrics.scale - 1) + 0.006 * Math.min(stage, 80) + 0.012 * Math.min(wave, 45);
      const atkScale = 1.32 + 0.16 * (metrics.scale - 1) + 0.0045 * Math.min(stage, 80) + 0.0065 * Math.min(wave, 45);
      const defScale = 1.20 + 0.11 * (metrics.scale - 1) + 0.0035 * Math.min(stage, 80) + 0.0045 * Math.min(wave, 45);
      battle.enemies.forEach(enemy => {
        const hpRatio = clamp((number(enemy.hp) || 0) / Math.max(1, number(enemy.max)), 0, 1);
        enemy.max = Math.max(1, Math.round(number(enemy.max) * hpScale));
        enemy.hp = Math.min(enemy.max, Math.round(enemy.max * hpRatio));
        enemy.atk = Math.max(1, Math.round(number(enemy.atk) * atkScale));
        enemy.def = Math.max(0, Math.round(number(enemy.def) * defScale));
        enemy.__owlDungeonScaling = { hp: hpScale, atk: atkScale, def: defScale };
      });
      battle.__owlDungeonPowerScale = metrics.scale;
    }
    return result;
  };

  /* ---------- Continuous Dungeon run state ---------- */
  const previousNewBattle = newBattle;
  newBattle = function (stage, dungeon, opponent) {
    const battle = previousNewBattle.apply(this, arguments);
    if (isDungeon(battle)) {
      const now = (window.performance && performance.now) ? performance.now() : Date.now();
      battle.__owlDungeonRun = {
        startedAt: now,
        lastClock: now,
        elapsed: 0,
        wavesCleared: 0,
        bossQueued: false,
        bossSpawned: false,
        completed: false,
        failed: false,
        failureReason: '',
        rewards: { gold: 0, diamonds: 0, soul: 0, relics: 0, forge: 0, xp: 0, items: [] }
      };
    }
    return battle;
  };

  function advanceDungeonClock(battle) {
    const run = battle && battle.__owlDungeonRun;
    if (!run || run.completed || run.failed) return;
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (!Number.isFinite(run.lastClock)) run.lastClock = now;
    const delta = clamp((now - run.lastClock) / 1000, 0, 0.5);
    run.lastClock = now;
    // Pause and hidden tabs freeze the timer; speed-up changes combat only.
    if (!paused && !document.hidden) run.elapsed = Math.min(DUNGEON_LIMIT, run.elapsed + delta);
    if (run.elapsed >= BOSS_AT) run.bossQueued = true;
  }

  function spawnDungeonBoss(battle) {
    const run = battle && battle.__owlDungeonRun;
    if (!run || run.bossSpawned || run.failed || run.completed) return false;
    const metrics = partyMetrics();
    const stage = Math.max(1, n(battle.stage) || 1);
    const base = E.ouro || { n: 'Ouro, Dungeon Devourer', e: '🐍', hp: 4200, atk: 60, def: 22, spd: 70 };
    const k = 1 + 0.28 * (stage - 1);
    const ka = 1 + 0.22 * (stage - 1);
    const hpFactor = 2.0 + 0.35 * (metrics.scale - 1) + 0.007 * Math.min(stage, 80);
    const atkFactor = 1.55 + 0.15 * (metrics.scale - 1) + 0.004 * Math.min(stage, 80);
    const defFactor = 1.12 + 0.12 * (metrics.scale - 1);
    const maxHp = Math.max(1, Math.round(base.hp * k * hpFactor));
    battle.enemies = [{
      uid: `dungeon-boss-${battle.dg}-${Date.now()}`,
      id: 'ouro', team: 1, pos: 0, n: `${base.n || 'Ouro'} · Dungeon Boss`, e: base.e || '🐍',
      boss: 1, miniBoss: 0, max: maxHp, hp: maxHp,
      atk: Math.max(1, Math.round(base.atk * ka * atkFactor)),
      def: Math.max(0, Math.round(base.def * (1 + 0.1 * (stage - 1)) * defFactor)),
      spd: Math.min(180, Math.max(1, Math.round(base.spd * (1 + 0.002 * (stage - 1))))),
      crit: 0.10, cdm: 1.8, sh: 0, stun: 0, atkT: 0.8, skT: 99, dead: 0, en: 0,
      phase2: 0, phase3: 0
    }];
    run.bossSpawned = true;
    run.bossQueued = true;
    battle.wave = Math.max(1, n(battle.wave) + 1);
    battle.kind = 'DUNGEON FINAL BOSS';
    battle.pulse = 5.5;
    battle.enr = 0;
    battle.over = 0;
    battle.res = null;
    battle.built = '';
    battle.fx = [{ k: 'c', u: battle.enemies[0].uid, v: 'FINAL BOSS · DUNGEON GATE' }];
    try { sfx('pulse'); } catch (_) {}
    return true;
  }

  function failDungeon(battle, reason) {
    const run = battle && battle.__owlDungeonRun;
    if (!run || run.completed || run.failed) return;
    run.failed = true;
    run.failureReason = reason || 'party_defeated';
    battle.over = 2;
    battle.res = { gold: 0, shards: 0, items: [], extra: 'Dungeon incomplete · no rewards granted.' };
    battle.fx = [];
    try { save(); } catch (error) { console.warn('[OWL v1.5.9] dungeon failure save skipped', error); }
  }

  function addDungeonCompletionRewards(battle, reward) {
    const stage = Math.max(1, n(battle.stage) || 1);
    const run = battle.__owlDungeonRun;
    const r = reward && typeof reward === 'object' ? reward : { gold: 0, shards: 0, items: [], extra: '' };
    if (!Array.isArray(r.items)) r.items = [];
    let bonus = { gold: 0, shards: 0, soul: 0, relics: 0, forge: 0, xp: 0, items: [] };

    if (battle.dg === 'gold') {
      bonus = { gold: 900 * stage + 250, shards: 18 + stage, soul: 5 + Math.floor(stage / 20), relics: 0, forge: 0, xp: 180 * stage, items: [] };
    } else if (battle.dg === 'forge') {
      bonus = { gold: 500 * stage + 300, shards: 20 + Math.floor(stage / 2), soul: 8 + Math.floor(stage / 10), relics: 0, forge: 20 + 3 * stage, xp: 120 * stage, items: [] };
      const minRarity = stage >= 40 ? 4 : 3;
      for (let i = 0; i < 3; i++) bonus.items.push(rollItem(stage, minRarity));
    } else if (battle.dg === 'relic') {
      bonus = { gold: 450 * stage + 300, shards: 30 + stage, soul: 20 + Math.floor(stage / 4), relics: 18 + Math.floor(stage * 1.5), forge: 8 + Math.floor(stage / 2), xp: 120 * stage, items: [] };
      for (let i = 0; i < 2; i++) bonus.items.push(rollItem(stage, 3));
    }

    S.gold += bonus.gold;
    S.shards += bonus.shards;
    S.soul += bonus.soul;
    S.rel += bonus.relics;
    S.mith += bonus.forge;
    if (bonus.xp > 0) (S.owned || []).forEach(id => addXp(id, bonus.xp));
    bonus.items.forEach(item => r.items.push(item));

    r.gold = n(r.gold) + bonus.gold;
    r.shards = n(r.shards) + bonus.shards;
    r.xp = n(r.xp) + bonus.xp + (battle.dg === 'gold' ? 70 * stage : 0);
    r.extra = `${r.extra || ''} · DUNGEON COMPLETE · ${run.wavesCleared} waves · Boss defeated · +${fmt(bonus.soul)} Soul · +${fmt(bonus.relics)} Relics · +${fmt(bonus.forge)} Forge · +${fmt(bonus.xp)} XP`;

    run.completed = true;
    run.rewards = {
      gold: r.gold, diamonds: r.shards, soul: bonus.soul,
      relics: bonus.relics, forge: bonus.forge, xp: r.xp,
      items: r.items.map(item => ({ name: iname(item), rarity: RAR[item.r] || 'Gear' }))
    };
    battle.res = r;
    try { save(); } catch (error) { console.warn('[OWL v1.5.9] dungeon reward save skipped', error); }
    return r;
  }

  /* ---------- Win wrapper: intermediate waves are not wins and grant no loot ---------- */
  const previousWin = win;
  win = function (battle) {
    if (!isDungeon(battle) || !battle.__owlDungeonRun) return previousWin.apply(this, arguments);
    const run = battle.__owlDungeonRun;
    if (run.failed || run.completed) return battle.res;
    if (run.elapsed >= DUNGEON_LIMIT) {
      failDungeon(battle, 'time_expired');
      return battle.res;
    }
    if (!run.bossSpawned) {
      if (run.elapsed >= BOSS_AT || run.bossQueued) {
        spawnDungeonBoss(battle);
      } else {
        run.wavesCleared += 1;
        battle.wave = Math.max(0, n(battle.wave) + 1);
        battle.over = 0;
        battle.res = null;
        battle.built = '';
        battle.fx = [];
        spawn(battle);
      }
      return null;
    }
    if (!alive(battle.allies || []).length) {
      failDungeon(battle, 'party_defeated_with_boss');
      return battle.res;
    }
    const reward = previousWin.apply(this, arguments);
    return addDungeonCompletionRewards(battle, reward);
  };

  /* ---------- Timer, boss phases and end-of-run detection ---------- */
  const previousStep = step;
  step = function (battle, dt) {
    if (isDungeon(battle)) advanceDungeonClock(battle);
    const result = previousStep.apply(this, arguments);
    if (isDungeon(battle)) {
      const run = battle.__owlDungeonRun;
      if (run && !run.completed && !run.failed) {
        if (run.elapsed >= BOSS_AT && !run.bossSpawned && battle.over === 0) spawnDungeonBoss(battle);
        if (run.elapsed >= DUNGEON_LIMIT && !run.completed) failDungeon(battle, 'time_expired');
        if (battle.over === 2) failDungeon(battle, 'party_defeated');
        const boss = (battle.enemies || []).find(enemy => enemy && enemy.boss && !enemy.dead);
        if (boss && !battle.over) {
          if (!boss.phase2 && boss.hp <= boss.max * 0.70) {
            boss.phase2 = 1;
            boss.sh = Math.max(n(boss.sh), Math.round(boss.max * 0.12));
            boss.atk = Math.round(boss.atk * 1.12);
            battle.fx.push({ k: 'c', u: boss.uid, v: 'PHASE II · ANCIENT SHIELD' });
          }
          if (!boss.phase3 && boss.hp <= boss.max * 0.35) {
            boss.phase3 = 1;
            boss.sh = Math.max(n(boss.sh), Math.round(boss.max * 0.10));
            boss.atk = Math.round(boss.atk * 1.18);
            boss.spd = Math.min(200, Math.round(boss.spd * 1.10));
            battle.pulse = Math.min(battle.pulse || 5.5, 3.8);
            battle.fx.push({ k: 'c', u: boss.uid, v: 'FINAL PHASE · DEVOURER RAGE' });
          }
        }
      }
    }
    if (battle && battle.over === 1 && Array.isArray(battle.enemies) && !alive(battle.enemies).length) scheduleEnemyCleanup(battle);
    return result;
  };

  /* ---------- Enemy visuals clear one second after a completed victory ---------- */
  const cleanupScheduled = new WeakSet();
  function disposeEnemyVisuals(battle) {
    if (typeof V === 'undefined' || !V || typeof SC === 'undefined' || !SC) return;
    (battle.enemies || []).forEach(enemy => {
      const visual = V[enemy.uid];
      if (!visual) return;
      if (visual.bar && visual.bar.parentNode) visual.bar.parentNode.removeChild(visual.bar);
      if (visual.g) {
        SC.remove(visual.g);
        try {
          visual.g.traverse(object => {
            if (object.geometry && typeof object.geometry.dispose === 'function') object.geometry.dispose();
            if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
              if (material && typeof material.dispose === 'function') material.dispose();
            });
          });
        } catch (_) {}
      }
      if (visual.umat && typeof visual.umat.dispose === 'function') visual.umat.dispose();
      if (visual.glow && visual.glow.material && typeof visual.glow.material.dispose === 'function') visual.glow.material.dispose();
      delete V[enemy.uid];
    });
  }
  function scheduleEnemyCleanup(battle) {
    if (cleanupScheduled.has(battle)) return;
    cleanupScheduled.add(battle);
    window.setTimeout(() => {
      if (B !== battle || battle.over !== 1 || alive(battle.enemies || []).length) return;
      disposeEnemyVisuals(battle);
    }, 1000);
  }

  /* ---------- Compact in-arena dungeon clock / result ---------- */
  function syncDungeonStatus() {
    const arena = $('#arena');
    if (!arena || !B || !isDungeon(B) || !B.__owlDungeonRun) {
      const old = $('#dungeon-expedition-status'); if (old) old.remove();
      const oldResult = $('#dungeon-expedition-result'); if (oldResult) oldResult.remove();
      return;
    }
    const run = B.__owlDungeonRun;
    let status = $('#dungeon-expedition-status', arena);
    if (!status) {
      status = document.createElement('div');
      status.id = 'dungeon-expedition-status';
      status.className = 'dungeon-expedition-status';
      status.setAttribute('role', 'status');
      arena.appendChild(status);
    }
    const remaining = Math.max(0, Math.ceil(DUNGEON_LIMIT - run.elapsed));
    const clock = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    const phase = run.bossSpawned ? 'FINAL BOSS' : `WAVE ${run.wavesCleared + 1}`;
    status.textContent = `⏱ ${clock} · ${phase}`;
    status.classList.toggle('is-urgent', remaining <= 60);
    const info = $('#inf', arena);
    if (info) {
      const dungeonName = (DG && DG[B.dg] && DG[B.dg].n) || 'DUNGEON EXPEDITION';
      info.innerHTML = `${dungeonName}<br>${phase} · ${run.wavesCleared} CLEARED<br><span style="color:var(--gold)">10-MINUTE EXPEDITION</span>`;
    }

    if (B.over) {
      let result = $('#dungeon-expedition-result', arena);
      if (!result) {
        result = document.createElement('div');
        result.id = 'dungeon-expedition-result';
        result.className = 'dungeon-expedition-result';
        arena.appendChild(result);
      }
      if (run.completed) {
        result.innerHTML = `<b>DUNGEON CLEARED</b><span>${run.wavesCleared} waves · Final boss defeated</span><small>+${fmt(run.rewards.gold)} Gold · +${fmt(run.rewards.diamonds)} Diamonds · +${fmt(run.rewards.soul)} Soul · +${fmt(run.rewards.relics)} Relics · +${fmt(run.rewards.forge)} Forge</small>`;
      } else {
        const reason = run.failureReason === 'time_expired' ? 'TIME EXPIRED' : 'PARTY DEFEATED';
        result.innerHTML = `<b>DUNGEON FAILED · ${reason}</b><span>Final boss not defeated · No rewards granted</span>`;
      }
    }
  }

  const previousDraw = draw;
  draw = function () {
    const result = previousDraw.apply(this, arguments);
    if (view === 'battle') syncDungeonStatus();
    return result;
  };
  const previousRender = render;
  render = function () {
    const result = previousRender.apply(this, arguments);
    if (isDungeon(B)) {
      advanceDungeonClock(B);
      const run = B.__owlDungeonRun;
      if (run && !run.completed && !run.failed) {
        if (run.elapsed >= BOSS_AT && !run.bossSpawned && B.over === 0) spawnDungeonBoss(B);
        if (run.elapsed >= DUNGEON_LIMIT && !run.completed) failDungeon(B, 'time_expired');
      }
    }
    if (view === 'battle') syncDungeonStatus();
    if (B && B.over === 1 && Array.isArray(B.enemies) && !alive(B.enemies).length) scheduleEnemyCleanup(B);
    return result;
  };

  window.OWL_EXPEDITION_V159 = {
    partyMetrics,
    dungeonRules: { durationSeconds: DUNGEON_LIMIT, bossAtSeconds: BOSS_AT },
    towerScaleForParty: () => partyMetrics().scale,
    isDungeon
  };
  console.info('[OWL v1.5.9] Settings reset, timed continuous dungeons, final-boss rewards, adaptive Tower scaling and enemy cleanup active.');
})();
