#!/usr/bin/env python3
"""Gate each PNG -> WebP candidate; never resize, crop or change alpha.

Staging is non-destructive. apply removes originals only after every gate passes.
The near-lossless fallback restores original alpha before final lossless packing.
"""
import argparse, concurrent.futures, hashlib, io, json, math, shutil, subprocess
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];ART=ROOT/'scenes/art';STAGE=ROOT/'.build/webp/candidates'
REPORT=ROOT/'tools/webp/report.json'
def disk():
 if shutil.disk_usage('/').free<3*1024**3:raise RuntimeError('STOP: less than 3 GiB free')
def metrics(im, data):
 a=np.asarray(im,dtype=np.float32);b=np.asarray(Image.open(io.BytesIO(data)).convert('RGBA'),dtype=np.float32)
 assert a.shape==b.shape
 w=a[:,:,3:]/255;delta=a[:,:,:3]-b[:,:,:3]
 mse=float((delta**2*w).sum(dtype=np.float64)/max(3*w.sum(dtype=np.float64),1))
 edge=(a[:,:,3]>0)&(a[:,:,3]<255)
 return {'psnr_db':round(10*math.log10(255**2/mse),5) if mse else None,
         'max_alpha_error':int(np.abs(a[:,:,3]-b[:,:,3]).max()),
         'max_edge_composite_error':round(float(np.abs(delta*w)[edge].max()),4) if edge.any() else 0,
         'alpha_sha256':hashlib.sha256(b[:,:,3].astype('uint8').tobytes()).hexdigest()}
def keep(path):
 # Pixel masks, luminance maps, and art processed by RGB classification stay untouched.
 return ('mask' in path.name or path.parts[0] in ('shared','skies') or
         str(path) in ('drive/roadside-painted.png','cafe/jukebox.png') or
         (path.parts[0] in ('cafe','records') and path.name.startswith('street-night')))
def candidate(p):
 disk();rel=p.relative_to(ART);original=p.read_bytes();im=Image.open(io.BytesIO(original)).convert('RGBA')
 result={'path':str(rel),'original_bytes':len(original),'size':list(im.size),'source_sha256':hashlib.sha256(original).hexdigest()}
 if keep(rel):return {**result,'kept_png':'pixel mask, luminance map, or RGB-classified art'}
 out=STAGE/rel.with_suffix('.webp')
 if out.exists():
  data=out.read_bytes();m=metrics(im,data)
  if len(data)<=len(original)*.7 and (m['psnr_db'] is None or m['psnr_db']>=40) and m['max_alpha_error']==0 and m['max_edge_composite_error']<=8:
   # Resume staged work without discarding successful, expensive method-6 trials.
   offset=12;kinds=[]
   while offset+8<=len(data):
    kinds.append(data[offset:offset+4]);n=int.from_bytes(data[offset+4:offset+8],'little');offset+=8+n+(n&1)
   mode='lossy-q90..95' if b'VP8 ' in kinds else 'near-lossless-40..60-exact-alpha-fringe'
   return {**result,'webp_bytes':len(data),'saving':round(1-len(data)/len(original),5),'mode':mode,**m,'webp_sha256':hashlib.sha256(data).hexdigest()}
 choices=[]
 # Saturated sprite lines repeatedly fail 4:2:0 RGB PSNR; use bounded 4:4:4 directly.
 for q in (() if rel.parts[0]=='sprites' else (90,92,95)):

  b=io.BytesIO();im.save(b,format='WEBP',quality=q,alpha_quality=100,method=6,exact=True);data=b.getvalue();m=metrics(im,data)
  if (m['psnr_db'] is None or m['psnr_db']>=40) and m['max_alpha_error']==0 and m['max_edge_composite_error']<=8:
   choices.append((len(data),data,m,f'lossy-q{q}'));break
 # 4:4:4 near-lossless avoids WebP lossy chroma subsampling on saturated lines.
 if not choices:
  for level in (40,60,80,100):
   r=subprocess.run([str(ROOT/'.build/webp/encode'),str(im.width),str(im.height),str(level)],input=im.tobytes(),capture_output=True,check=True)
   dec=Image.open(io.BytesIO(r.stdout)).convert('RGBA');dec.putalpha(im.getchannel('A'))
   # Preserve low-alpha fringe RGB too: colour there is unstable when alpha was quantized.
   a=np.array(im);d=np.array(dec);edge=(a[:,:,3]<255);d[edge,:3]=a[edge,:3]
   b=io.BytesIO();Image.fromarray(d).save(b,format='WEBP',lossless=True,quality=75,method=6,exact=True);data=b.getvalue();m=metrics(im,data)
   if (m['psnr_db'] is None or m['psnr_db']>=40) and m['max_alpha_error']==0 and m['max_edge_composite_error']<=8:
    choices.append((len(data),data,m,f'near-lossless-{level}-exact-alpha-fringe'));break
 if choices and choices[0][0]<=len(original)*.7:
  size,data,m,mode=choices[0];out=STAGE/rel.with_suffix('.webp');out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
  return {**result,'webp_bytes':size,'saving':round(1-size/len(original),5),'mode':mode,**m,'webp_sha256':hashlib.sha256(data).hexdigest()}
 return {**result,'kept_png':'no candidate passes quality and >=30% savings', 'candidate_bytes':choices[0][0] if choices else None}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args();disk()
 if args.apply:
  rows=json.loads(REPORT.read_text())
  for r in rows:
   if 'webp_bytes' not in r:continue
   p=ART/r['path'];data=(STAGE/Path(r['path']).with_suffix('.webp')).read_bytes()
   assert hashlib.sha256(p.read_bytes()).hexdigest()==r['source_sha256']
   assert hashlib.sha256(data).hexdigest()==r['webp_sha256']
  for r in rows:
   if 'webp_bytes' not in r:continue
   disk();p=ART/r['path'];shutil.copyfile(STAGE/Path(r['path']).with_suffix('.webp'),p.with_suffix('.webp'));p.unlink()
  return
 rows=[];files=sorted(ART.rglob('*.png'))
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for i,r in enumerate(pool.map(candidate,files),1):
   rows.append(r)
   if i%25==0:print(i,'/',len(files),'candidate MB',round(sum(x.get('webp_bytes',x['original_bytes']) for x in rows)/1e6,2),flush=True)
 REPORT.write_text(json.dumps(rows,indent=2)+'\n')
 print('PNG bytes',sum(x['original_bytes'] for x in rows),'result bytes',sum(x.get('webp_bytes',x['original_bytes']) for x in rows),'converted',sum('webp_bytes' in x for x in rows),flush=True)
if __name__=='__main__':main()
