/* ===== OBSIDIAN AGE UPGRADE: 3D relief, map, VFX, Ouro ===== */
(function(){
/* v1.2: hero() lives inside this block; 16-visual-polish.js wraps it (hero=function...) and used to crash with "hero is not defined", which aborted the rest of that file. Expose it so the wrapper reaches the real binding. */
try{Object.defineProperty(window,'hero',{configurable:true,get(){return hero},set(f){hero=f}})}catch(e){}
if(typeof THREE=='undefined'||!R3)return;
const V3=THREE.Vector3,lerp=(a,b,t)=>a+(b-a)*t,cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const GE={oct:new THREE.OctahedronGeometry(.16),tet:new THREE.TetrahedronGeometry(.2),pan:new THREE.PlaneGeometry(.55,.85),box:new THREE.BoxGeometry(1,1,1),tor:new THREE.TorusGeometry(1,.06,6,40),ico:new THREE.IcosahedronGeometry(1,1)};
const LAM=(c,e)=>new THREE.MeshStandardMaterial({color:c,roughness:.85,metalness:.1,flatShading:true,emissive:e||0});
const noise=(x,z)=>Math.sin(x*.7)*Math.cos(z*.5)+.5*Math.sin(x*1.9+z*1.3)+.25*Math.sin(z*2.7-x*2.1);
const spr=(c,s)=>{const p=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color:c,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));p.scale.set(s,s,1);return p};
/* ---------- 1. 3D WORLD: dunes, mountains, ruins, mist ---------- */
function world(grp,col,emi,gold){
 [-1,1].forEach(sd=>{const g=new THREE.PlaneGeometry(16,70,24,50);g.rotateX(-Math.PI/2);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),t=(x+8)/16,d=sd>0?t:1-t;p.setY(i,Math.max(0,d-.28)*(3+noise(x*sd,z)*2.2)*(1+d*d*2.2)-.05)}
  g.computeVertexNormals();const m=new THREE.Mesh(g,LAM(col,emi));m.position.set(sd*15.5,0,-12);grp.add(m)});
 const mO=LAM(0x1a1030,0x2a1050),mG=new THREE.MeshBasicMaterial({color:gold?0xf5b94a:0x38e8ff});
 for(let i=0;i<8;i++){const sd=i%2?1:-1,z=-8-i*3.2,h=5+R()*5,t=new THREE.Group(),b=new THREE.Mesh(new THREE.BoxGeometry(1.4,h,1.4),mO),c=new THREE.Mesh(new THREE.ConeGeometry(1,2,4),mO),s=new THREE.Mesh(new THREE.BoxGeometry(1.5,.1,1.5),mG);
  b.position.y=h/2;c.position.y=h+1;c.rotation.y=.78;s.position.y=h*.6;t.add(b,c,s);t.position.set(sd*(9+R()*3),0,z);t.rotation.y=R();grp.add(t)}
 for(const x of[-3,3]){const p=new THREE.Mesh(new THREE.BoxGeometry(1.2,9,1.2),mO);p.position.set(x,4.5,-34);grp.add(p)}
 const lt=new THREE.Mesh(new THREE.BoxGeometry(8.4,1,1.4),mO);lt.position.set(0,9.2,-34);grp.add(lt);
 const ey=new THREE.Mesh(new THREE.TorusGeometry(1.1,.12,6,24),mG);ey.position.set(0,6.5,-33.4);grp.add(ey);
 for(let i=0;i<7;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(4+R()*3,9+R()*8,6),mO);m.position.set((i-3)*11+R()*4,3,-46-R()*8);grp.add(m)}
 for(let i=0;i<9;i++){const s=spr(gold?0xb88a4a:0x6a5a9a,7+R()*4);s.material.opacity=.16;s.position.set((R()-.5)*20,.5,-4-R()*28);s.userData.d=R()*6;grp.add(s);MIST.push(s)}}
const MIST=[];
world(KG,0x7a5128,0x1a0c10,1);world(VD,0x153a2c,0x04141a,0);
/* ---------- 3. FLOATERS ---------- */
floater=function(v,txt,col,big){const s=document.createElement('span'),p=new V3(v.x+(R()-.5)*.6,v.snake?1.4:v.h*1.3,v.z).project(CAM),t=String(txt),heal=t[0]=='+',cr=col=='#ffd34a';
 s.className='fl'+(cr?' cr':'')+(heal?' he':'')+(big&&!cr&&!heal?' sk2':'');s.textContent=cr?t+'!':t;
 s.style.cssText=`left:${(p.x*.5+.5)*CW}px;top:${(-p.y*.5+.5)*CH}px;color:${col}`;$('#hudu').appendChild(s);setTimeout(()=>s.remove(),1100)};
/* ---------- FX primitives ---------- */
function panels(w,c,d,n){const g=new THREE.Group();for(let i=0;i<n;i++){const m=new THREE.Mesh(GE.pan,mat(c,{opacity:.7})),a=i/n*6.283;m.position.set(Math.cos(a)*.8,0,Math.sin(a)*.8);m.rotation.y=Math.PI/2-a;g.add(m)}
 addFx(g,d,p=>{g.rotation.y=p*3;const s=.6+.5*Math.min(1,p*4);g.scale.set(s,s+.2,s);g.position.set(w.x,.7+p*.4,w.z);g.children.forEach(m=>m.material.opacity=fade(p)*.8)})}
function wings(v,c,d){const g=new THREE.Group();[-1,1].forEach(sd=>{for(let i=0;i<5;i++){const m=new THREE.Mesh(GE.pan,mat(c,{opacity:.8}));m.position.set(sd*(.35+i*.3),i*.17,0);m.rotation.z=-sd*(.5+i*.14);m.scale.set(1+i*.15,1+i*.35,1);g.add(m)}});
 g.position.set(v.x,1.1,v.z-.2);g.quaternion.copy(CAM.quaternion);addFx(g,d,p=>{g.scale.x=1+Math.sin(p*10)*.12;g.children.forEach(m=>m.material.opacity=fade(p)*.8)})}
function spiral(w,c,d,n){const g=new THREE.Group();for(let i=0;i<n;i++)g.add(spr(c,.2));g.position.set(w.x,0,w.z);
 addFx(g,d,p=>g.children.forEach((s,i)=>{const a=p*9+i*12.56/n,h=((i/n)+p)%1*2;s.position.set(Math.cos(a)*.5,h,Math.sin(a)*.5);s.material.opacity=fade(p)}))}
