#!/usr/bin/env python3
"""15s / 30fps production-WebKit comparisons; immediately delete captured PNGs."""
import os,sys,json,subprocess,tempfile,shutil
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt';FPS=30;N=int(os.environ.get('FRAMES','450'))
coats=sys.argv[1:] or ['orange','black','grey','calico','siamese']
def disk():
 if shutil.disk_usage('/').free<5*1024**3:raise RuntimeError('Under 5 GiB free; stop rendering')
for coat in coats:
 subprocess.run(['df','-h','/'],check=True);disk();name=f'diagonals-v3-{coat}';reports=[]
 js=f"window.__qaCoat='{coat}';"+(ROOT/'tools/cats-qa/diagonals_v3.js').read_text()
 with tempfile.TemporaryDirectory(prefix='cats-v3-') as tmp:
  enc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1260x600','-framerate','30','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',str(OUT/(name+'.mp4'))],stdin=subprocess.PIPE)
  proc=subprocess.Popen(['/tmp/cats-wkshot',f'file://{ROOT}/scenes/cats.html?virtual=1&muted=1&hour=12&shotSeed=19',tmp+'/v.png','1260','600','0',js],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,env={**os.environ,'WKSHOT_CROP':'1','WKSHOT_TIMEOUT':'1800','WKSHOT_CAPTURE_DELAY':'.025','WKSHOT_FRAMES':','.join(f'{i/FPS:.8f}' for i in range(N))})
  try:
   for line in proc.stdout:
    if line.startswith('saved '):path=Path(line[6:].strip())
    elif line.startswith('result: '):
     result=json.loads(line[8:]);assert not result['errors'] and not result['imageErrors'],result
     with Image.open(path) as im:im=im.convert('RGB').resize((1260,600),Image.Resampling.LANCZOS)
     enc.stdin.write(im.tobytes());path.unlink();reports.append(result['report']);disk()
     if len(reports)%90==0:print(coat,len(reports),'/',N,flush=True)
    elif 'error' in line.lower() or 'timeout' in line.lower():print(line,flush=True)
   proc.wait();assert proc.returncode==0 and len(reports)==N,(proc.returncode,len(reports))
  finally:
   if proc.poll() is None:proc.terminate();proc.wait()
   enc.stdin.close();enc.wait()
  assert enc.returncode==0
 (OUT/(name+'.json')).write_text(json.dumps(reports,separators=(',',':'))+'\n')
 print(OUT/(name+'.mp4'),flush=True)
