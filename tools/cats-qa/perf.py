#!/usr/bin/env python3
"""Measure an isolated file:// scene; never connect to wallpap or write preferences."""
import subprocess,time,json,pathlib,os,sys,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt'
def processes():
    lines=subprocess.check_output(['ps','-axo','pid=,comm='],text=True).splitlines()
    return {int(s.split(None,1)[0]):s.split(None,1)[1] for s in lines if len(s.split(None,1))==2}
before=processes()
js="window.__shotPending=true;window.__shotReport=()=>({errors:__errs,images:__loadedImages.length});setTimeout(()=>window.__shotPending=false,35000)"
label=sys.argv[1]
with open(OUT/f'{label}-perf-render.log','w') as log:
 p=subprocess.Popen(['/tmp/cats-wkshot',(ROOT/'scenes/cats.html').as_uri()+'?muted=1&hour=12&shotSeed=19',str(OUT/f'{label}.png'),'1280','800','0',js],stdout=log,stderr=subprocess.STDOUT,env={**os.environ,'WKSHOT_TIMEOUT':'65'})
 time.sleep(8)
 after=processes();pids=[pid for pid,name in after.items() if pid==p.pid or (pid not in before and 'WebKit' in name)]
 def sample(pid):
  r=subprocess.run(['/tmp/cats-wpmeter','20',str(pid)],capture_output=True,text=True,check=True)
  return json.loads(r.stdout)
 with concurrent.futures.ThreadPoolExecutor() as pool: samples=list(pool.map(sample,pids))
 rows={r['pid']:r for s in samples for r in s['procs']}
 result={'method':'isolated off-screen 1280x800 WebKit, day, fixed seed, 8s warmup, 20s sample; newly spawned WebKit processes plus screenshot host; unrelated wallpaper excluded','procs':list(rows.values()),'total':{k:round(sum(r[k] for r in rows.values()),1) for k in ['cpu','mb','mw']}}
 (OUT/f'{label}-performance.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));p.wait();print('render',p.returncode)
