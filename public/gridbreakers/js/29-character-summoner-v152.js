/* ===== OWL GRIDBREAKERS v1.5.2 — CHARACTER SUMMONER + 8:1 RARITY ECHO FUSION =====
   - Embeds the existing Soul Crystal Summoner in Characters.
   - Every duplicate Gacha pull grants one Echo of its rolled rarity.
   - 8 Echoes of a tier guarantee one random hero at the next active tier.
   - Uses the live Gacha rates and pity already configured for this game.
   - Does not consume owned heroes, stars, gear, or Soul Crystals for fusion.
*/
(function () {
  'use strict';
  if (window.__AWO_CHARACTER_SUMMONER_V152) return;
  window.__AWO_CHARACTER_SUMMONER_V152 = true;

  const RARITY = [
    { rank: 0, name: 'Common', color: '#aeb8c6', next: 1 },
    { rank: 1, name: 'Uncommon', color: '#46df9b', next: 2 },
    { rank: 2, name: 'Rare', color: '#2753a5', next: 3 },
    { rank: 3, name: 'Mythic', color: '#ef4444', next: 5 },
    { rank: 5, name: 'Divine', color: '#f6c85f', next: 6 },
    { rank: 6, name: 'Ancestral', color: '#5be7ee', next: null }
  ];
  const NORMAL_HEROES = Object.keys(H).filter(id => id !== 'orion' && id !== 'aeon');
  const RARITY_BY_RANK = Object.fromEntries(RARITY.map(row => [row.rank, row]));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = n => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('pt-BR');
  const pct = n => `${Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

  function rankOf(id) {
    if (id === 'orion') return 5;
    if (id === 'aeon') return 6;
    return clamp(Math.floor(Number(S.heroRarity && S.heroRarity[id]) || 0), 0, 3);
  }

  function normalizeEchoes() {
    const defaults = { 0: 0, 1: 0, 2: 0, 3: 0, 5: 0, 6: 0 };
    S.summonEchoes = Object.assign(defaults, S.summonEchoes && typeof S.summonEchoes === 'object' ? S.summonEchoes : {});
    Object.keys(defaults).forEach(key => {
      S.summonEchoes[key] = clamp(Math.floor(Number(S.summonEchoes[key]) || 0), 0, 999999);
    });
    S.summonFusionHistory = Array.isArray(S.summonFusionHistory) ? S.summonFusionHistory.slice(0, 20) : [];
    S.gachaPity = Object.assign({ total: 0 }, S.gachaPity || {});
    // A new install starts counting from this point; old pulls are not retroactively converted.
    if (!Number.isFinite(Number(S.summonEchoesProcessedTotal))) {
      S.summonEchoesProcessedTotal = Math.max(0, Math.floor(Number(S.gachaPity.total) || 0));
    }
  }
  normalizeEchoes();

  function processNewDuplicatePulls() {
    const total = Math.max(0, Math.floor(Number(S.gachaPity && S.gachaPity.total) || 0));
    const processed = Math.max(0, Math.floor(Number(S.summonEchoesProcessedTotal) || 0));
    if (total < processed) {
      // Handles a legitimate save import or a fresh campaign that resets pity counters.
      S.summonEchoesProcessedTotal = total;
      return false;
    }
    const delta = total - processed;
    if (!delta) return false;

    const recent = Array.isArray(S.gachaHistory) ? S.gachaHistory.slice(0, Math.min(delta, 30)) : [];
    let changed = false;
    recent.forEach(result => {
      if (!result || !result.duplicate) return;
      const id = result.id;
      let rank = id === 'orion' ? 5 : id === 'aeon' ? 6 : Math.floor(Number(result.rolledRank ?? result.rank) || 0);
      if (rank === 4) rank = 3; // Legendary is intentionally folded into Mythic in the active Gacha table.
      if (![0, 1, 2, 3, 5].includes(rank)) return; // Ancestral is the current cap; it has no next tier.
      S.summonEchoes[rank] = Math.min(999999, (Number(S.summonEchoes[rank]) || 0) + 1);
      changed = true;
    });
    S.summonEchoesProcessedTotal = total;
    return changed;
  }

  // The premium Gacha calls save() after it appends its new history entries.
  // Process those entries exactly once and persist the resulting Echo balance.
  const baseSave = save;
  let processingSave = false;
  save = function () {
    const result = baseSave.apply(this, arguments);
    if (processingSave) return result;
    processingSave = true;
    try {
      if (processNewDuplicatePulls()) baseSave.apply(this, arguments);
    } catch (error) {
      console.warn('[OWL v1.5.2] duplicate Echo processing skipped', error);
    } finally {
      processingSave = false;
    }
    return result;
  };

  function chanceMarkup() {
    const rates = Array.isArray(OWL_CONFIG.gacha.rates) ? OWL_CONFIG.gacha.rates : [52.2, 28, 15, 3.5, 0, 1, 0.3];
    const rows = [
      { label: 'Common', value: rates[0], color: '#aeb8c6' },
      { label: 'Uncommon', value: rates[1], color: '#46df9b' },
      { label: 'Rare', value: rates[2], color: '#2753a5' },
      { label: 'Mythic', value: Number(rates[3] || 0) + Number(rates[4] || 0), color: '#ef4444' },
      { label: 'Legendary', value: 0, color: '#e3b75e', note: 'folded into Mythic' },
      { label: 'Divine', value: rates[5], color: '#f6c85f' },
      { label: 'Ancestral', value: rates[6], color: '#5be7ee' }
    ];
    return rows.map(row => `<div class="cs-rate-row" style="--cs-rarity:${row.color}"><span>${row.label}${row.note ? `<small>${row.note}</small>` : ''}</span><b>${pct(row.value)}</b></div>`).join('');
  }

  function fusionMarkup(row) {
    const count = Math.max(0, Number(S.summonEchoes[row.rank]) || 0);
    const progress = Math.min(100, count / 8 * 100);
    const remaining = Math.max(0, 8 - count);
    return `<article class="cs-fusion-card" style="--cs-rarity:${row.color}">
      <div class="cs-fusion-head"><div><span class="cs-eyebrow">RARITY CONVERGENCE</span><b>${row.name.toUpperCase()} <i>→</i> ${RARITY_BY_RANK[row.next].name.toUpperCase()}</b></div><strong>${count}/8</strong></div>
      <div class="cs-progress"><i style="width:${progress}%"></i></div>
      <div class="cs-fusion-foot"><span>${remaining ? `${remaining} more duplicate ${row.name} pull${remaining === 1 ? '' : 's'} needed` : 'Ritual ready · next rarity guaranteed'}</span><button type="button" data-a="characterFusion" data-v="${row.rank}" ${count < 8 ? 'disabled' : ''}>${count >= 8 ? `SUMMON ${RARITY_BY_RANK[row.next].name.toUpperCase()}` : '8 ECHOES REQUIRED'}</button></div>
    </article>`;
  }

  function summonerHTML() {
    const soul = Math.max(0, Number(S.soul) || 0);
    const pity = S.gachaPity || {};
    const fusionRows = RARITY.filter(row => row.next !== null).map(fusionMarkup).join('');
    const activeRateTotal = [0, 1, 2, 3, 5, 6].reduce((sum, rank) => {
      const rates = OWL_CONFIG.gacha.rates || [];
      return sum + Number(rank === 3 ? (rates[3] || 0) + (rates[4] || 0) : rates[rank === 5 ? 5 : rank === 6 ? 6 : rank] || 0);
    }, 0);
    return `<section class="cs-summoner">
      <header class="cs-summoner-hero">
        <div class="cs-summoner-mark">✦</div>
        <div class="cs-summoner-title"><span>OWL GRIDBREAKERS · CHARACTER ARCHIVE</span><h2>CHARACTER SUMMONER</h2><p>Recruit heroes with Soul Crystals or convert duplicate echoes into a guaranteed higher rarity.</p></div>
        <div class="cs-soul-wallet"><small>SOUL CRYSTALS</small><b>◆ ${fmt(soul)}</b></div>
      </header>
      <div class="cs-summon-actions">
        <button type="button" data-a="summon" data-v="1" ${soul < 100 ? 'disabled' : ''}><small>STANDARD CALL</small><b>SUMMON ×1</b><span>100 ◆</span></button>
        <button type="button" data-a="summon" data-v="5" ${soul < 450 ? 'disabled' : ''}><small>CONVERGENCE</small><b>SUMMON ×5</b><span>450 ◆ · SAVE 50</span></button>
      </div>
      <div class="cs-summoner-grid">
        <section class="cs-subpanel"><div class="cs-section-title"><div><span>THE ODDS OF DESTINY</span><h3>RARITY RATES</h3></div><b>${pct(activeRateTotal)}</b></div><div class="cs-rates">${chanceMarkup()}</div><p class="cs-note">Base chance per Soul Crystal pull. Divine is guaranteed by ${Number(OWL_CONFIG.gacha.divinePity) || 90} pulls and Ancestral by ${Number(OWL_CONFIG.gacha.ancestralPity) || 200} pulls. Legendary currently has 0% and is included in Mythic.</p></section>
        <section class="cs-subpanel"><div class="cs-section-title"><div><span>FATE WILL NOT FORGET</span><h3>PITY PROTECTION</h3></div></div><div class="cs-pity-grid"><div><b>${Math.max(0, (Number(OWL_CONFIG.gacha.divinePity) || 90) - (Number(pity.divine) || 0))}</b><small>to Divine</small></div><div><b>${Math.max(0, (Number(OWL_CONFIG.gacha.ancestralPity) || 200) - (Number(pity.ancestral) || 0))}</b><small>to Ancestral</small></div><div><b>${fmt(pity.total)}</b><small>total pulls</small></div></div><p class="cs-note">Fusion summons do not reset or consume Gacha pity.</p></section>
      </div>
      <section class="cs-fusion-panel"><div class="cs-section-title"><div><span>8 DUPLICATE ECHOES · 1 HIGHER HERO</span><h3>RARITY FUSION</h3></div><b class="cs-ratio">8 : 1</b></div><p class="cs-note">Each duplicate from a Soul Crystal summon grants one Echo of the rarity rolled. When you collect 8 Echoes of the same rarity, you can summon one random hero of the next active rarity. The duplicate's Star upgrade remains intact; no owned hero or equipment is consumed.</p>
        <div class="cs-fusion-list">${fusionRows}</div>
        <div class="cs-max-tier"><span>ANCESTRAL</span><b>MAX RARITY</b><small>No higher tier exists in the current roster.</small></div>
      </section>
    </section>`;
  }

  function chooseFusionHero(targetRank) {
    if (targetRank === 5) return 'orion';
    if (targetRank === 6) return 'aeon';
    // The six standard heroes can awaken up to Mythic. The ritual chooses one at random.
    return NORMAL_HEROES[Math.floor(R() * NORMAL_HEROES.length)] || NORMAL_HEROES[0];
  }

  function setHeroRarity(id, targetRank) {
    S.heroRarity = S.heroRarity && typeof S.heroRarity === 'object' ? S.heroRarity : {};
    if (id === 'orion') S.heroRarity[id] = 5;
    else if (id === 'aeon') S.heroRarity[id] = 6;
    else S.heroRarity[id] = clamp(Math.max(rankOf(id), targetRank), 0, 3);
    const rank = rankOf(id);
    H[id].rarity = rank;
    H[id].rarityName = (RARITY_BY_RANK[rank] || RARITY[0]).name;
    if (typeof HC !== 'undefined') HC[id] = parseInt((RARITY_BY_RANK[rank] || RARITY[0]).color.slice(1), 16);
    return rank;
  }

  function recruitOrUpgrade(id) {
    const duplicate = S.owned.includes(id);
    if (!duplicate) {
      S.owned.push(id);
      S.lv[id] = Math.max(1, Number(S.lv[id]) || 1);
      S.xp[id] = Math.max(0, Number(S.xp[id]) || 0);
      S.order = Array.isArray(S.order) ? S.order : [];
      if (S.order.length < 5 && !S.order.includes(id)) S.order.push(id);
    } else {
      S.star = S.star || {};
      if ((Number(S.star[id]) || 0) < 5) S.star[id] = (Number(S.star[id]) || 0) + 1;
      else S.shards = (Number(S.shards) || 0) + 20;
    }
    return duplicate;
  }

  act.characterFusion = function (rawRank) {
    const rank = Number(rawRank);
    const row = RARITY_BY_RANK[rank];
    if (!row || row.next === null) return;
    normalizeEchoes();
    if ((Number(S.summonEchoes[rank]) || 0) < 8) return;

    const targetRank = row.next;
    const id = chooseFusionHero(targetRank);
    if (!id || !H[id]) return;

    // Commit the cost and reward together so a failed summon cannot spend Echoes.
    S.summonEchoes[rank] -= 8;
    const duplicate = recruitOrUpgrade(id);
    const actualRank = setHeroRarity(id, targetRank);
    const record = { id, from: rank, to: targetRank, actualRank, duplicate, at: Date.now() };
    S.summonFusionHistory.unshift(record);
    S.summonFusionHistory = S.summonFusionHistory.slice(0, 20);
    save();
    draw();

    const color = (RARITY_BY_RANK[actualRank] || RARITY[0]).color;
    const nextName = (RARITY_BY_RANK[targetRank] || RARITY[0]).name;
    const rosterNote = !duplicate && S.order.length >= 5 ? '<p class="mu">Your squad is full. The hero was added to Characters and can be placed manually.</p>' : '';
    M(`<section class="cs-fusion-result" style="--cs-rarity:${color}"><span>✦ RARITY CONVERGENCE COMPLETE</span><h2>SUMMON COMPLETE</h2><img src="${SP[id]}" alt="${H[id].n}"><b>${H[id].n}</b><em>${(RARITY_BY_RANK[actualRank] || RARITY[0]).name.toUpperCase()} · ${actualRank > targetRank ? 'ABOVE TARGET' : 'TARGET TIER'}</em><small>${duplicate ? ((Number(S.star[id]) || 0) >= 5 ? 'DUPLICATE · +20 SHARDS' : 'DUPLICATE · STAR UPGRADE') : 'NEW HERO RECRUITED'}</small>${rosterNote}<p>8 ${row.name} Echoes consumed · one ${nextName} or higher hero summoned.</p></section>`);
  };

  // Characters owns its own Summoner entry, while the original Summon tab remains available.
  const previousCharsHTML = charsHTML;
  charsHTML = function () {
    return summonerHTML() + previousCharsHTML.apply(this, arguments);
  };

  // On installation, persist only the migration fields; do not award old summons retroactively.
  save();
  console.info('[OWL v1.5.2] Character Summoner loaded: 8 duplicate Echoes guarantee next active rarity');
})();
