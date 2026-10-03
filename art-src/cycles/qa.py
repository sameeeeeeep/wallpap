#!/usr/bin/env python3
# QA montage for a cut cycle: walk1 + frames bottom-aligned at one scale, torso-centroid tick marks.
# usage: qa.py <slug> <cycle> <spritesdir> <out.png>
import sys,glob,os
from PIL import Image,ImageDraw
import numpy as np
slug,cyc,spd,out=sys.argv[1:5]
d=os.path.dirname(os.path.abspath(__file__))
n=8 if cyc=='walk' else 6
fr=[Image.open(f'{d}/cut/{slug}-{cyc}-{i}.png').convert('RGBA') for i in range(1,n+1)]
ref=Image.open(f'{spd}/walk1.png').convert('RGBA')
def meas(im):
    a=np.array(im)[:,:,3]>127; ys=np.where(a.any(1))[0]; t,b=ys[0],ys[-1]
    y0,y1=int(t+(b-t)*.3),int(t+(b-t)*.65); xs=np.where(a[y0:y1+1])[1]
    return t,b,xs.mean()
hs=sorted(meas(f)[1]-meas(f)[0]+1 for f in fr); med=hs[len(hs)//2]
rt,rb,_=meas(ref); k=(rb-rt+1)/med
H=int((rb-rt+1)*1.25)+20; cw=int(max(f.width for f in fr)*k)+30
COLS=(n+1+1)//2; W=cw*COLS
M=Image.new('RGBA',(W,H*2),(230,230,230,255)); D=ImageDraw.Draw(M)
def put(im,i,kk):
    im2=im.resize((int(im.width*kk),int(im.height*kk)),Image.LANCZOS)
    r,c=divmod(i,COLS); x=c*cw+15; y=r*H+H-10-im2.height; M.alpha_composite(im2,(x,y))
    t,b,cx=meas(im2); D.line([(x+cx,r*H),(x+cx,r*H+H)],fill=(255,0,0,255))
    D.text((c*cw+4,r*H+4),str(i) if i else 'walk1',fill=(0,0,0,255))
put(ref,0,1)
for i,f in enumerate(fr): put(f,i+1,k)
[D.line([(0,r*H+H-10),(W,r*H+H-10)],fill=(0,0,255,255)) for r in (0,1)]
M.save(out); print(out, 'k=%.2f'%k, 'sizes', [f.size for f in fr])
