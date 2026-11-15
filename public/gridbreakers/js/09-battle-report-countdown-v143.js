/* ===== AI WORLD OWL — COMPACT BOSS-ONLY BATTLE REPORT ===== */
(function(){
  'use strict';
  if(window.__AWO_BATTLE_REPORT_V1)return;
  window.__AWO_BATTLE_REPORT_V1=true;

  const fmt=n=>Math.max(0,Math.round(Number(n)||0)).toLocaleString();

  // Reports are reserved for a completed final-stage boss (wave 33) or the raid boss.
  // Campaign waves are zero-based internally: 32 is the final boss encounter.
  function shouldShowBossReport(b){
    if(!b||b.over!==1)return false;
    const enemies=Array.isArray(b.enemies)?b.enemies:[];
    if(b.dg==='raid')return enemies.some(e=>e&&e.boss);
    if(b.dg)return false;
    const finalBossWave=Number(b.wave)>=32||Number(b.__owlWaveNumber)>=33;
    return finalBossWave&&enemies.some(e=>e&&e.boss&&!e.miniBoss);
  }
  window.awoShouldShowBossReport=shouldShowBossReport;
  function statFor(b,id){
    if(!b.__awoReportStats)b.__awoReportStats={};
    if(!b.__awoReportStats[id])b.__awoReportStats[id]={damage:0,basicDamage:0,skillDamage:0,ultDamage:0,received:0,hpLost:0,shielded:0,healing:0,kills:0,deaths:0,skills:0,ultimates:0};
    return b.__awoReportStats[id];
  }
  function ensureAll(b){if(b&&Array.isArray(b.allies))b.allies.forEach(u=>statFor(b,u.id));}
  function snapshotHp(b){return(b&&b.allies||[]).map(u=>({id:u.id,hp:Number(u.hp)||0}));}
  function recordHealing(b,healer,before){
    if(!b||!healer||!healer.ally)return;
    const st=statFor(b,healer.id);
    for(const old of before){const target=b.allies.find(u=>u.id===old.id);if(target){const gained=Math.max(0,(Number(target.hp)||0)-old.hp);if(gained>0)st.healing+=gained;}}
  }

  // Wrap the real combat hit function and measure the actual HP/shield values changed.
  const rawHit=hit;
  hit=function(b,a,d,mult,flat){
    if(!b||!a||!d)return rawHit.apply(this,arguments);
    ensureAll(b);
    const hpBefore=Math.max(0,Number(d.hp)||0);
    const shieldBefore=Math.max(0,Number(d.sh)||0);
    const wasDead=!!d.dead;
    const kind=b.__awoReportKind||'basic';
    const result=rawHit.apply(this,arguments);
    const hpLost=Math.max(0,hpBefore-Math.max(0,Number(d.hp)||0));
    const shieldLost=Math.max(0,shieldBefore-Math.max(0,Number(d.sh)||0));
    const actual=hpLost+shieldLost;
    if(actual>0&&a.ally){
      const st=statFor(b,a.id);
      st.damage+=actual;
      if(kind==='ultimate')st.ultDamage+=actual;
      else if(kind==='skill')st.skillDamage+=actual;
      else st.basicDamage+=actual;
    }
    if(actual>0&&d.ally){
      const st=statFor(b,d.id);
      st.received+=actual;st.hpLost+=hpLost;st.shielded+=shieldLost;
    }
    if(!wasDead&&d.dead){
      if(a.ally)statFor(b,a.id).kills++;
      if(d.ally)statFor(b,d.id).deaths++;
    }
    return result;
  };

  // Track actual healing and the number of skill/ultimate activations.
  const rawCast=cast;
  cast=function(b,u){
    if(!b||!u)return rawCast.apply(this,arguments);
    ensureAll(b);
    const before=snapshotHp(b),previous=b.__awoReportKind;
    if(u.ally)statFor(b,u.id).skills++;
    b.__awoReportKind='skill';
    try{return rawCast.apply(this,arguments);}
    finally{recordHealing(b,u,before);b.__awoReportKind=previous;}
  };
  const rawUlt=ult;
  ult=function(b,u){
    if(!b||!u)return rawUlt.apply(this,arguments);
    ensureAll(b);
    const before=snapshotHp(b),previous=b.__awoReportKind;
    if(u.ally)statFor(b,u.id).ultimates++;
    b.__awoReportKind='ultimate';
    try{return rawUlt.apply(this,arguments);}
    finally{recordHealing(b,u,before);b.__awoReportKind=previous;}
  };

  function reportHTML(b){
    ensureAll(b);
    const rows=(b.allies||[]).map(u=>({id:u.id,name:(H[u.id]&&H[u.id].n)||u.n||u.id,...statFor(b,u.id)})).sort((a,c)=>c.damage-a.damage);
    const total=rows.reduce((n,x)=>n+x.damage,0);
    const boss=(b.enemies||[]).find(e=>e.boss);
    const result=b.over===1?'VICTORY':'DEFEAT';
    const top=rows[0];
    const portraits=rows.map((x,i)=>`<div style="display:flex;align-items:center;gap:7px;min-width:0;padding:4px 5px;border-radius:8px;background:#101a1acc;border:1px solid #ffffff20">
      <img src="${SP[x.id]||''}" alt="${x.name}" style="width:34px;height:34px;object-fit:contain;flex:0 0 34px;filter:drop-shadow(0 2px 3px #000)" />
      <div style="min-width:0;flex:1"><b style="display:block;font-size:10px;color:${i===0?'#f5d27b':'#f0f5ef'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i===0?'★ ':''}${x.name}</b>
      <div style="font-size:8px;color:#d6e1d6;line-height:1.45">DMG ${fmt(x.damage)} · ULT ${fmt(x.ultDamage)} · HEAL ${fmt(x.healing)}</div></div>
    </div>`).join('');
    const title=b.dg?((DG[b.dg]||DGX[b.dg]||{n:b.dg}).n):`STAGE ${b.stage}`;
    return `<section data-battle-report="1" style="margin:7px auto 2px;max-width:300px;text-align:left;background:rgba(8,18,15,.76);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);border:1px solid #a9d6ad88;border-radius:11px;padding:8px;color:#f1f7ee;box-shadow:0 5px 18px #0008;pointer-events:auto">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;border-bottom:1px solid #ffffff35;padding-bottom:5px;margin-bottom:5px"><b style="font-size:10px;color:#d8f1bb;letter-spacing:.6px">⚔ RESUMO DA BATALHA</b><span style="font-size:9px;color:${b.over===1?'#83f2a1':'#ff9cae'};font-weight:900">${result}</span></div>
      <div style="font-size:9px;color:#e0eadb;margin-bottom:6px">${title}${boss?' · '+boss.n:''} <span style="float:right;color:#fff;font-weight:900">DANO ${fmt(total)}</span></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px">${portraits}</div>
      ${top?`<div style="margin-top:5px;font-size:8px;color:#f5d27b">Destaque: ${top.name} · ${fmt(top.damage)} de dano</div>`:''}
    </section>`;
  }

  function attachReport(){
    if(typeof B==='undefined'||!B||!B.over)return;
    if(B.over===1&&!shouldShowBossReport(B))return; // keep defeat reports; suppress routine victory reports.
    const existing=document.querySelector('#awo-battle-results [data-battle-report]');
    if(existing)return;
    const banner=document.querySelector('#battle-result-slot .ban')||document.querySelector('#arena .ban');
    if(!banner||banner.querySelector('[data-battle-report]'))return;
    banner.insertAdjacentHTML('beforeend',reportHTML(B));
  }

  const rawRender=render;
  render=function(){
    rawRender.apply(this,arguments);
    try{attachReport();}catch(e){console.error('[AWO] Battle report error',e);}
  };

  const style=document.createElement('style');
  style.textContent=`
    .ban{max-height:94%!important;overflow-y:auto!important;overscroll-behavior:contain;pointer-events:auto;padding:8px 7px 10px!important;background:rgba(5,12,10,.30);border:1px solid #c4e8c344;border-radius:14px;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
    [data-battle-report]{font-variant-numeric:tabular-nums}
    #arena .ban>small{font-size:10px}
    #arena [data-battle-report]{width:min(100%,300px);box-sizing:border-box}
    @media(max-height:650px){#arena .ban{inset:auto 4% 20% 4%!important;max-height:76%!important}}
  `;
  document.head.appendChild(style);
  render();
  console.info('[AI WORLD OWL] boss-only victory report and defeat report enabled; victory countdown copy suppressed');
})();
