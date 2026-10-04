#!/usr/bin/env python3
"""Check the lazy-loaded Café jukebox paintings and player-switch compatibility."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,subprocess,shutil
ROOT=Path(__file__).resolve().parents[2];out=ROOT/'shots/webp';tiles=[]
for hour in (12,22):
 if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: less than 3 GiB free')
 raw=out/f'cafe-jukebox-{hour}.png'
 try:
  r=subprocess.run([str(ROOT/'tools/wkshot'),f'http://localhost:5217/cafe.html?virtual=1&muted=1&hour={hour}&shotSeed=135',str(raw),'1600','1000','4',"__lw('settings',{player:'jukebox'});window.__shotReport=()=>({player:LW.settings.player})"],cwd=ROOT,capture_output=True,text=True,timeout=70)
  (out/f'cafe-jukebox-{hour}.log').write_text(r.stdout+r.stderr)
  rec=json.loads(next(l[8:] for l in r.stdout.splitlines() if l.startswith('result: ')))
  assert r.returncode==0 and not rec['errors'] and not rec['imageErrors'] and not rec['pendingImages'] and rec['report']['player']=='jukebox',rec
  im=Image.open(raw).convert('RGB').resize((800,500));cv=Image.new('RGB',(800,524),'#252831');cv.paste(im,(0,24));ImageDraw.Draw(cv).text((8,6),f'cafe jukebox {hour}',fill='white');tiles.append(cv)
 finally:raw.unlink(missing_ok=True)
cv=Image.new('RGB',(1600,524));cv.paste(tiles[0],(0,0));cv.paste(tiles[1],(800,0));cv.save(out/'cafe-jukebox.jpg',quality=90)
print('Cafe jukebox day/night: zero errors and failed images')
