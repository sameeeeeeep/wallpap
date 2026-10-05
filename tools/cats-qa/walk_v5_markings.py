#!/usr/bin/env python3
"""Compare registered calico front head patch masks; excludes legs and tail."""
import json
import numpy as np
from scipy import ndimage as ndi
from PIL import Image
from walk_v5 import DATA,BASE,ROOT,OUT,cut
shifts=json.loads((DATA/'calibration.json').read_text())['toward']['registration']
clip=json.loads((BASE/'calico/atlas/manifest.json').read_text())['walk-toward']
im=Image.open(ROOT/'scenes'/clip['src']).convert('RGBA');raw=cut('calico','toward');groups={}
for label in ['source','final']:
 masks=[];centers=[]
 for i,(p,(dx,dy)) in enumerate(zip(raw,shifts)):
  if label=='final':
   x,y,w,h,*_=clip['frames'][i];p=im.crop((x,y,x+w,y+h)).resize(p.size,Image.Resampling.BILINEAR)
  a=np.array(p);yy,xx=np.mgrid[180:325,25:175]
  rgb=np.array([ndi.map_coordinates(a[:,:,c].astype(float),[yy+dy,xx+dx],order=1) for c in range(3)]).transpose(1,2,0)
  dark=ndi.binary_opening(rgb.mean(2)<105,iterations=2);masks.append(dark);centers.append(float(np.where(dark)[1].mean()+25))
 ref=masks[2];ious=[float((z&ref).sum()/(z|ref).sum()) for z in masks]
 groups[label]={'darkPatchCentroidX':centers,'headDarkMaskIoUWithFrame3':ious}
(OUT/'walk-v5-calico-markings.json').write_text(json.dumps(groups,indent=2)+'\n')
print(json.dumps(groups,indent=2))
