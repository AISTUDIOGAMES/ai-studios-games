"""Builds the per-element masks used by the interactive hero (src/heroFx2.ts).
Input : public/images/hero-keyart.webp (the flat 2048x1144 key art)
Output: public/images/hero-fx/<id>.webp (silhouette), <id>-lit.webp (neon/gold parts only), hit.png (hover index map)
Run   : python3 scripts/build-hero-masks.py   (needs numpy, opencv-python-headless, pillow)
Coordinates below are in the art's own 1024x572 space."""
import json, numpy as np, cv2
from PIL import Image
S = 2
src = Image.open('public/images/hero-keyart.webp').convert('RGB')
im = cv2.cvtColor(np.array(src), cv2.COLOR_RGB2BGR)
H, W = im.shape[:2]
R = {'samurai':(560,88,840,360),'android':(830,55,1000,340),'female':(578,290,795,500),'hooded':(830,298,1024,572),'ouroboros':(328,205,585,355)}
C = {'samurai':[(735,200,28,70),(790,110,14,10),(700,235,10,25)],
     'android':[(920,170,18,70),(900,235,16,28),(930,100,10,14)],
     'female':[(675,330,22,30),(690,385,35,25),(660,440,16,40),(745,450,12,30)],
     'hooded':[(890,360,28,50),(900,450,30,70),(960,420,35,30)],
     'ouroboros':[(405,235,12,12),(450,285,14,35),(510,315,40,12)]}
# clip polygons trim background that GrabCut leaked into (1024 space); 'add' = thin parts kept outside the clip
CLIP = {'samurai':[(702,98),(822,82),(818,132),(782,160),(800,280),(845,335),(845,365),(690,365),(690,262),(690,236),(672,228),(657,222),(655,205),(676,165),(690,130)]}
ADD  = {'samurai':[[(564,268),(652,218),(664,222),(662,236),(576,276)]]}   # lower-left sword blade
CUT  = {'android':[[(868,50),(922,50),(922,66),(906,84),(892,88),(888,76)]], 'female':[[(598,330),(636,330),(636,378),(626,396),(606,412),(596,410)]]}
poly = lambda pts: (np.array(pts)*S).astype(np.int32)
masks = {}
for k,(x0,y0,x1,y1) in R.items():
    x0,y0,x1,y1 = [v*S for v in (x0,y0,x1,y1)]; pad=20
    X0,Y0,X1,Y1 = max(0,x0-pad),max(0,y0-pad),min(W,x1+pad),min(H,y1+pad)
    crop = im[Y0:Y1,X0:X1].copy()
    m = np.full(crop.shape[:2], cv2.GC_BGD, np.uint8)
    m[(y0-Y0):(y1-Y0),(x0-X0):(x1-X0)] = cv2.GC_PR_BGD
    for cx,cy,rx,ry in C[k]:
        cv2.ellipse(m,(cx*S-X0,cy*S-Y0),(rx*S,ry*S),0,0,360,cv2.GC_FGD,-1)
        cv2.ellipse(m,(cx*S-X0,cy*S-Y0),(int(rx*S*2),int(ry*S*1.8)),0,0,360,cv2.GC_PR_FGD,-1)
    bg = np.zeros((1,65)); fg = np.zeros((1,65))
    cv2.grabCut(crop,m,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
    a = np.where((m==cv2.GC_FGD)|(m==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    a = cv2.morphologyEx(a,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,_ = cv2.connectedComponentsWithStats(a)
    keep = np.zeros_like(a)
    for i in range(1,n):
        if st[i,4] > 600: keep[lab==i] = 255
    full = np.zeros((H,W),np.uint8); full[Y0:Y1,X0:X1] = keep
    if k in CLIP:
        c = np.zeros((H,W),np.uint8); cv2.fillPoly(c,[poly(CLIP[k])],255)
        for p in ADD.get(k,[]): cv2.fillPoly(c,[poly(p)],255)
        full = cv2.bitwise_and(full,c)
    for p in CUT.get(k,[]): cv2.fillPoly(full,[poly(p)],0)
    masks[k] = full
# sphere: circle minus the characters in front of it
sp = np.zeros((H,W),np.uint8); cv2.circle(sp,(640*S,152*S),124*S,255,-1)
front = cv2.dilate(cv2.bitwise_or(masks['samurai'],masks['android']),np.ones((5,5),np.uint8))
masks['sphere'] = cv2.bitwise_and(sp,cv2.bitwise_not(front))
hsv = cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
lit_all = ((hsv[...,2]>150)&(hsv[...,1]>70)).astype(np.uint8)*255      # bright + saturated = neon / gold / glow
lit_all = cv2.dilate(lit_all,np.ones((5,5),np.uint8))
bbox = {}; out = {}
def save(name,m,box):
    x0,y0,x1,y1 = box
    c = m[y0:y1,x0:x1]; c = cv2.GaussianBlur(c,(0,0),1.2)
    sc = 0.75   # store at 1.5x of the 1024 space
    c = cv2.resize(c,(max(1,int(c.shape[1]*sc)),max(1,int(c.shape[0]*sc))),interpolation=cv2.INTER_AREA)
    rgba = np.dstack([np.full_like(c,255)]*3+[c])
    Image.fromarray(rgba,'RGBA').save(f'public/images/hero-fx/{name}.webp',lossless=True,quality=100,method=6)
for k,m in masks.items():
    ys,xs = np.where(m>127); pad=8
    box = (max(0,xs.min()-pad),max(0,ys.min()-pad),min(W,xs.max()+pad),min(H,ys.max()+pad))
    bbox[k] = [round(v/S,1) for v in box]
    save(k,m,box)
    lit = cv2.bitwise_and(cv2.dilate(m,np.ones((3,3),np.uint8)),lit_all)
    if k=='sphere': lit = cv2.bitwise_and(m,((hsv[...,2]>95)&(hsv[...,1]>110)).astype(np.uint8)*255)
    save(k+'-lit',lit,box)
# hit map (512x286): index*40, dilated a little so thin parts are easy to hover; later ids win
order = ['sphere','ouroboros','female','samurai','android','hooded']
hit = np.zeros((H,W),np.uint8)
for i,k in enumerate(order,1):
    d = cv2.dilate(masks[k],np.ones((9,9),np.uint8)) if k!='sphere' else masks[k]
    hit[d>127] = i*40
hit = cv2.resize(hit,(512,286),interpolation=cv2.INTER_NEAREST)
Image.fromarray(hit,'L').save('public/images/hero-fx/hit.png',optimize=True)
json.dump({'order':order,'bbox':bbox},open('/home/claude/masks/meta.json','w'))
print(json.dumps(bbox))
prev = cv2.resize(im,(1024,572))
cols = {'ouroboros':(0,215,255),'sphere':(255,0,255),'samurai':(255,100,200),'android':(255,255,0),'female':(0,255,0),'hooded':(0,128,255)}
for k in order:
    mm = cv2.resize(masks[k],(1024,572))>127; prev[mm]=(0.5*prev[mm]+0.5*np.array(cols[k])).astype(np.uint8)
cv2.imwrite('/home/claude/overlay3.png',prev)
