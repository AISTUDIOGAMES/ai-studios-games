/* ===== OWL GRIDBREAKERS v1.4.4 — REPORTS IN NAVIGATION, NO VICTORY TOASTS ===== */
(function () {
  'use strict';
  if (window.__AWO_REPORT_MENU_V144) return;
  window.__AWO_REPORT_MENU_V144 = true;

  const STORAGE_KEY = 'awo_battle_report_history_v1';
  const MAX_REPORTS = 30;
  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const number = value => Math.max(0, Math.round(Number(value) || 0)).toLocaleString('pt-BR');

  function readHistory() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.slice(0, MAX_REPORTS) : [];
    } catch (_) { return []; }
  }

  function shouldArchive(battle) {
    if (!battle || !battle.over) return false;
    if (battle.over === 2) return true; // Defeats remain useful for tactical review.
    return battle.over === 1 && typeof window.awoShouldShowBossReport === 'function' && window.awoShouldShowBossReport(battle);
  }

  function activityName(battle) {
    if (!battle.dg) return `Campanha · ${STAGES[Math.max(0, (Number(battle.stage) || 1) - 1)] || `Fase ${battle.stage || 1}`}`;
    const meta = (typeof DG !== 'undefined' && DG[battle.dg]) || (typeof DGX !== 'undefined' && DGX[battle.dg]);
    return meta && meta.n ? meta.n : String(battle.dg).toUpperCase();
  }

  function archiveBattle(battle) {
    if (!shouldArchive(battle) || battle.__awoReportMenuRecorded) return;
    battle.__awoReportMenuRecorded = true;
    const rows = (battle.allies || []).map(unit => {
      const stats = battle.__awoReportStats && battle.__awoReportStats[unit.id] || {};
      const hero = typeof H !== 'undefined' && H[unit.id] || {};
      return {
        id: String(unit.id || ''),
        name: String(hero.n || unit.n || unit.id || 'Herói'),
        portrait: typeof SP !== 'undefined' && SP[unit.id] || '',
        damage: Math.max(0, Number(stats.damage) || 0),
        basicDamage: Math.max(0, Number(stats.basicDamage) || 0),
        skillDamage: Math.max(0, Number(stats.skillDamage) || 0),
        ultDamage: Math.max(0, Number(stats.ultDamage) || 0),
        received: Math.max(0, Number(stats.received) || 0),
        healing: Math.max(0, Number(stats.healing) || 0),
        kills: Math.max(0, Number(stats.kills) || 0),
        deaths: Math.max(0, Number(stats.deaths) || 0),
        skills: Math.max(0, Number(stats.skills) || 0),
        ultimates: Math.max(0, Number(stats.ultimates) || 0)
      };
    }).sort((a, b) => b.damage - a.damage);
    const boss = (battle.enemies || []).find(enemy => enemy && enemy.boss);
    const report = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      result: battle.over === 1 ? 'victory' : 'defeat',
      activity: activityName(battle),
      stage: Math.max(1, Number(battle.stage) || 1),
      wave: Math.max(1, Number(battle.wave) || 0) + 1,
      boss: boss ? String(boss.n || 'Chefe') : '',
      rows,
      totalDamage: rows.reduce((sum, row) => sum + row.damage, 0)
    };
    const history = readHistory();
    history.unshift(report);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_REPORTS))); }
    catch (error) { console.warn('[AWO] Could not save report history:', error); }
  }

  function reportCard(report, index) {
    const isVictory = report.result === 'victory';
    const rows = Array.isArray(report.rows) ? report.rows : [];
    const date = new Date(Number(report.timestamp) || Date.now()).toLocaleString('pt-BR');
    const heroRows = rows.map((hero, heroIndex) => `
      <div class="awo-report-hero">
        <img src="${safe(hero.portrait)}" alt="${safe(hero.name)}" loading="lazy">
        <div class="awo-report-hero-main">
          <b>${heroIndex === 0 ? '★ ' : ''}${safe(hero.name)}</b>
          <div class="awo-report-hero-stats">
            <span>Dano <strong>${number(hero.damage)}</strong></span>
            <span>Habilidade <strong>${number(hero.skillDamage)}</strong></span>
            <span>Ultimate <strong>${number(hero.ultDamage)}</strong></span>
            <span>Cura <strong>${number(hero.healing)}</strong></span>
          </div>
          <div class="awo-report-hero-extra">Recebido ${number(hero.received)} · Abates ${number(hero.kills)} · Quedas ${number(hero.deaths)}</div>
        </div>
      </div>`).join('');
    return `
      <details class="awo-report-entry" ${index === 0 ? 'open' : ''}>
        <summary>
          <span class="awo-report-state ${isVictory ? 'is-win' : 'is-loss'}">${isVictory ? 'CHEFE DERROTADO' : 'DERROTA'}</span>
          <span class="awo-report-summary-main"><b>${safe(report.activity || 'Batalha')}</b><small>${safe(date)}${report.boss ? ' · ' + safe(report.boss) : ''}</small></span>
          <span class="awo-report-summary-damage">${number(report.totalDamage)} <small>DANO</small></span>
        </summary>
        <div class="awo-report-detail">
          <div class="awo-report-metrics">
            <div><small>DANO TOTAL</small><b>${number(report.totalDamage)}</b></div>
            <div><small>ONDA</small><b>${number(report.wave)}</b></div>
            <div><small>GRUPO</small><b>${number(rows.length)}</b></div>
          </div>
          <h3>DESEMPENHO DO GRUPO</h3>
          <div class="awo-report-heroes">${heroRows || '<p class="awo-report-empty">Sem estatísticas individuais para esta batalha.</p>'}</div>
        </div>
      </details>`;
  }

  function reportsHTML() {
    const reports = readHistory();
    if (!reports.length) return `
      <section class="awo-reports-page">
        <header class="awo-reports-heading"><div><span>ARQUIVO DE COMBATE</span><h1>Relatórios</h1><p>Os relatórios de chefes e as análises de derrotas ficam guardados aqui.</p></div><div class="awo-reports-icon">▤</div></header>
        <div class="awo-reports-empty"><div>▤</div><b>Nenhum relatório registrado</b><p>Quando derrotar um chefe ou terminar uma batalha em derrota, o relatório ficará disponível neste menu. Vitórias comuns não geram relatórios.</p></div>
      </section>`;
    return `
      <section class="awo-reports-page">
        <header class="awo-reports-heading"><div><span>ARQUIVO DE COMBATE</span><h1>Relatórios</h1><p>${reports.length} registro${reports.length === 1 ? '' : 's'} armazenado${reports.length === 1 ? '' : 's'} · mais recentes primeiro</p></div><div class="awo-reports-icon">▤</div></header>
        <div class="awo-reports-list">${reports.map(reportCard).join('')}</div>
        <p class="awo-reports-footnote">Vitórias comuns são registradas silenciosamente e não criam relatórios. O histórico é separado do save da campanha.</p>
      </section>`;
  }

  // Add a dedicated navigation destination without changing the game's existing tabs.
  const originalNav = nav;
  nav = function () {
    originalNav.apply(this, arguments);
    const host = document.querySelector('#nav');
    if (!host) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.a = 'tab';
    button.dataset.v = 'reports';
    button.className = view === 'reports' ? 'on' : '';
    button.innerHTML = '<span>▤</span>Relatório';
    host.appendChild(button);
  };

  // Draw the report archive as a first-class menu page.
  const originalDraw = draw;
  draw = function () {
    if (view === 'reports') {
      nav();
      head();
      const root = document.querySelector('#view');
      if (root) root.innerHTML = reportsHTML();
      return;
    }
    return originalDraw.apply(this, arguments);
  };

  function hiddenReportMarker(panel) {
    if (!panel) return null;
    let report = panel.querySelector('[data-battle-report]');
    if (!report) {
      report = document.createElement('div');
      report.dataset.battleReport = '1';
      report.setAttribute('aria-hidden', 'true');
      panel.appendChild(report);
    }
    report.style.display = 'none';
    return report;
  }

  function cleanBattleResults() {
    const battle = typeof B !== 'undefined' ? B : null;
    if (!battle || !battle.over) return;
    archiveBattle(battle);

    // Never leave victory copy, banners, replay buttons or result panels on the battle page.
    if (battle.over === 1) {
      document.querySelectorAll('#battle-result-slot .ban, #arena .ban').forEach(node => {
        node.replaceChildren();
        node.style.display = 'none';
        node.setAttribute('aria-hidden', 'true');
        node.dataset.awoVictorySuppressed = '1';
      });
      const resultPanel = document.querySelector('#awo-battle-results');
      if (resultPanel) {
        // Keep a hidden marker so the legacy report renderer does not recreate banners every frame.
        hiddenReportMarker(resultPanel);
        resultPanel.style.display = 'none';
        resultPanel.setAttribute('aria-hidden', 'true');
      }
      document.querySelectorAll('[data-auto-next-notice],[data-awo-win-actions],[data-campaign-actions]').forEach(node => node.remove());
      return;
    }

    // Defeat recovery buttons stay visible. The report node remains hidden in the results
    // container to prevent the legacy renderer from attaching it back to the main screen.
    document.querySelectorAll('#battle-result-slot [data-battle-report], #arena [data-battle-report]').forEach(node => node.remove());
    const defeatPanel = document.querySelector('#awo-battle-results');
    if (defeatPanel) hiddenReportMarker(defeatPanel);
    document.querySelectorAll('[data-awo-report-toggle]').forEach(node => node.remove());
  }

  const originalRender = render;
  render = function () {
    originalRender.apply(this, arguments);
    try { cleanBattleResults(); }
    catch (error) { console.error('[AWO] Report menu / victory cleanup:', error); }
  };

  console.info('[AI WORLD OWL] report archive menu enabled; all victory notifications removed from battle screen');
})();
