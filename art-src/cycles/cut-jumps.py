#!/usr/bin/env python3
"""Install generated jump strips. Preserve originals; register cuts to walk geometry."""
import json, shutil, subprocess, sys
from pathlib import Path
import numpy as np
from scipy import ndimage as nd
from PIL import Image, ImageDraw
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/webp'))
from assets import asset_path, save_art
root=Path(__file__).resolve().parents[2]
base=root/'art-src/cycles'
layout=json.loads((base/'directions-layout.json').read_text())
meta={}
for job in json.loads((base/'jumps-prompts.json').read_text()):
 coat,view=job['coat'],job['view'];name=f'cat-{coat}-jump-{view}'
 original=base/f'{name}-original.png'
 if not original.exists():shutil.copyfile(job['source'],original)
 im=Image.open(asset_path(original)).convert('RGBA');a=np.array(im)
 out=root/f'scenes/art/sprites/cats/{coat}/t';prefix=f'jump-{view}'
 if a[:,:,3].min()<255:
  lab,n=nd.label(a[:,:,3]>100);sizes=np.bincount(lab.ravel());sizes[0]=0
  ids=sorted(np.argsort(sizes)[-5:],key=lambda k:np.where(lab==k)[1].min())
  assert min(sizes[ids])>max(sizes[ids])*.3
  for i,k in enumerate(ids,1):
   yy,xx=np.where(lab==k);box=(max(0,xx.min()-2),max(0,yy.min()-2),min(im.width,xx.max()+3),min(im.height,yy.max()+3))
   x0,y0,x1,y1=box;cut=a[y0:y1,x0:x1].copy()
   cut[:,:,3]=np.where(nd.binary_dilation(lab[y0:y1,x0:x1]==k,iterations=2),cut[:,:,3],0)
   save_art(Image.fromarray(cut),out/f'{prefix}-{i}.png')
  bg=Image.new('RGBA',im.size,'#e6e6e6');bg.alpha_composite(im);save_art(bg.convert('RGB'),base/f'{name}.png')
 else:
  shutil.copyfile(original,base/f'{name}.png')
  subprocess.run([sys.executable,str(base/'cut.py'),str(original),str(out),prefix,'5'],check=True)
 cuts=[Image.open(asset_path(out/f'{prefix}-{i}.png')).convert('RGBA') for i in range(1,6)]
 # Prepared one-row master has an exactly flat grey backdrop; unmodified generation is retained above.
 cell=max(c.width for c in cuts)+48;h=max(c.height for c in cuts)+96
 master=Image.new('RGB',(cell*5,h),'#e6e6e6')
 for i,cut in enumerate(cuts):master.paste(cut,(i*cell+(cell-cut.width)//2,h-48-cut.height),cut)
 save_art(master,base/f'{name}.png')
 geom=layout['cats/'+coat]['walk-'+view];height=geom['height']
 # One scale for every articulation; landing is a slightly compressed walk stance.
 last=np.array(cuts[-1]);yy,xx=np.where(last[:,:,3]>127)
 factor=height*.88/(yy.max()-yy.min()+1)
 centers=[]
 for i,cut in enumerate(cuts,1):
  cut=cut.resize((round(cut.width*factor),round(cut.height*factor)),Image.Resampling.LANCZOS)
  b=np.array(cut);yy,xx=np.where(b[:,:,3]>127);top,bot=yy.min(),yy.max()
  band=(b[:,:,3]>127);band[:round(top+(bot-top)*.3)]=False;band[round(top+(bot-top)*.65)+1:]=False
  cy,cx=np.where(band);center=float(cx.mean())
  # Equal canvas height/baseline, plus margin for all whiskers and tail tips.
  pad=12;canvas=Image.new('RGBA',(cut.width+2*pad,round(height*1.6)+2*pad))
  baseline=canvas.height-pad-1;dy=baseline-int(bot)
  canvas.paste(cut,(pad,dy));save_art(canvas,out/f'{prefix}-{i}.png')
  centers.append(round(center+pad,4))
 meta.setdefault('cats/'+coat,{})[prefix]={'height':height,'pad':12,'centers':centers}
(base/'jumps-layout.json').write_text(json.dumps(meta,indent=2)+'\n')
shots=root/'shots/cats-jumps';shots.mkdir(exist_ok=True)
canvas=Image.new('RGB',(1400,10*170),'#65666a');d=ImageDraw.Draw(canvas)
for row,job in enumerate(json.loads((base/'jumps-prompts.json').read_text())):
 coat,view=job['coat'],job['view'];d.text((4,row*170+4),f'{coat} {view} / walk reference then five jump poses',fill='white')
 files=[root/f'scenes/art/sprites/cats/{coat}/cycle/walk-{view}-1.png']+[root/f'scenes/art/sprites/cats/{coat}/t/jump-{view}-{i}.png' for i in range(1,6)]
 for col,f in enumerate(files):
  im=Image.open(asset_path(f));bbox=im.getbbox();im=im.crop(bbox)
  # Compare at common scale based on metadata, excluding transparent walk padding.
  scale=110/layout['cats/'+coat]['walk-'+view]['height'];im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
  canvas.paste(im,(col*230+(230-im.width)//2,row*170+155-im.height),im)
save_art(canvas,shots/'art-contact.jpg',quality=90)
