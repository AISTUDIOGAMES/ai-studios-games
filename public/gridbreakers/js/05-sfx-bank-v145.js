/* ===== SOUND FILES: real SFX bank (embedded mp3) on top of the synth fallback ===== */
(function(){
const BANK={"b_awake":"assets/audio/sfx/b_awake.mp3","b_corruption_storm":"assets/audio/sfx/b_corruption_storm.mp3","b_data_pulse":"assets/audio/sfx/b_data_pulse.mp3","b_devourer_rage":"assets/audio/sfx/b_devourer_rage.mp3","b_serpent_strike":"assets/audio/sfx/b_serpent_strike.mp3","b_tail_annihilation":"assets/audio/sfx/b_tail_annihilation.mp3","b_void_breath":"assets/audio/sfx/b_void_breath.mp3","b_warn":"assets/audio/sfx/b_warn.mp3","crit":"assets/audio/sfx/crit.mp3","die":"assets/audio/sfx/die.mp3","heal":"assets/audio/sfx/heal.mp3","heal2":"assets/audio/sfx/heal2.mp3","s_aeon":"assets/audio/sfx/s_aeon.mp3","s_jax":"assets/audio/sfx/s_jax.mp3","s_kai":"assets/audio/sfx/s_kai.mp3","s_kira":"assets/audio/sfx/s_kira.mp3","s_lyra":"assets/audio/sfx/s_lyra.mp3","s_orion":"assets/audio/sfx/s_orion.mp3","s_titan":"assets/audio/sfx/s_titan.mp3","s_vex":"assets/audio/sfx/s_vex.mp3","sbreak":"assets/audio/sfx/sbreak.mp3","shield":"assets/audio/sfx/shield.mp3","stun":"assets/audio/sfx/stun.mp3","u_aeon":"assets/audio/sfx/u_aeon.mp3","u_jax":"assets/audio/sfx/u_jax.mp3","u_kai":"assets/audio/sfx/u_kai.mp3","u_kira":"assets/audio/sfx/u_kira.mp3","u_lyra":"assets/audio/sfx/u_lyra.mp3","u_orion":"assets/audio/sfx/u_orion.mp3","u_titan":"assets/audio/sfx/u_titan.mp3","u_vex":"assets/audio/sfx/u_vex.mp3"};
const BUF={};let loaded=false,ready=0,active=0;
const GAIN={a:.55,s:.85,u:.95,b:1,x:.7};
/* map the game's sfx names to bank files */
function keyOf(n){
 if(n==='ult')return 'ult';
 if(n==='warn')return 'b_warn';
 if(n==='awake')return 'b_awake';
 if(n.indexOf('b:')===0)return 'b_'+n.slice(2).toLowerCase().replace(/ /g,'_');
 if(/^a_/.test(n))return 'basic';
 if(/^u_/.test(n))return n;
 if(/^(crit|heal|heal2|shield|sbreak|stun|die)$/.test(n))return n;
 if(typeof H!=='undefined'&&H[n])return 's_'+n;
 return '';
}
const catOf=k=>/^a_/.test(k)?'a':/^s_/.test(k)?'s':/^u_/.test(k)?'u':/^b_/.test(k)?'b':'x';
const GAP=k=>/^a_/.test(k)?60:/^(heal|heal2)$/.test(k)?260:k==='crit'?200:/^(die|shield|sbreak|stun)$/.test(k)?100:40;
const lastK={};
function b64(s){const r=atob(s),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u.buffer}
const dec=ab=>new Promise((ok,no)=>{try{const p=AC.decodeAudioData(ab,ok,no);if(p&&p.catch)p.catch(no)}catch(e){no(e)}});
async function loadBank(){
 if(loaded||!AC)return;loaded=true;
 const order=Object.keys(BANK).sort((x,y)=>(/^(a_|crit|heal|s_)/.test(y)?1:0)-(/^(a_|crit|heal|s_)/.test(x)?1:0));
 for(const k of order){try{BUF[k]=await dec(await (await fetch(BANK[k])).arrayBuffer());ready++}catch(e){}await new Promise(r=>setTimeout(r,0))}
}
function sv(){return S.sv===undefined?1:S.sv}
function playBuf(k){
 const b=BUF[k],c=catOf(k),t=AC.currentTime,s=AC.createBufferSource(),g=AC.createGain();
 s.buffer=b;let vol=GAIN[c]*sv();
 if(k==='b_warn')vol*=.7;if(k==='crit'||k==='heal')vol*=.8;
 g.gain.setValueAtTime(vol,t);
 if(c==='a'){s.playbackRate.value=.94+Math.random()*.12;if(b.duration>1.1){g.gain.setValueAtTime(vol,t+.85);g.gain.linearRampToValueAtTime(0,t+1.05);s.stop(t+1.08)}}
 s.connect(g);g.connect(MG);active++;s.onended=()=>{active--};s.start(t);
 if(window.duckMusic){if(c==='u')window.duckMusic(.3,b.duration*850);else if(c==='b'&&k!=='b_warn')window.duckMusic(.4,Math.min(b.duration,3.5)*800)}
}

/* standard basic attack: one clean, short hit for every character (heroes slightly brighter, enemies slightly deeper) */
let NBUF;
function nbuf(){if(!NBUF){NBUF=AC.createBuffer(1,AC.sampleRate*.2,AC.sampleRate);const d=NBUF.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}return NBUF}
function basic(n){
 const id=n.slice(2),ally=typeof H!=='undefined'&&!!H[id],t=AC.currentTime,v=sv(),r=.96+Math.random()*.08;
 const o=AC.createOscillator(),g=AC.createGain();o.type='sine';
 o.frequency.setValueAtTime((ally?200:130)*r,t);o.frequency.exponentialRampToValueAtTime(ally?85:55,t+.1);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.2*v,t+.005);g.gain.exponentialRampToValueAtTime(.0005,t+.12);
 o.connect(g);g.connect(MG);o.start(t);o.stop(t+.14);
 const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g2=AC.createGain();s.buffer=nbuf();f.type='bandpass';f.Q.value=1.1;
 f.frequency.setValueAtTime((ally?3200:1800)*r,t);f.frequency.exponentialRampToValueAtTime(ally?1400:600,t+.07);
 g2.gain.setValueAtTime(.0001,t);g2.gain.exponentialRampToValueAtTime(.11*v,t+.004);g2.gain.exponentialRampToValueAtTime(.0005,t+.07);
 s.connect(f);f.connect(g2);g2.connect(MG);s.start(t);s.stop(t+.09)}
const lastB={};
const _prev=sfx;
sfx=function(n){
 if(!AC||S.snd===false)return;
 const k=keyOf(n);
 if(k==='basic'){const t=performance.now();if(lastB[n]&&t-lastB[n]<60)return;lastB[n]=t;try{basic(n)}catch(e){}return}
 if(k==='ult'){if(ready>8)return}
 else if(k&&BUF[k]){
  const t=performance.now();if(lastK[k]&&t-lastK[k]<GAP(k))return;
  if(active>14&&catOf(k)==='a')return;
  lastK[k]=t;try{playBuf(k)}catch(e){_prev(n)}return}
 _prev(n)};
const _ai=audioInit;audioInit=function(){_ai();if(AC)loadBank()};
document.addEventListener('click',()=>{if(AC&&AC.state==='suspended'&&S.snd!==false)AC.resume()},{capture:true});
document.addEventListener('visibilitychange',()=>{if(!AC)return;if(document.hidden)AC.suspend();else if(S.snd!==false)AC.resume()});
/* Audio controls now live in the global Config panel, not on the battle HUD. */
act.mixtest=function(){
 if(S.snd===false)return;
 audioInit();
 if(typeof MG!=='undefined'&&MG)MG.gain.value=.5;
 sfx(S.order[0]);setTimeout(()=>sfx('crit'),700);
};
document.addEventListener('input',e=>{
 const k=e.target.dataset&&e.target.dataset.mix;if(!k)return;
 const v=Math.max(0,Math.min(1,Number(e.target.value)/100));
 S[k]=v;
 const l=document.getElementById(k+'v');if(l)l.textContent=Math.round(v*100)+'%';
 if(k==='mv'&&window.AWO_MENU_MUSIC)window.AWO_MENU_MUSIC.setVolume(v);
 if(k==='sv'&&window.__AWO_GACHA_ROLL_AUDIO&&window.__AWO_GACHA_ROLL_AUDIO.setVolume)window.__AWO_GACHA_ROLL_AUDIO.setVolume(v);
 save();
});
window.SFXBANK={buf:BUF,ready:()=>ready};
})();
/* ===== CHARACTER & EQUIPMENT UPGRADE (additive; no save-format changes) ===== */
let _eqk=0;
const SETP={Obsidian:['#15102a','#4a3580','#f5b94a','#9b5cff'],Lunar:['#7f95bd','#e8f0ff','#cfe3ff','#6ab7ff'],Thread:['#0b2830','#1f6572','#38e8ff','#4be28a']};
const SETI={Obsidian:'Violet obsidian plates · ancient gold · fortress-grade protection',Lunar:'Silver-blue lunar steel · celestial wards · restorative resilience',Thread:'Quantum lattice · cyan energy lines · precision and speed'};
const ENAME={weapon:{Obsidian:'Obsidian Blade',Lunar:'Lunar Arcblade',Thread:'Golden Thread Staff'},helmet:{Obsidian:'Crown of Obsidia',Lunar:'Mooncrest Helm',Thread:'Ancient Owl Visor'},armor:{Obsidian:'Obsidian Aegis',Lunar:'Lunar Guardian Plate',Thread:'Threadweaver Mantle'},gloves:{Obsidian:"Devourer's Grips",Lunar:'Moonlit Handguards',Thread:'Quantum Gloves'},boots:{Obsidian:'Shadow Striders',Lunar:'Lunar Treads',Thread:'Void Walkers'},relic:{Obsidian:'Obsidian Core',Lunar:'Lunar Sigil',Thread:'Quantum Crystal'}};
const dname=it=>(ENAME[it.slot]&&ENAME[it.slot][it.set]||iname(it))+(it.lv?' +'+it.lv:'');
function eqSVG(it){const[b,m,a,e]=SETP[it.set]||SETP.Obsidian,k=++_eqk,G=`url(#m${k})`,s=it.set,sl=it.slot;
const st=`stroke="${a}" stroke-width="1.6" stroke-linejoin="round"`;let o='';
if(sl=='weapon')o=s=='Obsidian'?`<polygon points="50,5 63,22 59,67 50,76 41,67 37,22" fill="${G}" ${st}/><path d="M50,10V70" stroke="${e}" stroke-width="2.4" filter="url(#f${k})"/><rect x="28" y="66" width="44" height="7" rx="3" fill="${a}"/><rect x="46" y="73" width="8" height="18" fill="${b}" ${st}/><circle cx="50" cy="93" r="4" fill="${e}"/>`:s=='Lunar'?`<path d="M34,6C86,18,84,72,40,94C66,66,62,34,34,6Z" fill="${G}" ${st}/><path d="M38,16C70,30,70,60,48,82" fill="none" stroke="${e}" stroke-width="1.6" filter="url(#f${k})"/><rect x="26" y="78" width="24" height="6" rx="3" transform="rotate(-35 38 81)" fill="${a}"/><circle cx="30" cy="92" r="4" fill="${e}"/>`:`<rect x="47" y="14" width="6" height="78" rx="3" fill="${G}" ${st}/><circle cx="50" cy="20" r="14" fill="none" stroke="${a}" stroke-width="3"/><path d="M50,8L58,20L50,32L42,20Z" fill="${e}" filter="url(#f${k})"/><path d="M50,40C30,50 70,64 50,80" fill="none" stroke="${e}" stroke-width="1.5"/>`;
else if(sl=='helmet')o=`<path d="M22,62C20,22 80,22 78,62L71,80L58,70L50,82L42,70L29,80Z" fill="${G}" ${st}/><path d="M32,52H68L64,62H36Z" fill="#05030a" stroke="${e}" stroke-width="1.5" filter="url(#f${k})"/>`+(s=='Obsidian'?`<path d="M26,34L14,10L36,26ZM74,34L86,10L64,26Z" fill="${a}"/>`:s=='Lunar'?`<path d="M50,12C64,12 66,28 58,34C62,24 56,18 50,18C44,18 38,24 42,34C34,28 36,12 50,12Z" fill="${a}"/>`:`<path d="M30,30L18,8M70,30L82,8" stroke="${e}" stroke-width="2.4"/><circle cx="18" cy="8" r="3" fill="${e}"/><circle cx="82" cy="8" r="3" fill="${e}"/><path d="M50,22V50" stroke="${e}"/>`);
else if(sl=='armor')o=`<path d="M24,24L38,13H62L76,24L71,58L61,88H39L29,58Z" fill="${G}" ${st}/><circle cx="22" cy="26" r="11" fill="${m}" ${st}/><circle cx="78" cy="26" r="11" fill="${m}" ${st}/><path d="M50,28L60,44L50,64L40,44Z" fill="${e}" ${st} filter="url(#f${k})"/>`+(s=='Obsidian'?`<path d="M32,70H68M34,78H66" stroke="${a}" stroke-width="2"/>`:s=='Lunar'?`<path d="M36,66C46,76 54,76 64,66" fill="none" stroke="${a}" stroke-width="2"/>`:`<path d="M32,60H44M56,60H68M36,72H64" stroke="${e}" stroke-width="1.6"/>`);
else if(sl=='gloves')o=`<rect x="30" y="56" width="40" height="34" rx="6" fill="${G}" ${st}/><rect x="32" y="26" width="9" height="34" rx="4" fill="${G}" ${st}/><rect x="43" y="16" width="9" height="42" rx="4" fill="${G}" ${st}/><rect x="54" y="22" width="9" height="38" rx="4" fill="${G}" ${st}/><rect x="65" y="34" width="8" height="28" rx="4" fill="${G}" ${st}/><rect x="26" y="78" width="48" height="10" rx="3" fill="${a}"/>`+(s=='Obsidian'?`<path d="M32,26L36,8L41,26M43,16L47,2L52,16M54,22L58,6L63,22" fill="${a}"/>`:s=='Lunar'?`<circle cx="50" cy="68" r="7" fill="none" stroke="${e}" stroke-width="2"/><circle cx="50" cy="68" r="2.5" fill="${e}"/>`:`<path d="M34,70H66M34,64H66" stroke="${e}" stroke-width="1.6"/><rect x="45" y="72" width="10" height="5" fill="${e}" filter="url(#f${k})"/>`);
else if(sl=='boots')o=`<path d="M34,10H60L61,56L84,68L86,88H26L30,56Z" fill="${G}" ${st}/><rect x="24" y="84" width="64" height="8" rx="3" fill="${a}"/><rect x="33" y="14" width="27" height="8" fill="${a}"/>`+(s=='Obsidian'?`<path d="M70,70L84,60L82,76ZM72,80L90,76L84,88Z" fill="${a}"/>`:s=='Lunar'?`<path d="M34,34C18,30 14,44 18,56C24,46 28,44 34,46Z" fill="${e}" opacity=".85"/><path d="M34,28C20,20 14,28 14,36" fill="none" stroke="${a}"/>`:`<path d="M38,30H56M38,40H56M40,50H54" stroke="${e}" stroke-width="2"/><circle cx="48" cy="76" r="4" fill="${e}" filter="url(#f${k})"/>`);
else o=s=='Obsidian'?`<polygon points="50,6 78,22 78,56 50,92 22,56 22,22" fill="${G}" ${st}/><circle cx="50" cy="42" r="17" fill="${e}" filter="url(#f${k})"/><circle cx="50" cy="42" r="9" fill="#fff" opacity=".8"/><circle cx="50" cy="42" r="26" fill="none" stroke="${a}" stroke-width="1.5" stroke-dasharray="4 3"/>`:s=='Lunar'?`<circle cx="50" cy="50" r="38" fill="${G}" ${st}/><path d="M58,22C36,26 32,62 56,78C40,60 44,40 58,22Z" fill="${e}" filter="url(#f${k})"/><circle cx="66" cy="38" r="3" fill="#fff"/><circle cx="72" cy="56" r="2" fill="#fff"/>`:`<polygon points="50,4 72,34 62,92 38,92 28,34" fill="${G}" ${st} opacity=".95"/><path d="M50,4V92M28,34H72M38,92L50,34L62,92" stroke="${e}" stroke-width="1.3" fill="none" filter="url(#f${k})"/>`;
return`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="m${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${m}"/></linearGradient><filter id="f${k}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${o}</svg>`}
const OBSIDIAN_GEAR_SPRITES={
weapon:'assets/img/equipment/obsidian/obsidian_blade.png?v=162',
helmet:'assets/img/equipment/obsidian/crown_of_obsidia.png?v=162',
armor:'assets/img/equipment/obsidian/obsidian_aegis.png?v=162',
gloves:'assets/img/equipment/obsidian/devourers_grips.png?v=162',
boots:'assets/img/equipment/obsidian/shadow_striders.png?v=162',
relic:'assets/img/equipment/obsidian/obsidian_core.png?v=162'
};
const LUNAR_GEAR_SPRITES={
weapon:'assets/img/equipment/lunar/lunar_arcblade.png?v=163',
helmet:'assets/img/equipment/lunar/mooncrest_helm.png?v=163',
armor:'assets/img/equipment/lunar/lunar_guardian_plate.png?v=163',
gloves:'assets/img/equipment/lunar/moonlit_handguards.png?v=163',
boots:'assets/img/equipment/lunar/lunar_treads.png?v=163',
relic:'assets/img/equipment/lunar/lunar_sigil.png?v=163'
};
const THREAD_GEAR_SPRITES={
weapon:'assets/img/equipment/thread/golden_thread_staff.png?v=164',
helmet:'assets/img/equipment/thread/ancient_owl_visor.png?v=164',
armor:'assets/img/equipment/thread/threadweaver_mantle.png?v=164',
gloves:'assets/img/equipment/thread/quantum_gloves.png?v=164',
boots:'assets/img/equipment/thread/void_walkers.png?v=164',
relic:'assets/img/equipment/thread/quantum_crystal.png?v=164'
};
const eqImg=(it,sz)=>{
const obsidianSprite=it.set==='Obsidian'&&OBSIDIAN_GEAR_SPRITES[it.slot];
const lunarSprite=it.set==='Lunar'&&LUNAR_GEAR_SPRITES[it.slot];
const threadSprite=it.set==='Thread'&&THREAD_GEAR_SPRITES[it.slot];
const gearSprite=obsidianSprite||lunarSprite||threadSprite;
const gearClass=obsidianSprite?'obsidian-gear-art':lunarSprite?'lunar-gear-art':threadSprite?'thread-gear-art':'';
const gearImgClass=obsidianSprite?'obsidian-gear-sprite':lunarSprite?'lunar-gear-sprite':threadSprite?'thread-gear-sprite':'';
const legacyCoreArt=!gearSprite&&it.set==='Obsidian'&&it.slot==='relic'&&Number(it.r)===7;
const rarityClass=`eqi r${it.r}${it.lv>=5?' hi':''}${it.lv>=10?' fire':''}${gearClass?' '+gearClass:''}${legacyCoreArt?' obsidian-core-art':''}`;
const art=gearSprite?`<img class="eq-sprite ${gearImgClass}" src="${gearSprite}" alt="${dname(it)}" draggable="false">`:legacyCoreArt?`<img class="eq-sprite" src="assets/img/equipment/obsidian_core_ancestral.png?v=1513" alt="Obsidian Core — Ancestral" draggable="false">`:eqSVG(it);
return `<div class="${rarityClass}" title="${dname(it)}" style="--c:${RC[it.r]};width:${sz}px;height:${sz}px">${art}${it.lv>=10?'<span class="eq-fire-particles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>':''}<small>${'◆'.repeat(it.r+1)}</small></div>`;
};
const eqEmpty=(sl,sz)=>`<div class="eqi empty" style="width:${sz}px;height:${sz}px"><span>${sl.toUpperCase()}</span></div>`;
const power=id=>{const s=stats(id);return Math.round(s.atk*2+s.hp/5+s.def*3+s.spd+s.crit*500)};
const holder=it=>it.eq&&H[it.eq]?H[it.eq].n:'';
const eqOf=(id,sl)=>S.inv.find(i=>i.eq===id&&i.slot==sl);
function simStats(id,it){const old=it.eq,rm=S.inv.filter(o=>o.eq===id&&o.slot==it.slot&&o!==it);rm.forEach(o=>o.eq=null);it.eq=id;try{return stats(id)}finally{it.eq=old;rm.forEach(o=>o.eq=id)}}
function cmpRows(a,b){const K=[['atk','ATK'],['hp','HP'],['def','DEF'],['spd','SPD'],['crit','CRIT'],['bonus','SET']],f=(k,v)=>k=='crit'||k=='bonus'?(v*100).toFixed(1)+'%':Math.round(v).toLocaleString();
return K.map(([k,n])=>{const d=b[k]-a[k],ep=k=='crit'||k=='bonus'?.0005:.5,c=Math.abs(d)<ep?'var(--mu)':d>0?'var(--gr)':'var(--rd)',t=Math.abs(d)<ep?'(=)':`(${d>0?'+':'-'}${f(k,Math.abs(d))})`;return`<div class="st"><span>${n}</span><b style="color:${c}">${f(k,a[k])} → ${f(k,b[k])} ${t}</b></div>`}).join('')}
function slotCell(id,sl){const it=eqOf(id,sl);return`<div class="slc" data-a="slot" data-v="${id}|${sl}" style="--c:${it?RC[it.r]:'#4b3680'}">${it?eqImg(it,64):eqEmpty(sl,64)}<div class="sn">${it?dname(it):""}</div></div>`}
function heroM(id){const s=stats(id),h=H[id],c=90*S.lv[id],a0=S.asc[id]||0,ac=15*(a0+1),ag=500*(a0+1),xp=S.lv[id]>=cap(id)?100:Math.min(100,S.xp[id]/need(S.lv[id])*100),sets={};S.inv.forEach(i=>{if(i.eq===id)sets[i.set]=(sets[i.set]||0)+1});
const sb=Object.entries(sets).map(([n,c])=>`<span style="color:${c>=4?'var(--gold)':c>=2?'var(--gr)':'var(--mu)'}">${n} ${c}/6${c>=4?' +20%':c>=2?' +8%':''}</span>`).join(' · ')||'<span class="mu">No set pieces</span>';
M(`<div class="pg"><div class="ph"><div class="pp">${spr(id)}</div><div style="flex:1;min-width:0"><b style="font-size:20px">${h.n}</b><div class="mu">${FAC[h.f]} · ${h.t}</div><div class="mu">${h.role}${S.order.indexOf(id)>=0?' · '+(S.order.indexOf(id)<2?'Frontline':'Backline'):' · Bench'}</div><div>Lv ${S.lv[id]}/${cap(id)} <span style="color:var(--gold)">${'★'.repeat(S.star[id]||0)||'☆'}</span></div><div class="bar" style="margin:3px 0"><i style="width:${xp}%"></i></div><div class="pw">⚔ POWER ${power(id).toLocaleString()}</div></div></div>
<div class="mu" style="margin:6px 0">${h.bio}</div>
<div class="eqg"><div>${['weapon','helmet','armor'].map(x=>slotCell(id,x)).join('')}</div><div class="cp">${spr(id)}</div><div>${['gloves','boots','relic'].map(x=>slotCell(id,x)).join('')}</div></div>
<div class="card" style="text-align:center">${sb}</div>
<div class="card"><div class="st"><span>HP</span><b>${Math.round(s.hp)}</b></div><div class="st"><span>ATK</span><b>${Math.round(s.atk)}</b></div><div class="st"><span>DEF</span><b>${Math.round(s.def)}</b></div><div class="st"><span>SPD</span><b>${Math.round(s.spd)}</b></div><div class="st"><span>CRIT</span><b>${(s.crit*100).toFixed(1)}%</b></div><div class="st"><span>Set bonus</span><b>+${Math.round(s.bonus*100)}%</b></div></div>
<div class="card"><b>${h.sk}</b> — ${h.d}</div><div class="card"><b>⚡ ${h.ult}</b> — ${h.ud}</div>
<div class="row"><button class="pri" data-a="lvup" data-v="${id}" ${S.gold<c||S.lv[id]>=cap(id)?'disabled':''}>Level up (${c}💰)</button><button data-a="mv" data-v="${id}|-1">◀ Forward</button><button data-a="mv" data-v="${id}|1">Back ▶</button></div>
<div class="row"><button class="pri" data-a="asc" data-v="${id}" ${S.lv[id]<cap(id)||a0>=5||S.shards<ac||S.gold<ag?'disabled':''}>Ascend ${a0}/5 → +15% stats, +10 lv cap (${ac}🔷 ${ag}💰)</button></div>
<div class="row">${[1,2,3,4,5].map(i=>`<button data-a="place" data-v="${id}|${i-1}">Team slot ${i}</button>`).join('')}</div>
<div class="row"><button data-a="sfxt" data-v="${id}|s">🔊 Skill</button><button data-a="sfxt" data-v="${id}|u">🔊 Ultimate</button><button data-a="sfxt" data-v="${id}|a">🔊 Attack</button></div></div>`)}
function itCard(it,a,v,extra){return`<div class="card ic" data-a="${a}" data-v="${v}" style="border-color:${RC[it.r]}">${eqImg(it,56)}<div style="flex:1;min-width:0"><b style="color:${RC[it.r]}">${dname(it)}</b><div class="mu">${RAR[it.r]} · ${it.slot} · ${it.set} · Enh ${it.lv}/10</div>${itStats(it)}${it.eq?`<div class="mu">Equipped: ${holder(it)}</div>`:''}${extra||''}</div></div>`}
function slotM(id,sl){const cur=eqOf(id,sl),L=S.inv.filter(i=>i.slot==sl&&i!==cur).sort((a,b)=>b.r-a.r||b.lv-a.lv);M(`<b>${H[id].n} — ${sl.toUpperCase()}</b>`+(cur?`<div class="card" style="border-color:${RC[cur.r]}"><div class="mu">Equipped now</div>${itCard(cur,'item',cur.id).replace('card ic','ic')}<button data-a="unq2" data-v="${id}|${sl}" style="width:100%">UNEQUIP</button></div>`:'<div class="mu">Slot empty.</div>')+(L.map(it=>itCard(it,'cmp',it.id+'|'+id)).join('')||'<div class="mu">No other items for this slot.</div>')+`<button data-a="hero" data-v="${id}" style="width:100%;margin-top:6px">◀ Back</button>`)}
function cmpM(iid,id){const it=S.inv.find(i=>i.id==iid),cur=eqOf(id,it.slot),a=stats(id),b=simStats(id,it);let tr='';if(it.eq&&it.eq!==id){const o=it.eq,x=stats(o);it.eq=null;const y=stats(o);it.eq=o;tr=`<div class="card"><b>Transfer from ${H[o].n}</b><div class="mu">${H[o].n} loses this item: power ${power(o).toLocaleString()} → ${Math.round(y.atk*2+y.hp/5+y.def*3+y.spd+y.crit*500).toLocaleString()}</div></div>`}
const pa=power(id),pb=Math.round(b.atk*2+b.hp/5+b.def*3+b.spd+b.crit*500),d=pb-pa;M(`<div class="ic">${eqImg(it,84)}<div><b style="color:${RC[it.r]};font-size:17px">${dname(it)}</b><div class="mu">${RAR[it.r]} · ${it.set} · ${SETI[it.set]}</div><div class="mu">Enhancement ${it.lv}/10</div></div></div><div class="card">${itStats(it)}</div><div class="card"><b>${H[id].n}: ${cur?'replaces '+dname(cur):'fills empty slot'}</b>${cmpRows(a,b)}<div class="st"><span>POWER</span><b style="color:${d>0?'var(--gr)':d<0?'var(--rd)':'var(--mu)'}">${pa.toLocaleString()} → ${pb.toLocaleString()} (${d>0?'+':''}${d})</b></div></div>${tr}<div class="row"><button class="pri" data-a="eq3" data-v="${iid}|${id}">EQUIP</button><button data-a="slot" data-v="${id}|${it.slot}">◀ Back</button></div>`)}
function itemM(id){const it=S.inv.find(i=>i.id==id),gc=Math.round(60*(it.lv+1)*(it.r+1)*(1+(it.st||1)/20)),sc=1+it.lv,sell=15*(it.r+1)*(1+it.lv);M(`<div class="ic">${eqImg(it,96)}<div><b style="color:${RC[it.r]};font-size:17px">${dname(it)}</b><div class="mu">${RAR[it.r]} · ${it.slot} · ${it.set} · stage ${it.st}</div><div class="mu">${SETI[it.set]}</div>${it.eq?`<div>Equipped: <b>${holder(it)}</b></div>`:''}</div></div><div class="card">${itStats(it)}<div class="mu" style="margin-top:4px">Enhancement ${it.lv}/10</div><div class="bar"><i style="width:${it.lv*10}%;background:var(--gold)"></i></div></div>
<div class="mu">Equip on (shows comparison first):</div><div class="row">${S.owned.map(h=>`<button data-a="cmp" data-v="${id}|${h}" ${it.eq==h?'disabled':''}>${H[h].n}</button>`).join('')}</div>
<div class="row">${it.eq?`<button data-a="uneq" data-v="${id}">Unequip</button>`:''}<button class="pri" data-a="enh" data-v="${id}" ${it.lv>=10||S.gold<gc||S.shards<sc?'disabled':''}>Enhance (${gc}💰 ${sc}🔷)</button><button data-a="sell" data-v="${id}" ${it.eq?'disabled':''}>Sell +${sell}💰</button></div>`)}
Object.assign(act,{cmp(v){cmpM(...v.split('|'))},eq3(v){const[i,h]=v.split('|');equip(i,h);heroM(h);head()},unq2(v){const[h,sl]=v.split('|'),it=eqOf(h,sl);if(it){it.eq=null;save()}heroM(h)}});
{const _e=act.enh;act.enh=function(id){const l=S.inv.find(i=>i.id==id).lv;_e(id);const n=S.inv.find(i=>i.id==id);if(n.lv>l){const e=document.querySelector('#modal .eqi');if(e)e.classList.add('flash')}}}
const BF={cat:'all',r:'all',set:'all',eq:'all',sort:'set'};
window.bagSet=(k,v)=>{BF[k]=v;draw()};
const sel=(k,o)=>`<select onchange="bagSet('${k}',this.value)">${o.map(([v,n])=>`<option value="${v}" ${BF[k]==v?'selected':''}>${n}</option>`).join('')}</select>`;
function bagHTML(){let L=S.inv.filter(i=>(BF.cat=='all'||i.slot==BF.cat)&&(BF.r=='all'||i.r==BF.r)&&(BF.set=='all'||i.set==BF.set)&&(BF.eq=='all'||(BF.eq=='1')==!!i.eq));
L.sort(BF.sort=='set'?(a,b)=>SETS.indexOf(a.set)-SETS.indexOf(b.set)||SLOTS.indexOf(a.slot)-SLOTS.indexOf(b.slot)||b.r-a.r||b.st-a.st:BF.sort=='r'?(a,b)=>b.r-a.r||b.st-a.st:BF.sort=='a'?(a,b)=>iv(b,b.main,1)/T[b.main][0]-iv(a,a.main,1)/T[a.main][0]:(a,b)=>b.id-a.id);
return`<div class="card"><b>Inventory</b> <span class="mu">${L.length}/${S.inv.length} items · tap a card to equip, enhance or sell</span><div class="row fl">${sel('cat',[['all','All slots'],...SLOTS.map(s=>[s,s])])}${sel('r',[['all','All rarities'],...RAR.map((n,i)=>[i,n])])}${sel('set',[['all','All sets'],...SETS.map(s=>[s,s])])}${sel('eq',[['all','Equipped + free'],['1','Equipped'],['0','Not equipped']])}${sel('sort',[['set','Set order'],['r','Highest rarity'],['a','Highest main stat'],['n','Most recent']])}</div></div><div class="bg2">${L.map(it=>`<div class="bc" style="border-color:${RC[it.r]}" data-a="item" data-v="${it.id}">${eqImg(it,72)}<b style="color:${RC[it.r]}">${dname(it)}</b><div class="mu">${RAR[it.r]} · ${it.slot}</div><div class="mu">${it.set}</div><div>${T[it.main][1]} ${fmt(it.main,iv(it,it.main,1))}</div>${it.eq?`<div class="mu" style="color:var(--gold)">⚔ ${holder(it)}</div>`:''}</div>`).join('')||'<div class="mu">No items match.</div>'}</div>`}
function charsHTML(){return synHTML()+Object.keys(H).map(id=>{const own=S.owned.includes(id),h=H[id];if(!own)return`<div class="card hc" style="opacity:.45"><div class="pp">${spr(id)}</div><div><b>${h.n}</b> <span class="mu">${h.t}</span><div class="mu">🔒 Locked — recruit in Summon</div></div></div>`;
return`<div class="card cc" data-a="hero" data-v="${id}"><div class="pp">${spr(id)}</div><div style="flex:1;min-width:0"><b>${h.n}</b> <span class="mu">${h.t}</span><div class="mu">${FAC[h.f]} · ${h.role}</div><div>Lv ${S.lv[id]}/${cap(id)} <span style="color:var(--gold)">${'★'.repeat(S.star[id]||0)}</span> <span class="pw">⚔ ${power(id).toLocaleString()}</span></div><div class="mini">${SLOTS.map(sl=>{const it=eqOf(id,sl);return it?eqImg(it,34):eqEmpty('',34)}).join('')}</div></div></div>`}).join('')}
{const _d=draw;draw=function(){_d();if(view=='heroes')$('#view').innerHTML=charsHTML();else if(view=='bag')$('#view').innerHTML=bagHTML();const b=document.querySelector('#nav [data-v=heroes]');if(b)b.innerHTML='<span>👥</span>Characters'}}
