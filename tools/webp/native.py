#!/usr/bin/env python3
"""Compare every converted PNG/WebP in WebKit; alpha equality proves registration.
Runs before --apply or against installed WebP (originals are read from Git).
"""
import json, shutil, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/webp'
rows=[r for r in json.loads((ROOT/'tools/webp/report.json').read_text()) if 'webp_bytes' in r]
fixture=ROOT/'.webp-qa.html';results=[]
installed=not (ROOT/'scenes/art'/rows[0]['path']).exists()
originals=ROOT/'.build/webp/native-originals'
baseline=json.loads((ROOT/'tools/webp/baseline.json').read_text())
try:
 for start in range(0,len(rows),40):
  if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: less than 3 GiB free')
  batch=rows[start:start+40]
  paths=[]
  for row in batch:
   rel=Path(row['path']);source='scenes/art/'+str(rel);dest='.build/webp/candidates/'+str(rel.with_suffix('.webp'))
   if installed:
    p=originals/rel;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_bytes(subprocess.check_output(['git','show',baseline['commit']+':scenes/art/'+str(rel)],cwd=ROOT))
    source=str(p.relative_to(ROOT));dest='scenes/art/'+str(rel.with_suffix('.webp'))
   paths.append([str(rel),source,dest])
  script=r'''
  window.__shotPending=true;window.qa=[];window.__shotReport=()=>qa;
  const load=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(url));im.src=url});
  const pixels=im=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,c.width,c.height).data};
  (async()=>{try{for(const [path,source,dest] of PATHS){
   const a=await load(source),b=await load(dest);
   if(a.width!==b.width||a.height!==b.height)throw new Error('Dimensions '+path);
   const x=pixels(a),y=pixels(b);let maxAlpha=0,changedAlpha=0;
   for(let i=3;i<x.length;i+=4){const d=Math.abs(x[i]-y[i]);maxAlpha=Math.max(maxAlpha,d);if(d)changedAlpha++;}
   qa.push({path,width:a.width,height:a.height,maxAlpha,changedAlpha});
   if(maxAlpha)throw new Error('Alpha/registration changed: '+path);
  }}catch(e){console.error(e)}finally{window.__shotPending=false}})();
  '''.replace('PATHS',json.dumps(paths))
  # Start after wkshot's document-start error/image hooks; the test scene needs no runtime.
  fixture.write_text('<!doctype html><meta charset="utf-8"><script>'+script+'</script>')
  raw=OUT/'native.png'
  try:
   r=subprocess.run([str(ROOT/'tools/wkshot'),fixture.as_uri(),str(raw),'80','60','0'],cwd=ROOT,text=True,capture_output=True,timeout=70)
   (OUT/f'native-{start//40:02d}.log').write_text(r.stdout+r.stderr)
   records=[json.loads(l[8:]) for l in r.stdout.splitlines() if l.startswith('result: ')]
   assert r.returncode==0 and len(records)==1,(r.stdout,r.stderr)
   rec=records[0];assert not rec['errors'] and not rec['imageErrors'],rec
   assert len(rec['report'])==len(batch)
   results.extend(rec['report']);print(len(results),'native alpha/dimension checks passed',flush=True)
  finally:raw.unlink(missing_ok=True)
 (OUT/'native.json').write_text(json.dumps(results,indent=2)+'\n')
finally:
 fixture.unlink(missing_ok=True)
 if installed:shutil.rmtree(originals,ignore_errors=True)
