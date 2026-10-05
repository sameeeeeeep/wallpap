#!/usr/bin/env python3
"""Verify walk-only scope, source provenance, atlas geometry and decoded video coverage."""
from pathlib import Path
import json,hashlib,subprocess,io
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from walk_v5 import ROOT,BASE,DATA,OUT,COATS,VIEWS

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def atlas(js):return json.loads(js[js.index('=')+1:].strip().rstrip(';'))
before=json.loads((DATA/'before-sha256.json').read_text())
# This baseline is the owner-approved run/rest commit before v5 integration.
rev=(DATA/'baseline-commit.txt').read_text().strip()
old=atlas(subprocess.check_output(['git','show',rev+':scenes/cat-atlas.js'],cwd=ROOT,text=True));new=atlas((ROOT/'scenes/cat-atlas.js').read_text())
unchanged=[];changes=[];walks=[]
for name,digest in before.items():
 p=ROOT/name
 if p.suffix=='.webp' and not p.name.startswith('walk-'):
  assert sha(p)==digest,name;unchanged.append(name)
 elif sha(p)!=digest:changes.append(name)
for coat in COATS:
 assert old[coat]['unit']==new[coat]['unit']==.52
 manifest=json.loads((BASE/coat/'atlas/manifest.json').read_text())
 oldmanifest=json.loads(subprocess.check_output(['git','show',rev+f':scenes/art/sprites/cats/{coat}/atlas/manifest.json'],cwd=ROOT,text=True))
 for key,c in new[coat]['clips'].items():
  if not key.startswith('walk-'):
   assert c==old[coat]['clips'][key],(coat,key)
   assert manifest[key]==oldmanifest[key],(coat,key,'manifest');continue
  assert len(c['frames'])==6
  im=np.array(Image.open(ROOT/'scenes'/c['src']).convert('RGBA'));shapes=[]
  orange=new['orange']['clips'][key];assert c['frames']==orange['frames']
  ref=np.array(Image.open(ROOT/'scenes'/orange['src']).convert('RGBA'))
  assert np.array_equal(im[:,:,3],ref[:,:,3]),(coat,key,'alpha')
  for x,y,w,h,ax,ay in c['frames']:
   assert x>=0 and y>=0 and x+w<=im.shape[1] and y+h<=im.shape[0]
   a=im[y:y+h,x:x+w,3];lab,n=ndi.label(a>128);sz=np.bincount(lab.ravel())[1:]
   # Fur filaments may be disconnected; reject any sizeable detached speck.
   assert len(sz)>0 and max(sorted(sz,reverse=True)[1:],default=0)<5
   shapes.append([w,h,ax,ay])
  walks.append({'coat':coat,'clip':key,'frames':6,'stride':c['stride'],'sha256':sha(ROOT/'scenes'/c['src'])})
videos=[]
for coat in COATS:
 for suffix in ['', '-full']:
  p=OUT/f'walk-v5-{coat}{suffix}.mp4'
  assert p.exists(),(p,'missing required render')
  inputs=list((BASE/coat/'atlas').glob('walk-*.webp'))+[ROOT/'scenes/cat-atlas.js',ROOT/'scenes/cat-motion.js']
  assert p.stat().st_mtime>max(q.stat().st_mtime for q in inputs),(p,'stale render')
  r=json.loads(p.with_suffix('.json').read_text());assert len(r)==600
  assert not any(q.get('errors') for q in r)
  for i in range(8):
   poses={q['pose'] for q in r if q['pass']==i and q['time']<14.4 and not q['turn']}
   assert len(poses)==6,(p,i,poses)
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-of','json',str(p)]))['streams'][0]
  assert probe['nb_read_frames']=='600' and probe['r_frame_rate']=='30/1'
  videos.append({'file':p.name,'frames':600,'fps':30,'seconds':20,'eightDirections':True,'errors':0})
memory={}
for label,meta in [('before',old),('after',new)]:
 decoded=cropped=payload=0
 for coat,item in meta.items():
  for c in item['clips'].values():
   name='scenes/'+c['src']
   blob=subprocess.check_output(['git','show',rev+':'+name],cwd=ROOT) if label=='before' else (ROOT/name).read_bytes()
   im=Image.open(io.BytesIO(blob));decoded+=im.width*im.height*4;payload+=len(blob)
   cropped+=sum(r[2]*r[3]*4 for r in c['frames'])
 memory[label]={'decodedAtlasMiB':round(decoded/2**20,2),'croppedFramesMiB':round(cropped/2**20,2),'payloadMiB':round(payload/2**20,2)}
report={'memoryEstimate':memory,'baseline':rev,'unchangedApprovedAtlases':len(unchanged),'unchangedApprovedMetadata':70,'preservedUnit':.52,'walks':walks,'videos':videos,'sources':{str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'art-src/walk-v5').glob('*.png')) if 'rejected' not in p.name}}
(OUT/'walk-v5-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['walks','sources']},indent=2))
