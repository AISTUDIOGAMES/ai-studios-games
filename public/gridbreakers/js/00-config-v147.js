/* =====================================================================
   OWL GRIDBREAKERS - CONFIG (todos os numeros de balanceamento aqui)
   Abra o jogo com ?debug no endereco para ganhar 1.000.000 de soul (teste).
   ===================================================================== */
window.OWL_CONFIG = {
  version: '1.8.0',
  debug: /[?&]debug\b/.test(location.search),

  gacha: {
    // [Common, Uncommon, Rare, Mythic, (reservado=0), Divine/Orion, Ancestral/Aeon]  -> soma 100
    rates: [52.2, 28, 15, 3.5, 0, 1, 0.3],
    divinePity: 90,       // puxadas ate Orion garantido
    ancestralPity: 200,   // puxadas ate Aeon garantido
    // bonus de status por raridade do heroi
    rarityMult: { 0: 1, 1: 1.05, 2: 1.10, 3: 1.18, 5: 1.28, 6: 1.38 }
  },

  // Escala do gear por estagio de origem: (1+0.25*(stage-1))^stageExp. 1.0 = comportamento antigo (gear domina tudo).
  gear: { stageExp: 0.5 },

  // soul (moeda do gacha) ganho nas batalhas da campanha
  soul: { firstClear: 25, firstBoss: 150, repeat: 0, repeatBoss: 1 },

  // Critico dos herois: base reduzida, bonus de equipamento com soft cap e teto total.
  critBalance: {
    baseMultiplier: 0.80,
    maxGearBonus: 0.10,
    gearHalfSaturation: 0.25,
    absoluteCap: 0.30
  },

  // Escalada infinita da Ancient Tower depois do limite do gerador base de inimigos.
  ancientTower: {
    baseStageCap: 100,
    scalingStartFloor: 96,
    hpGrowthPerFloor: 0.035,
    atkGrowthPerFloor: 0.022,
    defGrowthPerFloor: 0.012
  },

  // curva de dificuldade da campanha (fase n: n-1 = passos)
  // multiplicador = (1 + a*n) * (1 + b)^n * (1 + c*(regiao-1))
  difficulty: {
    hp:  [0.11, 0.003, 0.025],
    atk: [0.085, 0.003, 0.020],
    def: [0.045, 0.002, 0.015],
    speed: 0.002,
    late: 6,   // pressao extra de HP/ATK: x(1 + late*(stage-1)/99) -> stage 100 = x4. Calibrado com o harness de QA.
    boss: { hp: [1.25, 0.05], atk: [1.12, 0.02], def: [1.08, 0.02] }
  }
};

/* ---------- utilitarios de save ---------- */
window.OWL = (function () {
  const SAVE_KEY = 'awo_save_v1';
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  // mescla profunda: campos novos do jogo nunca somem de saves antigos
  function merge(base, extra) {
    for (const k in extra) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue; base[k] = (isObj(base[k]) && isObj(extra[k])) ? merge(base[k], extra[k]) : extra[k]; }
    return base;
  }
  let lastBackup = 0, warned = false;
  function backup(json) {
    const now = Date.now();
    if (now - lastBackup < 300000) return;          // 1 backup a cada 5 min
    lastBackup = now;
    try { localStorage.setItem(SAVE_KEY + '_backup', json); } catch (e) {}
  }
  function toast(msg) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99;background:#300;color:#ffd0d0;font:13px system-ui;padding:10px 12px;border-radius:8px;border:1px solid #f55;text-align:center';
    d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 9000);
  }
  function saveError(e) {
    console.warn('[OWL] falha ao salvar', e);
    if (warned) return; warned = true;
    toast('Could not save progress (storage full or blocked). Open ⚙ Configurações to export your save.');
  }
  function exportSave() {
    const data = localStorage.getItem(SAVE_KEY) || JSON.stringify(window.S || {});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = 'owl-gridbreakers-save-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function importSave() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (!d || typeof d !== 'object' || !('cleared' in d)) throw new Error('not a save file');
          localStorage.setItem(SAVE_KEY + '_before_import', localStorage.getItem(SAVE_KEY) || '');
          localStorage.setItem(SAVE_KEY, JSON.stringify(d));
          location.reload();
        } catch (e) { toast('Invalid save file.'); }
      };
      r.readAsText(f);
    };
    inp.click();
  }
  function mountSaveButton() {
    const b = document.createElement('button');
    b.textContent = '💾'; b.title = 'Export / import save';
    b.style.cssText = 'position:fixed;left:8px;bottom:70px;z-index:15;width:34px;height:34px;padding:0;border-radius:50%;opacity:.55;font-size:15px';
    b.onclick = () => {
      const p = document.createElement('div');
      p.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:98;display:flex;align-items:center;justify-content:center';
      p.innerHTML = '<div style="background:#17102a;border:1px solid #5a3fa0;border-radius:12px;padding:14px;width:260px;display:flex;flex-direction:column;gap:8px"><b style="color:#f5b94a">Save data</b><button id="owlx">Export save (.json)</button><button id="owli">Import save (.json)</button><button id="owlc">Close</button></div>';
      document.body.appendChild(p);
      p.querySelector('#owlx').onclick = exportSave;
      p.querySelector('#owli').onclick = importSave;
      p.querySelector('#owlc').onclick = () => p.remove();
    };
    document.body.appendChild(b);
  }
  return { merge, backup, saveError, exportSave, importSave, mountSaveButton };
})();
