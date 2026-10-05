#!/usr/bin/env python3
"""Check packaged atlas bounds, shared coat geometry/alpha and color consistency.
These numerical checks supplement (never replace) the encoded-frame review.
"""
import json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt';out={'coats':{},'orangePalette':{},'walkAreaCV':{}}
base=ROOT/'scenes/art/sprites/cats/orange/atlas';reference=json.loads((base/'manifest.json').read_text())
for coat in ['orange','black','grey','calico','siamese']:
 folder=base.parents[1]/coat/'atlas';m=json.loads((folder/'manifest.json').read_text());size=decoded=cropped=0
 assert len(m)==19
 for key,c in m.items():
  p=folder/(key+'.webp');im=Image.open(p).convert('RGBA');size+=p.stat().st_size;decoded+=im.width*im.height*4
  assert c['frames']==reference[key]['frames'];assert len(c['frames'])==8
  assert np.array_equal(np.array(im.getchannel('A')),np.array(Image.open(base/(key+'.webp')).getchannel('A'))),(coat,key,'alpha drift')
  for x,y,w,h,ax,ay in c['frames']:
   assert x>=0 and y>=0 and x+w<=im.width and y+h<=im.height
   assert w>20 and h>20;cropped+=w*h*4
  if coat=='orange':
   a=np.array(im).astype(float);r,g,b=a[:,:,:3].transpose(2,0,1);sel=(a[:,:,3]>240)&(r-b>55)&(r>120)&(g>65)
   out['orangePalette'][key]=np.median(a[:,:,:3][sel],axis=0).astype(int).tolist()
   if key.startswith('walk-'):
    out['walkAreaCV'][key]=c['areaVariation']
    # The replacement diagonal limbs expose more silhouette during extension.
    # Do not normalize that pose area into body-size pumping; they use one scale.
    limit=.04 if key in ['walk-near','walk-far'] else .025
    assert c['areaVariation']<limit
 out['coats'][coat]={'clips':len(m),'frames':len(m)*8,'webpBytes':size,'decodedAtlasBytes':decoded,'croppedFrameBytes':cropped,'geometryAndAlphaMatch':True}
calibration=json.loads((ROOT/'tools/cats-qa/diagonal-v3-src/calibration.json').read_text())
out['diagonalCalibration']=calibration
for view,c in calibration.items():
 # v3 records all four paws, including partly occluded ones. Report residuals
 # honestly; they are not a pass/fail proof of zero sliding.
 assert c['scale']==.5,(view,'one fixed scale per whole sheet')
 assert max(abs(z) for xy in c['translationPixels'] for z in xy)<=2,(view,'upper-body registration drift')
 assert reference['walk-'+view]['stride']==c['stride']
(OUT/'art-quality.json').write_text(json.dumps(out,indent=2)+'\n')
sources={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'tools/cats-qa/generated').glob('orange-*.png') if '-v' not in p.stem}
(ROOT/'tools/cats-qa/sources.json').write_text(json.dumps({'note':'Selected whole-sheet imagegen masters are local ignored production inputs in generated/. Runtime WebP atlases are committed. SHA256 identifies the exact accepted source, not rejected versions.','masters':sources},indent=2)+'\n')
print('760 frames: bounds, shared geometry/alpha; walk area CV <4% diagonals / <2.5% other views pass; contact residuals reported')
