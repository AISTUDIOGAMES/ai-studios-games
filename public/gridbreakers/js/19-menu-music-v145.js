/* ===== OWL GRIDBREAKERS: CONTEXTUAL MENU MUSIC · SETTINGS INTEGRATION ===== */
(()=>{
 'use strict';
 const tracks={
  map:'assets/audio/music/map.mp3',
  menu:'assets/audio/music/menu.mp3',
  summon:'assets/audio/music/summon.mp3'
 };
 const players={};
 const musicVolume=()=>Math.max(0,Math.min(1,Number(S&&S.mv!==undefined?S.mv:1)));
 Object.keys(tracks).forEach(k=>{
  const a=new Audio(tracks[k]);a.loop=true;a.preload='auto';a.volume=.42*musicVolume();players[k]=a;
 });
 let enabled=true,started=false,current='';
 try{
  const stored=localStorage.getItem('awo_music_enabled');
  enabled=stored!==null?stored!=='0':(S.music!==false&&localStorage.getItem('awo_bgm_enabled')!=='0');
 }catch(e){enabled=S.music!==false}
 S.music=enabled;
 function activeTrack(){
  const active=document.querySelector('#nav button.on');
  const tab=active&&active.dataset.v;
  if(tab==='map')return 'map';
  if(tab==='summon')return 'summon';
  return 'menu';
 }
 function sync(){
  const wanted=activeTrack();
  if(!enabled)return;
  if(wanted==='summon'&&window.__AWO_GACHA_ROLLING){players.summon.pause();current='';return}
  if(wanted===current&&!players[wanted].paused)return;
  Object.entries(players).forEach(([k,a])=>{if(k!==wanted){a.pause();a.currentTime=0}});
  current=wanted;
  const p=players[wanted];p.volume=.42*musicVolume();
  const play=p.play();
  if(play&&play.catch)play.catch(()=>{started=false});
 }
 function setEnabled(value){
  enabled=!!value;S.music=enabled;
  try{localStorage.setItem('awo_music_enabled',enabled?'1':'0');localStorage.setItem('awo_bgm_enabled',enabled?'1':'0')}catch(e){}
  if(typeof save==='function')save();
  if(window.AWO_SOUNDTRACK_SYNC)window.AWO_SOUNDTRACK_SYNC();
  if(enabled){started=true;sync()}
  else{Object.values(players).forEach(a=>a.pause());current=''}
 }
 function setVolume(value){
  const v=Math.max(0,Math.min(1,Number(value)||0));
  Object.values(players).forEach(a=>a.volume=.42*v);
 }
 window.__AWO_BGM_SYNC=sync;
 window.AWO_MENU_MUSIC={isEnabled:()=>enabled,setEnabled,setVolume,sync};
 function unlock(){if(!enabled||started)return;started=true;sync()}
 document.addEventListener('pointerdown',unlock,{once:false,passive:true});
 document.addEventListener('keydown',unlock,{once:false});
 document.addEventListener('click',()=>setTimeout(sync,100),true);
 const nav=document.getElementById('nav');
 if(nav)new MutationObserver(()=>sync()).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)Object.values(players).forEach(a=>a.pause());
  else if(enabled&&started)sync();
 });
 console.info('[AWO] contextual background music loaded; volume and toggle moved to Settings');
})();
