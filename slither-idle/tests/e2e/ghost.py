from playwright.sync_api import sync_playwright
SETUP="""()=>{ paused=true; player.invulnUntil=1e12; const r=rivals[2]; r.sk=SKINS[38]; r.length=300; r.radius=14; const bx=player.x+110, by=player.y-70; r.segments=[];
  for(let i=0;i<50;i++) r.segments.push({x:bx-i*6, y:by+Math.sin(i*.22)*26, c:500-i}); r.x=bx; r.y=by; r.px=bx; r.py=by; r.angle=0; r.pa=0; r.n=551;
  window.__t0=performance.now(); }"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files"]); errs=[]
    pg=b.new_page(viewport={'width':900,'height':520}, device_scale_factor=2); pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script("localStorage.setItem('slitheri_tut','1')")
    pg.goto("file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/play.html?q=2"); pg.wait_for_timeout(600); pg.evaluate(SETUP); pg.wait_for_timeout(200)
    pg.screenshot(path='/tmp/vis/g0.png', clip={'x':200,'y':100,'width':520,'height':300})
    pg.evaluate("()=>{ killRival(2); }"); pg.wait_for_timeout(70); pg.screenshot(path='/tmp/vis/g1.png', clip={'x':200,'y':100,'width':520,'height':300})
    pg.wait_for_timeout(280); pg.screenshot(path='/tmp/vis/g2.png', clip={'x':200,'y':100,'width':520,'height':300})
    print('ghosts ativos:', pg.evaluate("ghosts.length"), '| erros', errs); b.close()
