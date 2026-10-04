#!/usr/bin/env python3
"""File-origin scene integration matrix, isolated from the installed application."""
import json,os,subprocess,shutil
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt/matrix';OUT.mkdir(parents=True,exist_ok=True)
scenes=['cats','cafe','cabin','ramen','records','rooftop','speakeasy','grass'];results=[]
for scene in scenes:
 for mode,hour,w,h,query in [('day',12,1280,800,''),('night',22,1280,800,''),('wide-left',22,1920,800,'&side=left')]:
  if shutil.disk_usage('/').free<5*1024**3:raise RuntimeError('Disk under 5 GiB')
  name=scene+'-'+mode;png=OUT/(name+'.png')
  js="window.__shotReport=()=>({ready:__pets.ready,pets:__pets.items.map(p=>({id:p.rosterId,kind:p.kind,atlas:!!p.asset.atlas,state:p.state,pose:p.spP,away:p.away})),overlaps:__pets.overlaps()})"
  r=subprocess.run(['/tmp/cats-wkshot',(ROOT/f'scenes/{scene}.html').as_uri()+f'?virtual=1&muted=1&hour={hour}&shotSeed=19'+query,str(png),str(w),str(h),'8',js],capture_output=True,text=True,timeout=90)
  lines=[json.loads(s[8:]) for s in r.stdout.splitlines() if s.startswith('result: ')];report=lines[-1] if lines else {'errors':[r.stdout,r.stderr]}
  assert r.returncode==0 and not report['errors'] and not report.get('imageErrors'),(name,report)
  assert report['report']['ready'],(name,'pets not ready')
  assert all(p['atlas'] for p in report['report']['pets'] if p['kind']=='cat'),(name,'cat fallback')
  with Image.open(png) as im:im.convert('RGB').resize((w,h)).save(OUT/(name+'.jpg'),quality=88)
  png.unlink();results.append({'scene':scene,'mode':mode,**report});print(name,'clean',flush=True)
(OUT/'results.json').write_text(json.dumps(results,indent=2))
for mode in ['day','night','wide-left']:
 sheet=Image.new('RGB',(1280,4*424),'#20242a');d=ImageDraw.Draw(sheet)
 for i,scene in enumerate(scenes):
  im=Image.open(OUT/f'{scene}-{mode}.jpg');im.thumbnail((640,400));x=i%2*640;y=i//2*424;sheet.paste(im,(x,y+24));d.text((x+6,y+5),scene+' / '+mode,fill='white')
 sheet.save(OUT/(mode+'-contact.jpg'),quality=90)
print('24 file:// WebKit integrations passed')
