#!/usr/bin/env python3
"""Exact calico takeoff regression and ultrawide left-widget compositions."""
import os,subprocess,json,shutil
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];os.chdir(root)
catch="console.error=(...a)=>{const s=a.map(e=>String(e)+' '+(e?.stack||'')).join(' ');if(!__errs.includes(s))__errs.push(s)};"
cases=[]
for hour,label in [(12,'day'),(0,'night')]:
 js=catch+"""window.__shotReady=()=>{LW.advance(.1);const P=__pets;P.initialized=true;P.items.forEach(p=>{p.away=true;p.mission='qa-hidden';p.j=null});P.forceJump(3,660,875,{from:[610,790]});LW.advance(1/30)};window.__shotReport=()=>{const p=__pets.items[3],f=__pets.frame(p);return {state:p.state,frame:f.key,k:p.k,z:p.z,quad:[f.w,f.h],errors:__errs}};"""
 cases.append(('cats','calico-takeoff-'+label,hour,1200,750,[0,.2,.36,.43,.5,.6,.75,.9,1.2],js))
for scene in ['cats','cafe','records','ramen','rooftop','speakeasy','cabin','grass']:
 js=catch+"window.__shotReady=()=>{LW.advance(.1);LW.advance(.1)};window.__shotReport=()=>({pets:__pets.items.map(p=>({id:p.rosterId,x:p.x,y:p.y,state:p.state})),overlaps:__pets.overlaps(),errors:__errs})"
 cases.append((scene,'wide-left-night',0,1680,720,[0,3,10],js))
for scene,name,h,w,height,frames,js in cases:
 if shutil.disk_usage('/').free<3*1024**3:raise RuntimeError('Disk stop')
 out=root/f'shots/pets-shared/{scene}/{name}';side='left' if name.startswith('wide') else 'off'
 r=subprocess.run(['./tools/wkshot',f'http://localhost:5210/{scene}.html?virtual=1&muted=1&hour={h}&side={side}',str(out)+'.png',str(w),str(height),'0',js],env={**os.environ,'WKSHOT_FRAMES':','.join(map(str,frames))},text=True,capture_output=True)
 out.with_suffix('.log').write_text(r.stdout+r.stderr);reports=[json.loads(s[8:]) for s in r.stdout.splitlines() if s.startswith('result: ')];pics=sorted(out.parent.glob(name+'-f*.png'))
 cell=(400,420) if name.startswith('calico') else (1500,665);cols=3 if name.startswith('calico') else 1
 cv=Image.new('RGB',(cols*cell[0],((len(pics)+cols-1)//cols)*cell[1]),'#30333a');d=ImageDraw.Draw(cv)
 for i,p in enumerate(pics):
  im=Image.open(p).convert('RGB')
  if name.startswith('calico'):
   ratio=im.width/1600;im=im.crop(tuple(round(x*ratio) for x in [480,620,800,940]))
  im.thumbnail((cell[0],cell[1]-20));x=i%cols*cell[0];y=i//cols*cell[1];cv.paste(im,(x,y+20));d.text((x+5,y+3),f'{scene} {name} {frames[i]:.2f}s',fill='white');p.unlink()
 cv.save(str(out)+'.jpg',quality=90)
 print(scene,name,reports[-1] if reports else r.stdout,flush=True)
