/* ===== AI WORLD OWL — 5v5 FORMATION + VISIBLE BATTLE RESULTS / DEFEAT RECOVERY ===== */
(function(){
  'use strict';
  if(window.__AWO_FIVE_VS_FIVE_RESULTS_V1)return;
  window.__AWO_FIVE_VS_FIVE_RESULTS_V1=true;

  // Keep the fifth slot available after every future campaign reset.
  const rawFresh=fresh;
  fresh=function(){
    const data=rawFresh();
    data.lv=data.lv||{};data.xp=data.xp||{};
    data.lv.aeon=1;data.xp.aeon=0;
    if(!data.owned.includes('aeon'))data.owned.push('aeon');
    if(!data.order.includes('aeon'))data.order.push('aeon');
    data.order=data.order.slice(0,5);
    return data;
  };

  // Migrate existing saves without resetting progress, currencies, equipment or levels.
  S.owned=Array.isArray(S.owned)?S.owned:[];
  S.order=Array.isArray(S.order)?S.order:[];
  S.lv=S.lv||{};S.xp=S.xp||{};
  ['lyra','jax','kira','kai'].forEach(id=>{
    if(H[id]&&!S.owned.includes(id))S.owned.push(id);
  });
  S.order=S.order.filter((id,i,a)=>H[id]&&S.owned.includes(id)&&a.indexOf(id)===i);
  while(S.order.length<5){
    let candidate=S.owned.find(id=>H[id]&&!S.order.includes(id));
    if(!candidate){
      candidate='aeon';
      if(!S.owned.includes(candidate))S.owned.push(candidate);
    }
    if(!H[candidate])break;
    S.order.push(candidate);
    S.lv[candidate]=Math.max(1,Number(S.lv[candidate])||1);
    S.xp[candidate]=Math.max(0,Number(S.xp[candidate])||0);
  }
  S.order=S.order.slice(0,5);
  S.order.forEach(id=>{S.lv[id]=Math.max(1,Number(S.lv[id])||1);S.xp[id]=Math.max(0,Number(S.xp[id])||0)});
  if(Array.isArray(S.arena?.opps))S.arena.opps.forEach(o=>{
    o.team=Array.isArray(o.team)?o.team.filter(id=>H[id]):[];
    while(o.team.length<5){const id=Object.keys(H).find(x=>!o.team.includes(x));if(!id)break;o.team.push(id)}
    o.team=o.team.slice(0,5);
  });
  if(Array.isArray(SYN))SYN[5]=Math.max(Number(SYN[5])||0,.32);
  save();

  // Use five opponent heroes for newly generated Arena squads too.
  const rawGenOpps=genOpps;
  genOpps=function(){
    rawGenOpps();
    (S.arena.opps||[]).forEach(o=>{
      o.team=(o.team||[]).filter(id=>H[id]);
      while(o.team.length<5){const id=Object.keys(H).find(x=>!o.team.includes(x));if(!id)break;o.team.push(id)}
      o.team=o.team.slice(0,5);
    });
    save();
  };

  // Build a pool that grows with the campaign regions.
  function enemyPool(stage){
    const s=Number(stage)||1,pool=['wraith','raider'];
    if(s>=3)pool.push('drone');
    if(s>=5)pool.push('stalker');
    if(s>=7)pool.push('knight');
    if(s>=11)pool.push('nullweaver');
    if(s>=21)pool.push('dunecrusher');
    if(s>=31)pool.push('scrapwraith');
    if(s>=41)pool.push('ashbrute');
    if(s>=51)pool.push('hushstalker');
    if(s>=61)pool.push('obsidianguard');
    if(s>=71)pool.push('sanctumshade');
    if(s>=81)pool.push('gridphantom');
    if(s>=91)pool.push('ancestralhusk');
    return pool.filter(id=>E[id]);
  }
  function difficultyForFive(stage){
    const s=Math.max(1,Math.min(100,Math.floor(Number(stage)||1))),region=Math.ceil(s/10),n=s-1;
    return{
      hp:(1+.28*n)*Math.pow(1.012,n)*(1+.025*(region-1)),
      atk:(1+.22*n)*Math.pow(1.009,n)*(1+.022*(region-1)),
      def:(1+.10*n)*Math.pow(1.006,n)*(1+.020*(region-1)),
      speed:1+.0025*n
    };
  }
  function makeExtraEnemy(id,b,index){
    const base=E[id]||E.wraith,s=Math.max(1,Number(b.stage)||1),d=(b.dg?difficultyForFive:(window.OWL_DIFFICULTY||difficultyForFive))(s),region=Math.ceil(s/10);
    const k=d.hp,ka=d.atk,kd=d.def;
    return{
      uid:'e5-'+s+'-'+b.wave+'-'+index+'-'+Math.floor(Math.random()*1e8),
      id,team:1,pos:index,n:base.n,e:base.e,boss:0,
      max:Math.max(1,Math.round(base.hp*k)),hp:Math.max(1,Math.round(base.hp*k)),
      atk:Math.max(1,Math.round(base.atk*ka)),def:Math.max(0,Math.round(base.def*kd)),
      spd:Math.min(190,Math.max(1,Math.round(base.spd*d.speed))),crit:Math.min(.17,.05+(s-1)*.0012),
      cdm:1.5,sh:0,stun:0,atkT:Math.random()*1.5,skT:99,dead:0
    };
  }

  // Wrap the fully configured spawn so every campaign wave has five enemies.
  const rawSpawnFive=spawn;
  spawn=function(b){
    rawSpawnFive(b);
    if(!b||b.dg==='raid')return;
    if(b.dg==='arena'){
      const team=(b.opp&&Array.isArray(b.opp.team))?b.opp.team:[];
      while(b.enemies.length<5){
        const id=team[b.enemies.length]||Object.keys(H).find(x=>!team.includes(x))||'aeon';
        b.enemies.push(mkFoe(id,b.enemies.length,b.opp?.lv||1));
      }
      b.enemies=b.enemies.slice(0,5);
      b.enemies.forEach((e,i)=>{e.pos=i;e.team=1});
    }else{
      const boss=b.enemies.find(e=>e.boss&&!e.dead);
      const pool=enemyPool(b.stage);
      const used=b.enemies.filter(e=>!e.boss).length;
      const wanted=5;
      while(b.enemies.length<wanted){
        const id=pool[Math.floor(Math.random()*pool.length)]||'wraith';
        const position=used+(b.enemies.filter(e=>!e.boss).length-used);
        b.enemies.push(makeExtraEnemy(id,b,Math.min(4,position)));
      }
      if(b.enemies.length>wanted){
        if(boss){const adds=b.enemies.filter(e=>e!==boss).slice(0,4);b.enemies=[boss,...adds]}
        else b.enemies=b.enemies.slice(0,5);
      }
      const addPositions=[0,1,2,4];let next=0;
      b.enemies.forEach(e=>{if(e.boss){e.pos=3}else{e.pos=boss?addPositions[next++]:next++;e.team=1}});
    }
    b.built='';
  };

  // Ensure a defeated campaign always has a usable retry and map action.
  act.retryBattle=function(){
    if(!B||!B.over)return;
    if(B.dg&&B.dg!=='tower'){paused=0;view='map';draw();return} // dungeon/raid/arena must be re-entered via act.dg/raid/arena (spends key/attempt)
    const stage=Math.max(1,Math.min(100,Number(B.stage)||Number(S.sel)||1));
    const dungeon=B.dg,opponent=B.opp;
    paused=0;view='battle';startBattle(stage,dungeon,opponent);
  };
  act.campaignRetry=function(){act.retryBattle()};
  act.retryCurrent=function(){act.retryBattle()};
  act.resultMap=function(){paused=0;view='map';draw()};

  // Put the report and end-of-battle controls in normal document flow, below the 3D arena.
  // This prevents the report from covering the battle UI or hiding defeat buttons.
  const rawRenderFive=render;
  render=function(){
    rawRenderFive.apply(this,arguments);
    try{
      const arena=document.querySelector('#arena');
      const stale=document.querySelector('#awo-battle-results');
      if(!arena||!B||!B.over){if(stale)stale.remove();return}
      let banner=document.querySelector('#battle-result-slot .ban')||arena.querySelector('.ban');
      if(!banner){
        banner=document.createElement('div');banner.className='ban';
        banner.innerHTML=B.over===1?'VICTORY<br><small>Battle completed.</small>':'DEFEAT<br><small>Your squad has fallen. Retry or return to the campaign map.</small>';
        arena.appendChild(banner);
      }

      const isBossVictory=!!(B.over===1&&typeof window.awoShouldShowBossReport==='function'&&window.awoShouldShowBossReport(B));
      const isRoutineCampaignVictory=!!(B.over===1&&!B.dg&&!isBossVictory);
      if(isRoutineCampaignVictory){
        // Rewards and campaign progression are already committed by win(); hide repeated
        // victory copy and reports. The NEXT: ON/OFF control remains available.
        banner.style.display='none';
        banner.setAttribute('aria-hidden','true');
        banner.dataset.awoRoutineVictory='1';
        if(stale)stale.remove();
        return;
      }

      let panel=stale;
      if(!panel){
        panel=document.createElement('section');panel.id='awo-battle-results';
        panel.setAttribute('aria-live','polite');
        arena.insertAdjacentElement('afterend',panel);
      }
      // Move fresh nodes only once; later render cycles update the same visible countdown.
      const freshReport=banner.querySelector('[data-battle-report]');
      const oldReport=panel.querySelector('[data-battle-report]');
      if(freshReport){if(oldReport)freshReport.remove();else panel.appendChild(freshReport)}
      const freshControls=banner.querySelector('[data-campaign-actions]');
      const oldControls=panel.querySelector('[data-campaign-actions]');
      if(freshControls){if(oldControls)freshControls.remove();else panel.appendChild(freshControls)}
      const freshNotice=banner.querySelector('[data-auto-next-notice]');
      const oldNotice=panel.querySelector('[data-auto-next-notice]');
      if(freshNotice){if(oldNotice){oldNotice.textContent=freshNotice.textContent;oldNotice.style.color=freshNotice.style.color;oldNotice.style.background=freshNotice.style.background;freshNotice.remove()}else panel.appendChild(freshNotice)}

      // Defeat controls are always rendered as real, accessible buttons outside the 3D canvas.
      if(B.over===2&&!panel.querySelector('[data-campaign-actions]')&&!panel.querySelector('[data-awo-defeat-actions]')){
        const actions=document.createElement('div');
        actions.dataset.awoDefeatActions='1';
        actions.innerHTML=`<button class="pri" data-a="retryCurrent" type="button">↻ RETRY BATTLE</button><button data-a="resultMap" type="button">🗺 CAMPAIGN MAP</button>`;
        panel.appendChild(actions);
      }
      // Side activities also get a recovery button; campaign already has its own retry/map row.
      if(B.dg&&B.over===1&&!panel.querySelector('[data-awo-win-actions]')){
        const actions=document.createElement('div');actions.dataset.awoWinActions='1';
        actions.innerHTML=`<button class="pri" data-a="retryCurrent" type="button">↻ REPLAY BATTLE</button><button data-a="resultMap" type="button">🗺 BACK TO MAP</button>`;
        panel.appendChild(actions);
      }
      if(!panel.querySelector('[data-battle-report]')){
        const fallback=document.createElement('div');fallback.className='card';
        fallback.innerHTML=`<b>${B.over===1?'VICTORY':'DEFEAT'} · ${B.dg?'BATTLE':'STAGE '+B.stage}</b><div class="mu">${B.over===1?'The battle is complete.':'Your squad has been defeated. You can retry without losing campaign progress.'}</div>`;
        panel.insertBefore(fallback,panel.firstChild);
      }
      if(!panel.querySelector('[data-campaign-actions]')&&!panel.querySelector('[data-awo-defeat-actions]')&&!panel.querySelector('[data-awo-win-actions]')){
        const actions=document.createElement('div');actions.dataset.awoDefeatActions='1';
        actions.innerHTML=`<button class="pri" data-a="retryCurrent" type="button">↻ RETRY BATTLE</button><button data-a="resultMap" type="button">🗺 CAMPAIGN MAP</button>`;
        panel.appendChild(actions);
      }
      if(B.over===1&&isBossVictory){
        // A boss clear gets one useful artifact: the report. Remove duplicate victory
        // banners, reward paragraphs, action rows, tabs and countdown messages.
        panel.querySelectorAll('[data-campaign-actions],[data-auto-next-notice],[data-awo-defeat-actions],[data-awo-win-actions],[data-awo-report-toggle]').forEach(node=>node.remove());
        const report=panel.querySelector('[data-battle-report]');
        Array.from(panel.children).forEach(node=>{if(node!==report)node.remove()});
        if(report)report.style.display='';
        banner.replaceChildren();
        banner.style.display='none';
        banner.setAttribute('aria-hidden','true');
        banner.dataset.awoBossVictory='1';
      }
    }catch(err){console.error('[AWO] Result panel error',err)}
  };

  const style=document.createElement('style');
  style.id='awo-five-results-style';
  style.textContent=`
    #arena .ban{max-height:none!important;overflow:visible!important;pointer-events:none!important}
    #awo-battle-results{position:relative;display:flex;flex-direction:column;gap:6px;width:100%;max-width:100%;margin:6px 0 58px;padding:0 0 4px;z-index:2;}
    #awo-battle-results [data-battle-report]{width:100%!important;max-width:none!important;margin:0!important;max-height:none!important;overflow:visible!important;}
    #awo-battle-results [data-campaign-actions],#awo-battle-results [data-awo-defeat-actions],#awo-battle-results [data-awo-win-actions]{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:none!important;margin:0!important;}
    #awo-battle-results [data-campaign-actions] button,#awo-battle-results [data-awo-defeat-actions] button,#awo-battle-results [data-awo-win-actions] button{width:100%;min-height:42px;font-size:11px;}
    #awo-battle-results [data-auto-next-notice]{display:block!important;width:100%;max-width:none!important;margin:0!important;}
    #awo-battle-results .card{margin:0;}
    #awo-battle-results [data-battle-report] *{box-sizing:border-box;}
    .pt{max-height:75%;overflow-y:auto;}
    .skr{gap:6px;padding:0 5px;}
    .skb{width:54px;height:54px;flex:0 0 54px;}
    @media(max-width:390px){.skb{width:46px;height:46px;flex-basis:46px}.skr{gap:4px}}
  `;
  document.head.appendChild(style);

  // Rebuild the same selected stage with all five allies; campaign progress remains untouched.
  const stage=Math.max(1,Math.min(100,Number(B&&B.stage)||Number(S.sel)||1));
  const dungeon=B&&B.dg,opponent=B&&B.opp;
  paused=0;
  startBattle(stage,dungeon,opponent);
  console.info('[AI WORLD OWL] 5v5 formations and external battle-results panel enabled');
})();
