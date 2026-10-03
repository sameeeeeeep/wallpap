#!/usr/bin/env python3
import functools,http.server,threading,json,os,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
from verify import OUT,guard
class MissingFrame(http.server.SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path=='/art/sprites/cats/grey/t/jump-b-3.png':self.send_error(404);return
  super().do_GET()
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(MissingFrame,directory='scenes'))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE="LW.advance(.1);__cats.cats.forEach(c=>{__cats.setState(c,'away',1e9);c.mission='qa'});const c=__cats.cats[2];c.comeBack=true;c.mission='qa';c.seq=null;c.spPrev=null;c._petDirection=null;"
CASES={
 'wall-down':"const i=__cats.L.ledges.findIndex(l=>l.name==='parapet'),l=__cats.L.ledges[i];c.surf=i;c.x=(l.x0+l.x1)/2;c.y=l.y;c.px=c.x;c.py=c.y;__cats.setState(c,'stand',1e9);const random=Math.random;Math.random=()=>.5;__cats.jumpDown(c,p=>__cats.setState(p,'stand',1e9));Math.random=random;",
 'bench-up':"const i=__cats.L.ledges.findIndex(l=>l.name==='bench'),l=__cats.L.ledges[i];c.surf=-1;c.x=(l.x0+l.x1)/2-35;c.y=l.base+65;c.px=c.x;c.py=c.y;__cats.setState(c,'stand',1e9);const random=Math.random;Math.random=()=>.5;__cats.goLedge(c,i);Math.random=random;for(let i=0;i<300&&c.state==='move';i++)LW.advance(1/30);",
 'toy-front':"c.surf=-1;c.x=650;c.y=760;c.px=c.x;c.py=c.y;c.dir=1;__cats.spawnToy(705,855);const t=__cats.toys.at(-1);t.z=t.vz=t.vx=t.vy=0;c.prey={kind:'toy',t};c.interest=8;c.huntT=0;__cats.setState(c,'stalk',.05);",
 'missing-back-frame':"__cats.forceJump(2,700,755,{from:[650,840],walk:[725,710]});",
 'vertical-front':"c.dir=-1;__cats.forceJump(2,650,870,{from:[650,760],walk:[650,910]});",
 'mirrored-back':"__cats.forceJump(2,700,755,{from:[650,840],walk:[725,710]});"
}
TIMES=[0,.2,.36,.43,.5,.57,.64,.71,.8,.9,1,1.1,1.2,1.4,1.6,1.8]
for case,setup in CASES.items():
 for hour in ([12,0] if case in ['wall-down','bench-up','toy-front'] else [0]):
  guard();name=f'{case}-'+('day' if hour==12 else 'night')
  if (OUT/(name+'-contact.jpg')).exists():continue
  port=server.server_port if case=='missing-back-frame' else 5210
  side='left' if case=='mirrored-back' else 'off'
  js='window.__shotReady=()=>{'+BASE+setup+'LW.advance(1/30);};'
  js+="window.__shotReport=()=>{const c=__cats.cats[2];return {x:c.x,y:c.y,z:c.z,k:c.k,state:c.state,frame:c.spP,view:c._petDirection,jump:c.j&&{view:c.j.view,key:c.j.key,vx:c.j.vx,vy:c.j.vy},loaded:Object.keys(__cats.SPR[2].seq),mirrored:__cats.MIR}}"
  p=subprocess.run(['./tools/wkshot',f'http://localhost:{port}/cats.html?virtual=1&muted=1&hour={hour}&side={side}',str(OUT/(name+'.png')),'1600','1000','0',js],env=dict(os.environ,WKSHOT_FRAMES=','.join(map(str,TIMES))),capture_output=True,text=True)
  (OUT/(name+'.log')).write_text(p.stdout+p.stderr);assert p.returncode==0,(name,p.stdout,p.stderr)
  reports=[json.loads(l[8:]) for l in p.stdout.splitlines() if l.startswith('result: ')]
  assert len(reports)==len(TIMES) and all(not r['errors'] for r in reports),(name,reports)
  airborne=[r['report'] for r in reports if r['report']['state']=='jump'];assert airborne,name
  expected='f' if case in ['wall-down','toy-front','vertical-front'] else 'b'
  assert all(r['jump']['view']==expected for r in airborne),(name,airborne)
  if case=='missing-back-frame':assert all(r['jump']['key']=='jump' and 'jump-b' not in r['loaded'] for r in airborne)
  (OUT/(name+'.json')).write_text(json.dumps(reports,indent=2)+'\n')
  # Fixed crop per sequence retains the actual wall/bench and shadow plane.
  xs=[r['report']['x'] for r in reports];ys=[r['report']['y'] for r in reports];cx=(min(xs)+max(xs))/2
  if side=='left':cx=1600-cx
  box=(int(cx-230)*2,int(min(ys)-260)*2,int(cx+230)*2,int(max(ys)+40)*2)
  sheet=Image.new('RGB',(1680,1440),'#252936');draw=ImageDraw.Draw(sheet)
  for k,f in enumerate(sorted(OUT.glob(name+'-f*.png'))):
   im=Image.open(f).crop(box);im.thumbnail((420,337));x,y=k%4*420,k//4*360;sheet.paste(im,(x,y+22));draw.text((x+4,y+4),f"{name} {TIMES[k]:.2f}s {reports[k]['report']['frame']}",fill='white')
  sheet.save(OUT/(name+'-contact.jpg'),quality=89)
  for f in OUT.glob(name+'-f*.png'):f.unlink()
  print(name,flush=True)
server.shutdown();guard()
