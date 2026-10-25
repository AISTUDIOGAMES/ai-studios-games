from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files"]); errs=[]
    pg=b.new_page(viewport={'width':1100,'height':800}, device_scale_factor=2); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text else None)
    pg.goto("file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/store.html"); pg.wait_for_timeout(1200)
    n=pg.evaluate("document.querySelectorAll('.pv').length"); sz=pg.evaluate("(()=>{const c=document.querySelector('.pv');return [c.width,c.height,c.getBoundingClientRect().width,c.getBoundingClientRect().height]})()")
    print('miniaturas:',n,'| 1ª [pixels reais w,h, css w,h]:',sz,'| erros:',errs)
    pg.screenshot(path='/tmp/vis/store.png', clip={'x':0,'y':120,'width':1100,'height':520}); b.close()
