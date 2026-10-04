#!/usr/bin/env python3
"""Stage 4:4:4 candidates with exact alpha and <=4/255 RGB error at alpha edges.

Invisible RGB is zeroed. An edge pixel whose near-lossless colour error exceeds
four levels is restored from the original; alpha is always restored exactly.
"""
import concurrent.futures,hashlib,io,json,subprocess
import numpy as np
from PIL import Image
from pathlib import Path
from compress import ROOT,ART,REPORT,disk,metrics,keep
OUT=ROOT/'.build/webp/bounded'
def convert(r):
 if keep(Path(r['path'])) or r.get('mode','').startswith('lossy'):return None
 disk();im=Image.open(ART/r['path']).convert('RGBA');a=np.array(im)
 raw=subprocess.run([str(ROOT/'.build/webp/encode'),str(im.width),str(im.height),'40'],input=im.tobytes(),capture_output=True,check=True).stdout
 d=np.array(Image.open(io.BytesIO(raw)).convert('RGBA'));d[:,:,3]=a[:,:,3]
 edge=(a[:,:,3]>0)&(a[:,:,3]<255)
 restore=edge&(np.abs(d[:,:,:3].astype(np.int16)-a[:,:,:3]).max(axis=2)>4)
 d[restore,:3]=a[restore,:3];d[a[:,:,3]==0,:3]=0
 b=io.BytesIO();Image.fromarray(d).save(b,format='WEBP',lossless=True,quality=75,method=6,exact=True);data=b.getvalue();m=metrics(im,data)
 if len(data)>r['original_bytes']*.7 or len(data)>=r.get('webp_bytes',r['original_bytes']):return None
 if not ((m['psnr_db'] is None or m['psnr_db']>=40) and m['max_alpha_error']==0 and m['max_edge_composite_error']<=4):return None
 out=OUT/Path(r['path']).with_suffix('.webp');out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
 r={k:v for k,v in r.items() if k not in ('kept_png','candidate_bytes')}
 return {**r,'mode':'near-lossless-40-exact-alpha-bounded-fringe','webp_bytes':len(data),'saving':round(1-len(data)/r['original_bytes'],5),**m,'webp_sha256':hashlib.sha256(data).hexdigest()}
if __name__=='__main__':
 rows=json.loads(REPORT.read_text());out=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for i,r in enumerate(pool.map(convert,rows),1):
   if r:out.append(r)
   if i%100==0:print('bounded',i,'better candidates',len(out),flush=True)
 (ROOT/'.build/webp/bounded.json').write_text(json.dumps(out,indent=2)+'\n')
 print('bounded candidates',len(out),flush=True)
