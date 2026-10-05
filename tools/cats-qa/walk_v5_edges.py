#!/usr/bin/env python3
"""Composite final alpha on dark/light backgrounds; no source pixel edits."""
from PIL import Image,ImageDraw
import json
from walk_v5 import BASE,OUT,COATS,VIEWS
out=Image.new('RGB',(1500,900));d=ImageDraw.Draw(out)
for row,coat in enumerate(COATS):
 m=json.loads((BASE/coat/'atlas/manifest.json').read_text())
 for col,v in enumerate(VIEWS):
  c=m['walk-'+v];im=Image.open(BASE/coat/'atlas'/f'walk-{v}.webp');x,y,w,h,*_=c['frames'][2];p=im.crop((x,y,x+w,y+h));p.thumbnail((140,155))
  for j,bg in enumerate(['#14202b','#f1ede3']):
   x=col*300+j*150;y=row*180;d.rectangle((x,y,x+150,y+180),fill=bg);out.paste(p,(x+(150-p.width)//2,y+175-p.height),p);d.text((x+4,y+4),coat+' '+v,fill='#a9aaaa')
out.save(OUT/'walk-v5-edges.jpg',quality=92)
