#!/usr/bin/env python3
"""Install the generated directional strips, retaining alpha and a shared foot baseline.
Run from the repository root. Original generated sheets are never changed.
"""
from pathlib import Path
import numpy as np
from scipy import ndimage as nd
from PIL import Image, ImageDraw
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/webp'))
from assets import asset_path, save_art
root=Path(__file__).resolve().parents[2]
for coat in ['orange','black','grey','calico','siamese']:
 for view in ['f','b']:
  src=root/f'art-src/cycles/cat-{coat}-walk-{view}.png'
  im=Image.open(asset_path(src)).convert('RGBA');a=np.array(im)
  if a[:,:,3].min()==255:
   raise ValueError('Expected generated alpha; use cut.py for an opaque grey strip')
  labels,n=nd.label(a[:,:,3]>100)
  sizes=np.bincount(labels.ravel());sizes[0]=0
  ids=sorted(np.argsort(sizes)[-8:],key=lambda k:np.where(labels==k)[1].min())
  assert min(sizes[ids])>max(sizes[ids])*.5
  boxes=[]
  for k in ids:
   yy,xx=np.where(labels==k);boxes.append((xx.min(),yy.min(),xx.max()+1,yy.max()+1))
  top=min(b[1] for b in boxes);baseline=max(b[3] for b in boxes)
  out=root/f'scenes/art/sprites/cats/{coat}/cycle'
  for i,(x0,y0,x1,y1) in enumerate(boxes,1):
   # Include antialiasing and whiskers but no disconnected generation speckles.
   x0=max(0,x0-2);x1=min(im.width,x1+2)
   cut=a[top:baseline,x0:x1].copy()
   mask=nd.binary_dilation(labels[top:baseline,x0:x1]==ids[i-1],iterations=2)
   cut[:,:,3]=np.where(mask,cut[:,:,3],0)
   save_art(Image.fromarray(cut),out/f'walk-{view}-{i}.png')
  print(coat,view,'height',baseline-top)
# Three views side by side at runtime-normalized heights; every phase is visible.
canvas=Image.new('RGB',(1440,5*3*150),'#c9c8c6');draw=ImageDraw.Draw(canvas)
for row,coat in enumerate(['orange','black','grey','calico','siamese']):
 for v,view in enumerate(['side','f','b']):
  y=(row*3+v)*150;draw.text((5,y+2),f'{coat} {view}',fill='black')
  for i in range(1,9):
   prefix='walk' if view=='side' else f'walk-{view}'
   im=Image.open(asset_path(root/f'scenes/art/sprites/cats/{coat}/cycle/{prefix}-{i}.png'));im.thumbnail((170,120))
   canvas.paste(im,((i-1)*180+(180-im.width)//2,y+145-im.height),im)
save_art(canvas,root/'shots/cats-dirs/installed-contact.jpg')
