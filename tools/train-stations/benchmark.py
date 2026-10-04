"""Measure WebKit frame work with real performance clock, baseline vs station runtime."""
from pathlib import Path
import subprocess,json,shutil
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/train-stations'
base=ROOT/'scenes/train-stations-baseline.html'
if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: disk below 3 GiB')
base.write_bytes(subprocess.check_output(['git','show','f6191d1:scenes/train.html'],cwd=ROOT))
try:
 results={}
 for name in ['baseline','cruise','dwell','released']:
  scene=base if name=='baseline' else ROOT/'scenes/train.html'
  js="window.__shotReport=()=>({samples:Array.from({length:3},()=>__train.benchRaw(90)),station:__train.stations?.report()})"
  js+=";window.__shotReady=()=>{__train.train.v=260;__train.train.d=15000;__train.benchRaw(60);__train.train.v=260;__train.train.d=15000}"
  if name in ['dwell','released']:
   js+=";window.__shotReady=()=>{__train.train.v=260;__train.train.d=15000;__train.benchRaw(60);__train.train.v=260;__train.train.d=15000;__train.forceStation(24)};window.__shotPending=true;window.__shotPoll=()=>{if(__train.stations.art.images){__train.benchRaw("+('630' if name=='dwell' else '2070')+");window.__shotPending=false}}"
  p=OUT/f'perf-{name}.png'
  r=subprocess.run([str(ROOT/'tools/wkshot'),scene.as_uri()+'?muted=1&hour=12&shotSeed=43',str(p),'1600','1000','0',js],cwd=ROOT,capture_output=True,text=True,timeout=90)
  (OUT/f'perf-{name}.log').write_text(r.stdout+r.stderr)
  if r.returncode:raise RuntimeError(r.stdout)
  report=json.loads([l[8:]for l in r.stdout.splitlines() if l.startswith('result: ')][-1]);results[name]=report['report'];print(name,results[name],flush=True)
  p.unlink(missing_ok=True)
 (OUT/'performance.json').write_text(json.dumps(results,indent=2)+'\n')
finally:base.unlink(missing_ok=True)
