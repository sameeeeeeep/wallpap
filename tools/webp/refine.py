#!/usr/bin/env python3
"""Find smaller candidates without weakening the quality/alpha/size gates."""
import concurrent.futures,hashlib,io,json,subprocess
import numpy as np
from PIL import Image
from compress import ROOT,ART,STAGE,REPORT,disk,metrics,keep
from pathlib import Path

def refine(r):
 if keep(Path(r['path'])):return r
 disk();im=Image.open(ART/r['path']).convert('RGBA');a=np.array(im)
 current=STAGE/Path(r['path']).with_suffix('.webp');best_size=r.get('webp_bytes',r['original_bytes']);best=None
 def consider(data,mode):
  nonlocal best,best_size
  if len(data)>=best_size or len(data)>r['original_bytes']*.7:return
  m=metrics(im,data)
  if (m['psnr_db'] is None or m['psnr_db']>=40) and m['max_alpha_error']==0 and m['max_edge_composite_error']<=8:
   best=(data,mode,m);best_size=len(data)
 # Fast probes only select which full method-6 trials are worth attempting.
 for q in (90,95):
  probe=io.BytesIO();im.save(probe,format='WEBP',quality=q,method=4,alpha_quality=100,exact=True)
  if len(probe.getvalue())>best_size:continue
  m=metrics(im,probe.getvalue())
  if (m['psnr_db'] is None or m['psnr_db']>=39.8) and m['max_edge_composite_error']<=10:
   b=io.BytesIO();im.save(b,format='WEBP',quality=q,method=6,alpha_quality=100,exact=True);consider(b.getvalue(),f'lossy-q{q}')
   if best:break
 if best is None and not r.get('mode','').startswith('lossy'):
  for level in (20,40):
   raw=subprocess.run([str(ROOT/'.build/webp/encode'),str(im.width),str(im.height),str(level)],input=im.tobytes(),capture_output=True,check=True).stdout
   d=np.array(Image.open(io.BytesIO(raw)).convert('RGBA'));d[:,:,3]=a[:,:,3];edge=a[:,:,3]<255;d[edge,:3]=a[edge,:3]
   b=io.BytesIO();Image.fromarray(d).save(b,format='WEBP',lossless=True,quality=75,method=6,exact=True);consider(b.getvalue(),f'near-lossless-{level}-exact-alpha-fringe')
   if best:break
 if best:
  data,mode,m=best;current.parent.mkdir(parents=True,exist_ok=True);current.write_bytes(data)
  r={k:v for k,v in r.items() if k not in ('kept_png','candidate_bytes')}
  return {**r,'mode':mode,'webp_bytes':len(data),'saving':round(1-len(data)/r['original_bytes'],5),**m,'webp_sha256':hashlib.sha256(data).hexdigest()}
 return r
if __name__=='__main__':
 rows=json.loads(REPORT.read_text());out=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for i,r in enumerate(pool.map(refine,rows),1):
   out.append(r)
   if i%50==0:print('refined',i,'MB',round(sum(x.get('webp_bytes',x['original_bytes']) for x in out)/1e6,2),flush=True)
 REPORT.write_text(json.dumps(out,indent=2)+'\n')
 print('refined total bytes',sum(r.get('webp_bytes',r['original_bytes']) for r in out),flush=True)
