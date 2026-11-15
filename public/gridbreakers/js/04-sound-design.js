/* ===== SOUND DESIGN: per-hero skills, ultimates, attacks, boss moves ===== */
(function(){
const lastT={};let NB;
const nb=()=>{if(!NB){NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const a=NB.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}return NB};
function T(f,d,ty,v,f2,dl,at,lp){const n=AC.currentTime+(dl||0),o=AC.createOscillator(),g=AC.createGain();o.type=ty||'sine';o.frequency.setValueAtTime(f,n);if(f2)o.frequency.exponentialRampToValueAtTime(f2,n+d);
 g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(v||.1,n+Math.min(at||.01,d*.8));g.gain.exponentialRampToValueAtTime(.0005,n+d);
 if(lp){const b=AC.createBiquadFilter();b.type='lowpass';b.frequency.value=lp;o.connect(b);b.connect(g)}else o.connect(g);g.connect(MG);o.start(n);o.stop(n+d+.05)}
function N(d,v,f0,f1,ty,q,dl,at){const n=AC.currentTime+(dl||0),s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=nb();s.loop=true;f.type=ty||'bandpass';f.Q.value=q||1;f.frequency.setValueAtTime(f0,n);if(f1)f.frequency.exponentialRampToValueAtTime(f1,n+d);
 g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(v,n+Math.min(at||.01,d*.8));g.gain.exponentialRampToValueAtTime(.0005,n+d);s.connect(f);f.connect(g);g.connect(MG);s.start(n);s.stop(n+d+.05)}
const arp=(fs,ty,v,gap,len)=>fs.forEach((f,i)=>T(f,len||.5,ty,v,0,i*gap));
const S2={
 hit:()=>{T(110+R()*40,.09,'sine',.14,60);N(.06,.07,1800,600,'bandpass',1)},
 crit:()=>{T(90,.12,'sine',.18,45);N(.1,.12,3500,900,'bandpass',2);arp([1568,2093,2637],'triangle',.05,.04,.25)},
 miss:()=>N(.14,.05,2500,6000,'bandpass',2),
 heal:()=>arp([660,880],'sine',.06,.07,.35),
 heal2:()=>{arp([523,659,784,1046,1318],'triangle',.07,.07,.7);T(262,1,'sine',.06,0,0,.2)},
 pulse:()=>{},
 win:()=>arp([392,494,587,784],'triangle',.1,.12,.4),lose:()=>T(220,.8,'sawtooth',.1,90),
 /* skills */
 lyra:()=>{arp([880,1108,1318,1760],'sine',.07,.06,.8);T(220,1.2,'sine',.07,330,0,.4);N(.9,.04,6000,9000,'bandpass',4,0,.3)},
 jax:()=>{N(.22,.2,5000,700,'bandpass',3);T(2300,.5,'square',.025,2250,.05);T(90,.12,'sine',.2,45,.08)},
 kira:()=>{for(let i=0;i<8;i++)T(300+Math.floor(R()*8)*160,.04,'square',.05,0,i*.035);T(1800,.3,'sawtooth',.04,200,.28,.01,2000)},
 kai:()=>{arp([523,659,784,1046],'triangle',.07,.08,.6);T(260,.5,'sawtooth',.04,720,0,.2,900)},
 aeon:()=>{N(.9,.3,300,60,'lowpass',1,.02);N(.12,.25,6000,2000,'highpass',1);T(3200,.25,'sawtooth',.05,180);T(60,.5,'square',.06,0,.05,.01,300)},
 orion:()=>{arp([440,660,880],'sine',.07,0,1.4);T(1320,1.6,'sine',.06,0,.05);T(165,1.4,'triangle',.08,160,0,.15)},
 titan:()=>{T(85,.5,'sine',.3,28);N(.5,.25,500,120,'lowpass',1);T(220,.35,'square',.05,0,.02,.01,900)},
 vex:()=>{[0,.14,.28].forEach((d,i)=>N(.18,.16/(i+1),4200,900,'bandpass',3,d));T(120,.2,'sawtooth',.08,40,.02,.01,500)},
 /* ultimates */
 ult:()=>{N(.7,.14,200,2500,'bandpass',2,0,.5);T(110,.8,'sawtooth',.05,440,0,.4,800)},
 u_lyra:()=>{[220,277,330,440,554].forEach((f,i)=>T(f,2,'sine',.05,0,i*.05,.5));arp([880,1108,1318,1760,2217],'sine',.05,.1,.9);N(1.6,.04,5000,9000,'bandpass',4,0,.6)},
 u_jax:()=>{[0,.12,.24].forEach(d=>N(.2,.22,5200,600,'bandpass',3,d));T(70,.7,'sine',.35,26,.34);N(.5,.3,2500,300,'lowpass',1,.34);T(2400,1,'square',.03,0,.34)},
 u_kira:()=>{T(900,.7,'sawtooth',.09,60,0,.01,1500);for(let i=0;i<14;i++)T(200+Math.floor(R()*12)*140,.04,'square',.06,0,.45+i*.03);N(1,.2,800,80,'lowpass',1,.45)},
 u_kai:()=>{arp([262,330,392,523,659,784,1046,1318,1568],'triangle',.06,.07,.9);T(130,1.6,'sine',.1,0,0,.5);T(196,1.6,'sine',.07,0,0,.5)},
 u_aeon:()=>{[0,.25,.55].forEach((d,i)=>{N(.9,.35-i*.05,400,70,'lowpass',1,d);N(.1,.25,7000,2500,'highpass',1,d);T(4000,.3,'sawtooth',.05,150,d)});T(45,1.6,'sine',.35,22)},
 u_orion:()=>{[220,330,440,660].forEach((f,i)=>T(f,1.8,'sawtooth',.035,0,0,.5,700+i*200));T(1320,2,'sine',.08,0,.5);T(165,2,'sine',.12,0,.5);N(.5,.1,3000,6000,'bandpass',2,.45)},
 u_titan:()=>{T(70,1.6,'sine',.4,20);[0,.35,.7].forEach(d=>N(.5,.28,400,70,'lowpass',1,d));T(180,.6,'square',.07,0,.02,.01,800);T(110,.7,'square',.05,0,.7,.01,600)},
 u_vex:()=>{T(60,.15,'sine',.3,40);T(60,.15,'sine',.3,40,.22);[.7,.84,.98].forEach((d,i)=>N(.22,.28/(i+1),5000,500,'bandpass',3,d));T(55,.9,'sine',.35,22,.7);N(.5,.2,2000,200,'lowpass',1,.7)},
 /* basic attacks: heroes then enemies */
 a_lyra:()=>{T(140,.1,'sine',.12,70);N(.05,.06,1500,700,'bandpass',1)},
 a_jax:()=>{N(.12,.14,4500,1200,'bandpass',3);T(1800,.15,'square',.015)},
 a_kira:()=>{N(.08,.1,6000,2500,'bandpass',3);T(900,.08,'square',.03,400)},
 a_kai:()=>{T(1200,.06,'square',.04,700);T(1600,.06,'square',.03,0,.05)},
 a_aeon:()=>{T(2600,.1,'sawtooth',.04,500);N(.05,.07,5000,2000,'highpass',1)},
 a_orion:()=>{T(988,.25,'sine',.06);T(1480,.2,'sine',.04,0,.04)},
 a_titan:()=>{T(70,.18,'sine',.22,35);N(.08,.1,600,200,'lowpass',1)},
 a_vex:()=>{N(.09,.14,5200,1500,'bandpass',4);T(180,.07,'sawtooth',.06,90)},
 a_wraith:()=>N(.3,.06,1500,500,'bandpass',6),
 a_raider:()=>{N(.07,.12,3500,1800,'bandpass',4);T(300,.05,'square',.04)},
 a_drone:()=>{T(1500,.09,'square',.04,500);T(2200,.06,'square',.03,0,.07)},
 a_stalker:()=>{N(.14,.12,3000,800,'bandpass',2);T(140,.1,'sawtooth',.06,80)},
 a_knight:()=>{T(200,.2,'square',.07,0,0,.01,1200);N(.1,.12,2500,900,'bandpass',2)},
 a_ouro:()=>{T(90,.3,'sawtooth',.1,50,0,.01,500);N(.2,.1,800,200,'lowpass',1)},
 /* Ouro */
 'b:DATA PULSE':()=>{T(50,.9,'sine',.4,24);T(300,.9,'sawtooth',.06,1800,0,.1,2500);for(let i=0;i<6;i++)T(900+R()*1600,.04,'square',.04,0,.1+i*.08)},
 'b:VOID BREATH':()=>{N(1.3,.3,500,150,'lowpass',1,0,.35);T(70,1.3,'sawtooth',.12,50,0,.3,300);T(73,1.3,'sawtooth',.1,52,0,.3,300)},
 'b:SERPENT STRIKE':()=>{N(.22,.25,7000,2500,'highpass',1);T(100,.25,'sine',.3,40,.05);N(.3,.12,3000,500,'bandpass',2,.05)},
 'b:TAIL ANNIHILATION':()=>{N(.5,.25,300,2500,'bandpass',1.5,0,.25);N(.9,.4,700,100,'lowpass',1,.4);T(60,.9,'sine',.35,24,.4)},
 'b:CORRUPTION STORM':()=>{for(let i=0;i<6;i++){N(.4,.22,500,80,'lowpass',1,i*.14);T(3000+R()*1500,.12,'sawtooth',.04,200,i*.14)}},
 'b:DEVOURER RAGE':()=>{[55,58,110,113].forEach(f=>T(f,1.8,'sawtooth',.1,f*.5,0,.05,500));N(1.6,.3,900,120,'lowpass',1,0,.1);T(40,1.8,'sine',.4,18);T(880,1.2,'square',.025,0,.1,.01,2000)},
 warn:()=>[0,.22].forEach(d=>{T(440,.18,'square',.05,0,d,.01,1800);T(554,.18,'square',.04,0,d+.11,.01,1800)}),
 awake:()=>{T(40,2.6,'sine',.35,70,0,1.2);N(2.4,.2,150,500,'lowpass',1,0,1.2);T(55,2.4,'sawtooth',.06,90,0,1.4,300);T(1500,.5,'sine',.03,0,1.9)},
 /* status */
 shield:()=>arp([700,1050,1400],'sine',.06,.05,.4),
 sbreak:()=>{N(.4,.2,8000,2500,'highpass',1);arp([1800,1400,900,500],'triangle',.05,.04,.25)},
 stun:()=>{T(2500,.18,'sawtooth',.05,300);N(.15,.1,5000,1500,'highpass',1)},
 die:()=>{T(160,.5,'sawtooth',.1,40,0,.01,700);N(.4,.1,800,150,'lowpass',1)}};
sfx=function(n){if(!AC||S.snd===false)return;const t=performance.now();if(lastT[n]&&t-lastT[n]<(/^(hit|crit|a_)/.test(n)?60:30))return;lastT[n]=t;const f=S2[n];if(f)try{f()}catch(e){}};
window.SFXNAMES=Object.keys(S2);
const _u=ultFx;ultFx=function(u){_u(u);sfx('u_'+u.id)};
const _c=castFx;castFx=function(u){const k=B&&B.kind;_c(u);if(u.boss)sfx('b:'+(k||'DATA PULSE'))};
const _o=onFx;onFx=function(f){const v=V[f.u];if(v){if(f.k=='a')sfx('a_'+v.u.id);else if(f.k=='h'&&f.v>=v.u.max*.3)sfx('heal2')}_o(f)};
/* status sounds: shield up/break, stun, death, boss awake/warning */
const st={};let bossSeen=null,warned=0,lastW='';
setInterval(()=>{if(!AC||view!='battle'||!B)return;const wv=B.wave+'|'+B.dg+'|'+B.stage,quiet=wv!==lastW;lastW=wv;
 for(const k in V){const w=V[k],u=w.u;if(w.snake)continue;const s=(u.sh>1&&!u.dead)?1:0,z=u.stun>0?1:0,d=u.dead?1:0,p=st[k];
  if(!p||p.u!==u||quiet){st[k]={s,z,d,u};continue}
  if(s&&!p.s)sfx('shield');else if(!s&&p.s&&!u.dead)sfx('sbreak');if(z&&!p.z)sfx('stun');if(d&&!p.d)sfx('die');p.s=s;p.z=z;p.d=d}
 const bu=B.enemies&&B.enemies.find(e=>e.boss&&!e.dead);
 if(bu){if(bossSeen!==bu){bossSeen=bu;sfx('awake')}if(B.pulse<1.6&&B.pulse>0&&!warned){warned=1;sfx('warn')}else if(B.pulse>2)warned=0}else bossSeen=null},100);
/* audition buttons in the hero panel */
const _h=heroM;heroM=function(id){_h(id);const m=document.querySelector('#modal>div');if(m&&m.lastElementChild){const r=document.createElement('div');r.className='row';r.innerHTML=`<button data-a="sfxt" data-v="${id}|s">🔊 Skill</button><button data-a="sfxt" data-v="${id}|u">🔊 Ultimate</button><button data-a="sfxt" data-v="${id}|a">🔊 Attack</button>`;m.insertBefore(r,m.lastElementChild)}};
act.sfxt=v=>{const[id,t]=v.split('|');sfx(t=='s'?id:t=='u'?'u_'+id:'a_'+id)};
})();
