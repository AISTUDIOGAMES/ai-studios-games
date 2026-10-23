from playwright.sync_api import sync_playwright
JS="""()=>{ const R=rivals; R.forEach((r,i)=>{ const a=i/R.length*6.28, d=180+(i%4)*90; r.x=player.x+Math.cos(a)*d; r.y=player.y+Math.sin(a)*d; r.segments=[]; r.length=500; }); player.length=500; }"""
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files"]); pg=b.new_page(viewport={'width':1280,'height':720}, device_scale_factor=2)
    pg.add_init_script("localStorage.setItem('slitheri_tut','1')"); pg.goto("file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/play.html?debug"); pg.wait_for_timeout(500); pg.evaluate(JS); pg.mouse.move(900,300)
    for t in range(0,30,3):
        s=pg.evaluate("window.__game.stats()"); print(f"t={t:2d}s  q={s['qLevel']} dpr={s['DPR']} fps≈{1000/s['emaDt']:.0f} trabalho_js={s['emaWork']:.1f}ms")
        pg.wait_for_timeout(3000)
    b.close()
