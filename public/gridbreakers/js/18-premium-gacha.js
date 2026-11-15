/* ===== OWL GRIDBREAKERS: PREMIUM GACHA REWORK / ORIGIN RARITIES / AUTO SUMMON ===== */
(function(){
  'use strict';
  if(window.__AWO_PREMIUM_GACHA_V2)return;
  window.__AWO_PREMIUM_GACHA_V2=true;

  const COLORS={0:'#aeb8c6',1:'#46df9b',2:'#2753a5',3:'#ef4444',5:'#f6c85f',6:'#5be7ee'};
  const LABELS={0:'Common',1:'Uncommon',2:'Rare',3:'Mythic',5:'Divine',6:'Ancestral'};
  const MULT=OWL_CONFIG.gacha.rarityMult;
  const BASE_RANK={kai:0,kira:1,lyra:2,jax:3,titan:4,aeon:4,orion:5,vex:6};
  const NORMAL_IDS=Object.keys(H).filter(id=>id!=='orion'&&id!=='aeon');
  const SPECIAL={orion:5,aeon:6};
  // Fixed per-pull rates (sum = exactly 100%). The remaining probability is
  // distributed across Common / Uncommon / Rare; no campaign-stage rate scaling.
  const RATE_TABLE=Array.from({length:6},()=>OWL_CONFIG.gacha.rates.slice());
  const band=s=>s<=10?0:s<=30?1:s<=50?2:s<=70?3:s<=90?4:5;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rankOf=id=>id==='orion'?5:id==='aeon'?6:clamp(Math.floor(Number(S.heroRarity&&S.heroRarity[id])||0),0,3);
  const colorOf=r=>COLORS[r]||COLORS[0];
  const labelOf=r=>LABELS[r]||'Common';
  const pct=n=>(Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:3})+'%';
  const RANK_OF_SLOT=[0,1,2,3,5,6]; // weights[] index -> rarity rank
  const weighted=weights=>{const sum=weights.reduce((a,b)=>a+b,0);let x=R()*sum;for(let i=0;i<weights.length;i++){x-=weights[i];if(x<0)return i}return weights.length-1};

  // Migration: every non-special hero starts at Common unless the player has a later Gacha result.
  S.heroRarity=S.heroRarity&&typeof S.heroRarity==='object'?S.heroRarity:{};
  Object.keys(H).forEach(id=>{
    if(id==='orion')S.heroRarity[id]=5;
    else if(id==='aeon')S.heroRarity[id]=6;
    else if(S.heroRarity[id]===undefined)S.heroRarity[id]=0;
    else S.heroRarity[id]=clamp(Math.floor(Number(S.heroRarity[id])||0),0,3);
    H[id].rarity=rankOf(id);H[id].rarityName=labelOf(H[id].rarity);
    if(typeof HC!=='undefined')HC[id]=parseInt(colorOf(H[id].rarity).slice(1),16);
  });
  S.gachaPity=Object.assign({legendary:0,divine:0,ancestral:0,total:0},S.gachaPity||{});
  S.gachaHistory=Array.isArray(S.gachaHistory)?S.gachaHistory:[];
  S.gachaHistory.forEach(x=>{if(!x||!H[x.id])return;x.rank=x.id==='orion'?5:x.id==='aeon'?6:clamp(Math.min(3,Number(x.rank)||0),0,3)});
  save();

  // Existing combat stats included the old hard-coded character tiers. Remove that old factor,
  // then apply the Gacha-assigned tier (or the immutable origin tier for Orion/Aeon).
  const previousStats=stats;
  stats=function(id){
    const s=previousStats(id);if(!s||!H[id])return s;
    const old=BASE_RANK[id]??0,oldM=({0:1,1:1.04,2:1.08,3:1.13,4:1.18,5:1.25,6:1.33})[old]||1;
    s.atk/=oldM;s.hp/=oldM;s.def/=oldM;s.spd/=(1+(oldM-1)*.25);s.crit-=old*.0025;
    const r=rankOf(id),m=MULT[r]||1;
    s.atk*=m;s.hp*=m;s.def*=m;s.spd*=1+(m-1)*.25;s.crit+=r*.0025;
    H[id].rarity=r;H[id].rarityName=labelOf(r);
    return s;
  };

  function pity(){
    S.gachaPity=Object.assign({legendary:0,divine:0,ancestral:0,total:0},S.gachaPity||{});
    ['divine','ancestral','total'].forEach(k=>S.gachaPity[k]=clamp(Math.floor(Number(S.gachaPity[k])||0),0,10000000));
    return S.gachaPity;
  }
  function rollOne(){
    const p=pity(),stage=clamp((Number(S.cleared)||0)+1,1,100),old=RATE_TABLE[band(stage)];
    // Former Legendary odds are folded into Mythic. Only Orion can be Divine; only Aeon Ancestral.
    const weights=[old[0],old[1],old[2],old[3]+old[4],old[5],old[6]];
    let rank;
    if(p.ancestral>=OWL_CONFIG.gacha.ancestralPity-1)rank=6;
    else if(p.divine>=OWL_CONFIG.gacha.divinePity-1)rank=5;
    else rank=RANK_OF_SLOT[weighted(weights)];
    const id=rank===5?'orion':rank===6?'aeon':NORMAL_IDS[Math.floor(R()*NORMAL_IDS.length)];
    const duplicate=S.owned.includes(id);
    if(!duplicate){S.owned.push(id);if(!S.order.includes(id)&&S.order.length<5)S.order.push(id);}
    else if((S.star[id]||0)<5)S.star[id]=(S.star[id]||0)+1;
    else S.shards=(Number(S.shards)||0)+20;
    if(id==='orion')S.heroRarity[id]=5;
    else if(id==='aeon')S.heroRarity[id]=6;
    else S.heroRarity[id]=Math.max(rankOf(id),rank);
    const finalRank=rankOf(id);
    p.total++;p.divine=rank>=5?0:p.divine+1;p.ancestral=rank>=6?0:p.ancestral+1;
    const result={id,rank:finalRank,rolledRank:rank,duplicate,at:Date.now()};
    S.gachaHistory.unshift(result);S.gachaHistory=S.gachaHistory.slice(0,30);
    H[id].rarity=finalRank;H[id].rarityName=labelOf(finalRank);
    return result;
  }

  let autoActive=false,autoTimer=null,autoBatch=0;
  function stopAuto(){autoActive=false;if(autoTimer)clearTimeout(autoTimer);autoTimer=null;const b=document.querySelector('[data-a="autoSummon"]');if(b)b.textContent='✦ AUTO SUMMON';}
  function joinNewHeroes(before){
    const joined=[];
    S.gachaHistory.slice(0,5).reverse().forEach(x=>{if(x&&!x.duplicate&&!before.has(x.id)&&!S.order.includes(x.id)&&S.order.length<5){S.order.push(x.id);joined.push(x.id)}});
    S.order=[...new Set((S.order||[]).filter(id=>S.owned.includes(id)))].slice(0,5);
    return joined;
  }
  function resultsMarkup(results){
    return results.map((r,i)=>{
      // Reveal the rarity rolled on THIS pull, not the hero's already-awakened permanent rarity.
      // A duplicate can keep its best-ever rarity in the roster without falsely showing every pull as Mythic.
      const rank=r.id==='orion'?5:r.id==='aeon'?6:clamp(Number(r.rolledRank??r.rank)||0,0,3),c=colorOf(rank),fx=rank===6?'ancestral':rank===5?'divine':rank===3?'mythic':'';
      return `<article class="pg-result ${fx}" style="--rarity:${c};--delay:${i*110}ms"><div class="pg-orbit"></div><img src="${SP[r.id]}" alt="${H[r.id].n}"><div class="pg-result-copy"><span class="pg-kicker">${rank>=5?'ORIGIN-LOCKED HERO':'GACHA AWAKENING'}</span><b>${H[r.id].n}</b><span class="pg-tier">${labelOf(rank).toUpperCase()}</span><small>${r.duplicate?((S.star[r.id]||0)>=5?'DUPLICATE · +20 SHARDS':'DUPLICATE · STAR UPGRADE'):'NEW RECRUIT'}</small></div><strong class="pg-result-index">${String(i+1).padStart(2,'0')}</strong></article>`;
    }).join('');
  }
  function showReveal(results,automatic){
    const autoControl=automatic?'<button class="pg-stop" data-a="stopAutoSummon">STOP AUTO</button>':'';
    M(`<section class="pg-stage" id="pg-stage"><div class="pg-stars"></div><div class="pg-seal"><div class="pg-seal-ring"></div><div class="pg-seal-core">✦</div></div><div class="pg-pretitle">ASTRAL CONVERGENCE · SUMMONING GATE</div><h2>THE FATE IS SEALED</h2><p>${results.length} ${results.length===1?'soul':'souls'} resonating with the gate</p><button class="pg-reveal-button" type="button">✦ REVEAL YOUR DESTINY ✦</button>${autoControl}<div class="pg-result-list">${resultsMarkup(results)}</div><div class="pg-foot">ORIGIN IS FIXED · GACHA DETERMINES THE AWAKENED RARITY</div></section>`);
    const stage=document.querySelector('#pg-stage'),button=stage&&stage.querySelector('.pg-reveal-button');
    if(button)button.addEventListener('click',()=>{stage.classList.add('is-revealed');if(window.__AWO_GACHA_ROLL_AUDIO)window.__AWO_GACHA_ROLL_AUDIO.stop();if(window.__AWO_GACHA_REVEAL_AUDIO)window.__AWO_GACHA_REVEAL_AUDIO.play()}, {once:true});
    if(automatic&&stage){autoTimer=setTimeout(()=>{if(stage.isConnected){stage.classList.add('is-revealed');if(window.__AWO_GACHA_ROLL_AUDIO)window.__AWO_GACHA_ROLL_AUDIO.stop();if(window.__AWO_GACHA_REVEAL_AUDIO)window.__AWO_GACHA_REVEAL_AUDIO.play()}},950)}
  }
  function perform(count,automatic){
    const n=clamp(count,1,5),cost=n===5?450:n*100;
    if(S.soul<cost)return false;
    if(window.__AWO_GACHA_ROLL_AUDIO)window.__AWO_GACHA_ROLL_AUDIO.start();
    const before=new Set(S.owned);S.soul-=cost;
    const results=[];for(let i=0;i<n;i++)results.push(rollOne());
    const joined=joinNewHeroes(before);save();draw();
    if(joined.length&&B){const st=Math.max(1,Math.min(100,Number(B.stage)||Number(S.sel)||1));startBattle(st,B.dg,B.opp)}
    showReveal(results,automatic);
    return true;
  }

  summonHTML=function(){
    const stage=clamp((Number(S.cleared)||0)+1,1,100),old=RATE_TABLE[band(stage)],p=pity();
    const rates=[old[0],old[1],old[2],old[3]+old[4],old[5],old[6]],ranks=[0,1,2,3,5,6];
    const roster=Object.keys(H).map(id=>{
      const rank=rankOf(id),c=colorOf(rank),owned=S.owned.includes(id),origin=SPECIAL[id]?'BORN '+labelOf(rank).toUpperCase():'COMMON ORIGIN';
      return `<div class="pg-roster-card" style="--rarity:${c}"><div class="pg-portrait"><img src="${SP[id]}" alt="${H[id].n}"></div><div class="pg-roster-info"><b>${H[id].n}</b><span>${owned?labelOf(rank).toUpperCase():origin}</span><small>${H[id].role||H[id].t||'Hero'} · ${owned?'RECRUITED':'UNRECRUITED'}${owned?' · ★'+(S.star[id]||0):''}</small></div><i>${owned?'●':'○'}</i></div>`;
    }).join('');
    const history=S.gachaHistory.slice(0,5).map(x=>{const shown=x.id==='orion'?5:x.id==='aeon'?6:clamp(Number(x.rolledRank??x.rank)||0,0,3);return `<div class="pg-history-row"><img src="${SP[x.id]}"><span>${H[x.id]?.n||x.id}</span><b style="color:${colorOf(shown)}">${labelOf(shown)}</b><small>${x.duplicate?'DUPLICATE':'NEW'}</small></div>`}).join('')||'<div class="pg-muted">No summons recorded yet.</div>';
    return `<div class="pg-shell">
      <section class="pg-hero"><div class="pg-hero-noise"></div><div class="pg-hero-label">OWL GRIDBREAKERS · ASTRAL ARCHIVE</div><div class="pg-title-line"><div><div class="pg-eyebrow">THE GATE BETWEEN FATES</div><h1>ASTRAL <em>GACHA</em></h1><p>Call a hero from the grid. Discover the rarity fate has written for them.</p></div><div class="pg-crystal">✧</div></div><div class="pg-wallet"><span>SOUL CRYSTALS</span><b>◆ ${Number(S.soul)||0}</b><small>Campaign progress · ${S.cleared||0}/100 stages</small></div>
      <div class="pg-pull-grid"><button class="pg-pull pg-one" data-a="summon" data-v="1" ${S.soul<100||autoActive?'disabled':''}><small>SINGLE SUMMON</small><b>CALL ×1</b><span>100 ◆</span></button><button class="pg-pull pg-five" data-a="summon" data-v="5" ${S.soul<450||autoActive?'disabled':''}><small>CONVERGENCE</small><b>CALL ×5</b><span>450 ◆ · SAVE 50</span></button><button class="pg-pull pg-auto" data-a="autoSummon" ${S.soul<100?'disabled':''}><small>${autoActive?'AUTO MODE ACTIVE':'HANDS-FREE SUMMON'}</small><b>${autoActive?'AUTO RUNNING':'✦ AUTO SUMMON'}</b><span>${autoActive?'Press to stop':'Repeats ×5 pulls'}</span></button></div>
      <div class="pg-origin-note"><b>✦ ORIGIN RARITIES ARE IMMUTABLE</b><span>ORION is always Divine · AEON is always Ancestral. Every other hero is Common by birth and can awaken up to Mythic through Gacha.</span></div></section>
      <section class="pg-panel"><div class="pg-panel-heading"><div><span class="pg-eyebrow">THE ODDS OF DESTINY</span><h2>AWAKENING RATES</h2></div><span class="pg-stage-pill">STAGE ${stage}</span></div><div class="pg-rates">${ranks.map((r,i)=>`<div class="pg-rate" style="--rarity:${colorOf(r)}"><span>${labelOf(r)}</span><b>${pct(rates[i])}</b></div>`).join('')}</div><small class="pg-muted">Legendary odds are folded into Mythic. Divine can only summon Orion; Ancestral can only summon Aeon. Rates are fixed per summon and do not increase with campaign progress. Pity guarantees are separate: Divine at ${OWL_CONFIG.gacha.divinePity} pulls and Ancestral at ${OWL_CONFIG.gacha.ancestralPity} pulls.</small></section>
      <section class="pg-pity"><div><span class="pg-eyebrow">FATE WILL NOT FORGET</span><h2>PITY PROTECTION</h2></div><div class="pg-pity-grid"><div><b>${Math.max(0,OWL_CONFIG.gacha.divinePity-p.divine)}</b><span>pulls to Divine · Orion</span></div><div><b>${Math.max(0,OWL_CONFIG.gacha.ancestralPity-p.ancestral)}</b><span>pulls to Ancestral · Aeon</span></div><div><b>${p.total}</b><span>total summons</span></div></div></section>
      <section class="pg-panel"><div class="pg-panel-heading"><div><span class="pg-eyebrow">THE HERO CODEX</span><h2>KNOWN SOULS</h2></div><span class="pg-stage-pill">${S.owned.length}/8 RECRUITED</span></div><div class="pg-roster">${roster}</div></section>
      <section class="pg-panel"><div class="pg-panel-heading"><div><span class="pg-eyebrow">RECENT RESONANCE</span><h2>SUMMON HISTORY</h2></div></div><div class="pg-history">${history}</div></section>
      <section class="pg-gear-note"><b>⚒ EQUIPMENT RARITY IS SEPARATE</b><span>Equipment can roll through every tier up to Ancestral. Character Gacha never gives other heroes Divine or Ancestral rarity.</span></section>
      <div class="pg-squad-note">ACTIVE SQUAD · ${(S.order||[]).length}/5 · Newly recruited heroes fill the next open squad slot automatically.</div>
    </div>`;
  };

  act.summon=function(n){stopAuto();perform(Number(n)===5?5:1,false)};
  function autoStep(){
    if(!autoActive)return;
    let n=S.soul>=450?5:S.soul>=100?1:0;
    if(!n){stopAuto();draw();return}
    autoBatch++;const ok=perform(n,true);
    if(!ok){stopAuto();draw();return}
    autoTimer=setTimeout(()=>{
      if(!autoActive)return;
      const stage=document.querySelector('#pg-stage');if(stage)stage.classList.add('is-revealed');
      autoTimer=setTimeout(()=>{if(!autoActive)return;autoStep()},1450);
    },1100);
  }
  act.autoSummon=function(){
    if(autoActive){stopAuto();draw();return}
    if((Number(S.soul)||0)<100)return;
    autoActive=true;autoBatch=0;draw();autoStep();
  };
  act.stopAutoSummon=function(){stopAuto();if(window.__AWO_GACHA_ROLL_AUDIO)window.__AWO_GACHA_ROLL_AUDIO.stop();draw();M('<div class="pg-auto-stopped"><div class="pg-seal-core">✦</div><h2>AUTO SUMMON PAUSED</h2><p>Your remaining Soul Crystals are safe. You can resume whenever you wish.</p></div>')};

  // Keep the equipment tiers untouched: the eight existing gear tiers already end at Ancestral.
  // Update every existing rarity display to use the Gacha-assigned rarity, not the old birth tier.
  function paintDynamic(root=document){
    root.querySelectorAll('.pr,.skb,.pp,.hc,.cc,[data-hero-id]').forEach(el=>{
      let id=el.id&&el.id.startsWith('pr-')?el.id.slice(3):el.id&&el.id.startsWith('sk-')?el.id.slice(3):el.dataset.heroId||el.dataset.v;
      if(!H[id]){const im=el.matches('img')?el:el.querySelector('img');if(im&&im.alt)id=Object.keys(H).find(k=>H[k].n===im.alt)}
      if(!H[id])return;
      // In Characters, rarity belongs to the full outer card. Strip the inner portrait frame.
      if(el.classList.contains('pp')&&el.closest('.hc,.cc')){el.classList.remove('hero-aura-frame');return;}
      const r=rankOf(id),c=colorOf(r);el.dataset.rank=String(r);el.dataset.rarity=labelOf(r);el.style.setProperty('--hero-aura',c);
      if(r>0)el.classList.add('hero-aura-frame');else el.classList.remove('hero-aura-frame');
      if(el.classList.contains('hc')||el.classList.contains('cc'))el.style.borderColor=r?c:'';
      const im=el.matches('img')?el:el.querySelector('img');if(im)im.style.filter=r?`drop-shadow(0 0 ${r>=5?12:8}px ${c})`:'drop-shadow(0 0 6px #000)';
    });
  }
  const oldDraw=draw;draw=function(){oldDraw.apply(this,arguments);try{paintDynamic(document)}catch(e){}};
  const oldRender=render;render=function(){oldRender.apply(this,arguments);try{paintDynamic(document)}catch(e){}};
  const oldChars=charsHTML;charsHTML=function(){let html=oldChars();Object.keys(H).forEach(id=>{const name=`<b>${H[id].n}</b>`,tag=`<span class="pg-inline-rarity" style="--rarity:${colorOf(rankOf(id))}">${labelOf(rankOf(id)).toUpperCase()}</span>`;html=html.replaceAll(name,name+' '+tag)});return html};
  const oldHeroM=heroM;heroM=function(id){oldHeroM(id);try{const box=document.querySelector('#modal>div');if(!box||!H[id])return;const old=box.querySelector('.hero-rarity-label');if(old)old.remove();const tag=document.createElement('span');tag.className='rarity-pill hero-rarity-label';tag.style.setProperty('--hero-aura',colorOf(rankOf(id)));tag.textContent=labelOf(rankOf(id)).toUpperCase();const title=box.querySelector('.ph b,.pg b,.hc b');if(title)title.insertAdjacentElement('afterend',tag)}catch(e){}};

  const style=document.createElement('style');style.id='awo-premium-gacha-v2-style';style.textContent=`
  .pg-inline-rarity{display:inline-block;margin-left:4px;padding:2px 5px;border:1px solid var(--rarity);border-radius:8px;color:var(--rarity);font-size:7px;font-weight:950;letter-spacing:.5px;vertical-align:middle}.pg-shell{display:grid;gap:12px;padding-bottom:16px;color:#f5f2ff}.pg-shell *{box-sizing:border-box}.pg-hero{position:relative;overflow:hidden;padding:18px;border:1px solid #8e75c966;border-radius:20px;background:radial-gradient(ellipse at 80% 5%,#6e4fa766,transparent 45%),radial-gradient(ellipse at 10% 90%,#174b6177,transparent 48%),linear-gradient(145deg,#171326,#0b1020 70%);box-shadow:0 12px 34px #0008,inset 0 0 30px #b78cff12}.pg-hero-noise,.pg-stars{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(#fff8 1px,transparent 1px),radial-gradient(#9befff77 1px,transparent 1px);background-size:43px 43px,67px 67px;background-position:0 0,19px 28px;opacity:.22}.pg-hero-label,.pg-eyebrow,.pg-kicker{font-size:9px;font-weight:950;letter-spacing:2px;color:#a8c8e8}.pg-title-line{position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0}.pg-title-line h1{font-size:clamp(26px,6vw,42px);line-height:1;margin:5px 0;letter-spacing:2px}.pg-title-line h1 em{font-style:normal;color:#d7b2ff;text-shadow:0 0 18px #a76aff99}.pg-title-line p{font-size:11px;color:#b8b5ca;margin:7px 0;max-width:300px}.pg-crystal{font-size:66px;color:#a9e9ff;text-shadow:0 0 12px #65caff,0 0 34px #a76aff;animation:pgFloat 3s ease-in-out infinite}.pg-wallet{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #bba0ef55;border-radius:12px;background:#080b18a8}.pg-wallet span{font-size:9px;letter-spacing:1.2px;color:#a9a3c2;font-weight:900}.pg-wallet b{margin-left:auto;color:#ffe39a;font-size:17px}.pg-wallet small{font-size:9px;color:#9994ae}.pg-pull-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.pg-pull{min-height:74px;padding:10px;border:1px solid #9074c9;border-radius:13px;background:linear-gradient(145deg,#33274f,#15182b);color:#f8f4ff;text-align:left;cursor:pointer;box-shadow:inset 0 1px #ffffff18,0 5px 16px #0005;transition:.2s}.pg-pull:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.18)}.pg-pull:disabled{opacity:.38;cursor:not-allowed}.pg-pull small,.pg-pull span{display:block;font-size:8px;letter-spacing:1.2px;color:#b8b0ce}.pg-pull b{display:block;font-size:16px;letter-spacing:.7px;margin:4px 0}.pg-pull span{color:#f8d98b}.pg-five{background:linear-gradient(145deg,#46345e,#1b1a31);border-color:#d6b16b}.pg-auto{grid-column:1/-1;min-height:56px;text-align:center;background:linear-gradient(100deg,#12384a,#292047,#51305e);border-color:#62d9eb}.pg-auto b{color:#b6f5ff}.pg-origin-note,.pg-gear-note{display:grid;gap:4px;margin-top:10px;padding:10px 12px;border:1px solid #d6b16b55;border-radius:11px;background:#171628aa}.pg-origin-note b,.pg-gear-note b{font-size:9px;letter-spacing:1.1px;color:#f6d98e}.pg-origin-note span,.pg-gear-note span{font-size:10px;line-height:1.5;color:#c6c2d7}.pg-panel,.pg-pity{padding:14px;border:1px solid #71628b66;border-radius:16px;background:linear-gradient(145deg,#171529ed,#0e1322ed);box-shadow:inset 0 1px #ffffff0c}.pg-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.pg-panel-heading h2,.pg-pity h2{font-size:15px;letter-spacing:1.5px;margin:3px 0;color:#f4efff}.pg-stage-pill{font-size:8px;font-weight:900;letter-spacing:1px;color:#a9e9ff;border:1px solid #55cde766;border-radius:30px;padding:5px 8px}.pg-rates{display:grid;grid-template-columns:1fr 1fr;gap:5px 14px}.pg-rate{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border-left:2px solid var(--rarity);background:linear-gradient(90deg,color-mix(in srgb,var(--rarity) 13%,transparent),transparent);font-size:10px}.pg-rate span{color:var(--rarity);font-weight:900}.pg-rate b{color:#f8f4ff}.pg-muted{display:block;margin-top:9px;font-size:9px;line-height:1.5;color:#9895ad}.pg-pity-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.pg-pity-grid div{padding:9px 5px;text-align:center;border:1px solid #a38acb44;border-radius:10px;background:#0a0d1c}.pg-pity-grid b{display:block;font-size:20px;color:#ffe39a}.pg-pity-grid span{display:block;font-size:8px;line-height:1.35;color:#b9b2cd}.pg-roster{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pg-roster-card{display:flex;align-items:center;gap:7px;min-width:0;padding:7px;border:1px solid color-mix(in srgb,var(--rarity) 45%,#302943);border-radius:11px;background:linear-gradient(120deg,color-mix(in srgb,var(--rarity) 12%,#141425),#101323)}.pg-portrait{width:44px;height:48px;flex:0 0 44px;display:grid;place-items:center;border-radius:8px;background:radial-gradient(circle,color-mix(in srgb,var(--rarity) 25%,#222039),#10101b);overflow:hidden}.pg-portrait img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 5px var(--rarity))}.pg-roster-info{display:grid;gap:2px;min-width:0}.pg-roster-info b{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pg-roster-info span{font-size:8px;font-weight:950;letter-spacing:.7px;color:var(--rarity)}.pg-roster-info small{font-size:7px;color:#a5a1b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pg-roster-card>i{margin-left:auto;font-style:normal;color:var(--rarity);font-size:11px}.pg-history{display:grid;gap:5px}.pg-history-row{display:flex;align-items:center;gap:8px;padding:5px 7px;border-bottom:1px solid #ffffff0c;font-size:9px}.pg-history-row img{width:30px;height:32px;object-fit:contain}.pg-history-row span{flex:1}.pg-history-row small{color:#9992b0}.pg-squad-note{text-align:center;padding:9px;border:1px solid #54d69a55;border-radius:10px;background:#12342655;color:#aef2d0;font-size:9px;font-weight:900;letter-spacing:1px}
  .pg-stage{position:relative;overflow:hidden;min-height:270px;padding:24px 14px 16px;border:1px solid #a58bdd;border-radius:18px;text-align:center;background:radial-gradient(ellipse at 50% 15%,#513d78,#17152a 50%,#080d19);color:#f8f4ff}.pg-stage h2{font-size:20px;letter-spacing:3px;margin:8px 0}.pg-stage>p{font-size:10px;color:#bcb5d2}.pg-seal{position:relative;width:82px;height:82px;margin:0 auto 10px;display:grid;place-items:center}.pg-seal-ring{position:absolute;inset:0;border:1px solid #b9a0ff;border-radius:50%;box-shadow:0 0 20px #a78bfa88,inset 0 0 18px #a78bfa55;animation:pgSpin 8s linear infinite}.pg-seal-ring:before,.pg-seal-ring:after{content:'';position:absolute;inset:8px;border:1px dashed #6ce6f5;border-radius:50%;transform:rotate(45deg)}.pg-seal-ring:after{inset:17px;border-style:solid;transform:rotate(-25deg)}.pg-seal-core{font-size:32px;color:#ffe39a;text-shadow:0 0 16px #ffe39a,0 0 32px #8e70ff}.pg-pretitle{font-size:8px;letter-spacing:2px;color:#a8eaff;font-weight:900}.pg-reveal-button,.pg-stop{position:relative;z-index:2;margin:12px 4px 4px;padding:11px 16px;border:1px solid #f3d58a;border-radius:30px;background:linear-gradient(100deg,#7454a6,#2b5471);color:#fff;font-size:10px;font-weight:950;letter-spacing:1px;cursor:pointer;box-shadow:0 0 18px #b89aff55}.pg-stop{border-color:#e58d9a;background:#542538}.pg-result-list{display:grid;gap:7px;max-height:0;opacity:0;overflow:hidden;transition:max-height .8s ease,opacity .6s ease;margin-top:0}.pg-stage.is-revealed .pg-result-list{max-height:900px;opacity:1;margin-top:14px}.pg-stage.is-revealed .pg-seal{transform:scale(.65);margin-top:-10px;margin-bottom:0;transition:.6s}.pg-stage.is-revealed .pg-reveal-button{display:none}.pg-result{position:relative;display:flex;align-items:center;gap:10px;overflow:hidden;padding:8px;border:1px solid var(--rarity);border-radius:12px;text-align:left;background:radial-gradient(ellipse at 15% 50%,color-mix(in srgb,var(--rarity) 26%,#17152a),#111321 72%);box-shadow:0 0 16px color-mix(in srgb,var(--rarity) 35%,transparent);opacity:0;transform:translateY(12px) scale(.97)}.is-revealed .pg-result{animation:pgCardReveal .55s var(--delay) both}.pg-result img{width:66px;height:72px;object-fit:contain;z-index:1;filter:drop-shadow(0 0 10px var(--rarity))}.pg-result-copy{display:grid;gap:2px;z-index:1}.pg-result-copy b{font-size:15px}.pg-kicker{font-size:7px;color:#bcb6d4}.pg-tier{width:max-content;padding:3px 7px;border:1px solid var(--rarity);border-radius:20px;color:var(--rarity);font-size:9px;font-weight:950;letter-spacing:1px}.pg-result-copy small{font-size:8px;color:#b8b2ca}.pg-result-index{margin-left:auto;align-self:flex-start;font-size:9px;color:#ffffff55}.pg-result.mythic{box-shadow:0 0 18px #ef444466}.pg-result.divine{box-shadow:0 0 22px #f6c85f88,inset 0 0 20px #f6c85f22}.pg-result.ancestral{box-shadow:0 0 28px #5be7eeaa,inset 0 0 22px #5be7ee33;animation:pgCardReveal .65s var(--delay) both,pgAncestral 1.5s ease-in-out infinite alternate}.pg-foot{margin-top:12px;font-size:7px;letter-spacing:1.4px;color:#8c88a8}.pg-auto-stopped{text-align:center;padding:25px;background:radial-gradient(circle at top,#43315f,#101323);border:1px solid #b18de9;border-radius:16px;color:#f8f4ff}.pg-auto-stopped p{font-size:11px;color:#bcb5d2}
  @keyframes pgSpin{to{transform:rotate(360deg)}}@keyframes pgFloat{50%{transform:translateY(-7px) rotate(7deg)}}@keyframes pgCardReveal{to{opacity:1;transform:none}}@keyframes pgAncestral{to{filter:brightness(1.2);box-shadow:0 0 36px #5be7eecc,inset 0 0 25px #5be7ee55}}
  @media(max-width:430px){.pg-roster{grid-template-columns:1fr}.pg-wallet{flex-wrap:wrap}.pg-wallet small{width:100%;margin-left:0}.pg-pull-grid{grid-template-columns:1fr 1fr}.pg-pull b{font-size:14px}.pg-pity-grid span{font-size:7px}}
  `;document.head.appendChild(style);
  draw();
  console.info('[AWO] premium Gacha: Common-origin heroes, Mythic cap, fixed Divine Orion, fixed Ancestral Aeon, auto summon and reveal animation loaded');
})();
