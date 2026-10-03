#!/usr/bin/env python3
"""Pointer-coordinate smoke checks in each scene, mirrored and ultrawide."""
import os,json,shutil,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];os.chdir(ROOT)
out=ROOT/'shots/follow/smoke';out.mkdir(parents=True,exist_ok=True)
for scene in sys.argv[1:] or ['cats','cafe','records','ramen','rooftop','cabin','speakeasy','grass']:
 if shutil.disk_usage('/').free<3*1024**3:raise RuntimeError('STOP: under 3 GB free')
 base=out/scene
 r=subprocess.run(['./tools/wkshot',f'http://localhost:5210/{scene}.html?virtual=1&muted=1&hour=12&side=left',str(base)+'.png','2000','850','0',(ROOT/'tools/follow/smoke.js').read_text()],env={**os.environ,'WKSHOT_FRAMES':'0,.5,2,4,5.2,6'},text=True,capture_output=True)
 base.with_suffix('.log').write_text(r.stdout+r.stderr)
 reports=[json.loads(s[8:]) for s in r.stdout.splitlines() if s.startswith('result: ')]
 files=sorted(out.glob(scene+'-f*.png'));cv=Image.new('RGB',(1600,3*365),'#252831');d=ImageDraw.Draw(cv)
 for i,p in enumerate(files):
  im=Image.open(p).convert('RGB');im.thumbnail((800,340));x=i%2*800;y=i//2*365;cv.paste(im,(x,y+22));d.text((x+5,y+4),scene+' '+str(reports[i].get('report',{}).get('time')),fill='white');p.unlink()
 cv.save(base.with_suffix('.jpg'),quality=87)
 assert r.returncode==0 and len(files)==len(reports)==6,(scene,'incomplete')
 q=reports[-1]['report'];assert all(not v['errors'] and not v['report']['bad'] for v in reports),(scene,'errors/overlap')
 assert q['events'][0]['picked'] and not q['events'][-1]['picked'],(scene,q)
 print(scene,'pick/release',q['events'],'travel',round(((q['pet']['x']-q['start'][0])**2+(q['pet']['y']-q['start'][1])**2)**.5),flush=True)
