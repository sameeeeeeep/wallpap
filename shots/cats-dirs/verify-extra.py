#!/usr/bin/env python3
"""Vertical, mirrored and directional-run smoke sequences in WebKit."""
import os,json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
out=Path('shots/cats-dirs')
cases=[('vertical',0,[650,730],[650,940],'walk','off'),('mirror',4,[800,730],[600,930],'walk','left'),('run',3,[550,730],[750,940],'run','off')]
for name,cat,start,end,gait,side in cases:
 prefix='extra-'+name
 js="__cats.cats.forEach(c=>{__cats.setState(c,'away',1e9);c.mission='qa'});"
 js+=f"__cats.forceWalk({cat},{end[0]},{end[1]},{json.dumps({'from':start,'gait':gait})});"
 js+=f"window.__shotReport=()=>{{let c=__cats.cats[{cat}];return {{frame:c.spP,view:c._petDirection,phase:c._gait.ph,x:c.x,y:c.y}}}}"
 p=subprocess.run(['./tools/wkshot',f'http://localhost:5210/cats.html?virtual=1&muted=1&hour=0&side={side}',str(out/(prefix+'.png')),'1600','1000','.1',js],env=dict(os.environ,WKSHOT_FRAMES=','.join(str(i*2/30) for i in range(12))),capture_output=True,text=True)
 (out/(prefix+'.log')).write_text(p.stdout+p.stderr);assert p.returncode==0,p.stdout+p.stderr
 rows=[json.loads(line[8:]) for line in p.stdout.splitlines() if line.startswith('result: ')];assert all(not r['errors'] for r in rows)
 (out/(prefix+'.json')).write_text(json.dumps(rows,indent=2)+'\n')
 sheet=Image.new('RGB',(1680,1035),'#252936');d=ImageDraw.Draw(sheet)
 for k,f in enumerate(sorted(out.glob(prefix+'-f*.png'))):
  rect=(1400,1180,2400,1950) if side=='left' else (800,1180,1800,1950)
  im=Image.open(f).crop(rect);im.thumbnail((420,323));x,y=k%4*420,k//4*345
  sheet.paste(im,(x,y+20));d.text((x+3,y+3),f"{name} {k*2/30:.2f}s {rows[k]['report']['frame']}",fill='white');f.unlink()
 sheet.save(out/(prefix+'-contact.jpg'),quality=90);print(prefix,flush=True)
