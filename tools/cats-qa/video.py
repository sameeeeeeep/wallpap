#!/usr/bin/env python3
"""Stream file:// WebKit frames into a 30 fps MP4; no accumulation of raw frames.
Usage: video.py orange 12 showcase (FPS/END/START/OUT optional).
"""
import subprocess,os,sys,shutil,json,tempfile
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=Path(os.environ.get('OUT',ROOT/'shots/cats-gpt'));OUT.mkdir(parents=True,exist_ok=True)
coat,hour,script=sys.argv[1],int(sys.argv[2]),sys.argv[3];fps=int(os.environ.get('FPS','30'));end=float(os.environ.get('END','44'));start=float(os.environ.get('START','0'))
if shutil.disk_usage('/').free<5*1024**3:raise SystemExit('Under 5 GiB free; stopped before rendering.')
frames=[start+i/fps for i in range(round((end-start)*fps))]
js=f"window.__qaCoat='{coat}';"+('window.__qaNight=true;' if script=='night' else '')+(ROOT/f'tools/cats-qa/{"showcase" if script=="night" else script}.js').read_text()
if os.environ.get('QA_FULL')=='1':js='window.__qaFull=true;'+js
url=f"file://{ROOT}/scenes/cats.html?virtual=1&muted=1&hour={hour}&shotSeed=19"+os.environ.get('QUERY','')
reports=[];out=OUT/f'{script}-{coat}-h{hour}.mp4';enc=None
with tempfile.TemporaryDirectory(prefix='cats-gpt-') as tmp:
 cmd=['/tmp/cats-wkshot',url,str(Path(tmp)/'v.png'),'1280','800','0',js]
 proc=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1,env={**os.environ,'WKSHOT_TIMEOUT':'1800','WKSHOT_CROP':'1','WKSHOT_CAPTURE_DELAY':'0.035','WKSHOT_FRAMES':','.join(f'{t:.7f}' for t in frames)})
 framepath=None
 try:
  for line in proc.stdout:
   if line.startswith('saved '):framepath=Path(line[6:].strip())
   elif line.startswith('result: '):
    result=json.loads(line[8:]);rep=result.get('report') or {};reports.append(rep)
    if result.get('errors') or result.get('imageErrors'):raise RuntimeError(str({k:result[k] for k in ['errors','imageErrors']}))
    if framepath is None:raise RuntimeError('Missing capture')
    with Image.open(framepath) as src:
     im=src.convert('RGB')  # wkshot captures the report's camera rectangle natively.
     im=im.resize((960,600),Image.Resampling.LANCZOS)
    d=ImageDraw.Draw(im);d.rectangle((0,0,960,29),fill='#14212a');d.text((14,8),f'{coat.upper()}  |  '+rep.get('label',script)+f'  |  {hour}:00',fill='white')
    if enc is None:enc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size','960x600','-framerate',str(fps),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','20','-movflags','+faststart',str(out)],stdin=subprocess.PIPE)
    enc.stdin.write(im.tobytes());framepath.unlink();framepath=None
    if len(reports)%90==0:print(f'{len(reports)}/{len(frames)} frames',flush=True)
    if shutil.disk_usage('/').free<5*1024**3:raise RuntimeError('Under 5 GiB free; render stopped')
   elif 'error' in line.lower() or 'timeout' in line.lower():print(line.strip(),flush=True)
  proc.wait()
  if proc.returncode or len(reports)!=len(frames):raise RuntimeError(f'Incomplete video: {len(reports)}/{len(frames)} frames, status {proc.returncode}')
 finally:
  if proc.poll() is None:proc.terminate();proc.wait()
  if enc:
   enc.stdin.close();enc.wait()
   if enc.returncode:raise RuntimeError(f'ffmpeg failed: {enc.returncode}')
  (OUT/f'{script}-{coat}-h{hour}.json').write_text(json.dumps(reports,separators=(',',':')))
print(out)
