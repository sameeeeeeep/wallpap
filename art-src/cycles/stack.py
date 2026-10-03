#!/usr/bin/env python3
# Stack consecutive LW.shot crops (world-fixed window) vertically with a fixed x grid, to see
# whether planted paws hold still on the ground. usage: stack.py <glob-prefix> <out.png> [label...]
import sys,glob
from PIL import Image,ImageDraw
import os
fs=sorted(glob.glob(sys.argv[1]+'*.png')); ims=[Image.open(f).convert('RGB') for f in fs]
F=int(os.environ.get('FEET','0'))   # FEET=n: keep only the bottom n px (the paws), shown 3x
if F: ims=[i.crop((0,i.height-F,i.width,i.height)).resize((i.width*3,F*3),Image.NEAREST) for i in ims]
w,h=ims[0].size; M=Image.new('RGB',(w,h*len(ims)),(0,0,0)); D=ImageDraw.Draw(M)
for i,im in enumerate(ims): M.paste(im,(0,i*h)); D.text((4,i*h+4),str(i)+(' '+sys.argv[3+i] if len(sys.argv)>3+i else ''),fill=(255,255,0))
for x in range(0,w,20*(3 if F else 1)): D.line([(x,0),(x,M.height)],fill=(255,0,0) if x%100==0 else (90,90,90))
M.save(sys.argv[2]); print(sys.argv[2],M.size)
