/* =====================================================================
   OWL GRIDBREAKERS v1.3 — 33 WAVE CAMPAIGN
   Additive save migration: preserves awo_save_v1 and all existing player data.
   Wave indexes are zero-based internally: 0..30 normal, 31 mini-boss, 32 boss.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_33_WAVE_CAMPAIGN__) return;
  window.__OWL_33_WAVE_CAMPAIGN__ = true;

  const TOTAL_WAVES = 33;
  const MINI_INDEX = 31;
  const BOSS_INDEX = 32;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

  // Additive migration only. The legacy save key and all old fields remain intact.
  S.campaignV13 = Object.assign({ version: 1, totalWaves: TOTAL_WAVES }, S.campaignV13 || {});
  S.campaignV13.version = 1;
  S.campaignV13.totalWaves = TOTAL_WAVES;
  save();

  function isCampaign(b) { return !!(b && !b.dg); }
  function stageNumber(b) { return clamp(Math.floor(b.stage || 1), 1, 100); }

  // Recovery happens only after a wave is cleared, immediately before the next wave.
  // A defeated ally is revived only at the defined checkpoints.
  window.applyWaveRecovery = function (b) {
    if (!isCampaign(b) || b.wave <= 0) return;
    const completedWave = b.wave; // spawn() is called after increment; equals prior 1-based wave.
    let heal = 0.05;
    let checkpoint = false;
    if (completedWave === 10) { heal = 0.10; checkpoint = true; }
    if (completedWave === 22 || completedWave === 32) { heal = 0.15; checkpoint = true; }

    (b.allies || []).forEach(a => {
      if (a.dead) {
        if (checkpoint) {
          a.dead = 0;
          a.hp = Math.max(1, Math.round(a.max * 0.25));
          a.sh = 0;
          a.stun = 0;
        }
      } else {
        a.hp = Math.min(a.max, a.hp + Math.round(a.max * heal));
        a.sh = 0;
      }
    });
    b.__owlLastRecoveryWave = completedWave;
  };

  function rewardOnce(b, completedIndex) {
    if (!isCampaign(b) || completedIndex < 0 || completedIndex >= TOTAL_WAVES) return;
    b.__owlPaidWaves = b.__owlPaidWaves || {};
    if (b.__owlPaidWaves[completedIndex]) return;
    b.__owlPaidWaves[completedIndex] = true;

    const s = stageNumber(b);
    const waveDrops = [];
    const wave = completedIndex + 1;
    const isMini = completedIndex === MINI_INDEX;
    const isBoss = completedIndex === BOSS_INDEX;
    const xp = (isBoss ? 12 : isMini ? 6 : 3) * s;
    const gold = (isBoss ? 25 : isMini ? 15 : 5) * s;

    S.gold += gold;
    S.owned.forEach(id => addXp(id, xp));
    b.__owlRewardTotals = b.__owlRewardTotals || { gold: 0, xp: 0, items: [] };
    b.__owlRewardTotals.gold += gold;
    b.__owlRewardTotals.xp += xp;

    // Ordinary waves have a low independent gear chance.
    if (!isMini && !isBoss && R() < 0.02) waveDrops.push(rollItem(s, 0));

    // Mini-boss chest: guaranteed uncommon-or-better gear and crafting material.
    if (isMini) {
      waveDrops.push(rollItem(s, 1));
      S.mith += 2 + Math.floor(s / 10);
      b.__owlMiniChest = true;
    }

    // Advanced chest at wave 22: bonus materials and a 40% gear chance.
    if (wave === 22) {
      S.mith += 3 + Math.floor(s / 10);
      if (R() < 0.40) waveDrops.push(rollItem(s, 2));
      b.__owlAdvancedChest = true;
    }

    b.__owlRewardTotals.items = b.__owlRewardTotals.items.concat(waveDrops);
    b.__owlLastWaveReward = { wave, xp, gold, mini: isMini, boss: isBoss };
    save();
  }

  // The existing spawn pipeline (rarity, difficulty and 5v5 formation) runs first.
  // Then this module applies within-stage scaling and the two campaign boss encounters.
  const previousSpawn = spawn;
  spawn = function (b) {
    previousSpawn(b);
    if (!isCampaign(b)) return;

    if (b.wave > 0) rewardOnce(b, b.wave - 1);

    const s = stageNumber(b);
    const wave = b.wave + 1;
    const enemies = b.enemies || [];
    const regionBoss = s % 10 === 0 && b.wave === BOSS_INDEX;

    // Wave-based difficulty ramp: normal waves increase gently across three acts.
    let hpFactor = 1, atkFactor = 1, defFactor = 1;
    if (wave <= 10) {
      const t = (wave - 1) / 9;
      hpFactor = 1 + 0.15 * t; atkFactor = 1 + 0.08 * t; defFactor = 1 + 0.04 * t;
    } else if (wave <= 22) {
      const t = (wave - 11) / 11;
      hpFactor = 1.15 + 0.20 * t; atkFactor = 1.08 + 0.12 * t; defFactor = 1.04 + 0.08 * t;
    } else if (wave <= 32) {
      const t = (wave - 23) / 9;
      hpFactor = 1.35 + 0.25 * t; atkFactor = 1.20 + 0.20 * t; defFactor = 1.12 + 0.10 * t;
    }

    if (b.wave === MINI_INDEX && enemies.length) {
      const mini = enemies[0];
      mini.boss = 1;
      mini.miniBoss = 1;
      mini.n = 'Elite Warden';
      mini.max = Math.round(mini.max * 1.55);
      mini.hp = mini.max;
      mini.atk = Math.round(mini.atk * 1.25);
      mini.def = Math.round(mini.def * 1.15);
      mini.phase2 = 0; mini.phase3 = 0;
      b.kind = 'ELITE CHALLENGE';
    } else if (b.wave === BOSS_INDEX && enemies.length) {
      const boss = enemies[0];
      boss.boss = 1;
      boss.miniBoss = 0;
      boss.n = boss.n && regionBoss ? boss.n : 'Stage Guardian';
      boss.max = Math.round(boss.max * (regionBoss ? 1 : 2.0));
      boss.hp = boss.max;
      boss.atk = Math.round(boss.atk * (regionBoss ? 1 : 1.5));
      boss.def = Math.round(boss.def * (regionBoss ? 1 : 1.25));
      boss.phase2 = 0; boss.phase3 = 0;
      b.kind = regionBoss ? (b.kind || 'REGIONAL BOSS') : 'STAGE BOSS';
    }

    enemies.forEach(enemy => {
      if (b.wave === MINI_INDEX && enemy.miniBoss) return; // mini-boss multipliers above are explicit.
      if (b.wave === BOSS_INDEX && enemy.boss) return;    // boss multipliers above are explicit.
      enemy.max = Math.max(1, Math.round(enemy.max * hpFactor));
      enemy.hp = enemy.max;
      enemy.atk = Math.max(1, Math.round(enemy.atk * atkFactor));
      enemy.def = Math.max(0, Math.round(enemy.def * defFactor));
    });
    b.__owlWaveNumber = wave;
  };

  // Final boss reward is paid by win(); earlier wave rewards were paid on next spawn.
  const previousWin = win;
  win = function (b) {
    if (!isCampaign(b)) return previousWin(b);
    rewardOnce(b, BOSS_INDEX);

    const s = stageNumber(b);
    const regional = s % 10 === 0;
    const firstClear = s > Number(S.cleared || 0);
    const soulCfg = OWL_CONFIG.soul;
    const soul = firstClear
      ? (regional ? soulCfg.firstBoss : soulCfg.firstClear)
      : (regional ? soulCfg.repeatBoss : soulCfg.repeat);
    S.soul += soul;
    const shards = 1 + (s % 3 === 0 ? 2 : 0) + (regional ? 5 : 0);
    S.shards += shards;

    const items = [];
    // Every stage boss guarantees gear. Regional bosses retain the legacy rarity floor.
    const minR = regional
      ? (s <= 20 ? 2 : s <= 40 ? 3 : s <= 60 ? 4 : s <= 80 ? 6 : 7)
      : (s <= 20 ? 1 : s <= 40 ? 2 : s <= 60 ? 3 : s <= 80 ? 4 : 5);
    items.push(rollItem(s, minR));
    if (regional) {
      if (R() < 0.55) items.push(rollItem(s, minR));
      S.mith += 5 + Math.floor(s / 10);
    }

    if (firstClear) S.cleared = s;
    S.cnt.w++;
    const totals = b.__owlRewardTotals || { gold: 0, xp: 0, items: [] };
    totals.items = (totals.items || []).concat(items);
    const result = {
      gold: totals.gold,
      xp: totals.xp,
      shards,
      items: totals.items,
      extra: ` · +${soul}💎${firstClear ? ' (first clear)' : ''}${regional ? ' · REGIONAL BOSS' : ''} · 33 WAVES CLEARED · ${totals.xp.toLocaleString()} XP`
    };
    save();
    return result;
  };

  // Correct the existing cinematic caption for mini-bosses and non-regional stage bosses.
  const oldBuild = build;
  build = function () {
    oldBuild.apply(this, arguments);
    const boss = B && B.enemies && B.enemies.find(e => e.boss && !e.dead);
    const caption = document.querySelector('.cin2 span');
    if (boss && caption && !B.dg) {
      caption.textContent = boss.miniBoss
        ? `MINI-BOSS · STAGE ${B.stage}`
        : (Number(B.stage) % 10 === 0 ? `REGIONAL BOSS · STAGE ${B.stage}` : `STAGE BOSS · STAGE ${B.stage}`);
    }
  };

  // Keep campaign display consistent with the 33-wave structure.
  const oldHead = head;
  head = function () {
    oldHead();
    const stageLabel = document.querySelector('#stg');
    if (stageLabel && B && !B.dg) {
      stageLabel.textContent = `Stage ${B.stage} · W${Math.min(TOTAL_WAVES, B.wave + 1)}/${TOTAL_WAVES}`;
    }
  };

  // Update the battle's central info line without touching other HUD elements.
  const oldRender = render;
  render = function () {
    oldRender.apply(this, arguments);
    const info = document.querySelector('#inf');
    if (info && B && !B.dg) {
      const name = (STAGES[B.stage - 1] || `Stage ${B.stage}`);
      const type = B.wave === MINI_INDEX ? ' · MINI-BOSS' : B.wave === BOSS_INDEX ? ' · BOSS' : '';
      const f = Math.max(1, Math.min(100, Number(S.cleared) + 1));
      const idleScale = 1 + 0.4 * (f - 1);
      info.innerHTML = `${name}<br>Wave ${Math.min(TOTAL_WAVES, B.wave + 1)}/${TOTAL_WAVES}${type}<br><span style="color:var(--gold)">💰 ${Math.round(25 * idleScale)}/min</span> · XP ${Math.round(12 * idleScale)}/min`;
    }
  };

  console.info('[OWL] v1.3 33-wave campaign loaded; legacy saves preserved');
})();