function drone(a,b,c,d){const m=new THREE.Mesh(GE.oct,mat(c));addFx(m,d,p=>{const t=Math.min(1,p*1.2);m.position.set(lerp(a.x,b.x,t),lerp(1.8,1.2,t)+Math.sin(t*3.14)*1.2,lerp(a.z,b.z,t));m.rotation.y=p*12;m.material.opacity=1-p*.5})}
function zig(a,b,c,d,j){const g=new THREE.Group();let p0=a.clone();for(let i=1;i<=7;i++){const p1=a.clone().lerp(b,i/7);if(i<7){p1.x+=(R()-.5)*j;p1.y+=(R()-.5)*j;p1.z+=(R()-.5)*j}const m=new THREE.Mesh(BG,mat(c));m.position.copy(p0).lerp(p1,.5);m.scale.set(1.4,1.4,p0.distanceTo(p1)+.01);m.lookAt(p1);g.add(m);p0=p1}
 addFx(g,d,p=>g.children.forEach(m=>m.material.opacity=(1-p)*(R()<.6?1:.4)))}
function link(a,b,c,d,w){const m=new THREE.Mesh(BG,mat(c));m.position.copy(a).lerp(b,.5);m.scale.set(w,w,a.distanceTo(b));m.lookAt(b);addFx(m,d,p=>{const k=w*(1+Math.sin(p*30)*.3)*(1-p*.5);m.scale.x=m.scale.y=k;m.material.opacity=fade(p)})}
function rocks(x,z,c,n,d){const g=new THREE.Group(),vs=[];for(let i=0;i<n;i++){const m=new THREE.Mesh(GE.tet,new THREE.MeshLambertMaterial({color:c,transparent:true}));m.position.set(x,.2,z);m.scale.setScalar(.6+R()*1.2);g.add(m);vs.push([(R()-.5)*4,3+R()*4,(R()-.5)*3])}
 addFx(g,d,p=>g.children.forEach((m,i)=>{const v=vs[i],t=p*d;m.position.set(x+v[0]*t,Math.max(.1,.2+v[1]*t-5*t*t),z+v[2]*t);m.rotation.x+=.2;m.material.opacity=p>.7?(1-p)/.3:1}))}
function cracks(x,z,c,d,n,L){const g=new THREE.Group();for(let i=0;i<n;i++){const m=new THREE.Mesh(GE.box,mat(c));m.userData.a=i/n*6.283+R()*.3;g.add(m)}g.position.set(x,.05,z);
 addFx(g,d,p=>g.children.forEach(m=>{const a=m.userData.a,l=L*Math.min(1,p*3);m.scale.set(.09+.05*Math.sin(p*20),.02,l);m.position.set(Math.cos(a)*l/2,0,Math.sin(a)*l/2);m.rotation.y=Math.PI/2-a;m.material.opacity=p<.7?1:(1-p)/.3}))}
function shock(x,z,c,r,d){const m=new THREE.Mesh(GE.tor,mat(c));m.rotation.x=Math.PI/2;m.position.set(x,.15,z);addFx(m,d,p=>{const s=.3+r*p;m.scale.set(s,s,1+p*4);m.material.opacity=1-p})}
function mark(v,c,d){const g=new THREE.Group(),t=new THREE.Mesh(GE.tor,mat(c)),o=new THREE.Mesh(GE.oct,mat(c)),y=(v.h||2)*1.15;t.scale.setScalar(.45);t.rotation.x=1.2;o.scale.setScalar(1.3);g.add(t,o);
 addFx(g,d,p=>{g.rotation.y=p*10;g.position.set(v.x,y+p*.3,v.z);g.children.forEach(m=>m.material.opacity=fade(p))})}
