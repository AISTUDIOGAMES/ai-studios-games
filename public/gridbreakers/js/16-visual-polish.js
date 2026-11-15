/* ===== AWO VISUAL POLISH: CHARACTER/TREE SHADING + DISTINCT COMBAT VFX ===== */
(function(){
'use strict';
const _initScene=initScene;
function enableSceneShadows(){
 if(!R3||!SC)return;
 R3.shadowMap.enabled=true;
 R3.shadowMap.type=THREE.PCFSoftShadowMap;
 R3.toneMapping=THREE.ACESFilmicToneMapping;
 R3.toneMappingExposure=(typeof view!=='undefined'&&view==='battle')?1.12:.82;
 SC.traverse(o=>{if(!o.isMesh)return; if(o.material&&o.material.transparent&&o.material.opacity<.5)return; o.castShadow=true;o.receiveShadow=true;});
 SC.traverse(o=>{if(o.isDirectionalLight){o.castShadow=true;o.shadow.mapSize.set(1024,1024);o.shadow.camera.near=.5;o.shadow.camera.far=65;o.shadow.camera.left=-22;o.shadow.camera.right=22;o.shadow.camera.top=20;o.shadow.camera.bottom=-25;o.shadow.bias=-.00025;o.shadow.normalBias=.025;}});
}
initScene=function(){_initScene();try{enableSceneShadows();}catch(e){console.warn('[AWO] shadow setup',e)}};
const _build=build;
build=function(){_build();try{
 enableSceneShadows();
 const shadowTex=new THREE.CanvasTexture(cv(128,128,g=>{const q=g.createRadialGradient(64,64,4,64,64,62);q.addColorStop(0,'rgba(8,12,10,.48)');q.addColorStop(.55,'rgba(8,12,10,.22)');q.addColorStop(1,'rgba(8,12,10,0)');g.fillStyle=q;g.fillRect(0,0,128,128)}));
 Object.values(V).forEach(v=>{if(v.sh){v.sh.material=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,opacity:.88,depthWrite:false,toneMapped:false});v.sh.scale.set(v.h*.62,v.h*.30,1);v.sh.position.y=.025;}});
 }catch(e){console.warn('[AWO] character shading',e)}};
const _land=buildVerdanceLandscape;
buildVerdanceLandscape=function(){_land();try{if(VD)VD.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});enableSceneShadows()}catch(e){}};
// Canvas-made glyphs: no external assets, crisp at any resolution.
function glyph(kind,color){return new THREE.CanvasTexture(cv(256,256,g=>{
 g.translate(128,128);g.lineCap='round';g.lineJoin='round';g.strokeStyle='#'+color.toString(16).padStart(6,'0');g.fillStyle=g.strokeStyle;g.shadowColor=g.strokeStyle;g.shadowBlur=12;
 const path=(pts,close=true)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(close)g.closePath();g.stroke()};
 if(kind==='heal'){g.lineWidth=9;g.beginPath();g.arc(0,0,83,0,Math.PI*2);g.stroke();g.fillRect(-9,-43,18,86);g.fillRect(-43,-9,86,18);g.lineWidth=5;for(let i=0;i<6;i++){g.save();g.rotate(i*Math.PI/3);g.beginPath();g.ellipse(0,-65,12,27,.2,0,Math.PI*2);g.stroke();g.restore()}}
 else if(kind==='shield'){g.lineWidth=8;path([[0,-100],[78,-62],[68,25],[0,100],[-68,25],[-78,-62]]);g.lineWidth=4;path([[0,-75],[55,-48],[48,20],[0,75],[-48,20],[-55,-48]]);g.beginPath();g.moveTo(-35,0);g.lineTo(-8,28);g.lineTo(40,-30);g.stroke()}
 else if(kind==='moon'){g.lineWidth=9;g.beginPath();g.arc(0,0,72,-1.2,1.2);g.stroke();g.beginPath();g.arc(30,0,72,Math.PI-1.2,Math.PI+1.2);g.stroke();g.fillRect(-5,-7,10,14)}
 else if(kind==='blade'){g.lineWidth=10;path([[-82,60],[-48,20],[30,-80],[10,-20],[-82,60]]);path([[82,60],[48,20],[-30,-80],[-10,-20],[82,60]])}
 else if(kind==='glitch'){g.lineWidth=8;path([[-75,-55],[-25,-55],[-5,-15],[30,-15],[50,25],[75,25]]);path([[-70,50],[-25,50],[0,10],[35,10],[65,-35]])}
 else if(kind==='sun'){g.lineWidth=8;g.beginPath();g.arc(0,0,42,0,Math.PI*2);g.stroke();for(let i=0;i<12;i++){g.save();g.rotate(i*Math.PI/6);g.beginPath();g.moveTo(0,-58);g.lineTo(0,-100);g.stroke();g.restore()}}
 else if(kind==='rune'){g.lineWidth=8;path([[0,-92],[78,45],[-78,45]]);g.lineWidth=5;path([[0,-55],[46,25],[-46,25]]);g.beginPath();g.arc(0,0,108,0,Math.PI*2);g.stroke()}
 else if(kind==='crack'){g.lineWidth=10;path([[-10,-100],[10,-30],[-35,5],[12,25],[-5,95]],false);g.lineWidth=4;path([[-35,5],[-75,-22]],false);path([[12,25],[70,0]],false)}
 else if(kind==='hex'){g.lineWidth=8;for(let i=0;i<6;i++){g.save();g.rotate(i*Math.PI/3);g.beginPath();g.moveTo(-45,-78);g.lineTo(45,-78);g.stroke();g.restore()}g.beginPath();g.arc(0,0,95,0,Math.PI*2);g.stroke()}
 }));}
