#!/usr/bin/env python3
"""Select the smallest audited candidate after refine.py and bounded.py finish."""
import hashlib,json,shutil
from pathlib import Path
from compress import ROOT,ART,STAGE,REPORT,disk
rows=json.loads(REPORT.read_text());bounded={r['path']:r for r in json.loads((ROOT/'.build/webp/bounded.json').read_text())}
for i,r in enumerate(rows):
 b=bounded.get(r['path'])
 if b and b['webp_bytes']<r.get('webp_bytes',r['original_bytes']):
  disk();src=ROOT/'.build/webp/bounded'/Path(r['path']).with_suffix('.webp')
  assert hashlib.sha256(src.read_bytes()).hexdigest()==b['webp_sha256']
  dest=STAGE/Path(r['path']).with_suffix('.webp');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);rows[i]=b
REPORT.write_text(json.dumps(rows,indent=2)+'\n')
other=sum(p.stat().st_size for p in ART.rglob('*') if p.is_file() and p.suffix!='.png')
total=other+sum(r.get('webp_bytes',r['original_bytes']) for r in rows)
print('Candidate art bytes:',total,'MB:',round(total/1e6,2),'MiB:',round(total/1024**2,2))
assert total<=70_000_000,'candidate art exceeds 70 MB'