function after(a,b,c,d){const g=new THREE.Group();for(let i=0;i<5;i++){const s=spr(c,.9);s.scale.set(.9,1.7,1);s.position.set(lerp(a.x,b.x,i/4),1,lerp(a.z,b.z,i/4));g.add(s)}addFx(g,d,p=>g.children.forEach((s,i)=>s.material.opacity=fade(p)*(.3+i*.15)))}
/* ---------- 3. HERO SKILLS & ULTIMATES ---------- */
function hero(u,big){const v=V[u.uid];if(!v)return;const foes=alive(u.team==0?B.enemies:B.allies),fr=alive(u.team==0?B.allies:B.enemies),P=x=>V[x.uid]||v,c=HC[u.id]||0xffffff,me=new V3(v.x,1.2,v.z),Tp=w=>new V3(w.x,1.1,w.z),front=foes.length?P(foes[0]):v,tg=big?foes.map(P):(foes.length?[front]:[]);
 switch(u.id){
 case 'lyra':fr.forEach(a=>{const w=P(a);panels(w,0x9fd4ff,big?1.8:1.3,6);if(big)panels(w,0xffffff,2,10);shock(w.x,w.z,0xdfeeff,1.5,.7);moteFx(w.x,w.z,0xdfeeff,5)});wings(v,0x9fd4ff,big?1.6:1.1);if(big){flareFx(v.x,4,v.z,0xdfeeff,9,1.2);decalFx(TX.wave,0,1.5,0x9fd4ff,2,16,1.4,0)}break;
 case 'jax':tg.forEach(t=>{slashFx2(t.x,t.z,0xff4fd8,.6,big?2.6:1.8,.35);slashFx2(t.x,t.z,0xffffff,-.7,big?2.2:1.5,.3,.2);after(v,t,0xff4fd8,.5);flareFx(t.x,1,t.z,0xff4fd8,2.2,.35);spark(t.x,1,t.z,0xff4fd8,14);if(big){beamFx(t.x,t.z,0xffffff,6,.8,.7);shock(t.x,t.z,0xff4fd8,3,.6)}});shake(big?.5:.2);break;
 case 'kira':{const k=foes.length?P(foes.reduce((m,e)=>e.hp<m.hp?e:m)):v;if(!v.ult&&v.spr){v.spr.visible=false;setTimeout(()=>{if(v.spr)v.spr.visible=true},170)}
  spark(v.x,1,v.z,0xa46bff,10);beamFx(v.x,v.z,0xa46bff,3,.6,.4);(big?tg:[k]).forEach(t=>{link(me,Tp(t),0x38e8ff,.5,.35);slashFx2(t.x,t.z,0xa46bff,.4,1.7,.35);slashFx2(t.x,t.z,0x38e8ff,-.5,1.5,.3,.1);shock(t.x,t.z,0x38e8ff,2,.6);flareFx(t.x,1,t.z,0x38e8ff,1.8,.3);spark(t.x,1,t.z,0xa46bff,10)});break}
 case 'kai':fr.forEach(a=>{const w=P(a);beamFx(w.x,w.z,0xf5e08a,big?5.5:4,1.5,1);beamFx(w.x,w.z,0x4be28a,3.2,.8,1);spiral(w,0x6dffa8,1.1,big?16:10);shock(w.x,w.z,0x4be28a,1.7,.8);drone(v,w,0xf5e08a,.7);if(big)drone(v,w,0x9affc0,.9)});if(big)flareFx(v.x,1.2,v.z,0xf5e08a,4,.6);break;
 case 'aeon':tg.forEach((w,i)=>{boltFx(w.x,w.z,0x38e8ff);boltFx(w.x,w.z,0xffffff);beamFx(w.x,w.z,0x38e8ff,6,1.1,.7);mark(w,0x38e8ff,1.2);flareFx(w.x,.8,w.z,0x38e8ff,1.6,.3);if(i&&big)zig(Tp(tg[i-1]),Tp(w),0x7ff6ff,.4,.9)});zig(me,Tp(tg[0]||v),0x38e8ff,.35,.7);shake(big?.5:.2);break;
 case 'orion':fr.forEach(a=>{const w=P(a);beamFx(w.x,w.z,0xf5b94a,4.5,1.8,1);spiral(w,0xffe08a,1.1,10);panels(w,0xf5b94a,1.4,5);moteFx(w.x,w.z,0xffe08a,6)});wings(v,0xffe08a,1.4);if(big){tg.forEach(w=>beamFx(w.x,w.z,0xffffff,7,2.2,1));flareFx(v.x,1.5,v.z,0xffe08a,6,1)}break;
 case 'titan':tg.forEach(t=>{cracks(t.x,t.z,0xff8a2a,1.3,9,big?4:3.2);shock(t.x,t.z,0xff8a2a,big?5:3.5,.7);shock(t.x,t.z,0xffd08a,2,.5);rocks(t.x,t.z,0x3a2a45,big?12:8,1);moteFx(t.x,t.z,0x9a6a38,10);spark(t.x,.6,t.z,0xff8a2a,14)});if(big)cracks(0,-4,0xff8a2a,1.6,14,10);shake(big?.8:.45);break;
 case 'vex':{const k=foes.length?P(foes.reduce((m,e)=>e.hp>m.hp?e:m)):v;(big?tg:[k]).forEach(t=>{mark(t,0xb25cff,1.2);link(me,Tp(t),0xb25cff,.8,.5);for(let i=0;i<3;i++)drone(v,t,0xb25cff,.4+i*.1);slashFx2(t.x,t.z,0xb25cff,.5,1.8,.3);beamFx(t.x,t.z,0xb25cff,3.2,1.2,.8);flareFx(t.x,1,t.z,0xffffff,2,.3);spark(t.x,1,t.z,0xb25cff,12)});shake(big?.5:.25);break}}}
castFx=function(u){const v=V[u.uid];if(!v)return;fxTex();if(!u.sk){if(u.boss||v.snake)bossFx(u,v);return}sfx(u.id);hero(u,0)};
let zoomT=0;ultFx=function(u){const v=V[u.uid];if(!v)return;fxTex();shake(.6);flashFx(HC[u.id]||0xffffff);zoomT=1.1;hero(u,1)};
/* ---------- 4. DAMAGE / HEAL / SHIELD ---------- */
xFx=function(f){const v=V[f.u];if(!v||!TX)return;
 if(f.k=='d'){const col=v.u.ally?0xff6a6a:(f.c?0xffd34a:0xfff0c0);flareFx(v.x,1.1,v.z,col,f.c?3:1.4,.28);if(f.c){shock(v.x,v.z,0xffd34a,2.2,.45);spark(v.x,1.2,v.z,0xffd34a,8)}}
 else if(f.k=='h'){const sup=f.v>=v.u.max*.3,c=sup?0xf5e08a:0x4be28a;beamFx(v.x,v.z,c,sup?5:3.2,sup?1.6:1,.9);spiral(v,sup?0xf5e08a:0x7affb0,1,sup?16:8);shock(v.x,v.z,c,sup?2.2:1.4,.7);if(sup)flareFx(v.x,1.2,v.z,0xf5e08a,3,.5)}};
/* ---------- 5. OURO ---------- */
makeOuro=function(){const g=new THREE.Group(),segs=[],rings=[],N=30,
 bm=new THREE.MeshStandardMaterial({color:0x0c0716,roughness:.3,metalness:.7,emissive:0x1a0a30,flatShading:true}),bm2=bm.clone(),gold=new THREE.MeshBasicMaterial({color:0xf5b94a}),eye=new THREE.MeshBasicMaterial({color:0xffd34a}),cy=new THREE.MeshBasicMaterial({color:0x9ff6ff}),bone=new THREE.MeshStandardMaterial({color:0x2a1a44,emissive:0x4a2a00,flatShading:true});bm2.color.setHex(0x1b1030);
 for(let i=0;i<N;i++){const q=i/(N-1),r=i==N-1?.5:.12+.46*Math.pow(Math.sin(Math.min(1,q*1.15)*Math.PI*.5),.8),m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),i%2?bm:bm2);m.scale.set(1,.85,1.35);m.userData.r=r;g.add(m);segs.push(m);
  const rg=new THREE.Mesh(new THREE.TorusGeometry(r*1.02,.03,6,16),gold);g.add(rg);rings.push(rg);
  if(i<N-1&&i%2==0){const sp=new THREE.Mesh(new THREE.ConeGeometry(r*.28,r*1.1,5),bone);sp.position.y=r*.95;m.add(sp)}}
 const head=segs[N-1],jaw=new THREE.Group(),jm=new THREE.Mesh(new THREE.BoxGeometry(.55,.12,.85),bm2);jm.position.set(0,-.26,.5);jaw.add(jm);head.add(jaw);
 [-1,1].forEach(sd=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),eye);e.position.set(sd*.24,.12,.5);head.add(e);const h=new THREE.Mesh(new THREE.ConeGeometry(.12,.95,6),bone);h.position.set(sd*.3,.38,-.1);h.rotation.set(-.8,0,sd*.5);head.add(h)});
 for(let i=0;i<7;i++){const x=(i-3)*.075,u=new THREE.Mesh(new THREE.ConeGeometry(.035,.2,5),cy),l=new THREE.Mesh(new THREE.ConeGeometry(.035,.2,5),cy);u.position.set(x,-.08,.82);u.rotation.x=Math.PI;l.position.set(x,-.12,.82);jaw.add(l);head.add(u)}
 const aura=spr(0xb25cff,2.4);aura.position.z=.2;head.add(aura);return{g,segs,rings,bm,bm2,gold,eye,jaw,head}};