const TEXV={};function tex(kind,c){const k=kind+'_'+c;if(!TEXV[k])TEXV[k]=glyph(kind,c);return TEXV[k]}
function emblem(v,kind,c,d=1){if(!v||!SC)return;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex(kind,c),transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending}));s.position.set(v.x,(v.h||1.5)*1.2,v.z);s.scale.set(1.55*d,1.55*d,1);addFx(s,.8,p=>{const q=.8+p*.55;s.scale.set(1.55*d*q,1.55*d*q,1);s.material.opacity=(1-p)*.68;s.material.rotation=p*(kind==='blade'?1.8:0.5)});}
function orbitLeaves(v,c,n=8){for(let i=0;i<n;i++){const a=i*Math.PI*2/n,sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex('heal',c),transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending}));sp.position.set(v.x+Math.cos(a)*.65,.55+(i%3)*.35,v.z+Math.sin(a)*.65);sp.scale.set(.26,.48,1);addFx(sp,1.05,p=>{const q=a+p*5;sp.position.set(v.x+Math.cos(q)*(.65+p*.7),.55+p*1.1+(i%3)*.2,v.z+Math.sin(q)*(.65+p*.7));sp.material.rotation=q;sp.material.opacity=(1-p)*.9})}}
function shieldHalo(v,c){const group=new THREE.Group();const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(.9,1),new THREE.MeshBasicMaterial({color:c,wireframe:true,transparent:true,opacity:.65,depthWrite:false}));shell.scale.set(.8,1.35,.8);group.add(shell);const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.035,6,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9}));ring.rotation.x=Math.PI/2;ring.position.y=-.2;group.add(ring);group.position.set(v.x,.9,v.z);addFx(group,1.15,p=>{group.rotation.y=p*2.4;group.rotation.x=p*.35;const q=1+p*.5;group.scale.set(q,q,q);group.children.forEach(m=>m.material.opacity=(1-p)*.7)})}
const _xFx=xFx;
xFx=function(f){_xFx(f);const v=V[f.u];if(!v)return;
 if(f.k==='h'){emblem(v,'heal',f.v>=v.u.max*.3?0xffe58a:0x6dff9c,f.v>=v.u.max*.3?1.15:.85);orbitLeaves(v,f.v>=v.u.max*.3?0xffe58a:0x6dff9c,7)}
};
const _ult=ultFx;
ultFx=function(u){_ult(u);const v=V[u.uid];if(!v)return;const styles={lyra:['moon',0x9fd4ff],jax:['blade',0xff4fd8],kira:['glitch',0x38e8ff],kai:['heal',0x6dff9c],aeon:['rune',0x38e8ff],orion:['sun',0xffd36b],titan:['crack',0xff8a2a],vex:['hex',0xb25cff]};const q=styles[u.id];if(q){emblem(v,q[0],q[1],1.65);if(u.id==='kai'||u.id==='orion')orbitLeaves(v,q[1],14);if(u.id==='titan')for(let i=0;i<3;i++)shock(v.x,v.z,q[1],2.5+i*1.25,.8+i*.12)}};
const _hero=hero;
hero=function(u,big){_hero(u,big);const v=V[u.uid];if(!v)return;const colors={lyra:0x9fd4ff,jax:0xff4fd8,kira:0x38e8ff,kai:0x6dff9c,aeon:0x38e8ff,orion:0xffd36b,titan:0xff8a2a,vex:0xb25cff};const styles={lyra:'moon',jax:'blade',kira:'glitch',kai:'heal',aeon:'rune',orion:'sun',titan:'crack',vex:'hex'};emblem(v,styles[u.id]||'rune',colors[u.id]||0xffffff,big?1.2:.72)};
// Distinct, persistent shield treatment when a unit gains a barrier.
const shieldState={};setInterval(()=>{if(!B||view!=='battle'||!SC)return;for(const k in V){const v=V[k],u=v.u,active=!u.dead&&(u.sh||0)>1,prev=shieldState[k];if(active&&(!prev||prev.u!==u||!prev.active)){shieldHalo(v,u.ally?0x69dfff:0xff718b)}shieldState[k]={u,active}}},180);
try{enableSceneShadows()}catch(e){}
console.info('[AWO] enhanced character/tree shading and bespoke heal, shield, skill and ultimate VFX loaded');
})();
