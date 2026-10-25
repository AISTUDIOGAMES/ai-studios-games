import json
from playwright.sync_api import sync_playwright
JS_SAMPLE="""async()=>{ player.invulnUntil=1e12; const out=[]; mouseX=VW*0.8; mouseY=VH*0.35; await new Promise(r=>setTimeout(r,500));
  return await new Promise(res=>{ let n=0, lastT=0; const f=t=>{ const a=paused?1:acc/STEP; out.push([t, player.px+(player.x-player.px)*a, player.py+(player.y-player.py)*a, player.x, player.y]); if(++n<480) requestAnimationFrame(f); else res(out); }; requestAnimationFrame(f); }); }"""
def stats(pts, ix, iy):
    d=[((pts[i][ix]-pts[i-1][ix])**2+(pts[i][iy]-pts[i-1][iy])**2)**.5 for i in range(1,len(pts))]
    m=sum(d)/len(d); sd=(sum((x-m)**2 for x in d)/len(d))**.5; return m, sd/m if m else 0
with sync_playwright() as p:
    b=p.chromium.launch(args=["--allow-file-access-from-files","--disable-frame-rate-limit","--disable-gpu-vsync"]); 
    for slow in (1,4):
        pg=b.new_page(viewport={'width':360,'height':240}, device_scale_factor=1); pg.add_init_script("localStorage.setItem('slitheri_tut','1')")
        pg.goto("file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..")) + "/play.html?debug&q=0"); pg.wait_for_timeout(500)
        if slow>1: pg.context.new_cdp_session(pg).send('Emulation.setCPUThrottlingRate',{'rate':slow})
        pts=pg.evaluate(JS_SAMPLE); dt=(pts[-1][0]-pts[0][0])/1000
        ci=stats(pts,1,2); cr=stats(pts,3,4)
        print(f"CPU {slow}x | fps≈{len(pts)/dt:4.0f} | px/s desenhado={ci[0]*len(pts)/dt:6.1f} (esperado ≈216) | irregularidade do passo: interpolado={ci[1]*100:5.1f}%  sem interpolar={cr[1]*100:5.1f}%")
        pg.close()
    b.close()
