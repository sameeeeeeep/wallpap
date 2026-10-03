#!/usr/bin/env python3
"""Actual WebKit jump sequences; budget-guarded, JPEG contacts only after capture."""
import concurrent.futures,json,os,shutil,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
OUT=Path('shots/cats-jumps');COATS=['orange','black','grey','calico','siamese']
TIMES=[0,.2,.36,.43,.5,.57,.64,.71,.78,.86,.96,1.1,1.3,1.5,1.7,1.9]
def guard():
 if shutil.disk_usage('/').free<3*1024**3:raise RuntimeError('STOP: less than 3 GB free')
 if sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file())>480*1024**2:raise RuntimeError('STOP: capture budget')
def run(job):
 guard();coat,hour,view,sign=job;i=COATS.index(coat)
 name=f'{coat}-{view}-'+('right' if sign==1 else 'left')+'-'+('day' if hour==12 else 'night')
 if (OUT/(name+'-contact.jpg')).exists():return name+' (retained)'
 x=610 if sign==1 else 750;y=790 if view!='back' else 840
 dx=140*sign if view=='side' else 50*sign;dy=0 if view=='side' else 85 if view=='front' else -85
 end=[x+dx,y+dy];opt={'from':[x,y],'walk':[end[0]+dx*.35,end[1]+dy*.35]}
 js="window.__shotReady=()=>{LW.advance(.1);__cats.cats.forEach(c=>{__cats.setState(c,'away',1e9);c.mission='qa'});"
 js+=f'__cats.forceJump({i},{end[0]},{end[1]},{json.dumps(opt)});LW.advance(1/30);}};'
 js+=f"window.__shotReport=()=>{{const c=__cats.cats[{i}];return {{x:c.x,y:c.y,z:c.z,state:c.state,frame:c.spP,view:c._petDirection,jump:c.j&&{{view:c.j.view,key:c.j.key,vx:c.j.vx,vy:c.j.vy}},shift:c._gait?.shift,scale:c.k,loaded:Object.keys(__cats.SPR[{i}].seq)}}}}"
 env=dict(os.environ,WKSHOT_FRAMES=','.join(map(str,TIMES)))
 p=subprocess.run(['./tools/wkshot',f'http://localhost:5210/cats.html?virtual=1&muted=1&hour={hour}&side=off',str(OUT/(name+'.png')),'1200','750','0',js],env=env,text=True,capture_output=True)
 (OUT/(name+'.log')).write_text(p.stdout+p.stderr)
 assert p.returncode==0,(name,p.stdout,p.stderr)
 reports=[json.loads(l[8:]) for l in p.stdout.splitlines() if l.startswith('result: ')]
 assert len(reports)==len(TIMES) and all(not r['errors'] for r in reports),(name,reports)
 wanted={'front':'f','back':'b','side':'side'}[view]
 assert any(r['report']['state']=='jump' and r['report']['jump']['view']==wanted for r in reports),(name,reports)
 assert all(r['report']['view']['face']==sign for r in reports),name
 (OUT/(name+'.json')).write_text(json.dumps(reports,indent=2)+'\n')
 sheet=Image.new('RGB',(4*420,4*340),'#252936');draw=ImageDraw.Draw(sheet)
 for k,f in enumerate(sorted(OUT.glob(name+'-f*.png'))):
  im=Image.open(f);ratio=im.width/1600;im=im.crop(tuple(round(v*ratio) for v in (450,580,900,920)));im.thumbnail((420,317))
  xx,yy=(k%4)*420,(k//4)*340;sheet.paste(im,(xx,yy+22));r=reports[k]['report']
  draw.text((xx+4,yy+4),f"{name} {TIMES[k]:.2f}s {r['frame']}",fill='white')
 sheet.save(OUT/(name+'-contact.jpg'),quality=88)
 for f in OUT.glob(name+'-f*.png'):f.unlink()
 return name
if __name__=='__main__':
 subprocess.run(['df','-h','/'],check=True)
 jobs=[(c,h,v,s) for c in COATS for h in [12,0] for v in ['side','front','back'] for s in [1,-1]]
 if len(sys.argv)>1:jobs=jobs[:int(sys.argv[1])]
 with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
  for result in ex.map(run,jobs):print(result,flush=True)
 guard()
