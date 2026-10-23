import sys, json
from playwright.sync_api import sync_playwright
CASES=[('ORIGINAL (sem DPR, esferas)','play_old_tmp.html',''),('NOVO q0','play.html','?debug&q=0'),('NOVO q1','play.html','?debug&q=1'),('NOVO q2','play.html','?debug&q=2')]
JS_SETUP="""()=>{ const R=rivals; R.forEach((r,i)=>{ const a=i/R.length*6.28, d=180+ (i%4)*90; r.x=player.x+Math.cos(a)*d; r.y=player.y+Math.sin(a)*d; r.segments=[]; r.length=500; r.score=500; }); player.length=500; window.__f=0; const c=()=>{window.__f++; requestAnimationFrame(c)}; requestAnimationFrame(c); }"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files"])
    for name,f,q in CASES:
        pg=b.new_page(viewport={'width':1280,'height':720}, device_scale_factor=float(__import__('os').environ.get('DSF','2'))); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.add_init_script("localStorage.setItem('slitheri_tut','1')")
        pg.goto(f"file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/{f}{q}"); pg.wait_for_timeout(600)
        pg.evaluate(JS_SETUP); pg.mouse.move(900,300); pg.wait_for_timeout(2500)   # deixa os corpos crescerem
        f0=pg.evaluate("window.__f"); pg.wait_for_timeout(6000); f1=pg.evaluate("window.__f")
        print(f"{name:32s} {(f1-f0)/6:5.1f} quadros/s  erros={errs[:1]}")
        pg.close()
    b.close()
