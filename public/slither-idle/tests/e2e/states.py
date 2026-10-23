from playwright.sync_api import sync_playwright
SETUP="""()=>{ player.invulnUntil=1e12; const R=rivals; R.forEach((r,i)=>{ const a=i/R.length*6.28, d=150+(i%3)*80; r.x=player.x+Math.cos(a)*d; r.y=player.y+Math.sin(a)*d; r.segments=[]; r.length=260+i*14; });
  player.length=520; mouseX=VW*0.85; mouseY=VH*0.3; }"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files"]); errs=[]
    pg=b.new_page(viewport={'width':1280,'height':720}, device_scale_factor=2); pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script("localStorage.setItem('slitheri_tut','1')")
    pg.goto("file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/play.html?q=2"); pg.wait_for_timeout(500); pg.evaluate(SETUP); pg.wait_for_timeout(3500)
    pg.evaluate("()=>{held.key=true; player.eatT=performance.now()-90}"); pg.wait_for_timeout(700)
    pg.screenshot(path='/tmp/vis/s_boost.png', clip={'x':380,'y':140,'width':640,'height':400})
    pg.evaluate("()=>{held.key=false; killRival(2)}"); pg.wait_for_timeout(170); pg.screenshot(path='/tmp/vis/s_ghost.png', clip={'x':380,'y':140,'width':640,'height':400})
    # cobra gigante: 8000 de comprimento, construída por passos de simulação
    pg.evaluate("()=>{ player.length=8000; player.score=8000; held.key=false; for(let i=0;i<1500;i++) update(1, performance.now()); }"); pg.wait_for_timeout(500)
    print('segmentos do jogador:', pg.evaluate("player.segments.length"), '| zoom', round(pg.evaluate("camera.z"),2))
    pg.screenshot(path='/tmp/vis/s_long.png')
    print('erros:',errs); b.close()
