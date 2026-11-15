/* ===== OWL GRIDBREAKERS: DEDICATED GACHA ROLL SOUND ===== */
(()=>{
 'use strict';
 const src='assets/audio/gacha/roll.mp3 ';
 const sound=new Audio(src.trim());
 sound.loop=true; sound.preload='auto'; sound.volume=0.58;
 let active=false;
 function start(){
  if(active||S.snd===false)return; active=true; window.__AWO_GACHA_ROLLING=true;
  if(window.__AWO_BGM_SYNC)window.__AWO_BGM_SYNC();
  try{sound.currentTime=0;const p=sound.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}
 }
 function stop(){
  if(!active)return; active=false; window.__AWO_GACHA_ROLLING=false;
  sound.pause(); sound.currentTime=0;
  if(window.__AWO_BGM_SYNC)window.__AWO_BGM_SYNC();
 }
 window.__AWO_GACHA_ROLL_AUDIO={start,stop,setVolume(v){sound.volume=.58*Math.max(0,Math.min(1,Number(v)||0));}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){sound.pause()}else if(!document.hidden&&active){const p=sound.play();if(p&&p.catch)p.catch(()=>{});}});
 console.info('[AWO] dedicated Gacha roll audio loaded');
})();
