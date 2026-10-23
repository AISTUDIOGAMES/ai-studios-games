from playwright.sync_api import sync_playwright
TURN="""()=>{ paused=true; player.invulnUntil=1e12; player.angle=0; player.length=120; usingKeys=true; for(const k in dirKeys) delete dirKeys[k]; dirKeys.KeyA=true; // esquerda = +-PI
  const d=[]; let prev=player.angle; for(let i=0;i<60;i++){ update(1, performance.now()); d.push(Math.abs(angDiff(prev, player.angle))); prev=player.angle; }
  const lim=maxTurn(player); const reached=Math.abs(Math.abs(player.angle)-Math.PI)<0.02;
  // cobra longa gira mais devagar
  player.length=1700; const lim2=maxTurn(player); player.boosting=true; const lim3=maxTurn(player); player.boosting=false;
  return {maxStep:Math.max(...d), lim, lim2, lim3, reached, ticksToHalfTurn: d.findIndex((_,i)=>d.slice(0,i+1).reduce((a,b)=>a+b,0)>=Math.PI-0.02)+1}; }"""
KEYS="""()=>{ player.angle=0; usingKeys=true; for(const k in dirKeys) delete dirKeys[k]; dirKeys.ArrowDown=true; for(let i=0;i<40;i++) update(1, performance.now()); const a=player.angle; delete dirKeys.ArrowDown; const b=player.angle; for(let i=0;i<10;i++) update(1, performance.now()); return {afterDown:a, keepsWhenReleased:Math.abs(player.angle-b)<1e-9, pi2:Math.PI/2}; }"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files"]); errs=[]
    pg=b.new_page(viewport={'width':1000,'height':600}); pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script("localStorage.setItem('slitheri_tut','1')")
    pg.goto("file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/play.html?q=0"); pg.wait_for_timeout(500)
    r=pg.evaluate(TURN); print('inércia de curva:',{k:(round(v,3) if isinstance(v,float) else v) for k,v in r.items()}); print('   limite por tick (rad): curta=%.3f longa=%.3f turbo=%.3f'%(r['lim'],r['lim2'],r['lim3']))
    print('teclado:',pg.evaluate(KEYS))
    # mouse: mover o ponteiro muda o controle de volta para mouse
    pg.evaluate("()=>{paused=false; usingKeys=true}"); pg.mouse.move(700,300); print('mouse reassume o controle:', pg.evaluate("usingKeys===false"))
    # redimensionar: canvas acompanha viewport*DPR
    pg.set_viewport_size({'width':700,'height':500}); pg.wait_for_timeout(200); print('resize ->', pg.evaluate("[canvas.width,canvas.height,VW,VH,DPR]"))
    pg.close()
    m=b.new_page(viewport={'width':390,'height':844}, device_scale_factor=3, is_mobile=True, has_touch=True); m.on('pageerror',lambda e:errs.append(str(e))); m.add_init_script("localStorage.setItem('slitheri_tut','1')")
    m.goto("file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/play.html?debug"); m.wait_for_timeout(2500)
    print('mobile canvas:', m.evaluate("[canvas.width,canvas.height,VW,VH,DPR,qLevel]"), '| joystick visível:', m.evaluate("getComputedStyle(document.getElementById('joy')).display"))
    m.screenshot(path='/tmp/vis/mobile.png'); print('erros:',errs); b.close()
