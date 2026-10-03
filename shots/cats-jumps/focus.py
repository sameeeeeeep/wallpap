#!/usr/bin/env python3
"""Compact review of every captured matrix frame, retaining ground under each cat."""
import json
from pathlib import Path
from PIL import Image,ImageDraw
P=Path('shots/cats-jumps')
for coat in ['orange','black','grey','calico','siamese']:
 for light in ['day','night']:
  names=[f'{coat}-{v}-{s}-{light}' for v in ['side','front','back'] for s in ['right','left']]
  if not all((P/(n+'-contact.jpg')).exists() for n in names):continue
  for half in [0,1]:
   sheet=Image.new('RGB',(8*185,6*200),'#252936');d=ImageDraw.Draw(sheet)
   for row,name in enumerate(names):
    im=Image.open(P/(name+'-contact.jpg'));reports=json.loads((P/(name+'.json')).read_text())
    for col in range(8):
     k=half*8+col;r=reports[k]['report'];x=(r['x']-450)*420/900*2;y=(r['y']-580)*420/900*2
     # Keep the ground fixed at bottom; flying body is higher by z.
     tile=im.crop(((k%4)*420,(k//4)*340,(k%4+1)*420,(k//4+1)*340))
     crop=tile.crop((round(x-92),round(y+22-172),round(x+93),round(y+22+12)))
     sheet.paste(crop,(col*185,row*200+16));d.text((col*185+2,row*200+2),name.replace(coat+'-','')+' '+r['frame'],fill='white')
   sheet.save(P/f'review-{coat}-{light}-{half}.jpg',quality=91)
