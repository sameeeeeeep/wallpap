#!/usr/bin/env python3
"""JPEG comparisons: ten pet identities on dark/light mattes, weakest-PSNR art crops."""
import json
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/webp';rows=json.loads((ROOT/'tools/webp/report.json').read_text())
converted=[r for r in rows if 'webp_bytes' in r]
def pair(r):
 rel=Path(r['path']);return [Image.open(ROOT/'scenes/art'/rel).convert('RGBA'),Image.open(ROOT/'.build/webp/candidates'/rel.with_suffix('.webp')).convert('RGBA')]
animals=sorted({str(Path(r['path']).parent.parent if '/cycle/' in r['path'] or '/t/' in r['path'] else Path(r['path']).parent) for r in converted if r['path'].startswith('sprites/')})
for start in range(0,len(animals),5):
 selected=[min([r for r in converted if r['path'].startswith(a+'/')],key=lambda r:r['psnr_db'] or 999) for a in animals[start:start+5]]
 cv=Image.new('RGB',(1280,len(selected)*300),'#242831');draw=ImageDraw.Draw(cv)
 for row,r in enumerate(selected):
  ims=pair(r)
  for col in range(4):
   im=ims[col%2].copy();im.thumbnail((310,265));x=col*320;y=row*300
   cv.paste('#1c2430' if col<2 else '#eee9df',(x,y+30,x+320,y+300));cv.paste(im,(x+(320-im.width)//2,y+32+(265-im.height)//2),im)
   draw.text((x+6,y+4),('PNG ' if col%2==0 else 'WebP ')+r['path'].split('/')[2]+' '+str(r['psnr_db'])+' dB',fill='white')
 cv.save(OUT/f'sprite-edges-{start//5+1}.jpg',quality=95)
weak=sorted([r for r in converted if not r['path'].startswith('sprites/')],key=lambda r:r['psnr_db'] or 999)[:8]
for start in range(0,len(weak),4):
 cv=Image.new('RGB',(1200,4*324),'#242831');draw=ImageDraw.Draw(cv)
 for row,r in enumerate(weak[start:start+4]):
  for col,im in enumerate(pair(r)):
   w,h=im.size;im=im.crop((max(0,w//2-300),max(0,h//2-150),min(w,w//2+300),min(h,h//2+150)))
   x=col*600;y=row*324;cv.paste('#eee9df',(x,y+24,x+600,y+324));cv.paste(im,(x,y+24),im);draw.text((x+6,y+6),('PNG ' if col==0 else 'WebP ')+r['path']+' '+str(r['psnr_db'])+' dB',fill='white')
 cv.save(OUT/f'art-detail-{start//4+1}.jpg',quality=95)
