/* ===== AI WORLD OWL — CAMPAIGN DIFFICULTY, MANUAL PROGRESSION & RESET CONTROLS ===== */
(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const stageRegion=s=>Math.max(1,Math.min(10,Math.ceil(s/10)));

  // A steeper curve than the previous linear-only formula, while retaining early-game pacing.
  // Stage 10 is close to the previous tuning; late regions become progressively more demanding.
  function difficultyFor(stage){
    const D=OWL_CONFIG.difficulty,s=clamp(Math.floor(Number(stage)||1),1,100),r=stageRegion(s),n=s-1;
    const late=1+(Number(D.late)||0)*n/99;
    return {
      region:r,
      hp:late*(1+D.hp[0]*n)*Math.pow(1+D.hp[1],n)*(1+D.hp[2]*(r-1)),
      atk:late*(1+D.atk[0]*n)*Math.pow(1+D.atk[1],n)*(1+D.atk[2]*(r-1)),
      def:(1+D.def[0]*n)*Math.pow(1+D.def[1],n)*(1+D.def[2]*(r-1)),
      speed:1+D.speed*n,
      bossHp:D.boss.hp[0]+D.boss.hp[1]*r,
      bossAtk:D.boss.atk[0]+D.boss.atk[1]*r,
      bossDef:D.boss.def[0]+D.boss.def[1]*r,
      pulse:Math.max(3.8,7-.32*(r-1))
    };
  }

  window.OWL_DIFFICULTY=difficultyFor; // single source of truth (used by 10-formation extras)

  // Replace the old stage multiplier with the campaign curve without changing enemy IDs or visuals.
  const _spawnCampaignDifficulty=spawn;
  spawn=function(b){
    _spawnCampaignDifficulty(b);
    if(!b||b.dg)return;
    const s=clamp(Math.floor(Number(b.stage)||1),1,100),d=difficultyFor(s);
    b.enemies.forEach(enemy=>{
      const base=E[enemy.id]||E.ouro;
      if(!base)return;
      const boss=!!enemy.boss;
      const hp=d.hp*(boss?d.bossHp:1);
      const atk=d.atk*(boss?d.bossAtk:1);
      const def=d.def*(boss?d.bossDef:1);
      enemy.max=Math.max(1,Math.round(base.hp*hp));
      enemy.hp=enemy.max;
      enemy.atk=Math.max(1,Math.round(base.atk*atk));
      enemy.def=Math.max(0,Math.round(base.def*def));
      enemy.spd=Math.min(190,Math.max(1,Math.round(base.spd*d.speed)));
      enemy.crit=Math.min(boss?.22:.17,.05+(s-1)*.0012);
      if(boss){enemy.sh=0;enemy.phase2=0;enemy.phase3=0;}
    });
    b.pulse=d.pulse;
    b._difficulty=d;
  };

  // Regional bosses gain two combat phases: defensive shield at 70%, enrage at 35%.
  const _stepCampaignDifficulty=step;
  step=function(b,dt){
    _stepCampaignDifficulty(b,dt);
    if(!b||b.over||b.dg)return;
    const boss=b.enemies&&b.enemies.find(e=>e.boss&&!e.dead);
    if(!boss)return;
    const d=b._difficulty||difficultyFor(b.stage);
    if(b.pulse>6.95)b.pulse=boss.phase3?Math.max(2.8,d.pulse*.72):d.pulse;
    if(!boss.phase2&&boss.hp<=boss.max*.70){
      boss.phase2=1;
      boss.sh=Math.max(boss.sh||0,Math.round(boss.max*.12));
      boss.atk=Math.round(boss.atk*1.12);
      b.fx.push({k:'c',u:boss.uid,v:'PHASE II · ANCIENT SHIELD'});
    }
    if(!boss.phase3&&boss.hp<=boss.max*.35){
      boss.phase3=1;
      boss.sh=Math.max(boss.sh||0,Math.round(boss.max*.10));
      boss.atk=Math.round(boss.atk*1.18);
      boss.spd=Math.min(200,Math.round(boss.spd*1.12));
      b.pulse=Math.min(b.pulse||d.pulse,Math.max(2.8,d.pulse*.72));
      b.fx.push({k:'c',u:boss.uid,v:'FINAL PHASE · DEVOURER RAGE'});
    }
  };

  // Add explicit choices after a battle. No more automatic stage skipping while the player is away.
  act.campaignNext=function(){
    if(!B||B.dg||!B.over||B.over!==1)return;
    if(Number(S.cleared)>=100){M('<b style="color:var(--gold)">CAMPAIGN COMPLETE</b><div class="mu">You conquered all 100 stages of The Eternal Obsidian Realm.</div>');return;}
    const next=clamp(Number(S.cleared)+1,1,100);
    view='battle';startBattle(next);
  };
  act.campaignRetry=function(){
    if(!B||!B.over)return;
    const s=clamp(Number(B.stage)||Number(S.sel)||1,1,100);
    view='battle';startBattle(s,B.dg,B.opp);
  };
  act.campaignMap=function(){view='map';draw();};

  const _renderCampaignDifficulty=render;
  render=function(){
    _renderCampaignDifficulty();
    if(view!=='battle'||!B||!B.over||B.dg)return;
    const arena=$('#arena'),banner=document.querySelector('#battle-result-slot .ban')||(arena&&arena.querySelector('.ban'));
    if(!banner||banner.querySelector('[data-campaign-actions]'))return;
    let controls='';
    if(B.over===1){
      const final=Number(S.cleared)>=100;
      controls=final
        ? `<button data-a="campaignMap" style="width:100%;margin-top:9px;border-color:var(--gold)">VIEW CAMPAIGN MAP</button>`
        : `<button class="pri" data-a="campaignNext" style="width:100%;margin-top:9px">CONTINUE TO STAGE ${Number(S.cleared)+1} →</button><button data-a="campaignRetry" style="width:100%;margin-top:5px">REPLAY THIS STAGE</button><button data-a="campaignMap" style="width:100%;margin-top:5px">CAMPAIGN MAP</button>`;
    }else{
      controls=`<button class="pri" data-a="campaignRetry" style="width:100%;margin-top:9px">RETRY STAGE ${B.stage}</button><button data-a="campaignMap" style="width:100%;margin-top:5px">CAMPAIGN MAP</button>`;
    }
    banner.insertAdjacentHTML('beforeend',`<div data-campaign-actions style="pointer-events:auto;max-width:270px;margin:8px auto 0;font-size:11px">${controls}</div>`);
  };

  // Reusable reset option. It deliberately asks for confirmation before clearing the local save.
  act.resetCampaign=function(){
    M(`<b style="font-size:18px;color:var(--rd)">RESET ENTIRE CAMPAIGN?</b><div class="mu">This permanently clears campaign progress, hero levels, ascensions, stars, equipment, inventory, currencies, relic upgrades, summon history and pity counters on this browser.</div><div class="card"><b>New campaign starts with</b><div class="mu">Lyra · Level 1 · Stage 1 · starter resources (recruit more heroes in Summon)</div></div><button class="pri" data-a="confirmCampaignReset" style="width:100%;background:linear-gradient(#a51f40,#67152e);border-color:#ff718c">YES — ERASE AND START OVER</button><button data-a="cancelCampaignReset" style="width:100%;margin-top:6px">CANCEL</button>`);
  };
  act.cancelCampaignReset=function(){
    const modal=$('#modal');
    if(modal)modal.style.display='none';
    // Reset is now initiated only from Settings; cancel keeps the player there.
  };
  act.confirmCampaignReset=function(){
    // Reset only campaign progression. Keep the player's non-campaign preferences.
    const previous=S||{},preferences={};
    ['auto','autoU','snd','sv','mv','music'].forEach(key=>{
      if(Object.prototype.hasOwnProperty.call(previous,key))preferences[key]=previous[key];
    });
    try{localStorage.removeItem(KEY);localStorage.removeItem(KEY+'_backup');}catch(e){}
    const settings=document.getElementById('gfx-settings-overlay');
    if(settings)settings.remove();
    S=fresh();Object.assign(S,preferences);
    S.gachaPity={legendary:0,divine:0,ancestral:0,total:0};
    S.gachaHistory=[];
    S.cleared=0;S.sel=1;S.inv=[];S.nid=1;
    paused=0;speed=1;view='battle';startBattle(1);
    M(`<b style="font-size:20px;color:var(--gold)">✦ NEW JOURNEY ✦</b><div class="mu">Your campaign has been reset successfully. Lyra is Level 1 and Stage 1 is now available; use Summon to recruit more heroes. Display, audio and automatic-combat preferences were kept.</div>`);
  };

  // The difficulty overview remains on the Campaign Map; campaign reset lives only in Settings.
  const _drawCampaignDifficulty=draw;
  draw=function(){
    _drawCampaignDifficulty();
    if(view!=='map')return;
    const target=$('#view');
    if(!target||target.querySelector('[data-campaign-overview]'))return;
    const next=clamp((Number(S.cleared)||0)+1,1,100),d=difficultyFor(next),bossAt=Math.ceil(next/10)*10;
    const tier=next<=10?'INITIATE':next<=20?'SEASONED':next<=40?'VETERAN':next<=60?'NIGHTMARE':next<=80?'MYTHIC':'ANCESTRAL';
    target.insertAdjacentHTML('afterbegin',`<div class="card" data-campaign-overview style="border-color:#8b4dff;background:linear-gradient(135deg,#211238,#10091d)"><b style="color:var(--gold)">⚔ CAMPAIGN CHALLENGE</b><div class="st"><span>Progress</span><b>${S.cleared}/100 stages</b></div><div class="st"><span>Next stage</span><b>${next}. ${STAGES[next-1]}</b></div><div class="st"><span>Difficulty tier</span><b style="color:var(--rd)">${tier}</b></div><div class="st"><span>Next regional boss</span><b>${bossAt}</b></div><div class="mu" style="margin-top:6px">Enemy scaling at Stage ${next}: HP ×${d.hp.toFixed(1)} · ATK ×${d.atk.toFixed(1)} · DEF ×${d.def.toFixed(1)}. Regional bosses have two extra shield/enrage phases. Clear each stage manually to unlock the next.</div></div>`);
  };

  // Keep the map's stage selector honest; only the next uncleared stage or a replay is allowed.
  const _stageActionCampaign=act.stage;
  act.stage=function(value){
    const s=clamp(Math.floor(Number(value)||1),1,100);
    if(s>Number(S.cleared)+1){M('<b>Stage locked</b><div class="mu">Clear the previous stage to unlock this challenge.</div>');return;}
    _stageActionCampaign(s);
  };

  const style=document.createElement('style');
  style.textContent=`
    [data-campaign-actions] button{font-size:10px;letter-spacing:.4px;box-shadow:0 2px 10px #0009}
    [data-campaign-overview] .st{padding:4px 0}
    .ban{max-height:90%;overflow:auto;}
  `;
  document.head.appendChild(style);
  console.info('[AI WORLD OWL] campaign difficulty curve, boss phases, manual stage progression and fresh-start reset enabled');
})();
