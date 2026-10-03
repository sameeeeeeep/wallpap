#!/usr/bin/env python3
"""Before/after built-in WebKit matrix on THIS worktree's server (5217)."""
import json, shutil, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'shots/webp';OUT.mkdir(parents=True,exist_ok=True)
phase=sys.argv[1];assert phase in ('before','after')
scenes=['koi','bowls','cats','grass','cafe','records','ramen','rooftop','speakeasy','cabin','cymatics','drive','kinetic','fluids','skies']+['train-'+s for s in ('indian','orient','swiss','shinkansen')]
reports=[]
for scene in scenes:
 tiles=[]
 for hour in (12,22):
  if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: less than 3 GiB free')
  name=f'{phase}-{scene}-{hour}';raw=OUT/(name+'.png')
  url=f'http://localhost:5217/{scene.split("-")[0]}.html?virtual=1&muted=1&hour={hour}&shotSeed=135'
  pre="__lw('settings',{skin:"+json.dumps(scene.split('-')[1])+"})" if scene.startswith('train-') else ''
  try:
   r=subprocess.run([str(ROOT/'tools/wkshot'),url,str(raw),'1600','1000','4',pre],cwd=ROOT,text=True,capture_output=True,timeout=70)
   (OUT/(name+'.log')).write_text(r.stdout+r.stderr)
   record={'name':name,'exit':r.returncode}
   for line in r.stdout.splitlines():
    if line.startswith('result: '):record.update(json.loads(line[8:]))
   reports.append(record)
   assert r.returncode==0 and 'errors' in record,(name,r.stdout,r.stderr)
   im=Image.open(raw).convert('RGB');im.thumbnail((800,500))
   tile=Image.new('RGB',(800,524),'#252831');tile.paste(im,(0,24));ImageDraw.Draw(tile).text((10,7),name,fill='white');tiles.append(tile)
   print(name,'errors',record['errors'],'failed images',len(record.get('imageErrors',[])),flush=True)
  finally:raw.unlink(missing_ok=True)
 sheet=Image.new('RGB',(1600,524));sheet.paste(tiles[0],(0,0));sheet.paste(tiles[1],(800,0));sheet.save(OUT/f'{phase}-{scene}.jpg',quality=90)
 (OUT/f'{phase}.json').write_text(json.dumps(reports,indent=2)+'\n')
if phase=='after':
 assert all(not r['errors'] and not r.get('imageErrors') and not r.get('pendingImages') for r in reports), 'Runtime errors or failed images'
print('Completed',len(reports),'captures',flush=True)
