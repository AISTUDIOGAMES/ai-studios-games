import json, sys, time
from playwright.sync_api import sync_playwright
BASE='http://localhost:8766/rpg.html?debug'
errs=[]; res=[]
def ok(name,cond,extra=''):
    res.append((name,bool(cond))); print(('PASS' if cond else 'FAIL'),name,extra)
def hold(pg,key,ms): pg.keyboard.down(key); pg.wait_for_timeout(ms); pg.keyboard.up(key)
def st(pg): return pg.evaluate("({x:__owl.P.x,y:__owl.P.y,q:JSON.stringify(__owl.S.quests),f:JSON.stringify(__owl.S.flags),loops:__owl.loops(),dlg:!!__owl.dlg()})")
def tp(pg,x,y): pg.evaluate(f"(__owl.P.x={x},__owl.P.y={y},0)"); pg.wait_for_timeout(120)
def talk(pg):
    pg.keyboard.press('e'); pg.wait_for_timeout(100)
    for _ in range(8):
        if not pg.evaluate("!!__owl.dlg()"): break
        pg.keyboard.press('e'); pg.wait_for_timeout(80)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':720}); pg=ctx.new_page()
    pg.on('pageerror',lambda e: errs.append('pageerror '+str(e)))
    pg.on('console',lambda m: errs.append('console '+m.text) if m.type=='error' else None)
    pg.on('dialog',lambda d: d.accept())
    pg.goto(BASE)
    pg.evaluate("localStorage.setItem('owl_gridbreakers_v1',JSON.stringify({unlocked:['aeon'],clears:3,muted:true}))")
    pg.reload()
    ok('title tem botão EXPLORE', pg.inner_text('#explore')=='EXPLORE THE GRID')
    pg.click('#explore'); 
    for k in ['titan','kira','vex']: pg.click(f'.pick[data-k={k}]')
    pg.click('#go'); pg.wait_for_selector('#wc'); pg.wait_for_timeout(500)
    s=st(pg); ok('mundo carrega, 1 loop', s['loops']==1, s['loops'])
    x0=s['x']; hold(pg,'d',500); s=st(pg); ok('WASD move (D)', s['x']>x0+1, f"{x0:.2f}->{s['x']:.2f}")
    hold(pg,'ArrowLeft',400); s2=st(pg); ok('setas movem', s2['x']<s['x']-1)
    hold(pg,'s',4000); s=st(pg); ok('parede sul bloqueia', s['y']<23, f"y={s['y']:.2f}")
    tp(pg,15.5,16); hold(pg,'w',3000); s=st(pg); ok('estátua colide (plaza)', s['y']>=13.0 and abs(s['x']-15.5)<0.1, f"y={s['y']:.2f}")
    tp(pg,27.5,10.5); hold(pg,'w',2500); s=st(pg); ok('prédio colide (Night Market)', s['y']>=8.29, f"y={s['y']:.2f}")
    tp(pg,29,11.9); hold(pg,'ArrowRight',2000); s=st(pg); ok('gate leste bloqueia', 30.0<s['x']<31, f"x={s['x']:.2f}")
    # pausa
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200); ok('pausa para o loop', pg.evaluate("__owl.paused()") and st(pg)['loops']==0)
    f1=pg.evaluate("__owl.frames()"); pg.wait_for_timeout(300); ok('sem frames durante pausa', pg.evaluate("__owl.frames()")==f1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200); ok('retoma com 1 loop', st(pg)['loops']==1)
    # missão
    tp(pg,7.4,10.2); ok('prompt de NPC (Lyra)', pg.evaluate("__owl.nearest()&&__owl.nearest().ref.id")=='lyra'); talk(pg)
    s=st(pg); ok('missão aceita', '"static_leak":{"s":"active"' in s['q'], s['q'])
    ok('objetivo visível na HUD', 'Investigate' in pg.inner_text('#w-obj'))
    tp(pg,12.5,20.6); talk(pg); s=st(pg); ok('investigar terminal spawna glitch', 'glitchSpawned":true' in s['f'] and '"terminal"' in s['q'], s['q'])
    # secundária
    tp(pg,13.5,14.6); talk(pg); tp(pg,21,21.3); talk(pg); s=st(pg); ok('missão secundária pronta', '"spare_coil":{"s":"ready"' in s['q'], s['q'])
    tp(pg,13.5,14.6); talk(pg); s=st(pg); ok('secundária concluída', '"spare_coil":{"s":"done"' in s['q'])
    # combate
    tp(pg,14.4,20.2); px=st(pg)['x']; py=st(pg)['y']
    ok('glitch é alvo', pg.evaluate("__owl.nearest().type")=='glitch')
    talk(pg); pg.wait_for_selector('#arena',timeout=5000); ok('entrou no combate', True)
    pg.click('#spd'); pg.click('#spd')
    t0=time.time()
    while time.time()-t0<150 and not pg.query_selector('#wc'):
        if pg.query_selector('.cbtn:not(.off)'):
            pg.evaluate("document.querySelector('.cbtn.ult:not(.off)')?.click()||document.querySelector('.cbtn:not(.off)').click()")
            pg.wait_for_timeout(120)
            if pg.query_selector('.unit.targetable'): pg.evaluate("document.querySelector('.unit.targetable').click()")
        if pg.query_selector('#retry'): pg.click('#retry')
        pg.wait_for_timeout(150)
    ok('voltou ao mundo após vitória', bool(pg.query_selector('#wc')))
    s=st(pg); ok('mesma posição após combate', abs(s['x']-px)<0.01 and abs(s['y']-py)<0.01, f"{px:.2f},{py:.2f}->{s['x']:.2f},{s['y']:.2f}")
    ok('glitch derrotado + missão pronta', 'glitchDone":true' in s['f'] and '"static_leak":{"s":"ready"' in s['q'], s['q'])
    ok('apenas 1 loop após voltar', s['loops']==1, s['loops'])
    tp(pg,7.4,10.2); talk(pg); s=st(pg); ok('missão principal concluída', '"static_leak":{"s":"done"' in s['q']); ok('feedback de conclusão (toast)', 'QUEST COMPLETE' in pg.inner_text('#w-toasts'), pg.inner_text('#w-toasts'))
    # save/load
    sv=pg.evaluate("JSON.parse(localStorage.getItem('owl_gridworld_v1'))"); ok('save do mundo v1 gravado', sv['v']==1 and len(sv['squad'])==3)
    leg=pg.evaluate("JSON.parse(localStorage.getItem('owl_gridbreakers_v1'))"); ok('save antigo intacto', leg=={'unlocked':['aeon'],'clears':3,'muted':True}, leg)
    pg.screenshot(path='shot_world.png')
    pg.reload(); ok('título mostra CONTINUE', pg.inner_text('#explore')=='CONTINUE EXPLORING'); pg.click('#explore'); pg.wait_for_selector('#wc'); pg.wait_for_timeout(300)
    s=st(pg); ok('carrega quests salvas', '"static_leak":{"s":"done"' in s['q']); ok('carrega posição salva', abs(s['x']-7.4)<0.2 and abs(s['y']-10.2)<0.2)
    pg.click('#w-pause'); pg.click('[data-p=exit]'); pg.wait_for_selector('#explore'); ok('sair do mundo: 0 loops', pg.evaluate("__owl.loops()")==0)
    # save inválido
    pg.evaluate("localStorage.setItem('owl_gridworld_v1',JSON.stringify({v:1,map:'xx',x:4,y:4,safe:{x:'a'},squad:['titan','titan','zzz'],quests:{static_leak:{s:'hack',d:[1]}},flags:7}))"); pg.reload()
    pg.click('#explore'); pg.wait_for_selector('.pick-grid'); ok('save inválido: pede squad de novo', True)
    for k in ['titan','kira','vex']: pg.click(f'.pick[data-k={k}]')
    pg.click('#go'); pg.wait_for_selector('#wc'); s=st(pg); ok('posição inválida vira spawn seguro', abs(s['x']-15.5)<0.01 and abs(s['y']-16.2)<0.01, f"{s['x']},{s['y']}")
    # derrota
    pg.goto(BASE); pg.evaluate("localStorage.removeItem('owl_gridworld_v1')"); pg.reload(); pg.click('#explore')
    for k in ['titan','kira','vex']: pg.click(f'.pick[data-k={k}]')
    pg.click('#go'); pg.wait_for_selector('#wc')
    pg.evaluate("""async()=>{const E=await import('/rpg-engine.js');['titan','kira','vex'].forEach(k=>{E.HEROES[k].hp=1;E.HEROES[k].def=0})}""")
    tp(pg,7.4,10.2); talk(pg); tp(pg,12.5,20.6); talk(pg); tp(pg,14.4,20.2); safe=pg.evaluate("({...__owl.S.safe})"); talk(pg); pg.wait_for_selector('#arena')
    pg.click('#spd'); pg.click('#spd'); t0=time.time()
    while time.time()-t0<90 and not pg.query_selector('#safe'):
        if pg.query_selector('.cbtn:not(.off)'):
            pg.evaluate("document.querySelector('.cbtn:not(.off)').click()"); pg.wait_for_timeout(100)
            if pg.query_selector('.unit.targetable'): pg.evaluate("document.querySelector('.unit.targetable').click()")
        pg.wait_for_timeout(150)
    ok('derrota mostra TENTAR NOVAMENTE / PONTO SEGURO', bool(pg.query_selector('#safe') and pg.query_selector('#retry')))
    pg.click('#safe'); pg.wait_for_selector('#wc'); s=st(pg); ok('derrota: volta ao ponto seguro', abs(s['x']-safe['x'])<0.01 and abs(s['y']-safe['y'])<0.01 and s['loops']==1, f"{s['x']:.2f},{s['y']:.2f} safe={safe}")
    ctx.close()
    # tela pequena
    m=b.new_context(viewport={'width':390,'height':740},has_touch=True,is_mobile=True); mp=m.new_page(); mp.on('pageerror',lambda e: errs.append('m-pageerror '+str(e)))
    mp.goto(BASE); mp.click('#explore')
    for k in ['titan','kira','vex']: mp.click(f'.pick[data-k={k}]')
    mp.click('#go'); mp.wait_for_selector('#wc'); mp.wait_for_timeout(400)
    ok('mobile: controles de toque visíveis', mp.is_visible('.w-touch'))
    ok('mobile: sem scroll horizontal', mp.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    x0=mp.evaluate("__owl.P.x"); mp.dispatch_event('[data-k=right]','pointerdown'); mp.wait_for_timeout(500); mp.dispatch_event('[data-k=right]','pointerup'); ok('mobile: d-pad move', mp.evaluate("__owl.P.x")>x0+0.8)
    mp.screenshot(path='shot_mobile.png'); m.close(); b.close()
real=[e for e in errs if 'Failed to load resource' not in e]
print('ERROS CONSOLE:', real or 'nenhum'); print('RESUMO', sum(1 for _,c in res if c),'/',len(res))
