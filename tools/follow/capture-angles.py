#!/usr/bin/env python3
"""Capture a continuous WKWebView day/night motion matrix; retain only contact JPEGs."""
import os,sys,subprocess,json,shutil
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];os.chdir(root)
frames=[round(3*n+t,2) for n in range(5) for t in [.05,.4,.85,1.25,1.5,2]]
for scene in sys.argv[1:] or ['cats','speakeasy']:
 for label,hour in [('day',12),('night',0)]:
  if shutil.disk_usage('/').free<3*1024**3:raise RuntimeError('Stop: less than 3 GiB free')
  out=root/'shots/follow-angles'/scene;out.mkdir(parents=True,exist_ok=True);base=out/label
  env={**os.environ,'WKSHOT_FRAMES':','.join(map(str,frames))}
  r=subprocess.run(['./tools/wkshot',f'http://localhost:5210/{scene}.html?virtual=1&muted=1&hour={hour}',str(base)+'.png','1200','750','0',(root/'tools/follow/angles.js').read_text()],env=env,text=True,capture_output=True)
  base.with_suffix('.log').write_text(r.stdout+r.stderr);reports=[json.loads(x[8:]) for x in r.stdout.splitlines() if x.startswith('result: ')]
  pictures=sorted(out.glob(label+'-f*.png'));sheets=[]
  detail=Image.new('RGB',(1500,((len(pictures)+5)//6)*200),'#464952');dd=ImageDraw.Draw(detail)
  for j in range(0,len(pictures),6):
   sheet=Image.new('RGB',(1500,3*330),'#252831');d=ImageDraw.Draw(sheet)
   for k,p in enumerate(pictures[j:j+6]):
    im=Image.open(p).convert('RGB')
    rects=reports[j+k].get('report',{}).get('screen',[]) if len(reports)>j+k else []
    if rects:
     box=[min(r[0] for r in rects),min(r[1] for r in rects),max(r[2] for r in rects),max(r[3] for r in rects)];box=[round(v*im.width/1200) for v in box];box=[max(0,box[0]),max(0,box[1]),min(im.width,box[2]),min(im.height,box[3])]
     if box[2]>box[0] and box[3]>box[1]:
      cut=im.crop(box);cut.thumbnail((246,176));xx=((j+k)%6)*250;yy=((j+k)//6)*200;detail.paste(cut,(xx,yy+20));dd.text((xx+3,yy+3),f'{frames[j+k]:.2f}s',fill='white')
    im.thumbnail((750,310));x=(k%2)*750;y=(k//2)*330;sheet.paste(im,(x,y+20));d.text((x+8,y+3),f'{scene} {label} {frames[j+k]:.2f}s',fill='white');p.unlink()
   sheet.save(out/f'{label}-{j//6}.jpg',quality=87)
  detail.save(out/f'{label}-contacts.jpg',quality=90)
  print(scene,label,'frames',len(pictures),'errors',list({e for q in reports for e in q.get('errors',[])}),'overlaps',reports[-1].get('report',{}).get('bad') if reports else 'NO REPORT',flush=True)
  assert r.returncode==0 and len(reports)==len(frames) and len(pictures)==len(frames), f'{scene} {label}: incomplete capture'
  assert all(not q.get('errors') and not q.get('report',{}).get('errors') and not q.get('report',{}).get('bad') for q in reports), f'{scene} {label}: failed report'
  if sum(p.stat().st_size for p in (root/'shots/follow-angles').rglob('*') if p.is_file())>1024**3:raise RuntimeError('Evidence exceeds 1 GiB')
