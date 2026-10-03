#!/usr/bin/env python3
"""Compare the pre-migration commit and working tree in the same isolated WKWebView.
No application build/install. Temporary scene copies are always removed.
"""
import os,sys,subprocess,json,statistics,shutil
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2];os.chdir(root)
base='03719de';results=json.loads((root/'shots/pets-shared/performance.json').read_text())['results'] if sys.argv[1:] and (root/'shots/pets-shared/performance.json').exists() else {}
for scene in sys.argv[1:] or ['cats','cafe','records','ramen','rooftop','speakeasy','cabin','grass']:
 results[scene]={}
 for version in ['before','after']:
  if shutil.disk_usage('/').free<3*1024**3:raise RuntimeError('Disk stop')
  src=subprocess.check_output(['git','show',f'{base}:scenes/{scene}.html'],text=True) if version=='before' else (root/f'scenes/{scene}.html').read_text()
  motion=root/'scenes/__pets_bench_motion.js'
  if version=='before':
   motion.write_text(subprocess.check_output(['git','show',f'{base}:scenes/pet-motion.js'],text=True))
   src=src.replace('src="pet-motion.js"','src="__pets_bench_motion.js"')
  flush='gl.finish()' if scene=='grass' else "ctx.getImageData(0,0,1,1)"
  code=f'''window.__benchFlush=()=>{{{flush}}};'''
  idx=src.rfind('})();');src=src[:idx]+code+src[idx:]
  tmp=root/f'scenes/__pets_bench_{scene}.html';tmp.write_text(src)
  js="""console.error=(...a)=>{const s=a.map(String).join(' ');if(!__errs.includes(s))__errs.push(s)};
window.__shotReady=()=>{let seed=7;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
for(let i=0;i<90;i++)LW.advance(1/30);__benchFlush();window.__timings=[];
for(let r=0;r<7;r++){const a=Date.now();for(let i=0;i<90;i++)LW.advance(1/30);__benchFlush();__timings.push((Date.now()-a)/90)}};
window.__shotReport=()=>({timings:__timings,errors:__errs});"""
  out=root/f'shots/pets-shared/{scene}/perf-{version}'
  try:
   r=subprocess.run(['./tools/wkshot',f'http://localhost:5210/{tmp.name}?virtual=1&muted=1&hour=12',str(out)+'.png','1200','750','0',js],text=True,capture_output=True)
   out.with_suffix('.log').write_text(r.stdout+r.stderr)
   reports=[json.loads(x[8:]) for x in r.stdout.splitlines() if x.startswith('result: ')]
   report=reports[-1];assert not report['errors'],report;report=report['report'];assert not report['errors'],report
   results[scene][version]={'samples':report['timings'],'medianMs':statistics.median(report['timings'])}
   im=Image.open(str(out)+'.png');im.thumbnail((1200,750));im.convert('RGB').save(str(out)+'.jpg',quality=86)
   print(scene,version,results[scene][version],flush=True)
  finally:
   motion.unlink(missing_ok=True);tmp.unlink(missing_ok=True);Path(str(out)+'.png').unlink(missing_ok=True)
 (root/'shots/pets-shared/performance.json').write_text(json.dumps({'baseline':base,'viewport':[1200,750],'batchFrames':90,'results':results},indent=2)+'\n')
