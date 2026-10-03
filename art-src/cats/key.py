#!/usr/bin/env python3
# Green-screen key for the cats plates (Codex paints on flat #00ff00): alpha from how much greener than
# red/blue a pixel is, a 1-px choke, and despill (green pulled down to max(R, B) on the edges).
# usage: key.py <in.png> <out.png>
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
a=np.array(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
R,G,B=a[...,0],a[...,1],a[...,2]
ex=G-np.maximum(R,B)                       # green excess
alpha=1-np.clip((ex-28)/(120-28),0,1)      # ≥120 excess = background, ≤28 = subject
alpha=nd.grey_erosion(alpha,size=(2,2))    # choke the fringe a touch
spill=alpha<0.999
G2=np.where(spill|(ex>10),np.minimum(G,np.maximum(R,B)+6),G)
out=np.dstack([R,G2,B,alpha*255]).clip(0,255).astype(np.uint8)
Image.fromarray(out,'RGBA').save(sys.argv[2],optimize=True)
print(sys.argv[2],out.shape,'opaque',(alpha>0.5).sum())