const KINDS=[['DATA PULSE','SERPENT STRIKE'],['DATA PULSE','VOID BREATH','SERPENT STRIKE','TAIL ANNIHILATION','CORRUPTION STORM'],['VOID BREATH','TAIL ANNIHILATION','CORRUPTION STORM','DEVOURER RAGE','DATA PULSE']];
const phase=u=>u.hp/u.max>.66?0:u.hp/u.max>.33?1:2;
function bossFx(u,v){const k=B.kind||'DATA PULSE',al=alive(B.allies).map(a=>V[a.uid]).filter(Boolean),hp=new V3(),tl=new V3(),N=v.snake.segs.length;v.snake.segs[N-1].getWorldPosition(hp);v.snake.segs[0].getWorldPosition(tl);sfx('pulse');
 const cx=al.length?al.reduce((s,w)=>s+w.x,0)/al.length:0,cz=al.length?al.reduce((s,w)=>s+w.z,0)/al.length:2,ctr=new V3(cx,.8,cz);
 if(k=='DATA PULSE'){shock(0,v.z+.5,0xf5b94a,15,1.1);shock(0,v.z+.5,0x38e8ff,10,.9);al.forEach(w=>flareFx(w.x,1,w.z,0xf5b94a,2,.4));shake(.5)}
 else if(k=='VOID BREATH'){link(hp,ctr,0xb25cff,1.2,4.5);link(hp,ctr,0xffffff,.6,1.5);al.forEach(w=>moteFx(w.x,w.z,0xb25cff,8));shake(.4)}
 else if(k=='SERPENT STRIKE'){v.ax=0;v.az=1;v.lunge=.5;const w=al[0];if(w){slashFx2(w.x,w.z,0xff4d6d,.4,2.4,.4);flareFx(w.x,1,w.z,0xffffff,2.5,.3);spark(w.x,1,w.z,0xff4d6d,14)}shake(.45)}
 else if(k=='TAIL ANNIHILATION'){for(let i=0;i<3;i++)slashFx2(cx,cz,0xf5b94a,.3*i-.3,6,.45,i*.15);shock(tl.x,tl.z,0xf5b94a,12,.8);rocks(cx,cz,0x3a2a45,8,1);shake(.6)}
 else if(k=='CORRUPTION STORM'){const go=()=>alive(B.allies).forEach(a=>{const w=V[a.uid];if(w){boltFx(w.x,w.z,0xb25cff);boltFx(w.x,w.z,0x38e8ff);beamFx(w.x,w.z,0x6a2ab0,5,1.2,.6)}});go();setTimeout(go,350);shake(.5)}
 else{flashFx(0xff4d6d);shake(.9);zoomT=.9;shock(0,v.z+.5,0xff4d6d,16,1.2);shock(0,v.z+.5,0xf5b94a,11,1);al.forEach(w=>{beamFx(w.x,w.z,0xff4d6d,6,1.5,.9);boltFx(w.x,w.z,0xffd34a)})}
 const L=KINDS[phase(u)];B.ki=(B.ki||0)+1;B.kind=L[B.ki%L.length]}
/* Telegraphs: pooled meshes, one shape per attack */
const tgS=new THREE.Mesh(PG,amat(TX.beam,0xff4d6d,{opacity:0})),tgR=[0,1,2,3,4].map(()=>new THREE.Mesh(PG,amat(TX.rune,0xff4d6d,{opacity:0})));
tgS.rotation.x=-Math.PI/2;tgR.forEach(m=>m.rotation.x=-Math.PI/2);SC.add(tgS);tgR.forEach(m=>SC.add(m));tgS.visible=false;tgR.forEach(m=>m.visible=false);
function telegraph(bu,bv,k,pr,t){const pul=.55+.45*Math.sin(t*18),al=alive(B.allies).map(a=>V[a.uid]).filter(Boolean);tgS.visible=false;tgR.forEach(m=>m.visible=false);
 const strip=(x,z0,z1,w,c)=>{tgS.visible=true;tgS.material.color.setHex(c);tgS.material.opacity=pul*.8*pr;tgS.position.set(x,.08,(z0+z1)/2);tgS.scale.set(w,Math.abs(z1-z0),1);tgS.rotation.z=0},ring=(i,x,z,s,c)=>{const m=tgR[i];m.visible=true;m.material.color.setHex(c);m.material.opacity=pul*.85*pr;m.position.set(x,.09,z);m.scale.set(s,s,1);m.rotation.z=t*2};
 if(k=='DATA PULSE'){const z=lerp(bv.z,3,pr);strip(0,z-.5,z+.5,16,0xf5b94a)}
 else if(k=='VOID BREATH')strip(0,bv.z+1,4,4.6,0xb25cff);
 else if(k=='SERPENT STRIKE'){const w=al[0];if(w)strip(w.x,bv.z+1,w.z+.8,1.4,0xff4d6d)}
 else if(k=='TAIL ANNIHILATION'){ring(0,0,1.2,14*pr+2,0xff8a2a)}
 else if(k=='CORRUPTION STORM')al.slice(0,5).forEach((w,i)=>ring(i,w.x,w.z,2.2,0xb25cff));
 else{ring(0,0,1,16,0xff4d6d);al.slice(0,4).forEach((w,i)=>ring(i+1,w.x,w.z,2.4,0xffd34a))}
 let e=document.querySelector('#bwarn');if(!e){const a=document.querySelector('#arena');if(!a)return;e=document.createElement('div');e.id='bwarn';a.appendChild(e)}e.textContent='⚠ '+k;e.style.display='block'}
