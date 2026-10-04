"""Off-screen file:// WKWebView matrix. Compact each sequence immediately; never retain raw PNGs."""
import json,os,shutil,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/train-stations';OUT.mkdir(exist_ok=True)
TIMES=[0,10,15,20.1,26,39,49,57,68.2]
SKINS={'indian':(260,15000),'shinkansen':(360,17500),'swiss':(240,1000),'orient':(220,14500)}
def space():
 if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: free disk below 3 GiB')
def run(skin,hour=12,weather='clear',wide=False):
 space();tag=f'{skin}-'+('night' if hour==23 else 'day')+('' if weather=='clear' else '-'+weather)+('-wide-left' if wide else '')
 w,h=(3440,1440) if wide else (1600,1000);speed,distance=SKINS[skin]
 url=(ROOT/'scenes/train.html').as_uri()+f'?virtual=1&muted=1&hour={hour}&weather={weather}&shotSeed=42'+('&side=left' if wide else '')
 js=f"__lw('settings',{{skin:'{skin}'}});window.__shotReady=()=>{{for(let i=0;i<60;i++)LW.advance(1/30);__train.train.v={speed};__train.train.d={distance};__train.forceStation(24)}};window.__shotPending=true;window.__shotPoll=()=>{{if(__train.stations.art.images)__shotPending=false}};window.__shotReport=()=>({{...__train.stations.report(),view:__train.L.V,skin:__train.skin,tunnel:__train.train.tunnel}})"
 # forceStation starts asynchronous art decode in __shotReady; waitSetup checks it before advancing.
 env={**os.environ,'WKSHOT_FRAMES':','.join(map(str,TIMES))}
 r=subprocess.run([str(ROOT/'tools/wkshot'),url,str(OUT/(tag+'.png')),str(w),str(h),'0',js],env=env,capture_output=True,text=True,timeout=90)
 (OUT/(tag+'.log')).write_text(r.stdout+r.stderr)
 if r.returncode:raise RuntimeError(tag+': '+r.stdout[-1500:])
 reports=[json.loads(l.removeprefix('result: ')) for l in r.stdout.splitlines() if l.startswith('result: ')]
 for report in reports:
  if report['errors'] or report['imageErrors']:raise RuntimeError(report)
 full=Image.new('RGB',(1440,3*324),'#151b20');crop=Image.new('RGB',(1500,3*294),'#151b20')
 df,dc=ImageDraw.Draw(full),ImageDraw.Draw(crop)
 for i,(path,report) in enumerate(zip(sorted(OUT.glob(tag+'-f*.png')),reports)):
  space();im=Image.open(path);col,row=i%3,i//3;rep=report['report'];label=f'{TIMES[i]:g}s  {rep["phase"]}  {rep["speed"]:.1f} u/s'
  thumb=im.copy();thumb.thumbnail((480,300));full.paste(thumb,(col*480,row*324+24));df.text((col*480+8,row*324+6),label,fill='white')
  v=rep['view'];K=h/1000;OX=(w-1600*K)*(.75 if wide else .5)
  box=(int((OX+(v['x0']-10)*K)*im.width/w),int((v['y0']-10)*K*im.height/h),int((OX+(v['x1']+10)*K)*im.width/w),int((v['y1']+10)*K*im.height/h))
  z=im.crop(box);z.thumbnail((500,264));crop.paste(z,(col*500,row*294+24));dc.text((col*500+8,row*294+6),label,fill='white');im.close();path.unlink()
 full.save(OUT/(tag+'-scene.jpg'),quality=87);crop.save(OUT/(tag+'-windows.jpg'),quality=91)
 (OUT/(tag+'-report.json')).write_text(json.dumps([r['report'] for r in reports],indent=2)+'\n')
 print(tag,'OK',flush=True)
if __name__=='__main__':
 cases=[(s,h)for s in SKINS for h in [12,23]]+ [('indian',12,'rain'),('swiss',12,'snow'),('shinkansen',23,'rain',True),('swiss',12,'clear',True)]
 if len(sys.argv)>1:cases=[c for c in cases if c[0]==sys.argv[1]]
 for case in cases:run(*case)
