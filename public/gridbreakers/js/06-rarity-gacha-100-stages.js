/* ===== AI WORLD OWL: RARITY, GACHA, 100 STAGES, AUTO EQUIP & SALVAGE ===== */
(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const CHAR_RARITIES=['Common','Uncommon','Rare','Mythic','Legendary','Divine','Ancestral'];
  const CHAR_COLORS=['#9aa0aa','#25c56e','#2753a5','#ef4444','#f0d34a','#d9a52b','#16c9d5'];
  const CHAR_BONUS=[1,1.04,1.08,1.13,1.18,1.25,1.33];
  const CHAR_RANK={kai:0,kira:1,lyra:2,jax:3,titan:4,aeon:4,orion:5,vex:6};
  const CHAR_RATE_TABLE=[
    [55,27,12,4,1.5,.4,.1],
    [52,27,13,5,2,.8,.2],
    [49,27,14,6,3,.8,.2],
    [46,27,15,7,4,.8,.2],
    [44,26,16,8,4.5,1.2,.3],
    [42,25,17,9,5.5,1.2,.3]
  ];
  // Gear tiers are ordered Common → Ancestral; each higher tier is rarer.
  // Values are the existing band percentages with the Legendary/Mythic columns corrected.
  const GEAR_RATE_TABLE=[
    [50,25,15,7,2.5,.45,.049,.001],
    [44,25,16,9,4,1.5,.45,.05],
    [38,24,17,10,7,3,.9,.1],
    [33,23,18,11,9,4,1.7,.3],
    [29,22,18,12,10,6,2.5,.5],
    [25,20,18,13,12,8,3.5,.5]
  ];
  const GEAR_BASE_GOLD=[15,30,60,120,240,480,960,1920];
  const BOSS_NAMES=[
    'Ouro, Devourer of Code','Thread Matriarch','Kaldra Sun-Eater','Strix Iron Oracle',
    'Ashborn Colossus','Silent Warden','Obsidian Gatekeeper','Sanctum Seraph',
    'The Corrupted Grid','Ouro, Eternal Devourer'
  ];
  const REGION_MAPS=[
    ['Thread Canopy','Whispering Web','Silkroot Passage','The Living Loom','Amber Nest','Veiled Branches','Weaver Hollow','Resonant Grove','The Spindle Court','Heart of the Thread'],
    ['Glasswind Expanse','Singing Dunes','Buried Caravan','Sunscar Basin','The Shifting Maw','Obsidian Mirage','Scorpion Crown','Mirage of Kings','The Burning Rift','Kaldra Sunwell'],
    ['Broken Landing','Scrapfall Ridge','Rust Cathedral','The Shattered Hangar','Wreckage Fields','Titan’s Grave','The Black Flight Deck','Engine of Ruin','The Last Airlock','Strix Core'],
    ['Cinder Road','Ashen Causeway','Emberwatch','The Furnace March','Charred Reliquary','Pyre Valley','Ashen Throne','The Molten Crossing','Crown of Cinders','Ashborn Heart'],
    ['Mute Threshold','Hollow Signal','The Hushed Vault','Echo-Less Hall','Forgotten Frequency','The Still Engine','Pale Corridor','The Last Whisper','Silent Sanctum','The Quiet Core'],
    ['Outer Obsidia','Blackstone Rampart','Violet Bastion','The Broken Seal','Nightglass Bridge','Obsidian Crucible','The Umbral Gate','Crown of the Order','The Final Rampart','Obsidia Heart'],
    ['First Stair','Pilgrim’s Ascent','Celestial Causeway','The Ivory Steps','Astral Vestibule','Sanctuary of Dust','The Golden Nave','Ascendant Gallery','The Last Benediction','Sanctum Crown'],
    ['Glitch Frontier','Fractured Memory','Nullstorm Fields','The Redacted City','Corruption Wells','Broken Protocol','The Unmaking','Error Cathedral','The Last Exception','Grid Singularity'],
    ['Eternal Threshold','Ancient Kernel','Marble Wastes','The First Archive','Cyan Dominion','Throne of Origins','The Source Labyrinth','Ancestral Expanse','The Obsidian Eternity','The Eternal Obsidian Realm']
  ];
  const stageBand=s=>s<=10?0:s<=30?1:s<=50?2:s<=70?3:s<=90?4:5;
  const rarityColor=(rank)=>CHAR_COLORS[clamp(rank,0,6)];
  const rarityLabel=(rank)=>CHAR_RARITIES[clamp(rank,0,6)];
  const percent=n=>(Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:3})+'%';
  const getGachaRates=s=>CHAR_RATE_TABLE[stageBand(s)];
  const getGearRates=s=>GEAR_RATE_TABLE[stageBand(s)];
  const sample=(weights)=>{
    const total=weights.reduce((a,b)=>a+b,0); let roll=R()*total;
    for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0)return i}
    return weights.length-1;
  };

  // Extend the existing equipment rarity arrays without changing legacy indices.
  if(RAR.length<8){RAR.push('Divine','Ancestral')}
  if(RC.length<8){RC.push('#d9a52b','#16c9d5')}
  if(RM.length<8){RM.push(5.5,7.5)}
  RC[0]='#9aa0aa';RC[1]='#25c56e';RC[2]='#2753a5';RC[3]='#b25cff';
  RC[4]='#f0d34a';RC[5]='#ef4444';RC[6]='#d9a52b';RC[7]='#16c9d5';
  // Intrinsic rarity belongs to each hero and is not lost when loading an old save.
  Object.keys(H).forEach(id=>{H[id].rarity=CHAR_RANK[id]??0;H[id].rarityName=rarityLabel(H[id].rarity)});
  if(typeof HC!=='undefined')Object.keys(H).forEach(id=>{HC[id]=parseInt(rarityColor(H[id].rarity).slice(1),16)});

  // Append stages 11-100. The original ten stages and old progress are preserved.
  if(STAGES.length<100){
    for(let region=0;region<REGION_MAPS.length;region++){
      REGION_MAPS[region].forEach(name=>STAGES.push(name));
    }
  }
  // Data migration is additive. Never reset existing currency, heroes, gear or progress.
  S.gachaPity=Object.assign({legendary:0,divine:0,ancestral:0,total:0},S.gachaPity||{});
  S.gachaHistory=Array.isArray(S.gachaHistory)?S.gachaHistory:[];
  S.cleared=clamp(Number(S.cleared)||0,0,100);
  S.sel=clamp(Number(S.sel)||1,1,Math.min(100,S.cleared+1));
  S.inv=Array.isArray(S.inv)?S.inv:[];
  S.inv.forEach(it=>{it.r=clamp(Number(it.r)||0,0,7);it.lv=clamp(Number(it.lv)||0,0,10)});
  save();

  // Intrinsic character rarity contributes to combat stats, while level and gear stay intact.
  const _statsRarity=stats;
  stats=function(id){
    const s=_statsRarity(id),rank=CHAR_RANK[id]??0,m=CHAR_BONUS[rank];
    s.atk*=m;s.hp*=m;s.def*=m;s.spd*=1+(m-1)*.25;s.crit+=rank*.0025;
    return s;
  };

  // Replace the old six-tier gear roll with the progressive eight-tier table.
  rollItem=function(stage,minR=0,fs){
    stage=clamp(Math.floor(Number(stage)||1),1,100);minR=clamp(Math.floor(Number(minR)||0),0,7);
    const weights=getGearRates(stage).slice();
    for(let i=0;i<minR;i++){weights[minR]+=weights[i];weights[i]=0}
    const r=sample(weights),slot=fs||rnd(SLOTS),main=MAIN[slot];
    const pool=Object.keys(T).filter(k=>k!==main),subs=[],subCount=[0,1,2,2,3,3,4,5][r];
    for(let n=0;n<subCount;n++){
      const available=pool.filter(p=>!subs.some(x=>x.k===p));
      if(!available.length)break;
      subs.push({k:rnd(available),w:.4+R()*.3});
    }
    const it={id:S.nid++,slot,r,set:rnd(SETS),st:stage,lv:0,main,subs,eq:null};
    S.inv.push(it);return it;
  };

  // More enemy variety and a region boss every ten campaign stages.
  Object.assign(E,{
    nullweaver:{n:'Null Weaver',e:'🕷️',hp:260,atk:42,def:12,spd:105},
    dunecrusher:{n:'Dune Crusher',e:'🦂',hp:390,atk:38,def:20,spd:65},
    scrapwraith:{n:'Scrap Wraith',e:'⚙️',hp:310,atk:48,def:12,spd:95},
    ashbrute:{n:'Ashborn Brute',e:'🔥',hp:460,atk:50,def:24,spd:70},
    hushstalker:{n:'Hush Stalker',e:'🌑',hp:350,atk:58,def:16,spd:125},
    obsidianguard:{n:'Obsidian Guard',e:'🛡️',hp:560,atk:54,def:32,spd:72},
    sanctumshade:{n:'Sanctum Shade',e:'✨',hp:430,atk:64,def:18,spd:110},
    gridphantom:{n:'Grid Phantom',e:'👁️',hp:500,atk:72,def:22,spd:135},
    ancestralhusk:{n:'Ancestral Husk',e:'💠',hp:680,atk:78,def:35,spd:90}
  });
  spawn=function(b){
    const s=clamp(Math.floor(b.stage||1),1,100),isCampaignBoss=!b.dg&&s%10===0&&b.wave===32;
    const k=1+.28*(s-1),ka=1+.22*(s-1),region=Math.ceil(s/10);
    let pool=['wraith','raider'];
    if(s>=3)pool.push('drone');if(s>=5)pool.push('stalker');if(s>=7)pool.push('knight');
    if(s>=11)pool.push('nullweaver');if(s>=21)pool.push('dunecrusher');if(s>=31)pool.push('scrapwraith');
    if(s>=41)pool.push('ashbrute');if(s>=51)pool.push('hushstalker');if(s>=61)pool.push('obsidianguard');
    if(s>=71)pool.push('sanctumshade');if(s>=81)pool.push('gridphantom');if(s>=91)pool.push('ancestralhusk');
    const count=Math.min(5,2+(b.wave>0?1:0)+(s>5?1:0)+(region>=6?1:0));
    const list=isCampaignBoss||b.dg==='raid'?['ouro']:Array.from({length:count},()=>rnd(pool));
    b.enemies=b.dg==='arena'?b.opp.team.map((id,i)=>mkFoe(id,i,b.opp.lv)):
      list.map((t,i)=>{const e=E[t];return{uid:'e'+b.wave+'-'+i+'-'+s,id:t,team:1,pos:i,n:e.n,e:e.e,boss:e.boss,max:e.hp*k,hp:e.hp*k,atk:e.atk*ka,def:e.def*(1+.1*(s-1)),spd:e.spd,crit:.05,cdm:1.5,sh:0,stun:0,atkT:R()*1.5,skT:99,dead:0}});
    if(isCampaignBoss){
      const boss=b.enemies[0],idx=Math.max(0,Math.floor(s/10)-1);
      boss.boss=1;boss.n=BOSS_NAMES[idx]||BOSS_NAMES[9];boss.max*=1.25+region*.045;boss.hp=boss.max;boss.atk*=1.15+region*.035;
      b.kind=idx===9?'DEVOURER RAGE':idx>=7?'CORRUPTION STORM':idx>=4?'TAIL ANNIHILATION':idx>=2?'VOID BREATH':'SERPENT STRIKE';
    }
    if(b.dg==='raid')b.enemies.forEach(e=>{e.boss=1;e.max=e.hp=1e7;e.n='Ouro, Devourer of Code'});
    b.pulse=7;b.enr=0;
    if(typeof applyWaveRecovery==='function')applyWaveRecovery(b);else b.allies.forEach(a=>{if(a.dead){a.dead=0;a.hp=a.max*.35}else a.hp=Math.min(a.max,a.hp+a.max*.25);a.sh=0});
    b.built='';
  };

  // Stage rewards and equipment drop chances scale through the full campaign.
  win=function(b){
    if(b.dg)return dgWin(b);
    const s=clamp(Math.floor(b.stage||1),1,100),boss=s%10===0;
    S.cnt.w++;
    const r={gold:40*s+Math.floor(R()*20*s),xp:30*s,shards:1+(s%3===0?2:0)+(boss?5:0),items:[],extra:''};
    S.gold+=r.gold;S.shards+=r.shards;S.soul+=boss?30:3;r.extra=' · +'+(boss?30:3)+'💎';
    S.owned.forEach(h=>addXp(h,r.xp));
    const dropChance=Math.min(.82,.45+.27*((s-1)/99));
    if(R()<dropChance||boss){
      const minR=boss?(s>=90?5:s>=60?4:3):0;
      r.items.push(rollItem(s,minR));
    }
    if(boss){
      if(R()<.55)r.items.push(rollItem(s,s>=90?5:s>=60?4:3));
      r.extra+=' · REGION BOSS +5🔷';
    }
    if(s>S.cleared)S.cleared=s;
    save();return r;
  };

  afkCalc=function(){
    const min=Math.min(1440,Math.max(0,(Date.now()-S.afk)/60000)),f=cl(S.cleared+1,1,100),k=1+.12*(f-1);
    return{min,f,gold:Math.floor(min*25*k),xp:Math.floor(min*12*k),shards:Math.floor(min*.4*k),items:Math.min(30,Math.floor(min/45))};
  };
  const _startBattleRarity=startBattle;
  startBattle=function(s,dg,opp){s=clamp(Math.floor(Number(s)||1),1,100);return _startBattleRarity(s,dg,opp)};

  // Character Gacha rates depend on the highest campaign stage cleared (not the selected stage).
  function currentGachaStage(){return clamp((Number(S.cleared)||0)+1,1,100)}
  function pityState(){
    S.gachaPity=Object.assign({legendary:0,divine:0,ancestral:0,total:0},S.gachaPity||{});
    ['legendary','divine','ancestral','total'].forEach(k=>S.gachaPity[k]=clamp(Math.floor(Number(S.gachaPity[k])||0),0,10000000));
    return S.gachaPity;
  }
  function rollCharacter(){
    const p=pityState(),stage=currentGachaStage(),rates=getGachaRates(stage);
    let rank;
    if(p.ancestral>=OWL_CONFIG.gacha.ancestralPity-1)rank=6;
    else if(p.divine>=OWL_CONFIG.gacha.divinePity-1)rank=5;
    else if(p.legendary>=99)rank=4;
    else rank=sample(rates);
    const candidates=Object.keys(H).filter(id=>(CHAR_RANK[id]??0)===rank);
    const id=rnd(candidates.length?candidates:Object.keys(H));
    p.total++;
    p.legendary=rank>=4?0:p.legendary+1;
    p.divine=rank>=5?0:p.divine+1;
    p.ancestral=rank>=6?0:p.ancestral+1;
    const duplicate=S.owned.includes(id);
    if(duplicate){if((S.star[id]||0)<5)S.star[id]=(S.star[id]||0)+1;else S.shards+=20}
    else S.owned.push(id);
    const result={id,rank,duplicate,at:Date.now()};
    S.gachaHistory.unshift(result);S.gachaHistory=S.gachaHistory.slice(0,30);
    return result;
  }
  summonHTML=function(){
    const stage=currentGachaStage(),rates=getGachaRates(stage),p=pityState();
    const rows=CHAR_RARITIES.map((name,i)=>`<div class="rarity-rate"><span style="color:${CHAR_COLORS[i]}">${name}</span><b>${percent(rates[i])}</b></div>`).join('');
    const heroes=Object.keys(H).sort((a,b)=>(CHAR_RANK[a]??0)-(CHAR_RANK[b]??0)).map(id=>{
      const rank=CHAR_RANK[id]??0,owned=S.owned.includes(id);
      return`<div class="card hc" data-hero-id="${id}" style="border-color:${rarityColor(rank)};--hero-aura:${rarityColor(rank)}">${spr(id)}<div style="flex:1"><b>${H[id].n}</b><div class="rarity-pill" style="--hero-aura:${rarityColor(rank)}">${rarityLabel(rank)}</div><div class="mu">${H[id].t} · ${H[id].role}</div><div>${owned?'Owned ★'+(S.star[id]||0):'Not recruited'}</div></div></div>`;
    }).join('');
    const history=S.gachaHistory.slice(0,6).map(x=>`<div class="st"><span style="color:${CHAR_COLORS[x.rank]}">${H[x.id]?.n||x.id} · ${rarityLabel(x.rank)}</span><span class="mu">${x.duplicate?'Duplicate':'New hero'}</span></div>`).join('')||'<span class="mu">No summons yet.</span>';
    return`<div class="card summon-card"><b>✦ Cosmic Summoning</b><div class="mu">${S.soul} Soul Crystals · Highest cleared stage ${S.cleared}/100 · Rates are fixed per summon and do not increase with campaign progress. Pity guarantees are separate: Divine at ${OWL_CONFIG.gacha.divinePity} pulls and Ancestral at ${OWL_CONFIG.gacha.ancestralPity} pulls.</div><div class="row"><button class="pri" data-a="summon" data-v="1" ${S.soul<100?'disabled':''}>SUMMON ×1 · 100💎</button><button class="pri" data-a="summon" data-v="5" ${S.soul<450?'disabled':''}>SUMMON ×5 · 450💎</button></div></div>
      <div class="card"><b>Character rarity probabilities · Stage ${stage}</b><div class="rarity-rate-list">${rows}</div><div class="mu" style="margin-top:6px">Percentages are per pull and total exactly 100%. The active rate bracket is based on stages already cleared.</div></div>
      <div class="card"><b>Guaranteed summons · Pity</b><div class="st"><span>Legendary or higher</span><b>${Math.max(0,100-p.legendary)} pulls left</b></div><div class="st"><span>Divine or higher</span><b>${Math.max(0,OWL_CONFIG.gacha.divinePity-p.divine)} pulls left</b></div><div class="st"><span>Ancestral</span><b>${Math.max(0,OWL_CONFIG.gacha.ancestralPity-p.ancestral)} pulls left</b></div><div class="mu">Counters are saved locally. Obtaining the guaranteed tier or a higher tier resets that tier's counter.</div></div>
      <div class="card"><b>Available heroes</b><div class="mu">The hero's rarity is permanent. Duplicates grant ★ upgrades up to 5; extra duplicates grant 20 shards.</div></div>${heroes}
      <div class="card"><b>Recent summons</b>${history}</div>`;
  };
  act.summon=function(n){
    n=Number(n)===5?5:1;const cost=n===1?100:450;if(S.soul<cost)return;
    S.soul-=cost;const results=[];for(let i=0;i<n;i++)results.push(rollCharacter());
    save();draw();
    M(`<div class="gacha-results"><h3>✦ SUMMON RESULTS ✦</h3>${results.map(r=>{
      const c=rarityColor(r.rank),fx=r.rank>=6?'ancestral-reveal':r.rank>=5?'divine-reveal':r.rank>=4?'legendary-reveal':'';
      return`<div class="gacha-reveal ${fx}" style="--hero-aura:${c};border-color:${c}"><div class="gacha-glow"></div><img src="${SP[r.id]}" alt="${H[r.id].n}"><div><b>${H[r.id].n}</b><div class="rarity-pill">${rarityLabel(r.rank).toUpperCase()}</div><div class="mu">${r.duplicate?'DUPLICATE · ★ / SHARDS':'NEW HERO RECRUITED'}</div></div></div>`;
    }).join('')}<div class="mu" style="text-align:center;margin-top:8px">Pity progress saved · ${S.gachaPity.total} total summons</div></div>`);
  };

  // Eight-tier equipment presentation and fusion controls.
  const _forgeHtmlR=forgeHTML;
  forgeHTML=function(){return _forgeHtmlR().replace(/\[0,1,2,3\]/g,'[0,1,2,3,4,5,6]')};

  // Aura styling: portrait frame, battle HUD, team skill buttons and character panels.
  const style=document.createElement('style');
  style.textContent=`
    .hero-aura-frame{position:relative;isolation:isolate;border-radius:12px;box-shadow:0 0 0 1px var(--hero-aura),0 0 12px color-mix(in srgb,var(--hero-aura) 65%,transparent),inset 0 0 12px color-mix(in srgb,var(--hero-aura) 24%,transparent);animation:heroAuraPulse 2.8s ease-in-out infinite}
    .hero-aura-frame[data-rank="0"]{box-shadow:none;animation:none}
    .hero-aura-frame img{position:relative;z-index:1;filter:drop-shadow(0 0 5px var(--hero-aura))}
    .hero-aura-frame[data-rank="0"] img{filter:drop-shadow(0 0 6px #000)}
    .rarity-pill{display:inline-block;font-size:9px;font-weight:900;letter-spacing:1px;color:var(--hero-aura);border:1px solid var(--hero-aura);border-radius:999px;padding:2px 7px;margin:3px 0;text-shadow:0 0 8px var(--hero-aura);box-shadow:0 0 9px color-mix(in srgb,var(--hero-aura) 42%,transparent)}
    .rarity-rate-list{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-top:8px}.rarity-rate{display:flex;justify-content:space-between;border-bottom:1px solid #322650;padding:4px 0;font-size:12px}
    .pr.hero-aura-frame,.skb.hero-aura-frame{overflow:visible;z-index:4}.pr.hero-aura-frame img,.skb.hero-aura-frame img{border-radius:50%}
    .hero-aura-frame[data-rank="6"]{animation:ancestralPulse 1.8s ease-in-out infinite}
    .hero-aura-frame[data-rank="5"]{animation:divinePulse 2s ease-in-out infinite}
    .eqi.r6,.eqi.r7{box-shadow:0 0 14px var(--c)}
    .eqi.r6{animation:divineGear 2.8s ease-in-out infinite;border-color:#d9a52b}
    .eqi.r7{animation:ancestralGear 2.2s ease-in-out infinite;border-color:#16c9d5}
    .eqi.r6:after,.eqi.r7:after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:inherit;background:linear-gradient(115deg,transparent 30%,#fff8 50%,transparent 68%);background-size:200% 100%;background-position:0% 0;animation:gearShimmer 2.1s linear infinite}
    .gacha-results h3{text-align:center;color:var(--gold);letter-spacing:3px}.gacha-reveal{position:relative;overflow:hidden;display:flex;align-items:center;gap:12px;padding:10px;margin:8px 0;border:2px solid;border-radius:14px;background:radial-gradient(ellipse at 20% 50%,color-mix(in srgb,var(--hero-aura) 28%,#120a24),#120a24 70%);box-shadow:0 0 15px color-mix(in srgb,var(--hero-aura) 52%,transparent);animation:gachaEnter .55s both}
    .gacha-reveal img{width:84px;height:92px;object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 0 12px var(--hero-aura))}.gacha-reveal b{font-size:17px}.gacha-reveal .rarity-pill{font-size:10px}.gacha-glow{position:absolute;left:20px;top:5%;width:80px;height:90%;background:radial-gradient(ellipse,var(--hero-aura),transparent 70%);opacity:.4;filter:blur(12px)}
    .divine-reveal{box-shadow:0 0 22px #d9a52b99,inset 0 0 18px #d9a52b33}.ancestral-reveal{box-shadow:0 0 28px #16c9d599,inset 0 0 24px #16c9d544;animation:ancestralReveal .9s ease-out both}
    .summon-card{border-color:#b08cff;background:radial-gradient(ellipse at top,#38245f,#17102a 72%)}
    .burn-item{display:flex;align-items:center;gap:8px;padding:7px;border-bottom:1px solid #33264f;font-size:11px}.burn-item input{width:18px;height:18px;accent-color:#d9a52b}.burn-item strong{display:block}
    @keyframes heroAuraPulse{0%,100%{filter:brightness(1);box-shadow:0 0 4px var(--hero-aura),0 0 10px color-mix(in srgb,var(--hero-aura) 50%,transparent)}50%{filter:brightness(1.18);box-shadow:0 0 8px var(--hero-aura),0 0 18px color-mix(in srgb,var(--hero-aura) 72%,transparent)}}
    @keyframes divinePulse{50%{box-shadow:0 0 14px #d9a52b,0 0 24px #d9a52b99}}
    @keyframes ancestralPulse{50%{box-shadow:0 0 18px #16c9d5,0 0 30px #16c9d5aa;filter:brightness(1.2)}}
    @keyframes divineGear{50%{box-shadow:0 0 22px #d9a52b,inset 0 0 16px #d9a52b55}}
    @keyframes ancestralGear{0%,100%{box-shadow:0 0 9px #16c9d577;filter:brightness(1)}50%{box-shadow:0 0 24px #16c9d5;filter:brightness(1.12)}}
    @keyframes gearShimmer{from{background-position:0% 0}to{background-position:100% 0}}
    .eqi.r5:not(.empty){--c:#ef4444!important;border-color:#ef4444!important;box-shadow:0 0 12px #ef444488!important;animation:myth 2.4s ease-in-out infinite}
    .eqi.r7:not(.empty){--c:#16c9d5!important;border-color:#16c9d5!important;box-shadow:0 0 14px #16c9d599!important;animation:ancestralGear 2.2s ease-in-out infinite}
    .eqi.r5:not(.empty)::after,.eqi.r7:not(.empty)::after{border:0!important;outline:0!important}
    @keyframes gachaEnter{from{opacity:0;transform:translateY(15px) scale(.96)}to{opacity:1;transform:none}}
    @keyframes ancestralReveal{0%{filter:brightness(2.5);transform:scale(.94)}60%{filter:brightness(1.5);transform:scale(1.02)}100%{filter:none;transform:none}}
  `;
  document.head.appendChild(style);

  function getHeroId(el){
    if(!el)return null;
    if(el.id&&el.id.startsWith('pr-'))return el.id.slice(3);
    if(el.id&&el.id.startsWith('sk-'))return el.id.slice(3);
    if(el.dataset&&el.dataset.heroId&&H[el.dataset.heroId])return el.dataset.heroId;
    if(el.dataset&&el.dataset.v&&H[el.dataset.v])return el.dataset.v;
    const img=el.matches&&el.matches('img')?el:el.querySelector&&el.querySelector('img');
    if(img&&img.alt){const match=Object.keys(H).find(id=>H[id].n===img.alt);if(match)return match}
    return null;
  }
  function paintHeroElement(el,id){
    if(!el||!H[id])return;const rank=CHAR_RANK[id]??0,color=rarityColor(rank);
    el.dataset.rank=String(rank);el.dataset.rarity=rarityLabel(rank);el.style.setProperty('--hero-aura',color);
    if(rank>0)el.classList.add('hero-aura-frame');else el.classList.remove('hero-aura-frame');
    const img=el.matches&&el.matches('img')?el:el.querySelector&&el.querySelector('img');
    if(img){img.style.setProperty('--hero-aura',color);img.style.filter=rank?`drop-shadow(0 0 ${rank>=5?12:8}px ${color})`:'drop-shadow(0 0 6px #000)'}
    if(el.classList.contains('hc')||el.classList.contains('cc')){
      el.style.borderColor=rank?color:'';
      if(rank>=5)el.style.boxShadow=`0 0 12px ${color}55,inset 0 0 12px ${color}18`;
    }
  }
  function applyHeroAuras(root=document){
    root.querySelectorAll('.pr,.skb,.pp,[data-hero-id],.hc,.cc').forEach(el=>{
      const id=getHeroId(el);if(!id)return;
      // Characters tab: keep rarity styling on the full outer card only.
      // The smaller .pp portrait wrapper must not get its own pulsing square.
      if(el.classList.contains('pp')&&el.closest('.hc,.cc'))return;
      paintHeroElement(el,id);
    });
  }

  // Upgrade the character detail modal with rarity and an individual auto-equip action.
  const _heroModalR=heroM;
  heroM=function(id){
    _heroModalR(id);
    const root=$('#modal'),box=root&&root.firstElementChild;if(!box)return;
    const rank=CHAR_RANK[id]??0,color=rarityColor(rank);
    const title=box.querySelector('.ph b, .pg .ph b, .hc b');
    if(title&&!box.querySelector('.hero-rarity-label')){
      const tag=document.createElement('span');tag.className='rarity-pill hero-rarity-label';tag.style.setProperty('--hero-aura',color);tag.textContent=rarityLabel(rank).toUpperCase();title.insertAdjacentElement('afterend',tag);
    }
    if(!box.querySelector('[data-a="equipBestHero"]')){
      const btn=document.createElement('button');btn.className='pri';btn.dataset.a='equipBestHero';btn.dataset.v=id;btn.style.width='100%';btn.style.margin='8px 0';btn.textContent='⚔ EQUIP BEST FOR THIS HERO';
      box.appendChild(btn);
    }
    applyHeroAuras(root);
  };

  // Character overview now exposes rarity and a one-click team optimization button.
  const _charsHtmlR=charsHTML;
  charsHTML=function(){
    const base=_charsHtmlR();
    const button=`<div class="card"><b>Team equipment</b><div class="mu">Automatically assigns the strongest available item in each of the six slots, comparing real character POWER.</div><button class="pri" data-a="equipBest" style="width:100%;margin-top:7px">⚔ EQUIP BEST FOR TEAM</button></div>`;
    return button+base;
  };

  function itemContribution(hero,it){
    const slot=it.slot,oldEq=it.eq;
    const oldSlot=S.inv.filter(x=>x.eq===hero&&x.slot===slot);
    const baseEq=oldSlot.map(x=>[x,x.eq]);
    oldSlot.forEach(x=>x.eq=null);
    const base=power(hero);
    it.eq=hero;
    const score=power(hero)-base;
    it.eq=oldEq;baseEq.forEach(([x,eq])=>x.eq=eq);
    return score;
  }
  function equipBestFor(heroes,allowBorrow){
    heroes=heroes.filter(id=>S.owned.includes(id));if(!heroes.length)return[];
    const before=Object.fromEntries(heroes.map(id=>[id,power(id)])),changed=[];
    for(const slot of SLOTS){
      let candidates=S.inv.filter(it=>it.slot===slot);
      if(!allowBorrow)candidates=candidates.filter(it=>!it.eq||heroes.includes(it.eq)&&it.eq===heroes[0]);
      {const cs=it=>scale(it)*(1+(it.subs||[]).reduce((t,x)=>t+x.w,0));candidates=candidates.sort((p,q)=>cs(q)-cs(p)).slice(0,Math.max(12,heroes.length*4))}
      const pairs=[];
      heroes.forEach(hero=>candidates.forEach(it=>pairs.push({hero,it,score:itemContribution(hero,it)})));
      pairs.sort((a,b)=>b.score-a.score);
      const chosen=[],usedHeroes=new Set(),usedItems=new Set();
      for(const p of pairs){if(usedHeroes.has(p.hero)||usedItems.has(p.it.id))continue;chosen.push(p);usedHeroes.add(p.hero);usedItems.add(p.it.id);if(chosen.length>=heroes.length)break}
      // Only clear slots belonging to the requested heroes; bench equipment stays untouched unless borrowed.
      S.inv.forEach(it=>{if(it.slot===slot&&(heroes.includes(it.eq)||(allowBorrow&&chosen.some(p=>p.it===it))))it.eq=null});
      chosen.forEach(p=>{p.it.eq=p.hero});
      chosen.forEach(p=>{if(p.it.eq===p.hero)changed.push({hero:p.hero,item:p.it,slot})});
    }
    save();
    const after=Object.fromEntries(heroes.map(id=>[id,power(id)]));
    return heroes.map(id=>({id,before:before[id],after:after[id],delta:after[id]-before[id]}));
  }
  act.equipBest=function(){
    const heroes=[...new Set(S.order)].filter(id=>S.owned.includes(id));
    const summary=equipBestFor(heroes,true);draw();
    M(`<b>⚔ Best equipment assigned</b><div class="mu">Comparison completed using actual stats and POWER.</div>${summary.map(x=>`<div class="st"><span>${H[x.id].n}</span><b style="color:${x.delta>=0?'var(--gr)':'var(--rd)'}">${x.before.toLocaleString()} → ${x.after.toLocaleString()} (${x.delta>=0?'+':''}${x.delta.toLocaleString()})</b></div>`).join('')}<div class="mu" style="margin-top:8px">Items were not duplicated. Equipment on bench heroes may be transferred when it improves the active team.</div>`);
  };
  act.equipBestHero=function(id){
    if(!H[id]||!S.owned.includes(id))return;
    const summary=equipBestFor([id],false)[0];
    heroM(id);head();
    if(summary)M(`<b>⚔ ${H[id].n} optimized</b><div class="st"><span>POWER</span><b>${summary.before.toLocaleString()} → ${summary.after.toLocaleString()} (${summary.delta>=0?'+':''}${summary.delta.toLocaleString()})</b></div><div class="mu">The best unequipped items for this hero were assigned without taking gear from other heroes.</div>`);
  };

  // Safe equipment salvage, with explicit preview and a second confirmation for Divine/Ancestral.
  act.burnPrompt=function(){
    const freeItems=S.inv.filter(it=>!it.eq).sort((a,b)=>b.r-a.r||b.lv-a.lv);
    if(!freeItems.length){M('<b>🔥 Equipment salvage</b><div class="mu">There are no unequipped items available to burn.</div>');return}
    const list=freeItems.map(it=>{
      const value=Math.floor(GEAR_BASE_GOLD[it.r]*(1+it.lv*.12));
      return`<label class="burn-item"><input type="checkbox" data-burn-item="${it.id}" checked><span style="color:${RC[it.r]}">◆</span><span style="flex:1"><strong>${iname(it)}</strong><span class="mu">${RAR[it.r]} · ${it.slot} · +${it.lv} enhancement</span></span><b>${value.toLocaleString()}💰</b></label>`;
    }).join('');
    M(`<b style="font-size:18px">🔥 Burn equipment</b><div class="mu">Select unequipped gear to destroy permanently for gold. Equipped items are excluded and protected.</div><div class="row"><button data-a="burnSelect" data-v="all">Select all</button><button data-a="burnSelect" data-v="none">Clear selection</button></div><div class="card" style="max-height:48vh;overflow:auto;padding:6px">${list}</div><button class="pri" data-a="burnReview" style="width:100%">REVIEW SELECTED ITEMS</button>`);
  };
  act.burnSelect=function(mode){
    document.querySelectorAll('#modal [data-burn-item]').forEach(x=>x.checked=mode==='all');
  };
  act.burnReview=function(){
    const ids=[...document.querySelectorAll('#modal [data-burn-item]:checked')].map(x=>Number(x.dataset.burnItem));
    const selected=ids.map(id=>S.inv.find(it=>it.id===id)).filter(it=>it&&!it.eq);
    if(!selected.length||selected.length!==ids.length){M('<b>Nothing selected</b><div class="mu">Choose valid unequipped items and try again.</div>');return}
    const total=selected.reduce((sum,it)=>sum+Math.floor(GEAR_BASE_GOLD[it.r]*(1+it.lv*.12)),0);
    const rare=selected.some(it=>it.r>=6),idsPacked=ids.join(',');
    M(`<b>Confirm equipment burn</b><div class="mu">${selected.length} item(s) will be permanently destroyed.</div><div class="card">${selected.map(it=>`<div class="st"><span style="color:${RC[it.r]}">${iname(it)} · ${RAR[it.r]}</span><b>${Math.floor(GEAR_BASE_GOLD[it.r]*(1+it.lv*.12)).toLocaleString()}💰</b></div>`).join('')}</div><div class="st"><b>Total gold</b><b style="color:var(--gold)">+${total.toLocaleString()}💰</b></div>${rare?'<div style="color:#16c9d5;font-weight:800;margin:8px 0">⚠ DIVINE / ANCESTRAL ITEM SELECTED — SECOND CONFIRMATION REQUIRED.</div>':''}<button class="pri" data-a="burnExecute" data-v="${idsPacked}" style="width:100%">${rare?'CONFIRM SECOND TIME':'CONFIRM BURN'}</button><button data-a="burnPrompt" style="width:100%;margin-top:6px">CANCEL</button>`);
  };
  act.burnExecute=function(packed){
    const ids=String(packed||'').split(',').map(Number).filter(Number.isFinite);
    if(!ids.length||new Set(ids).size!==ids.length)return;
    const selected=ids.map(id=>S.inv.find(it=>it.id===id));
    if(selected.some(it=>!it||it.eq))return;
    const total=selected.reduce((sum,it)=>sum+Math.floor(GEAR_BASE_GOLD[it.r]*(1+it.lv*.12)),0);
    const set=new Set(ids);S.inv=S.inv.filter(it=>!set.has(it.id));S.gold+=total;save();draw();
    M(`<b>🔥 Equipment burned</b><div class="st"><span>Destroyed items</span><b>${ids.length}</b></div><div class="st"><span>Gold received</span><b style="color:var(--gold)">+${total.toLocaleString()}💰</b></div><div class="mu">Inventory and gold balance saved.</div>`);
  };

  // Add salvage entry point to the existing inventory screen.
  const _bagHtmlR=bagHTML;
  bagHTML=function(){return`<div class="card"><b>Equipment processing</b><div class="mu">Convert unwanted unequipped equipment into gold. Divine and Ancestral items require an extra confirmation.</div><button data-a="burnPrompt" style="width:100%;margin-top:6px">🔥 BURN EQUIPMENT FOR GOLD</button></div>`+_bagHtmlR()};

  // Update the cinematic title for the regional boss while retaining the existing Ouro 3D model.
  const _buildBossRarity=build;
  const BOSS_PALETTES=[
    [0x1a0a30,0xf5b94a,0xffd34a],[0x07313a,0x25c9c8,0x9ff6ff],[0x39200a,0xf0a32b,0xffe08a],
    [0x1b2630,0x8cbbc9,0x38e8ff],[0x351008,0xff702e,0xffd34a],[0x081b36,0x698dff,0xc3d4ff],
    [0x210d33,0x8c55e9,0xcc9dff],[0x332a16,0xffe8a0,0xffffff],[0x3a0817,0xff4d6d,0x16c9d5],[0x061e2a,0x16c9d5,0xd2ffff]
  ];
  function tintRegionalBoss(){
    const boss=B&&B.enemies&&B.enemies.find(e=>e.boss&&!e.dead);if(!boss||!B||B.dg)return;
    const v=V&&V[boss.uid],snake=v&&v.snake;if(!snake)return;
    const p=BOSS_PALETTES[clamp(Math.floor(B.stage/10)-1,0,9)];
    snake.bm.emissive.setHex(p[0]);snake.bm2.emissive.setHex(p[0]);snake.gold.color.setHex(p[1]);snake.eye.color.setHex(p[2]);
  }
  build=function(){
    _buildBossRarity();
    const boss=B&&B.enemies&&B.enemies.find(e=>e.boss&&!e.dead),cut=document.querySelector('.cin2');
    if(boss&&cut){const title=cut.querySelector('b'),sub=cut.querySelector('span');if(title)title.textContent=boss.n;if(sub)sub.textContent='REGION BOSS · STAGE '+B.stage; if(title)title.style.fontSize=boss.n.length>22?'22px':'34px'}
    tintRegionalBoss();
  };
  if(typeof postFx==='function'){const _postFxRegionalBoss=postFx;postFx=function(dt){_postFxRegionalBoss(dt);tintRegionalBoss()}}

  // Keep the aura visible after every tab/modal redraw.
  const _drawRarity=draw;
  draw=function(){_drawRarity();applyHeroAuras(document);};
  const _renderRarity=render;
  render=function(){_renderRarity();const stageIds=S.order||[];stageIds.forEach(id=>{const pr=$('#pr-'+id),sk=$('#sk-'+id);if(pr)paintHeroElement(pr,id);if(sk)paintHeroElement(sk,id)});};
  const _closeRarity=act.close;
  act.close=function(){_closeRarity();applyHeroAuras(document)};

  // Update the active battle once so the new intrinsic character attributes are applied immediately.
  if(typeof B!=='undefined'&&B&&!B.dg){B=newBattle(clamp(S.sel||1,1,100));}
  draw();
  console.info('[AI WORLD OWL] rarity, gacha, 100-stage progression, gear salvage and auto-equip systems loaded');
})();
