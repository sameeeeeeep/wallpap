#!/usr/bin/env python3
# Film strip of LW.shot crops (left→right, 2 rows if many). usage: film.py <glob-prefix> <out.png>
import sys,glob
from PIL import Image,ImageDraw
fs=sorted(glob.glob(sys.argv[1]+'*.png')); ims=[Image.open(f).convert('RGB') for f in fs]
w,h=ims[0].size; cols=min(len(ims),6); rows=(len(ims)+cols-1)//cols
M=Image.new('RGB',(w*cols,h*rows)); D=ImageDraw.Draw(M)
for i,im in enumerate(ims):
    r,c=divmod(i,cols); M.paste(im,(c*w,r*h)); D.text((c*w+3,r*h+3),str(i),fill=(255,255,0)); D.line([(c*w,r*h),(c*w,r*h+h)],fill=(0,0,0))
M.save(sys.argv[2]); print(sys.argv[2],M.size)
