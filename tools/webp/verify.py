#!/usr/bin/env python3
"""Recheck installed WebP bytes/dimensions/quality against source PNGs in Git."""
import hashlib,io,json,subprocess
from pathlib import Path
from PIL import Image
from compress import ROOT,ART,REPORT,disk,metrics
base=json.loads((ROOT/'tools/webp/baseline.json').read_text());rows=json.loads(REPORT.read_text());checked=[]
for i,r in enumerate(rows,1):
 disk();source=subprocess.check_output(['git','show',base['commit']+':scenes/art/'+r['path']],cwd=ROOT)
 assert hashlib.sha256(source).hexdigest()==r['source_sha256'],r['path']
 dest=ART/Path(r['path']).with_suffix('.webp' if 'webp_bytes' in r else '.png');data=dest.read_bytes()
 if 'webp_bytes' in r:
  assert hashlib.sha256(data).hexdigest()==r['webp_sha256']
  m=metrics(Image.open(io.BytesIO(source)).convert('RGBA'),data)
  assert Image.open(io.BytesIO(data)).size==tuple(r['size'])
  assert (m['psnr_db'] is None or m['psnr_db']>=40) and m['max_alpha_error']==0 and m['max_edge_composite_error']<=8,r['path']
  assert len(data)<=len(source)*.7,r['path']
  assert not (ART/r['path']).exists(),r['path']+' duplicate PNG'
  checked.append({'path':r['path'],**m})
 else:assert data==source,r['path']+' retained PNG changed'
 if i%200==0:print(i,'art files verified',flush=True)
(Path(ROOT/'shots/webp/verified.json')).write_text(json.dumps(checked,indent=2)+'\n')
total=sum(p.stat().st_size for p in ART.rglob('*') if p.is_file())
print('converted',len(checked),'retained',len(rows)-len(checked),'art bytes',total,flush=True)
assert total<=70_000_000,'art exceeds 70 MB'
