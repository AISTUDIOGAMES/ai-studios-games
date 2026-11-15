/* ===== AWO: SHOW / HIDE BATTLE REPORT ===== */
(function(){
  'use strict';
  if(window.__AWO_REPORT_TOGGLE_V1)return;
  window.__AWO_REPORT_TOGGLE_V1=true;
  const KEY='awo_battle_report_visible_v1';
  let visible=true;
  try{const saved=localStorage.getItem(KEY);if(saved!==null)visible=saved!=='0';}catch(e){}
  function apply(panel){
    if(!panel)return;
    const report=panel.querySelector('[data-battle-report]');
    if(!report)return;
    const bossVictory=typeof B!=='undefined'&&B&&B.over===1&&typeof window.awoShouldShowBossReport==='function'&&window.awoShouldShowBossReport(B);
    if(bossVictory){
      const existing=panel.querySelector('[data-awo-report-toggle]');
      if(existing)existing.remove();
      report.style.display='';
      return;
    }
    let button=panel.querySelector('[data-awo-report-toggle]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.dataset.awoReportToggle='1';
      button.style.cssText='display:block;margin:0 auto 2px;padding:6px 11px;border:1px solid #a9d6ad88;border-radius:8px;background:rgba(8,18,15,.78);color:#e8f6df;font:900 9px system-ui,sans-serif;letter-spacing:.55px;cursor:pointer;pointer-events:auto;';
      button.addEventListener('click',function(){
        visible=!visible;
        try{localStorage.setItem(KEY,visible?'1':'0');}catch(e){}
        update(panel);
      });
      panel.insertBefore(button,report);
    }
    update(panel);
  }
  function update(panel){
    const report=panel&&panel.querySelector('[data-battle-report]');
    const button=panel&&panel.querySelector('[data-awo-report-toggle]');
    if(!report||!button)return;
    report.style.display=visible?'':'none';
    button.textContent=visible?'▾ OCULTAR RELATÓRIO':'▸ VER RELATÓRIO';
    button.setAttribute('aria-expanded',visible?'true':'false');
    button.title=visible?'Ocultar resumo da batalha':'Mostrar resumo da batalha';
  }
  const rawRender=render;
  render=function(){
    rawRender.apply(this,arguments);
    try{apply(document.querySelector('#awo-battle-results'));}catch(e){console.warn('[AWO] report toggle',e);}
  };
  // A short observer-free refresh is unnecessary: the game's render loop calls render repeatedly.
  render();
})();
