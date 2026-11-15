/* ===== AI WORLD OWL — AUTO CONTINUE CONTROL — v1 ===== */
(function(){
  'use strict';
  const STORAGE_KEY='awo_campaign_auto_continue_v1';
  const WAIT_MS=10000;
  let autoContinue=false;
  let pendingBattle=null;
  let deadline=0;

  try{const saved=localStorage.getItem(STORAGE_KEY);autoContinue=saved===null?true:saved==='1';}catch(e){autoContinue=true;}

  function saveSetting(){
    try{localStorage.setItem(STORAGE_KEY,autoContinue?'1':'0');}catch(e){}
  }
  function stopCountdown(){pendingBattle=null;deadline=0;}
  function isCampaignVictory(){
    return typeof B!=='undefined' && B && !B.dg && B.over===1 && Number(S.cleared)<100;
  }
  function ensureButton(){
    const side=document.querySelector('#battle-commands .side')||document.querySelector('#arena .side');
    if(!side)return;
    let button=side.querySelector('[data-a="autoContinue"]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.dataset.a='autoContinue';
      button.id='bAutoContinue';
      button.title='Automatically start the next campaign stage after victory';
      button.setAttribute('aria-label','Toggle automatic stage continuation');
      side.appendChild(button);
    }
    button.textContent=autoContinue?'⏩ NEXT: ON':'⏸ NEXT: OFF';
    button.style.borderColor=autoContinue?'#4be28a':'#8b739f';
    button.style.color=autoContinue?'#8cffba':'#ece6ff';
    button.style.boxShadow=autoContinue?'0 0 9px #4be28a66':'none';
    button.setAttribute('aria-pressed',autoContinue?'true':'false');
  }
  function updateVictoryNotice(){
    const banner=document.querySelector('#battle-result-slot .ban')||document.querySelector('#arena .ban');
    if(!banner)return;
    // Auto progression continues in the background; omit repetitive victory/countdown copy.
    banner.querySelectorAll('[data-a="campaignNext"],[data-auto-next-notice]').forEach(node=>node.remove());
  }

  act.autoContinue=function(){
    autoContinue=!autoContinue;
    saveSetting();
    if(!autoContinue)stopCountdown();
    else if(isCampaignVictory()){
      pendingBattle=B;
      deadline=Date.now()+WAIT_MS;
    }
    render();
  };

  const _renderAutoContinue=render;
  render=function(){
    _renderAutoContinue();
    ensureButton();
    updateVictoryNotice();
  };

  // Only successful campaign-stage clears advance. Defeats and side activities never auto-advance.
  setInterval(function(){
    if(!autoContinue){stopCountdown();return;}
    if(!isCampaignVictory()){
      stopCountdown();
      return;
    }
    if(pendingBattle!==B){
      pendingBattle=B;
      deadline=Date.now()+WAIT_MS;
    }
    if(Date.now()>=deadline){
      const completedBattle=pendingBattle;
      stopCountdown();
      if(autoContinue&&B===completedBattle&&isCampaignVictory()){
        act.campaignNext();
        render();
      }
    }
  },200);

  // Add the toggle immediately on initial load, even before the next battle render tick.
  render();
  console.info('[AI WORLD OWL] auto stage continuation control enabled');
})();
