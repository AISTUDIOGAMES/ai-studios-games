import sys
from playwright.sync_api import sync_playwright
ids=sys.argv[1]; q=sys.argv[2]; out=sys.argv[3]
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files"]); pg=b.new_page(viewport={'width':1040,'height':900}, device_scale_factor=2)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto(f"file://" + __import__("os").path.abspath(__file__).replace("shot.py","harness.html") + "?ids={ids}&q={q}"); pg.wait_for_timeout(300); pg.screenshot(path=out, full_page=True); print('erros:',errs); b.close()
