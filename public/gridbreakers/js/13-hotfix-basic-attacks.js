/* ===== HOTFIX: keep basic attacks active while an ultimate is cooling down ===== */
(function(){
  'use strict';
  const previousStep=step;
  step=function(b,dt){
    if(!b || b.over || !Array.isArray(b.allies)) return previousStep.apply(this,arguments);
    const readyAt=b.__awoUltReadyAt||{};
    const now=Date.now();
    const held=[];
    // The core combat loop unconditionally skips the actor after attempting an ultimate.
    // During cooldown, temporarily hide the full-energy threshold so the actor can basic-attack.
    for(const hero of b.allies){
      if(!hero || hero.dead || (Number(readyAt[hero.id])||0)<=now || (Number(hero.en)||0)<100) continue;
      held.push([hero,hero.en]);
      hero.en=99.999;
    }
    try {
      return previousStep.apply(this,arguments);
    } finally {
      for(const [hero,energy] of held) hero.en=energy;
    }
  };
  console.info('[AI WORLD OWL] Ultimate cooldown no longer blocks basic attacks');
})();
