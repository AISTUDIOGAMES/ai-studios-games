/* ===== ULTIMATE AUDIO + 3 MINUTE COOLDOWN ===== */
(()=>{
 'use strict';
 const COOLDOWN=180000;
 const audioData={"aeon":"assets/audio/ultimates/aeon.mp3","jax":"assets/audio/ultimates/jax.mp3","kai":"assets/audio/ultimates/kai.mp3","kira":"assets/audio/ultimates/kira.mp3","lyra":"assets/audio/ultimates/lyra.mp3","orion":"assets/audio/ultimates/orion.mp3","titan":"assets/audio/ultimates/titan.mp3","vex":"assets/audio/ultimates/vex.mp3"};
 const players={};
 const readyAt=b=>b.__awoUltReadyAt||(b.__awoUltReadyAt={});
 function playUltimate(id){
   const data=audioData[id]; if(!data||S.snd===false)return;
   try{
     let a=players[id]; if(!a){a=new Audio(data);players[id]=a;}
     a.pause();a.currentTime=0;a.volume=Math.max(0,Math.min(1,Number(S.sv===undefined?1:S.sv)||0));
     const p=a.play();if(p&&p.catch)p.catch(()=>{});
   }catch(e){console.warn('[AWO] Ultimate audio unavailable',id,e)}
 }
 const originalUlt=ult;
 ult=function(b,u){
   if(!b||!u)return originalUlt.apply(this,arguments);
   const cd=readyAt(b),now=Date.now(),until=Number(cd[u.id])||0;
   if(now<until)return;
   const before=Number(u.en)||0;
   const result=originalUlt.apply(this,arguments);
   if(before>=100&&ULT[u.id]&&alive(b.allies.includes(u)?b.enemies:b.allies).length){
     cd[u.id]=now+COOLDOWN;
     if(u.ally)playUltimate(u.id);
     refreshUltimateCooldowns();
   }
   return result;
 };
 const style=document.createElement('style');
 style.textContent=`.skb .ult-cd{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#080512d9;color:#fff;font:900 12px system-ui;letter-spacing:.3px;text-shadow:0 1px 4px #000;z-index:4;pointer-events:none}.skb.cooling .ult-cd{display:flex}.skb.cooling{filter:saturate(.55);border-color:#796b8e!important;box-shadow:none!important;animation:none!important}.skb.cooling .en{opacity:.35}`;
 document.head.appendChild(style);
 window.refreshUltimateCooldowns=function(){
   if(!B||!B.allies)return;
   const cd=readyAt(B),now=Date.now();
   for(const id of (S.order||[])){
     const el=document.getElementById('sk-'+id);if(!el)continue;
     let label=el.querySelector('.ult-cd');
     if(!label){label=document.createElement('div');label.className='ult-cd';el.appendChild(label)}
     const left=Math.max(0,(Number(cd[id])||0)-now);
     el.classList.toggle('cooling',left>0);
     label.textContent=left>0?Math.ceil(left/1000)+'s':'';
     label.setAttribute('aria-label',left>0?'Ultimate em recarga: '+Math.ceil(left/1000)+' segundos':'Ultimate pronta quando a energia chegar a 100%');
     el.title=left>0?'Ultimate recarrega em '+Math.ceil(left/1000)+'s':'Ultimate disponível quando a energia chegar a 100%';
   }
 };
 setInterval(()=>{if(view==='battle')refreshUltimateCooldowns()},250);
 const oldDraw=draw;
 draw=function(){oldDraw.apply(this,arguments);refreshUltimateCooldowns()};
 console.info('[AI WORLD OWL] Kai ultimate self-refund fixed; per-hero 180-second cooldown and staggered basic attacks enabled');
})();
