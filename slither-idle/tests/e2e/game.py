import sys, json
from playwright.sync_api import sync_playwright
q=sys.argv[1] if len(sys.argv)>1 else '2'; dsf=float(sys.argv[2]) if len(sys.argv)>2 else 2; out=sys.argv[3] if len(sys.argv)>3 else '/tmp/vis/game.png'
w=int(sys.argv[4]) if len(sys.argv)>4 else 1280; h=int(sys.argv[5]) if len(sys.argv)>5 else 720
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files"]); pg=b.new_page(viewport={'width':w,'height':h}, device_scale_factor=dsf)
    errs=[]; pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.add_init_script("localStorage.setItem('slitheri_tut','1')")
    pg.goto(f"file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/play.html?debug&q={q}"); pg.wait_for_timeout(500)
    pg.mouse.move(w*0.8,h*0.3); pg.wait_for_timeout(4000)
    st=pg.evaluate("window.__game && window.__game.stats()"); print('stats',json.dumps(st)); print('erros:',[e for e in errs if 'coin.png' not in e and 'fonts' not in e][:6])
    pg.screenshot(path=out); b.close()