/* ---------- 6. CAMERA + PER-FRAME ---------- */
let cine=0;const CLOSE=new V3(0,2.4,-.6),LC=new V3(0,2.6,-5),LD=new V3(0,0,-1),DP=new V3(),TL=new V3(),ZP=new V3(0,3,2);
const _build=build;build=function(){for(const k in V){const w=V[k];if(w.snake)w.snake.g.traverse(o=>{if(o.geometry)o.geometry.dispose()});if(w.dome)w.dome.material.dispose();if(w.halo)w.halo.material.dispose()}
 _build();B.kind=B.kind||'DATA PULSE';const bu=B.enemies.find(e=>e.boss);if(bu&&R3&&view=='battle'){cine=2.8;holdT=2.8;const a=$('#arena');if(a){const d=document.createElement('div');d.className='cin2';d.innerHTML='<b>OURO</b><span>DEVOURER OF CODE</span>';a.appendChild(d);setTimeout(()=>d.remove(),3200)}}};
document.addEventListener('click',()=>{if(cine>0){cine=0;holdT=0}});
postFx=function(dt){
 const fv=CAM.aspect<.8?56:42;if(CAM.fov!==fv){CAM.fov=fv;CAM.updateProjectionMatrix()}
 MIST.forEach(s=>{s.position.x+=Math.sin(T3*.2+s.userData.d)*.004;s.material.opacity=.13+.05*Math.sin(T3*.4+s.userData.d)});
 const bu=B&&B.enemies&&B.enemies.find(e=>e.boss&&!e.dead),bv=bu&&V[bu.uid];
 if(bv&&bv.snake&&!B.over){const s=bv.snake,N=s.segs.length,ph=phase(bu),hd=s.head;
  const emi=[0x1a0a30,0x4a0a60,0x7a0a20][ph],gc=[0xf5b94a,0xffa0ff,0xff4d6d][ph];s.bm.emissive.setHex(emi);s.bm2.emissive.setHex(emi);s.gold.color.setHex(gc);s.eye.color.setHex([0xffd34a,0xff7aff,0xff2a40][ph]);
  const ig=cine>0?cl((2.8-cine)/1.2,0,1):1;s.eye.color.multiplyScalar(ig);
  hd.position.x+=Math.sin(T3*1.9)*.3;hd.position.y+=Math.sin(T3*1.3)*.15;hd.rotation.x=Math.sin(T3*1.1)*.12;
  const warn=B.pulse<1.6&&B.pulse>0&&cine<=0;s.jaw.rotation.x=.1+.08*Math.sin(T3*2)+(warn?.55:0)+(bu.dead?.7:0);
  for(let i=0;i<6;i++)s.segs[i].position.x+=Math.sin(T3*2.4-i*.5)*.28*(1-i/6);
  s.g.scale.setScalar(1+.012*Math.sin(T3*2)+(ph==2?.03*Math.sin(T3*9):0));
  if(warn&&cine<=0)telegraph(bu,bv,B.kind||'DATA PULSE',1-B.pulse/1.6,T3);else{tgS.visible=false;tgR.forEach(m=>m.visible=false);const e=document.querySelector('#bwarn');if(e)e.style.display='none'}}
 else{tgS.visible=false;tgR.forEach(m=>m.visible=false);const e=document.querySelector('#bwarn');if(e)e.style.display='none'}
 for(const k in V){const w=V[k],u=w.u;if(w.snake||!w.g)continue;const has=u.sh>1&&!u.dead;
  if(has&&!w.shd){const col=u.ally?0x7fd8ff:0xff8a4a,add=THREE.AdditiveBlending,fm=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:add}),lm=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:add}),hx=new THREE.CircleGeometry(.27,6),eg=new THREE.EdgesGeometry(hx),g=new THREE.Group(),P=[];g.position.y=.8;
   for(let i=0;i<8;i++){const tier=i%2,a=(i>>1)/4*Math.PI*2+tier*Math.PI/4,h=new THREE.Group(),m=new THREE.Mesh(hx,fm);m.add(new THREE.LineSegments(eg,lm));m.rotation.y=Math.PI/2;m.position.x=.72;h.add(m);h.rotation.y=a;h.position.y=tier?.5:-.35;h.userData={tier,i};g.add(h);P.push(h)}
   const rm=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0,depthWrite:false,blending:add}),ring=new THREE.Mesh(GE.tor,rm);ring.rotation.x=Math.PI/2;ring.scale.setScalar(.78);ring.position.y=-.72;g.add(ring);
   w.shd={g,P,fm,lm,rm,ring};w.g.add(g)}
  if(w.shd){const d=w.shd,k=Math.min(1,dt*8);d.fm.opacity+=((has?.2+.08*Math.sin(T3*5+w.ph):0)-d.fm.opacity)*k;d.lm.opacity+=((has?.95:0)-d.lm.opacity)*k;d.rm.opacity+=((has?.55:0)-d.rm.opacity)*k;
   const n=has?Math.max(3,Math.min(8,Math.ceil(u.sh/(u.max*.45)*8))):8;d.g.rotation.y+=dt*.9;d.ring.scale.setScalar(.78+.03*Math.sin(T3*4+w.ph));
   d.P.forEach(h=>{const tr=h.userData.tier;h.rotation.y+=dt*(tr?-1.5:.5);h.position.y=(tr?.5:-.35)+Math.sin(T3*2+h.userData.i)*.05;h.visible=h.userData.i<n});d.g.visible=d.fm.opacity>.01}
  if(!has&&w.shp){spark(w.x,1,w.z,0x9fe8ff,12);flareFx(w.x,1.1,w.z,0x9fe8ff,2,.3)}else if(has&&!w.shp)shock(w.x,w.z,0x7fd8ff,1.3,.5);w.shp=has;
  if(u.stun>0&&!u.dead){if(!w.halo){w.halo=new THREE.Mesh(GE.tor,mat(0xffd34a));w.halo.scale.setScalar(.35);w.halo.rotation.x=Math.PI/2;w.g.add(w.halo)}w.halo.visible=true;w.halo.position.y=(w.h||2)*1.05;w.halo.rotation.z+=dt*6}else if(w.halo)w.halo.visible=false}
 if(cine>0){cine-=dt;const p=cl(1-cine/2.8,0,1),e=p*p*(3-2*p);DP.copy(CAM.position);CAM.position.lerpVectors(CLOSE,DP,e);TL.lerpVectors(LC,LD,e);CAM.lookAt(TL)}
 else if(zoomT>0){zoomT-=dt;CAM.position.lerp(ZP,Math.sin(cl(zoomT/1.1,0,1)*Math.PI)*.18);CAM.lookAt(0,0,-1)}};
