/* ===== AI WORLD OWL — GACHA-UNLOCKED PARTY / STATIC TOP RARITIES / STARTER MAPS ===== */
(function(){
  'use strict';
  if(window.__AWO_GACHA_PARTY_MAPS_V1)return;
  window.__AWO_GACHA_PARTY_MAPS_V1=true;

  const MAX_PARTY=5;
  const STARTER='lyra';
  const DEFAULT_STARTERS=new Set(['lyra','jax','kira','kai','aeon']);
  const uniqueKnown=ids=>[...new Set((ids||[]).filter(id=>H[id]))];

  // New campaigns now begin with Lyra only. No free fifth hero is injected.
  const rawFreshParty=fresh;
  fresh=function(){
    const data=rawFreshParty();
    data.owned=[STARTER];
    data.order=[STARTER];
    data.lv={};data.xp={};
    Object.keys(H).forEach(id=>{data.lv[id]=1;data.xp[id]=0});
    data.partyGrowthVersion=1;
    data.gachaHistory=[];
    data.gachaPity={legendary:0,divine:0,ancestral:0,total:0};
    return data;
  };

  // One-time migration: remove only the old free starter lineup; retain actual Gacha recruits.
  // Currency, campaign progress, equipment, pity, and acquired heroes remain untouched.
  if(!S.partyGrowthVersion){
    /* v1.2: keep a copy of the pre-migration save */
    try{if(!localStorage.getItem(KEY+'_bak_partygrowth')){const _raw=localStorage.getItem(KEY);if(_raw)localStorage.setItem(KEY+'_bak_partygrowth',_raw)}}catch(e){}
    const history=Array.isArray(S.gachaHistory)?S.gachaHistory:[];
    const pulled=history.slice().reverse()
      .filter(entry=>entry&&entry.id&&H[entry.id]&&!entry.duplicate)
      .map(entry=>entry.id);
    const previouslyOwned=Array.isArray(S.owned)?S.owned:[];
    const legacyRecruits=previouslyOwned.filter(id=>H[id]&&!DEFAULT_STARTERS.has(id));
    const migratedOwned=uniqueKnown([STARTER,...pulled,...legacyRecruits]);
    S.owned=migratedOwned;
    const acquisitionOrder=uniqueKnown([STARTER,...pulled,...legacyRecruits]);
    S.order=acquisitionOrder.slice(0,MAX_PARTY);
    S.lv=S.lv||{};S.xp=S.xp||{};S.asc=S.asc||{};S.star=S.star||{};
    Object.keys(H).forEach(id=>{
      if(!S.owned.includes(id)){
        S.lv[id]=1;S.xp[id]=0;
        if(S.star)delete S.star[id];
        if(S.asc)delete S.asc[id];
      }else{
        S.lv[id]=Math.max(1,Number(S.lv[id])||1);
        S.xp[id]=Math.max(0,Number(S.xp[id])||0);
      }
    });
    // Gear belonging to characters no longer in the starter roster is returned to inventory.
    (S.inv||[]).forEach(item=>{if(item.eq&&!S.owned.includes(item.eq))item.eq=null});
    S.partyGrowthVersion=1;
  }

  // Normalize loaded state without granting new characters or creating empty team slots.
  S.owned=uniqueKnown([STARTER,...(Array.isArray(S.owned)?S.owned:[])]);
  S.order=uniqueKnown(Array.isArray(S.order)?S.order:[])
    .filter(id=>S.owned.includes(id)).slice(0,MAX_PARTY);
  if(!S.order.includes(STARTER))S.order.unshift(STARTER);
  S.order=S.order.slice(0,Math.min(MAX_PARTY,S.owned.length));
  S.lv=S.lv||{};S.xp=S.xp||{};
  S.owned.forEach(id=>{S.lv[id]=Math.max(1,Number(S.lv[id])||1);S.xp[id]=Math.max(0,Number(S.xp[id])||0)});

  // Only genuinely new Gacha recruits expand the active party, one available slot at a time.
  // Duplicate summons improve stars/shards and do not create duplicate battle units.
  const rawSummonAction=act.summon;
  act.summon=function(n){
    const count=Number(n)===5?5:1;
    const before=new Set(S.order);
    const beforeOwned=new Set(S.owned);
    const result=rawSummonAction.apply(this,arguments);
    const recent=(Array.isArray(S.gachaHistory)?S.gachaHistory:[]).slice(0,count).reverse();
    let joined=[];
    recent.forEach(entry=>{
      if(!entry||entry.duplicate||!H[entry.id]||beforeOwned.has(entry.id)||S.order.includes(entry.id))return;
      if(S.order.length<MAX_PARTY){S.order.push(entry.id);joined.push(entry.id)}
    });
    // Defensive consistency in case an older summon implementation changes owned before history.
    S.order=uniqueKnown(S.order).filter(id=>S.owned.includes(id)).slice(0,MAX_PARTY);
    if(joined.length){
      save();
      // Refresh the paused battle snapshot so the new recruit appears the next time Battle is opened.
      if(B){
        const stage=Math.max(1,Math.min(100,Number(B.stage)||Number(S.sel)||1));
        const dungeon=B.dg,opponent=B.opp;
        startBattle(stage,dungeon,opponent);
      }
      const modal=document.querySelector('#modal>div');
      const close=modal&&modal.querySelector('[data-a="close"]');
      if(close){
        const note=document.createElement('div');note.className='card';
        note.style.cssText='border-color:#4be28a;color:#baffd1;text-align:center;font-weight:800';
        note.textContent=`${joined.map(id=>H[id].n).join(', ')} joined your squad · ${S.order.length}/${MAX_PARTY} active slots`;
        close.parentNode.insertBefore(note,close);
      }
    }
    return result;
  };

  // Show the unlocked party capacity and make team placement safe for 1–5 members.
  const rawCharsHTML=charsHTML;
  charsHTML=function(){
    const slots=S.order.length;
    const note=`<div class="card" style="border-color:#4be28a"><b>ACTIVE SQUAD · ${slots}/${MAX_PARTY}</b><div class="mu">New characters recruited through Gacha automatically join the squad while an active slot is available. Duplicate summons do not occupy another slot.</div></div>`;
    return note+rawCharsHTML();
  };

  const rawSummonHTML=summonHTML;
  summonHTML=function(){
    return `<div class="card" style="border-color:#4be28a"><b>YOUR SQUAD · ${S.order.length}/${MAX_PARTY} SLOTS</b><div class="mu">Start with Lyra. Every new character recruited by Gacha fills the next available slot, up to five active heroes.</div></div>`+rawSummonHTML();
  };

  // Existing slot buttons now add a recruit to the next open slot or replace the selected slot.
  act.place=function(value){
    const parts=String(value||'').split('|'),id=parts[0],slot=Number(parts[1]);
    if(!H[id]||!S.owned.includes(id)||!Number.isInteger(slot)||slot<0||slot>=MAX_PARTY)return;
    const current=S.order.indexOf(id);
    if(current>=0){
      if(slot<S.order.length){
        const other=S.order[slot];S.order[slot]=id;S.order[current]=other;
      }
    }else if(slot<S.order.length){
      S.order[slot]=id;
    }else if(slot===S.order.length&&S.order.length<MAX_PARTY){
      S.order.push(id);
    }else{
      // A player cannot skip locked slots. Select the next open position instead.
      return;
    }
    S.order=uniqueKnown(S.order).filter(hero=>S.owned.includes(hero)).slice(0,MAX_PARTY);
    save();
    startBattle(Math.max(1,Math.min(100,Number(S.sel)||1)));
    heroM(id);
  };

  const rawMove=act.mv;
  act.mv=function(value){
    const [id,deltaText]=String(value||'').split('|');
    const i=S.order.indexOf(id),delta=Number(deltaText),j=i+delta;
    if(i>=0&&Number.isInteger(delta)&&j>=0&&j<S.order.length){
      [S.order[i],S.order[j]]=[S.order[j],S.order[i]];
      save();startBattle(Math.max(1,Math.min(100,Number(S.sel)||1)));
    }
    heroM(id);
  };

  // Replace static hero portraits for the two requested rarities: no pulse/blink/shimmer.
  const style=document.createElement('style');
  style.id='awo-static-legendary-ancestral-style';
  style.textContent=`
    .hero-aura-frame[data-rank="4"],.hero-aura-frame[data-rank="6"]{
      animation:none!important;
      box-shadow:0 0 0 1px var(--hero-aura),0 0 10px color-mix(in srgb,var(--hero-aura) 58%,transparent),inset 0 0 10px color-mix(in srgb,var(--hero-aura) 20%,transparent)!important;
    }
    .eqi.r4,.eqi.r7{animation:none!important;box-shadow:0 0 12px var(--c),inset 0 0 12px #000a!important}
    .eqi.r4:after,.eqi.r7:after{content:none!important;display:none!important;animation:none!important}
  `;
  document.head.appendChild(style);

  // Use the original Verdance/starter battle environment on every stage until the map art is upgraded.
  try{setBiome('v')}catch(_e){}

  // Keep five visible enemy slots while scaling their combined combat power to the unlocked squad size.
  // One active hero faces five weaker foes; as Gacha expands the squad, enemy HP/ATK/DEF rise proportionally.
  const rawSpawnForPartySize=spawn;
  spawn=function(b){
    rawSpawnForPartySize(b);
    if(!b||b.dg==='raid')return;
    const partySize=Math.max(1,Math.min(MAX_PARTY,(S.order||[]).length||1));
    const factor=partySize/MAX_PARTY;
    (b.enemies||[]).forEach(enemy=>{
      const oldMax=Math.max(1,Number(enemy.max)||1),ratio=Number(enemy.hp)/oldMax;
      enemy.max=Math.max(1,Math.round(oldMax*factor));
      enemy.hp=Math.max(1,Math.min(enemy.max,Math.round(enemy.max*(Number.isFinite(ratio)?ratio:1))));
      enemy.atk=Math.max(1,Math.round((Number(enemy.atk)||1)*factor));
      enemy.def=Math.max(0,Math.round((Number(enemy.def)||0)*(.35+.65*factor)));
    });
    b.built='';
  };

  // Rebuild the initial battle with the migrated party size; do not reset campaign progress.
  try{
    const stage=Math.max(1,Math.min(100,Number(B&&B.stage)||Number(S.sel)||1));
    const dungeon=B&&B.dg,opponent=B&&B.opp;
    paused=0;
    startBattle(stage,dungeon,opponent);
    draw();
  }catch(err){console.error('[AWO] party progression migration failed',err)}

  save();
  console.info('[AI WORLD OWL] one-hero start, Gacha-based party growth, static Legendary/Ancestral visuals, and starter-map visuals enabled');
})();
