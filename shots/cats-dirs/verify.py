#!/usr/bin/env python3
"""WebKit sequences in the actual scene; run from the repository root.
No wallpaper host is launched. Retains reports and contact sheets; discards raw captures.
"""
import concurrent.futures,json,os,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
OUT=Path('shots/cats-dirs');OUT.mkdir(exist_ok=True)
COATS=['orange','black','grey','calico','siamese']
CASES={'lateral':([560,795],[880,795]),'front':([550,730],[750,910]),'back':([550,905],[750,725]),'turn':([550,750],[880,750])}
def run(job):
 coat,hour,case=job;i=COATS.index(coat);start,end=CASES[case];name=f'{coat}-{case}-'+('day' if hour==12 else 'night')
 opt={'from':start}
 if case=='turn':opt['turn']={'after':.8,'to':[750,925]}
 js="__cats.cats.forEach(c=>{__cats.setState(c,'away',1e9);c.mission='qa'});"
 js+=f'__cats.forceWalk({i},{end[0]},{end[1]},{json.dumps(opt)});'
 js+=f"window.__shotReport=()=>{{const c=__cats.cats[{i}];return {{x:c.x,y:c.y,frame:c.spP,phase:c._gait.ph,view:c._petDirection,shift:c._gait.shift,scale:c.k,loaded:Object.keys(__cats.SPR[{i}].cyc.cyc),}}}}"
 env=dict(os.environ,WKSHOT_FRAMES=','.join(str(round(i*4/30,6)) for i in range(16)))
 p=subprocess.run(['./tools/wkshot',f'http://localhost:5210/cats.html?virtual=1&muted=1&hour={hour}&side=off',str(OUT/(name+'.png')),'1600','1000','.1',js],env=env,text=True,capture_output=True)
 (OUT/(name+'.log')).write_text(p.stdout+p.stderr)
 assert p.returncode==0,(name,p.stdout,p.stderr)
 reports=[json.loads(line[8:]) for line in p.stdout.splitlines() if line.startswith('result: ')]
 assert len(reports)==16 and all(not r['errors'] for r in reports),name
 (OUT/(name+'.json')).write_text(json.dumps(reports,indent=2)+'\n')
 # A fixed world-space crop makes foot motion against the tiles inspectable.
 sheet=Image.new('RGB',(4*420,4*345),'#252936');draw=ImageDraw.Draw(sheet)
 for k,f in enumerate(sorted(OUT.glob(name+'-f*.png'))):
  im=Image.open(f).crop((800,1180,1800,1950));im.thumbnail((420,323))
  x,y=(k%4)*420,(k//4)*345
  sheet.paste(im,(x,y+20));r=reports[k]['report']
  draw.text((x+4,y+3),f"{name} {k*4/30:.2f}s {r['frame']}",fill='white')
 sheet.save(OUT/(name+'-contact.jpg'),quality=90)
 for f in OUT.glob(name+'-f*.png'):f.unlink()
 return name
def art_contact():
 layout=json.loads(Path('art-src/cycles/directions-layout.json').read_text())
 out=Image.new('RGB',(1600,1500),'#bcbab7');d=ImageDraw.Draw(out)
 for r,coat in enumerate(COATS):
  for v,view in enumerate(['f','b']):
   geom=layout['cats/'+coat]['walk-'+view];y=(r*2+v)*150
   d.text((4,y),coat+' '+view,fill='black')
   for i in range(8):
    im=Image.open(f'scenes/art/sprites/cats/{coat}/cycle/walk-{view}-{i+1}.png');k=90/geom['height']
    im=im.resize((round(im.width*k),round(im.height*k)))
    out.paste(im,(i*200+100-im.width//2,round(y+128-(im.height-geom['pad']*k))),im)
 out.save(OUT/'planted-art-contact.jpg')
if __name__=='__main__':
 art_contact()
 jobs=[(c,h,case) for c in COATS for h in [12,0] for case in CASES]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
  for result in ex.map(run,jobs):print(result,flush=True)
