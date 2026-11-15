/* Simulador de dificuldade - usa a logica real de combate de js/01-core.js
   Requer Node.js 16+.   Uso:  node tools/difficulty-sim/sim.js [gear=1.6] [runs=14]
   gear = multiplicador de equipamento (1.0 = sem itens, 1.6 = equipamento medio, 2.2 = bom)
   Mostra, para varias fases, o MENOR nivel dos 4 herois iniciais (cap 60) com >=75% de vitoria.
   Os numeros da curva vem de js/00-config.js (OWL_CONFIG.difficulty). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const GEAR = Number(process.argv[2]) || 1.6, RUNS = Number(process.argv[3]) || 14;

// 1) config
const sandbox = { window: {}, location: { search: '' } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js', '00-config-v147.js'), 'utf8').replace(/window\.OWL = [\s\S]*$/, ''), sandbox);
const CFG = sandbox.window.OWL_CONFIG;

// 2) core (somente dados + combate, sem UI)
const core = fs.readFileSync(path.join(root, 'js', '01-core-v146.js'), 'utf8');
const patchedCore = core.replace('if(b.wave<(b.dg?0:32))', 'if(b.wave<(b.dg?0:32))').replace('b.allies.forEach(a=>{if(a.dead){a.dead=0;a.hp=a.max*.35}else a.hp=Math.min(a.max,a.hp+a.max*.25);a.sh=0})', 'b.allies.forEach(a=>{a.sh=0})');
const a = patchedCore.indexOf('const H={'), b = patchedCore.indexOf('const wkId=');
if (a < 0 || b < 0) throw new Error('01-core.js mudou: ajuste os marcadores do simulador');
const code = `
const localStorage={getItem(){return null},setItem(){}};
const OWL={merge:(x,y)=>Object.assign(x,y),backup(){},saveError(){}}; const OWL_CONFIG=${JSON.stringify(CFG)};
let raidEnd=()=>({}),arenaLoss=()=>{},mkFoe=()=>({}),weekly=()=>{};
${patchedCore.slice(a, b)}
;({H,E,fresh,newBattle,step,setS:s=>{S=s}})`;
const C = vm.runInNewContext(code, {});
const { H, E, fresh, newBattle, step, setS } = C;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const region = s => clamp(Math.ceil(s / 10), 1, 10);
const D = CFG.difficulty;
const curve = s => { const r = region(s), n = s - 1;
  return { hp: (1 + D.hp[0] * n) * Math.pow(1 + D.hp[1], n) * (1 + D.hp[2] * (r - 1)),
           atk: (1 + D.atk[0] * n) * Math.pow(1 + D.atk[1], n) * (1 + D.atk[2] * (r - 1)),
           def: (1 + D.def[0] * n) * Math.pow(1 + D.def[1], n) * (1 + D.def[2] * (r - 1)),
           speed: 1 + D.speed * n, bossHp: D.boss.hp[0] + D.boss.hp[1] * r, bossAtk: D.boss.atk[0] + D.boss.atk[1] * r,
           bossDef: D.boss.def[0] + D.boss.def[1] * r, pulse: Math.max(3.8, 7 - .32 * (r - 1)) }; };

function run(stage, level, gear) {
  const party = ['lyra', 'jax', 'kira', 'kai'], S = fresh();
  S.order = party.slice(); S.owned = party.slice(); S.lv = {}; S.xp = {}; S.asc = {};
  for (const id in H) { S.lv[id] = level; S.xp[id] = 0; S.asc[id] = Math.max(0, Math.ceil((level - 10) / 10)); }
  setS(S);
  const b = newBattle(stage, null, null), d = curve(stage);
  const healAfterWave = completed => {
    const checkpoint = [10, 22, 32].includes(completed);
    const heal = completed === 10 ? .10 : (completed === 22 || completed === 32) ? .15 : .05;
    b.allies.forEach(a => {
      if (a.dead && checkpoint) { a.dead = 0; a.hp = a.max * .25; }
      else if (!a.dead) a.hp = Math.min(a.max, a.hp + a.max * heal);
      a.sh = 0;
    });
  };
  const fix = () => {
    const wave = b.wave + 1;
    let hf = 1, af = 1, df = 1;
    if (wave <= 10) { const t=(wave-1)/9; hf=1+.15*t; af=1+.08*t; df=1+.04*t; }
    else if (wave <= 22) { const t=(wave-11)/11; hf=1.15+.20*t; af=1.08+.12*t; df=1.04+.08*t; }
    else if (wave <= 32) { const t=(wave-23)/9; hf=1.35+.25*t; af=1.20+.20*t; df=1.12+.10*t; }

    if (b.wave === 31 && b.enemies.length) {
      const m=b.enemies[0]; m.boss=1; m.max*=1.55; m.hp=m.max; m.atk*=1.25; m.def*=1.15;
    }
    if (b.wave === 32 && b.enemies.length) {
      const boss=b.enemies[0]; boss.boss=1; boss.max*=2; boss.hp=boss.max; boss.atk*=1.5; boss.def*=1.25;
    }
    b.enemies.forEach((e,i) => {
      const base=E[e.id]||E.ouro, bs=!!e.boss;
      const bossHp=bs?(b.wave===31?1.55:2*d.bossHp):1;
      const bossAtk=bs?(b.wave===31?1.25:1.5*d.bossAtk):1;
      const bossDef=bs?(b.wave===31?1.15:1.25*d.bossDef):1;
      e.max=Math.max(1,Math.round(base.hp*d.hp*bossHp*hf)); e.hp=e.max;
      e.atk=Math.max(1,Math.round(base.atk*d.atk*bossAtk*af));
      e.def=Math.max(0,Math.round(base.def*d.def*bossDef*df));
      e.spd=Math.min(190,Math.round(base.spd*d.speed));
      e.crit=Math.min(bs?.22:.17,.05+(stage-1)*.0012);
    });
    // Approximate the live 5v5 formation: one boss plus four adds on boss waves.
    while (b.enemies.length < 5) {
      const src=b.enemies[b.enemies.length % Math.max(1,b.enemies.length)] || b.enemies[0];
      const clone=Object.assign({},src,{uid:src.uid+'-sim-'+b.enemies.length,pos:b.enemies.length,boss:0,dead:0,sh:0,stun:0});
      if (clone.id==='ouro') clone.id='wraith';
      const base=E[clone.id]||E.wraith;
      clone.max=clone.hp=Math.round(base.hp*d.hp*hf);
      clone.atk=Math.round(base.atk*d.atk*af);
      clone.def=Math.round(base.def*d.def*df);
      clone.spd=base.spd; clone.ally=0;
      b.enemies.push(clone);
    }
    b.pulse=d.pulse;
  };
  b.allies.forEach(x => { x.atk *= gear; x.max *= gear; x.hp = x.max; x.def *= gear; });
  let last = -1, t = 0; fix();
  while (!b.over && t < 2400) {
    step(b, .1);
    if (b.wave !== last) {
      if (last >= 0) healAfterWave(b.wave);
      last = b.wave;
      fix();
    }
    t += .1;
  }
  return b.over === 1;
}
const rate = (s, L) => { let w = 0; for (let i = 0; i < RUNS; i++) if (run(s, L, GEAR)) w++; return w / RUNS; };
function minLevel(s) { // busca binaria (taxa de vitoria cresce com o nivel)
  if (rate(s, 60) < .75) return '>60';
  let lo = 1, hi = 60; while (lo < hi) { const m = (lo + hi) >> 1; if (rate(s, m) >= .75) hi = m; else lo = m + 1; } return lo; }

console.log(`Curva de js/00-config.js | equipamento x${GEAR} | ${RUNS} lutas por teste`);
console.log('Estagio de 33 ondas -> menor nivel dos herois com >=75% de vitoria');
for (const s of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) console.log(String(s).padStart(4), '->', minLevel(s));