const cv0=R3.domElement;cv0.addEventListener('webglcontextlost',e=>e.preventDefault());cv0.addEventListener('webglcontextrestored',()=>TXS.forEach(x=>x.needsUpdate=true));
/* ---------- 2. NAVIGABLE 3D MAP — 100 STAGES / 3 CAMPAIGN PARTS ---------- */
const MAP_PARTS=[
 {name:'PART I · THE AWAKENING FRONTIER',short:'I · FRONTIER',from:1,to:30,cx:-55,color:0x52d69b,regions:'Verdance Garden · Thread Grove · Kaldra Dunes'},
 {name:'PART II · THE SHATTERED EXPANSE',short:'II · EXPANSE',from:31,to:60,cx:0,color:0xffb65b,regions:'Strix Wreckage · Ashborn Crossing · Silent Corridor'},
 {name:'PART III · THE ETERNAL REALM',short:'III · ETERNAL',from:61,to:100,cx:55,color:0x38dff1,regions:'Obsidia Gate · Sanctum Stairs · Corrupted Grid · Eternal Obsidian'}
];
const MAP_REGIONS=['Verdance Garden / Moonlit Trail','Thread Grove','Kaldra Dunes','Strix Wreckage','Ashborn Crossing','Silent Corridor','Obsidia Gate','Sanctum Stairs','Corrupted Grid','The Eternal Obsidian Realm'];
const MAP_BOSSES=['Ouro, Devourer of Code','Thread Matriarch','Kaldra Sun-Eater','Strix Iron Oracle','Ashborn Colossus','Silent Warden','Obsidian Gatekeeper','Sanctum Seraph','The Corrupted Grid','Ouro, Eternal Devourer'];
let MS,MCm,MT,MN=[],mo={a:.12,e:.78,r:47},MW=0,MH=0,msel=0,mapActivePart=0,mapTarget={x:-55,z:0},mapTargetGoal={x:-55,z:0};
const mrc=new THREE.Raycaster(),mpt=new THREE.Vector2();
const mapClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mapCurrentStage(){
 const fighting=typeof B!=='undefined'&&B&&!B.dg&&!B.over&&Number(B.stage)>0;
 const n=fighting?Number(B.stage):(Number(S.cleared)>=100?100:Number(S.cleared||0)+1);
 return mapClamp(Math.floor(n||1),1,100);
}
function mapPartForStage(s){return s<=30?0:s<=60?1:2}
function mapStagePoint(s){
 const part=MAP_PARTS[mapPartForStage(s)],local=s-part.from,row=Math.floor(local/10),raw=local%10,col=row%2?9-raw:raw;
 const rows=Math.ceil((part.to-part.from+1)/10),x=part.cx+(col-4.5)*3.12,z=(row-(rows-1)/2)*6.25;
 return{x,z};
}
function mapHeight(x,z){return Math.sin(x*.12+z*.08)*.30+Math.cos(z*.18-x*.05)*.22}
function mapFocusPart(index){
 mapActivePart=mapClamp(Math.floor(index||0),0,2);const part=MAP_PARTS[mapActivePart];
 mapTargetGoal.x=part.cx;mapTargetGoal.z=0;mo.r=47;mo.a=.12;mo.e=.78;
 const tabs=MT&&MT.querySelectorAll('[data-map-part]');if(tabs)tabs.forEach(b=>{const on=Number(b.dataset.mapPart)===mapActivePart;b.style.background=on?'linear-gradient(135deg,#7544c8,#3c236c)':'#160f28';b.style.borderColor=on?'#d0b6ff':'#514070';b.style.color=on?'#fff':'#b8aacd'});
 const sub=MT&&MT.querySelector('#map-sector-caption');if(sub)sub.textContent=part.regions;
}
function mapFocusCurrent(){const s=mapCurrentStage();mapFocusPart(mapPartForStage(s));mapShowStage(s)}
function buildMap(){
 MS=new THREE.Scene();MS.fog=new THREE.Fog(0x150d29,75,175);MS.background=new THREE.Color(0x10091f);
 MCm=new THREE.PerspectiveCamera(43,1,.1,260);
 MS.add(new THREE.HemisphereLight(0xa58cff,0x5b432c,1.25));
 const key=new THREE.DirectionalLight(0xffd99a,1.25);key.position.set(-18,28,22);MS.add(key);
 const fill=new THREE.PointLight(0x38dfff,1.2,95);fill.position.set(55,14,0);MS.add(fill);
 const ground=new THREE.PlaneGeometry(184,58,92,29);ground.rotateX(-Math.PI/2);
 const pos=ground.attributes.position,colors=new Float32Array(pos.count*3),col=new THREE.Color();
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,mapHeight(x,z));
  col.setHex(0x28563f);
  col.offsetHSL(0,0,Math.sin(x*.11+z*.08)*.025);colors.set([col.r,col.g,col.b],i*3);
 }
 ground.setAttribute('color',new THREE.BufferAttribute(colors,3));ground.computeVertexNormals();
 MS.add(new THREE.Mesh(ground,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true})));
 // Three distinct campaign islands make the 100-stage journey readable at a glance.
 MAP_PARTS.forEach((part,index)=>{
  const cx=part.cx,baseY=mapHeight(cx,0)-.35;
  const disk=new THREE.Mesh(new THREE.CylinderGeometry(19.2,20.5,.55,56),new THREE.MeshStandardMaterial({color:0x142d26,roughness:.82,metalness:.12}));
  disk.position.set(cx,baseY,0);MS.add(disk);
  const border=new THREE.Mesh(new THREE.TorusGeometry(18.6,.16,8,72),new THREE.MeshBasicMaterial({color:part.color,transparent:true,opacity:.55}));
  border.rotation.x=-Math.PI/2;border.position.set(cx,baseY+.36,0);MS.add(border);
  const gate=new THREE.Group();
  const gateMat=new THREE.MeshStandardMaterial({color:0x171326,metalness:.55,roughness:.36,emissive:part.color,emissiveIntensity:.13});
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.42,.8,4.8,6),gateMat);pillar.position.y=2.4;gate.add(pillar);
  const crown=new THREE.Mesh(new THREE.OctahedronGeometry(1.35,1),new THREE.MeshStandardMaterial({color:part.color,emissive:part.color,emissiveIntensity:.7,metalness:.25,roughness:.2}));crown.position.y=5.1;gate.add(crown);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(2.1,.09,8,48),new THREE.MeshBasicMaterial({color:part.color,transparent:true,opacity:.85}));halo.position.y=5.1;gate.add(halo);
  gate.position.set(cx,baseY+.38,0);MS.add(gate);
  part.gate=crown;part.halo=halo;
  // Decorative crystal clusters at the edge of each island.
  for(let j=0;j<5;j++){
   const ang=(j/5)*Math.PI*2+.3,rad=16.5,x=cx+Math.cos(ang)*rad,z=Math.sin(ang)*rad;
   const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.55+((j%2)*.28),0),new THREE.MeshStandardMaterial({color:part.color,emissive:part.color,emissiveIntensity:.28,metalness:.25,roughness:.3}));
   crystal.position.set(x,mapHeight(x,z)+.75,z);crystal.scale.y=1.8;MS.add(crystal);
  }
 });
 // Each section has its own winding path, with all 100 stage pylons placed on it.
 MAP_PARTS.forEach((part,pi)=>{
  const points=[];for(let s=part.from;s<=part.to;s++){const q=mapStagePoint(s);points.push(new THREE.Vector3(q.x,mapHeight(q.x,q.z)+.48,q.z))}
  const curve=new THREE.CatmullRomCurve3(points);MS.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.max(100,points.length*5))),new THREE.LineBasicMaterial({color:part.color,transparent:true,opacity:.65})));
 });
 for(let s=1;s<=100;s++){
  const point=mapStagePoint(s),part=MAP_PARTS[mapPartForStage(s)],isBoss=s%10===0,isFinal=s===100;
  const group=new THREE.Group(),baseY=mapHeight(point.x,point.z),tone=part.color;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(isBoss?.82:.52,isBoss?1.05:.72,.28,8),new THREE.MeshStandardMaterial({color:0x211933,metalness:.45,roughness:.5}));base.position.y=.14;group.add(base);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(isBoss?.28:.16,isBoss?.42:.27,isBoss?2.05:1.35,6),new THREE.MeshStandardMaterial({color:0x31264a,metalness:.55,roughness:.4,emissive:tone,emissiveIntensity:.08}));stem.position.y=isBoss?1.25:.83;group.add(stem);
  const gem=new THREE.Mesh(isBoss?new THREE.TorusKnotGeometry(.78,.19,48,8):new THREE.OctahedronGeometry(.56,0),new THREE.MeshStandardMaterial({color:tone,emissive:tone,emissiveIntensity:isBoss?.55:.28,metalness:.2,roughness:.22}));
  gem.position.y=isBoss?2.55:1.75;group.add(gem);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(isBoss?1.05:.72,12,10),new THREE.MeshBasicMaterial({color:tone,transparent:true,opacity:.10,depthWrite:false}));glow.position.copy(gem.position);group.add(glow);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(isBoss?1.35:1.02,.075,8,40),new THREE.MeshBasicMaterial({color:0x38e8ff,transparent:true,opacity:.95}));ring.rotation.x=-Math.PI/2;ring.position.y=.34;ring.visible=false;group.add(ring);
  const hit=new THREE.Mesh(new THREE.SphereGeometry(isBoss?1.9:1.35,10,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,color:0xffffff}));hit.position.y=isBoss?1.45:1.05;hit.userData.s=s;group.add(hit);
  group.position.set(point.x,baseY,point.z);MS.add(group);MN.push({s,group,gem,glow,ring,hit,part:mapPartForStage(s),baseY,isBoss,isFinal});
 }
 requestAnimationFrame(mapLoop);
}
function updateMapNodes(){
 const current=mapCurrentStage(),cleared=Number(S.cleared)||0;
 MN.forEach(n=>{
  const done=n.s<=cleared,available=n.s<=cleared+1,isCurrent=n.s===current;
  const color=done?0xf5b94a:available?0x38e8ff:n.isBoss?0x7e3b51:0x697080;
  n.gem.material.color.setHex(color);n.gem.material.emissive.setHex(color);n.gem.material.emissiveIntensity=done?.38:available?.75:n.isBoss?.25:.05;
  n.glow.material.color.setHex(color);n.glow.material.opacity=done?.20:available?.30:n.isBoss?.10:.025;
  n.ring.visible=isCurrent;n.ring.material.color.setHex(0x38e8ff);
  n.group.userData.done=done;n.group.userData.available=available;
 });
}
function mapStatus(s){return s<=Number(S.cleared)?'CLEARED':s<=Number(S.cleared)+1?'AVAILABLE':'LOCKED'}
function mapShowStage(s){
 s=mapClamp(Math.floor(Number(s)||1),1,100);msel=s;
 const n=MN.find(x=>x.s===s),info=MT&&MT.querySelector('#map-stage-info');if(!info)return;
 const regionIndex=Math.ceil(s/10)-1,boss=s%10===0,bossName=MAP_BOSSES[regionIndex],status=mapStatus(s),current=mapCurrentStage(),part=MAP_PARTS[mapPartForStage(s)];
 const color=status==='CLEARED'?'#f5b94a':status==='AVAILABLE'?'#38e8ff':'#9290a3';
 info.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="min-width:0"><b style="color:${color}">${boss?'☠ ':''}STAGE ${s} / 100 · ${STAGES[s-1]||('Stage '+s)}</b><div style="font-size:10px;color:#b8aacd;margin-top:2px">${MAP_REGIONS[regionIndex]} · ${part.short}</div></div><b style="white-space:nowrap;color:${color};font-size:10px">${status}</b></div>${boss?`<div style="color:#ff718c;font-size:11px;margin-top:4px">REGIONAL BOSS · ${bossName}</div>`:''}<div style="font-size:10px;color:#b8aacd;margin-top:3px">${s===current?'📍 YOUR CURRENT POSITION':s<current?'Previous stage':'Future stage'}${s===100?' · FINAL CHALLENGE':''}</div>${s<=Number(S.cleared)+1?`<button class="pri" data-a="stage" data-v="${s}" style="width:100%;margin-top:6px">${s<=Number(S.cleared)?'REPLAY STAGE':'ENTER STAGE'} ${s} →</button>`:'<div style="font-size:10px;color:#ff9bac;margin-top:5px">🔒 Locked · Clear the previous stage to unlock this area.</div>'}`;
}
function mapLoop(t){
 requestAnimationFrame(mapLoop);if(view!=='map'||!MT||!MT.isConnected||!R3||R3.domElement.parentNode!==MT)return;if(window.GFX&&!GFX.frameOK(t,'map'))return;
 const w=MT.clientWidth,h=MT.clientHeight;if(w&&(w!==MW||h!==MH)){R3.setSize(w,h,false);MCm.aspect=w/h;MCm.updateProjectionMatrix();MW=w;MH=h}
 mapTarget.x+=(mapTargetGoal.x-mapTarget.x)*.075;mapTarget.z+=(mapTargetGoal.z-mapTarget.z)*.075;
 const ce=Math.cos(mo.e),targetY=mapHeight(mapTarget.x,mapTarget.z)+.35;
 MCm.position.set(mapTarget.x+mo.r*ce*Math.sin(mo.a),targetY+mo.r*Math.sin(mo.e),mapTarget.z+mo.r*ce*Math.cos(mo.a));MCm.lookAt(mapTarget.x,targetY,mapTarget.z);
 MN.forEach(n=>{n.gem.rotation.y=t*.0007+n.s*.035;n.gem.rotation.x=Math.sin(t*.001+n.s)*.08;n.gem.position.y=(n.isBoss?2.55:1.75)+Math.sin(t*.002+n.s)*.12;n.glow.material.opacity=(n.group.userData.available?.26:.035)+Math.sin(t*.003+n.s)*.025;if(n.ring.visible){const k=1+Math.sin(t*.004)*.12;n.ring.scale.set(k,k,k)}});
 MAP_PARTS.forEach(p=>{if(p.gate)p.gate.rotation.y=t*.00045;if(p.halo)p.halo.rotation.z=t*.0008});if(R3.toneMappingExposure!==.82)R3.toneMappingExposure=.82;R3.render(MS,MCm);
}
mapMount=function(){
 const box=$('#map3d');if(!box)return;
 if(!R3){box.innerHTML='<div class="mu" style="padding:20px">3D map unavailable. Use the 100-stage list below.</div>';return}
 if(!MS)buildMap();MT=box;MW=MH=0;box.style.position='relative';box.style.overflow='hidden';box.style.touchAction='none';box.style.borderRadius='12px';box.prepend(R3.domElement);
 const current=mapCurrentStage();mapActivePart=mapPartForStage(current);mapTarget={x:MAP_PARTS[mapActivePart].cx,z:0};mapTargetGoal={x:mapTarget.x,z:0};mo={a:.12,e:.78,r:47};updateMapNodes();
 const top=document.createElement('div');top.style.cssText='position:absolute;left:7px;right:7px;top:7px;z-index:5;pointer-events:none';
 top.innerHTML=`<div style="background:#090615df;border:1px solid #5a4382;border-radius:10px;padding:7px 8px;box-shadow:0 4px 14px #0008"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><b style="font-size:11px;color:#f5b94a;letter-spacing:.8px">100-STAGE CAMPAIGN MAP</b><b style="font-size:10px;color:#38e8ff">📍 ${current}/100</b></div><div style="height:5px;background:#312747;border-radius:5px;margin:6px 0 3px;overflow:hidden"><div style="height:100%;width:${Math.min(100,(Number(S.cleared)||0))}% ;background:linear-gradient(90deg,#38e8ff,#f5b94a)"></div></div><div style="font-size:9px;color:#b8aacd">${Number(S.cleared)||0} cleared · ${current===100&&Number(S.cleared)>=100?'CAMPAIGN COMPLETE':'Next objective: Stage '+current}</div></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:5px;pointer-events:auto">${MAP_PARTS.map((p,i)=>`<button type="button" data-map-part="${i}" style="padding:7px 3px;font-size:9px;line-height:1.2;background:#160f28;border-color:#514070">${p.short}<br><span style="font-size:8px;opacity:.8">${p.from}–${p.to}</span></button>`).join('')}</div><div id="map-sector-caption" style="margin-top:4px;text-align:center;background:#090615c9;border-radius:7px;padding:4px;font-size:9px;color:#d6c8f0"></div>`;
 const info=document.createElement('div');info.id='map-stage-info';info.style.cssText='position:absolute;left:7px;right:7px;bottom:7px;z-index:5;background:#090615eF;border:1px solid #5a4382;border-radius:10px;padding:8px;box-shadow:0 4px 14px #0008;font-size:11px;pointer-events:auto';
 box.appendChild(top);box.appendChild(info);
 top.querySelectorAll('[data-map-part]').forEach(button=>button.addEventListener('click',e=>{e.stopPropagation();mapFocusPart(Number(button.dataset.mapPart));mapShowStage(mapCurrentStage());}));
 const home=document.createElement('button');home.type='button';home.textContent='📍 MY LOCATION';home.style.cssText='position:absolute;right:10px;top:126px;z-index:6;padding:6px 8px;font-size:9px;background:#0e2632;border-color:#38e8ff;pointer-events:auto';home.addEventListener('click',e=>{e.stopPropagation();mapFocusCurrent();});box.appendChild(home);
 mapFocusPart(mapActivePart);mapShowStage(current);
 const P=new Map();let moved=0;
 box.onpointerdown=e=>{if(e.target.closest('button'))return;P.set(e.pointerId,[e.clientX,e.clientY]);moved=0;try{box.setPointerCapture(e.pointerId)}catch(_){} };
 box.onpointermove=e=>{const old=P.get(e.pointerId);if(!old)return;if(P.size===2){const q=[...P.values()],d0=Math.hypot(q[0][0]-q[1][0],q[0][1]-q[1][1]);P.set(e.pointerId,[e.clientX,e.clientY]);const q2=[...P.values()],d1=Math.hypot(q2[0][0]-q2[1][0],q2[0][1]-q2[1][1]);mo.r=mapClamp(mo.r*d0/Math.max(1,d1),26,72);moved=99;return}mo.a-=(e.clientX-old[0])*.006;mo.e=mapClamp(mo.e+(e.clientY-old[1])*.004,.35,1.25);moved+=Math.abs(e.clientX-old[0])+Math.abs(e.clientY-old[1]);P.set(e.pointerId,[e.clientX,e.clientY]);};
 box.onpointerup=box.onpointercancel=e=>{const had=P.delete(e.pointerId);if(!had||moved>7||e.type==='pointercancel'||e.target.closest('button'))return;const rect=box.getBoundingClientRect();mpt.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);mrc.setFromCamera(mpt,MCm);const hit=mrc.intersectObjects(MN.map(n=>n.hit),false)[0];if(!hit)return;const stage=hit.object.userData.s,part=mapPartForStage(stage);if(part!==mapActivePart)mapFocusPart(part);mapShowStage(stage);};
 box.addEventListener('wheel',e=>{e.preventDefault();mo.r=mapClamp(mo.r*(1+e.deltaY*.001),26,72)},{passive:false});
};
const _draw=draw;draw=function(){_draw();if(view=='map')mapMount()};
})();
