/* ===== SOUNDTRACK ENGINE v2 (files in ./audio/ or next to the HTML) ===== */
(function(){
window.NOAMB=true;
const BASES=['assets/audio/soundtrack/','audio/',''],FILES={mapa:'mapa.mp3',menu:'menu.mp3',verdance:'verdance.mp3',desert:'desert.mp3',batalha:'batalha.mp3',dungeon:'dungeon.mp3',boss:'boss.mp3',furia:'furia.mp3',vitoria:'vitoria.mp3',summon:'summon.mp3'},MV=.5,
 SIL='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
let BI=0,ci=0,cur=null,unlocked=false,duck=1,hidden=false,warned=0,sd=1,sdT=0;window.duckMusic=(l,ms)=>{sd=Math.min(sd,l);clearTimeout(sdT);sdT=setTimeout(()=>{sd=1},ms)};
const mvol=()=>S.mv===undefined?1:S.mv;
const mk=l=>{const a=new Audio();a.loop=l;a.preload='auto';a._v=0;a._t=0;a._k=null;a.onloadeddata=()=>{BI=a._t};
 a.onerror=()=>{if(!a._k)return;if(a._t+1<BASES.length){a._t++;a.src=BASES[a._t]+FILES[a._k];if(a._w)play(a)}else{a._w=0;notFound(a._k)}};return a};
const P=[mk(true),mk(true)],ST=mk(false),on=()=>S.music!==false,cl=x=>Math.max(0,Math.min(1,x));
function setSrc(a,k){a._k=k;a._t=BI;a._w=1;a.src=BASES[a._t]+FILES[k]}
function play(a){try{const p=a.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
function notFound(k){console.warn('Trilha não encontrada: audio/'+FILES[k]);if(warned)return;warned=1;const d=document.createElement('div');d.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99;background:#000c;color:#ffd34a;font:12px system-ui;padding:8px 12px;border-radius:8px;max-width:80%';d.textContent='🎵 Trilha não encontrada ('+FILES[k]+'). Verifique a pasta assets/audio/soundtrack.';document.body.appendChild(d);setTimeout(()=>d.remove(),9000)}
function pickTrack(){
 if(typeof B=='undefined'||!B)return 'mapa';
 if(view=='map'||view=='realm')return 'mapa';
 if(view!='battle')return 'menu';
 const bu=B.enemies&&B.enemies.find(e=>e.boss&&!e.dead);
 if(B.dg=='raid'||bu)return bu&&bu.hp/bu.max<.33?'furia':'boss';
 if(B.dg=='arena'||B.dg=='tower')return 'batalha';
 if(B.dg)return 'dungeon';
 const s=B.stage;return s<=3?'verdance':s<=6?'desert':'batalha'}
function fadeLoop(){P.forEach((a,i)=>{const t=(i===ci&&on()&&!hidden&&unlocked)?MV*duck*sd*mvol():0,d=t-a._v;a._v=Math.abs(d)>.01?cl(a._v+Math.sign(d)*Math.min(Math.abs(d),.025)):t;a.volume=a._v;if(a._v===0&&!a.paused&&(i!==ci||!on()||hidden))a.pause()})}
function tick(){if(!unlocked||hidden||!on())return;const w=pickTrack();
 if(w!==cur){const q=P[1-ci];q._v=0;q.volume=0;setSrc(q,w);play(q);ci=1-ci;cur=w}
 else{const a=P[ci];if(a.paused&&a._k)play(a)}}
window.AWO_SOUNDTRACK_SYNC=()=>{if(on()){tick();return}P.forEach(a=>{a.pause();a._v=0;a.volume=0});ST.pause();ST.volume=0;duck=1};
function stinger(k,ms){if(!on()||!unlocked)return;setSrc(ST,k);ST.volume=.7*mvol();play(ST);duck=.2;
 setTimeout(()=>{const f=setInterval(()=>{ST.volume=Math.max(0,ST.volume-.07*mvol()-.005);if(ST.volume<=0){clearInterval(f);ST.pause();duck=1}},60)},ms||14000)}
function unlock(){if(!unlocked){unlocked=true;[P[1],ST].forEach(a=>{a.src=SIL;play(a)})}tick();const a=P[ci];if(a._k&&a.paused&&on())play(a)}
['click','touchend','keydown'].forEach(e=>document.addEventListener(e,unlock,{capture:true,passive:true}));
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){P.forEach(a=>a.pause());ST.pause()}else tick()});
setInterval(fadeLoop,50);setInterval(tick,600);
let lastOver=null;setInterval(()=>{if(!B||!B.over){lastOver=null;return}if(lastOver===B)return;lastOver=B;
 if(B.over==1&&B.enemies&&B.enemies.some(e=>e.boss)&&B.dg!='raid')stinger('vitoria',14000)},400);
const _sum=act.summon;act.summon=function(n){const had=S.owned.length;_sum(n);if(S.owned.length>had)stinger('summon',14000)};
const _rc=act.rclaim;act.rclaim=function(){const c=S.raid.claimed;_rc();if(!c&&S.raid.claimed)stinger('vitoria',14000)};
const _snd=act.snd;act.snd=function(){_snd();if(!on()){P.forEach(a=>a.pause());ST.pause()}else tick()};
})();
