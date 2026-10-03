#!/usr/bin/env python3
# All installed cycle frames on a dark backdrop (spot holes / background left in leg gaps).
# usage: sheet.py <out.png> <slug-cycle>...
import sys,os
from PIL import Image
d=os.path.dirname(os.path.abspath(__file__)); rows=[]
for sc in sys.argv[2:]:
    n=8 if sc.endswith('walk') else 6
    rows.append([Image.open(f'{d}/cut/{sc}-{i}.png').convert('RGBA') for i in range(1,n+1)])
cw=max(i.width for r in rows for i in r)+8; ch=max(i.height for r in rows for i in r)+8
M=Image.new('RGBA',(cw*8,ch*len(rows)),(24,70,40,255))
for y,r in enumerate(rows):
    for x,i in enumerate(r): M.alpha_composite(i,(x*cw+4,y*ch+ch-4-i.height))
M.save(sys.argv[1])
