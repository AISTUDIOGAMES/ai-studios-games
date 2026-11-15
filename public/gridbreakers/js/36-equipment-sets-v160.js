/* =====================================================================
   OWL: GRIDBREAKERS v1.6.2 — Equipment Sets, Catalog & Obsidian Sprites
   - Defines distinct 2/4/6-piece bonuses for Obsidian, Lunar and Thread.
   - Removes the former shared set-bonus multiplier without touching saves.
   - Adds an ordered set codex and explicit rarity ladder to the Bag screen.
   - Keeps legacy item IDs, equipment slots, rarity indices and save key intact.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__OWL_EQUIPMENT_SETS_V160__) return;
  window.__OWL_EQUIPMENT_SETS_V160__ = true;

  const SET_ORDER = ['Obsidian', 'Lunar', 'Thread'];
  const SLOT_ORDER = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'relic'];
  const SLOT_LABELS = {
    weapon: 'Weapon', helmet: 'Helmet', armor: 'Armor',
    gloves: 'Gloves', boots: 'Boots', relic: 'Relic'
  };
  const SET_META = {
    Obsidian: {
      title: 'OBSIDIAN', subtitle: 'THE BLACKSTONE AEGIS',
      desc: 'A fortress forged from living obsidian, sealed with ancient gold and violet energy.',
      color: '#a57aff',
      bonuses: {
        2: { def: .08 },
        4: { def: .14, atk: .07 },
        6: { def: .24, atk: .14 }
      }
    },
    Lunar: {
      title: 'LUNAR', subtitle: 'THE MOONWARDEN REGALIA',
      desc: 'Silver-blue celestial armor that strengthens the bearer and protects their life force.',
      color: '#8bbcff',
      bonuses: {
        2: { hp: .08 },
        4: { hp: .14, def: .06 },
        6: { hp: .24, def: .12 }
      }
    },
    Thread: {
      title: 'THREAD', subtitle: 'THE QUANTUM WEAVE',
      desc: 'A precision lattice woven from the Grid itself, tuned for speed and critical strikes.',
      color: '#38e8ff',
      bonuses: {
        2: { crit: .02 },
        4: { crit: .05, spd: .08 },
        6: { crit: .08, spd: .16, atk: .10 }
      }
    }
  };
  const RARITY_COLORS = [
    '#9aa0aa', '#25c56e', '#2753a5', '#b25cff',
    '#f0d34a', '#ef4444', '#d9a52b', '#16c9d5'
  ];
  const RARITY_NAMES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Ancestral'];

  function getSetCounts(heroId) {
    const counts = { Obsidian: 0, Lunar: 0, Thread: 0 };
    (S.inv || []).forEach(item => {
      if (item && item.eq === heroId && Object.prototype.hasOwnProperty.call(counts, item.set)) {
        counts[item.set] += 1;
      }
    });
    return counts;
  }

  function activeTier(count) {
    return count >= 6 ? 6 : count >= 4 ? 4 : count >= 2 ? 2 : 0;
  }

  function previousSharedBonus(counts) {
    return Object.keys(counts).reduce((sum, setName) => {
      const count = counts[setName];
      return sum + (count >= 4 ? .20 : count >= 2 ? .08 : 0);
    }, 0);
  }

  function collectBonuses(counts) {
    const total = { atk: 0, hp: 0, def: 0, spd: 0, crit: 0 };
    const details = {};
    SET_ORDER.forEach(setName => {
      const count = counts[setName] || 0;
      const tier = activeTier(count);
      if (!tier) return;
      const bonus = SET_META[setName].bonuses[tier];
      Object.keys(bonus).forEach(key => { total[key] += bonus[key]; });
      details[setName] = { count, tier, bonus };
    });
    return { total, details };
  }

  /*
   * Core stats previously applied the same +8% (2pc) / +20% (4pc)
   * multiplier to every set. Undo only that legacy multiplier, then apply
   * each set's own final-tier effects. The save object itself is untouched.
   */
  const previousStats = stats;
  stats = function (heroId) {
    const result = previousStats.apply(this, arguments);
    if (!result || !heroId) return result;

    const counts = getSetCounts(heroId);
    const oldBonus = previousSharedBonus(counts);
    const newBonuses = collectBonuses(counts);
    const effects = newBonuses.total;
    const synergy = Array.isArray(S.order) && S.order.includes(heroId) ? (Number(synOf(heroId)) || 0) : 0;

    const oldAtkFactor = (1 + (Number(result.atkp) || 0) + oldBonus) * (1 + synergy);
    const oldHpFactor = (1 + (Number(result.hpp) || 0) + oldBonus) * (1 + synergy);
    const oldDefFactor = 1 + oldBonus / 2;

    if (oldAtkFactor > 0) result.atk = (Number(result.atk) || 0) / oldAtkFactor;
    if (oldHpFactor > 0) result.hp = (Number(result.hp) || 0) / oldHpFactor;
    if (oldDefFactor > 0) result.def = (Number(result.def) || 0) / oldDefFactor;

    result.atk *= (1 + (Number(result.atkp) || 0) + effects.atk) * (1 + synergy);
    result.hp *= (1 + (Number(result.hpp) || 0) + effects.hp) * (1 + synergy);
    result.def *= 1 + effects.def;
    result.spd *= 1 + effects.spd;

    const critCap = Math.max(.01, Math.min(1,
      Number(window.OWL_CONFIG && window.OWL_CONFIG.critBalance && window.OWL_CONFIG.critBalance.absoluteCap) || .30
    ));
    result.crit = Math.max(0, Math.min(critCap, (Number(result.crit) || 0) + effects.crit));

    result.setEffects = newBonuses.details;
    result.setCounts = counts;
    result.bonus = Math.max(effects.atk, effects.hp, effects.def, effects.spd, effects.crit);
    return result;
  };

  function fmtBonus(key, value) {
    if (!value) return '';
    if (key === 'spd') return `+${Math.round(value * 100)}% SPD`;
    if (key === 'crit') return `+${(value * 100).toFixed(1).replace(/\.0$/, '')}% CRIT`;
    return `+${Math.round(value * 100)}% ${key.toUpperCase()}`;
  }

  function bonusSummary(bonus) {
    return Object.keys(bonus).map(key => fmtBonus(key, bonus[key])).filter(Boolean).join(' · ');
  }

  function setProgress(count, setName) {
    const tier = activeTier(count);
    const next = [2, 4, 6].find(value => value > count);
    const meta = SET_META[setName];
    const active = tier ? `<span class="awo-active-tier">${tier}-PIECE BONUS ACTIVE</span>` : '<span class="awo-inactive-tier">NO BONUS ACTIVE</span>';
    const nextText = next ? `Next unlock: ${next} pieces` : 'Full set completed';
    const bonusText = tier ? bonusSummary(meta.bonuses[tier]) : 'Equip 2 matching pieces to activate the first bonus';
    return `<div class="awo-set-status">${active}<span>${count}/6 equipped · ${nextText}</span></div><div class="awo-set-current">${bonusText}</div>`;
  }

  function buildCodex() {
    const owned = S.inv || [];
    const rarityMarkup = RARITY_NAMES.map((name, index) =>
      `<span class="awo-rarity-chip" style="--rarity:${RARITY_COLORS[index]}"><i></i>${index + 1}. ${name}</span>`
    ).join('');
    const setCards = SET_ORDER.map((setName, index) => {
      const meta = SET_META[setName];
      const ownedCount = owned.filter(item => item && item.set === setName).length;
      const equippedCount = owned.filter(item => item && item.set === setName && item.eq).length;
      const pieces = SLOT_ORDER.map(slot => {
        const item = { set: setName, slot, lv: 0, r: 3 };
        const itemName = dname(item);
        const sprite = eqImg(item, 30);
        return `<div class="awo-piece-row">${sprite}<span class="awo-piece-slot">${SLOT_LABELS[slot]}</span><b>${itemName}</b><small>8 rarity tiers</small></div>`;
      }).join('');
      const tierRows = [2, 4, 6].map(tier =>
        `<div class="awo-tier-row"><b>${tier} PCS</b><span>${bonusSummary(meta.bonuses[tier])}</span></div>`
      ).join('');
      return `<article class="awo-set-card" style="--set-color:${meta.color}">
        <header class="awo-set-heading"><div><span>SET ${String(index + 1).padStart(2, '0')}</span><h3>${meta.title}</h3><small>${meta.subtitle}</small></div><div class="awo-set-count"><b>${equippedCount}/6</b><small>equipped</small><em>${ownedCount} owned</em></div></header>
        <p class="awo-set-description">${meta.desc}</p>
        <div class="awo-piece-list">${pieces}</div>
        <div class="awo-tier-list"><div class="awo-subheading">SET BONUSES</div>${tierRows}</div>
        <button type="button" class="awo-filter-set" onclick="window.bagSet('set','${setName}')">VIEW ${setName.toUpperCase()} ITEMS</button>
      </article>`;
    }).join('');
    return `<section class="awo-equipment-codex">
      <div class="awo-codex-top"><div><span class="awo-eyebrow">GRIDBREAKERS ARMORY</span><h2>EQUIPMENT SETS</h2><p>3 complete collections · 6 signature pieces per Set · 8 rarity tiers per piece</p></div><strong>18<br><small>BASE ITEMS</small></strong></div>
      <div class="awo-rarity-guide"><div class="awo-subheading">RARITY LADDER · LOW TO HIGH</div><div class="awo-rarity-list">${rarityMarkup}</div></div>
      <div class="awo-set-grid">${setCards}</div>
    </section>`;
  }

  function insertCodex() {
    const viewNode = document.getElementById('view');
    if (!viewNode || view !== 'bag' || viewNode.querySelector('.awo-equipment-codex')) return;
    viewNode.insertAdjacentHTML('afterbegin', buildCodex());
  }

  const previousDraw = draw;
  draw = function () {
    const result = previousDraw.apply(this, arguments);
    insertCodex();
    return result;
  };

  /* Replace the legacy generic set text in the hero equipment panel. */
  const previousHeroM = heroM;
  heroM = function (heroId) {
    const result = previousHeroM.apply(this, arguments);
    const root = document.querySelector('#modal .pg');
    const panel = root && root.querySelector(':scope > .card');
    if (!panel) return result;

    const counts = getSetCounts(heroId);
    const equippedSets = SET_ORDER.filter(setName => counts[setName] > 0);
    if (!equippedSets.length) {
      panel.innerHTML = '<b>SET BONUSES</b><div class="mu">No matching set pieces equipped. Equip 2, 4 or 6 pieces from one Set to unlock its bonuses.</div>';
      panel.classList.add('awo-hero-set-panel');
      return result;
    }

    panel.classList.add('awo-hero-set-panel');
    panel.innerHTML = `<b>ACTIVE SET BONUSES</b>${equippedSets.map(setName => {
      const meta = SET_META[setName];
      const count = counts[setName];
      return `<div class="awo-hero-set-row" style="--set-color:${meta.color}"><div><strong>${meta.title}</strong><span>${count}/6 pieces</span></div>${setProgress(count, setName)}</div>`;
    }).join('')}`;
    return result;
  };

  // Expose read-only catalogue metadata for debugging and future UI extensions.
  window.OWL_EQUIPMENT_SETS = Object.freeze({
    order: SET_ORDER.slice(),
    slots: SLOT_ORDER.slice(),
    rarities: RARITY_NAMES.slice(),
    metadata: SET_META
  });

  console.info('[OWL v1.6.3] equipment catalog, set bonuses, Obsidian and Lunar sprites active.');
})();
