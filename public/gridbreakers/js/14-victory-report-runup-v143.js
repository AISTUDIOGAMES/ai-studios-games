/* ===== OWL GRIDBREAKERS — EXTERNAL COMPACT BOSS REPORT + RUN-UP INTERMISSION ===== */
(function(){
  'use strict';
  const css=document.createElement('style');
  css.textContent=`#awo-battle-results:empty{display:none!important}#arena .ban [data-battle-report]{margin-top:6px!important}#arena .ban{isolation:isolate}`;
  document.head.appendChild(css);
  const priorRender=render;
  render=function(){
    priorRender.apply(this,arguments);
    try{
      const arena=document.querySelector('#arena');
      const banner=document.querySelector('#battle-result-slot .ban')||(arena&&arena.querySelector('.ban'));
      const panel=document.querySelector('#awo-battle-results');
      if(banner&&panel){
        // Keep summaries in the external result slot, never over the battlefield.
        const report=banner.querySelector('[data-battle-report]');
        if(report&&!panel.querySelector('[data-battle-report]'))panel.insertBefore(report,panel.firstChild);
      }
      if(panel&&!panel.children.length)panel.style.display='none';
      else if(panel)panel.style.display='';
    }catch(e){console.warn('[AWO] on-arena report placement:',e)}
  };
  render();
  console.info('[AWO] external boss-only report placement enabled');
})();
