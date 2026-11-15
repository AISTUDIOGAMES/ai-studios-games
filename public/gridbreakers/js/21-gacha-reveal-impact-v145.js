/* ===== OWL GRIDBREAKERS: GACHA REVEAL IMPACT ===== */
(()=>{
 'use strict';
 const sound=new Audio('assets/audio/gacha/reveal.mp3');
 sound.loop=false; sound.preload='auto'; sound.volume=0.82*Math.max(0,Math.min(1,Number(S.sv===undefined?1:S.sv)||0));
 function play(){
  if(S.snd===false)return;
  sound.volume=0.82*Math.max(0,Math.min(1,Number(S.sv===undefined?1:S.sv)||0));
  try{sound.pause();sound.currentTime=0;const p=sound.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}
 }
 window.__AWO_GACHA_REVEAL_AUDIO={play};
 console.info('[AWO] Gacha reveal impact sound loaded');
})();
