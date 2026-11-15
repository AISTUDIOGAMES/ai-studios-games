/* OWL GRIDBREAKERS v3.4 — Obsidian Rune Trail Worldmap + imported combat audio
   Presentation/audio layer only: existing stage actions, progression and music engine stay authoritative. */
(function(){
  'use strict';
  if(window.__OWL_V168__) return; window.__OWL_V168__=true;
  const $=(s,r=document)=>r.querySelector(s);
  const mapImage='assets/img/maps/obsidian-rune-trail.png';
  const regionNames=['Thread Canopy','Glasswind Expanse','Broken Landing','Cinder Road','Mute Threshold','Outer Obsidia','Sanctum Ascendant','Glitch Frontier','Eternal Threshold','Obsidian Crown'];
  function stageMapHTML(){
    const current=Math.max(1,Math.min(100,Number(S.cleared||0)+1));
    const nodes=STAGES.slice(0,100).map((name,i)=>{
      const n=i+1, unlocked=n<=current, cleared=n<=Number(S.cleared||0), boss=n%10===0;
      // Keep nodes aligned to the illustrated rune road while gently following its bends.
      const x=50 + Math.sin((n/100)*Math.PI*5.2)*10 + Math.sin((n/100)*Math.PI*11)*2.4;
      const y=1.25+(i/99)*97.5;
      const region=Math.floor(i/10);
      return `<button class="owl-map-stage ${cleared?'is-cleared':''} ${unlocked?'is-open':'is-locked'} ${boss?'is-boss':''} ${n===current?'is-current':''}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" data-a="stage" data-v="${n}" ${unlocked?'':'disabled'} aria-label="Stage ${n}: ${name}${boss?', chefe de região':''}, ${cleared?'concluído':unlocked?'disponível':'bloqueado'}" title="${n}. ${name}${boss?' · BOSS':''}"><span>${n}</span></button>`;
    }).join('');
    const regionTags=regionNames.map((name,i)=>`<div class="owl-map-region ${i%2?'region-right':''}" style="top:${5+i*10}%"><span>REGIÃO ${String(i+1).padStart(2,'0')}</span><b>${name}</b></div>`).join('');
    return `<section class="owl-worldmap" aria-label="Worldmap — Trilha Obsidiana das Runas Luminescentes">
      <header class="owl-map-heading"><div><small>WORLD MAP · CAMPANHA PRINCIPAL</small><h1>Trilha Obsidiana das Runas Luminescentes</h1><p>Uma jornada por 100 estágios. Selecione um marco liberado para continuar sua expedição.</p></div><div class="owl-map-progress"><b>${Number(S.cleared||0)} <i>/ 100</i></b><span>STAGES CONCLUÍDOS</span><div><em style="width:${Math.max(0,Math.min(100,Number(S.cleared||0)))}%"></em></div></div></header>
      <div class="owl-map-legend"><span><i class="done"></i> Concluído</span><span><i class="current"></i> Próximo estágio</span><span><i class="locked"></i> Bloqueado</span><span>◆ Chefe a cada 10 stages</span></div>
      <div class="owl-map-frame" id="owl-map-frame"><div class="owl-map-art" id="owl-map-art" style="background-image:url('${mapImage}')">${regionTags}<div class="owl-map-route-glow" aria-hidden="true"></div>${nodes}</div></div>
      <footer class="owl-map-foot"><span>TRILHA OBSIDIANA · 10 REGIÕES · 100 STAGES</span><span>Arraste o mapa para explorar · Toque em um marco liberado</span></footer>
    </section>`;
  }
  function renderWorldmap(){
    if(view!=='map') return;
    const host=$('#view'); if(!host) return;
    host.innerHTML=stageMapHTML()+(typeof dgHTML==='function'?dgHTML():'');
    const frame=$('#owl-map-frame'), target=$('.owl-map-stage.is-current');
    if(frame&&target){const top=target.offsetTop-frame.clientHeight*.46;frame.scrollTop=Math.max(0,top);}
  }
  const previousDraw=draw;
  draw=function(){const out=previousDraw.apply(this,arguments);if(view==='map')renderWorldmap();return out};

  // Imported samples replace synthesized placeholders only when a matching sample exists.
  // Music continues to use the existing soundtrack engine and is never ducked by these clips.
  const base='assets/audio/combat/';
  const soundMap={
    lyra:'skill_lyra.mp3',jax:'skill_jax.mp3',kira:'skill_kira.mp3',kai:'skill_kai.mp3',aeon:'skill_aeon.mp3',orion:'skill_orion.mp3',titan:'skill_titan.mp3',vex:'skill_vex.mp3',
    u_lyra:'ultimate_lyra.mp3',u_jax:'ultimate_jax.mp3',u_kira:'ultimate_kira.mp3',u_kai:'ultimate_kai.mp3',u_aeon:'ultimate_aeon.mp3',u_orion:'ultimate_orion.mp3',u_titan:'ultimate_titan.mp3',u_vex:'ultimate_vex.mp3',
    a_lyra:'attack_lyra.mp3',a_jax:'attack_jax.mp3',a_kira:'attack_kira.mp3',a_kai:'attack_kai.mp3',a_aeon:'attack_aeon.mp3',a_orion:'attack_orion.mp3',a_titan:'attack_titan.mp3',a_vex:'attack_vex.mp3',
    heal:'heal.mp3',heal2:'heal_strong.mp3',crit:'critical.mp3',die:'death.mp3',shield:'shield.mp3',sbreak:'shield_break.mp3',stun:'stun.mp3',
    a_drone:'enemy_drone.mp3',a_knight:'enemy_knight.mp3',a_ouro:'enemy_ouro.mp3',a_raider:'enemy_raider.mp3',a_stalker:'enemy_stalker.mp3',a_wraith:'enemy_wraith.mp3',
    awake:'boss_awake.mp3','b:DATA PULSE':'boss_data_pulse.mp3','b:VOID BREATH':'boss_void.mp3','b:SERPENT STRIKE':'boss_serpent.mp3','b:TAIL ANNIHILATION':'boss_tail.mp3','b:CORRUPTION STORM':'boss_corruption.mp3','b:DEVOURER RAGE':'boss_rage.mp3'
  };
  const live=new Set(); let last={};
  function playImported(key){
    const file=soundMap[key]; if(!file||S.snd===false) return false;
    const now=performance.now(); if(last[key]&&now-last[key]<65) return true; last[key]=now;
    // Keep transient SFX clearly below the music/ambience bed.
    const pref=Number(S.sv===undefined?0.82:S.sv); const volume=Math.max(0,Math.min(.42,pref*.42));
    if(volume<=.001) return true;
    if(live.size>=18){const first=live.values().next().value;try{first.pause();first.currentTime=0}catch(e){}live.delete(first)}
    const audio=new Audio(base+file); audio.preload='auto'; audio.volume=volume; live.add(audio);
    const done=()=>live.delete(audio); audio.addEventListener('ended',done,{once:true}); audio.addEventListener('error',done,{once:true});
    const p=audio.play(); if(p&&p.catch)p.catch(()=>{live.delete(audio)}); return true;
  }
  const previousSfx=sfx;
  sfx=function(key){if(playImported(String(key)))return;return previousSfx.apply(this,arguments)};
  window.OWL_IMPORTED_AUDIO={map:soundMap,active:()=>live.size,volume:()=>Math.max(0,Math.min(.42,Number(S.sv===undefined?.82:S.sv)*.42))};
  console.info('[OWL v3.4] 100-stage Obsidian Rune Trail map and imported combat audio ready.');
})();
