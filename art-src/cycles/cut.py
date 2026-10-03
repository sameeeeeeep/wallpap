#!/usr/bin/env python3
# Chroma-key cut-out for cycle strips on a flat light-grey background (replaces Vision's subject
# lifting for these sheets: it punched holes through dark fur patches). Background = what is
# reachable from the strip border through near-background colour; everything else is the
# animal (so white fur enclosed by the ink outline stays opaque); edges are feathered by colour
# distance. Frames = the N largest connected pieces, ordered left→right, tightly cropped.
# usage: cut.py <strip.png> <outdir> <prefix> <N>
import sys,os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
src,out,prefix,N=sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4])
im=np.array(Image.open(src).convert('RGB')).astype(float); h,w,_=im.shape
border=np.concatenate([im[:4].reshape(-1,3),im[-4:].reshape(-1,3),im[:,:4].reshape(-1,3),im[:,-4:].reshape(-1,3)])
bg=np.median(border,0); dist=np.abs(im-bg).max(2)
bgl=dist<16                                            # background-like colour
lab,_=nd.label(bgl); edge=np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])); edge=edge[edge>0]
outside=np.isin(lab,edge)
# leg gaps closed off by a paw or the belly: enclosed pockets of (near-exact, neutral) background
neutral=(np.abs(im[:,:,0]-im[:,:,1])<5)&(np.abs(im[:,:,1]-im[:,:,2])<5)&(dist<9)
pl,pn=nd.label(neutral&~outside)
if pn:
    ps=nd.sum(np.ones_like(dist),pl,range(1,pn+1))
    outside|=np.isin(pl,np.where(ps>=40)[0]+1)
fg=~outside
fg=nd.binary_opening(fg,iterations=1)                   # drop speckle
lab2,n=nd.label(fg,structure=np.ones((3,3)))
sizes=nd.sum(fg,lab2,range(1,n+1)); keep=np.argsort(sizes)[::-1][:N]+1
big=sizes[keep-1]
if len(keep)<N or big[-1]<big[0]*.25: print(f'expected {N} frames, found sizes {sorted(sizes.astype(int))[::-1][:N+3]}'); sys.exit(2)
# soft edge: alpha ramps with colour distance over the outer 2 px of each piece
alpha=np.clip((dist-6)/22,0,1)
inner=nd.binary_erosion(fg,iterations=2)
os.makedirs(out,exist_ok=True)
objs=nd.find_objects(lab2); pieces=sorted(keep,key=lambda k:objs[k-1][1].start)
for i,k in enumerate(pieces,1):
    sl=objs[k-1]; y0,y1=max(0,sl[0].start-2),min(h,sl[0].stop+2); x0,x1=max(0,sl[1].start-2),min(w,sl[1].stop+2)
    m=(lab2[y0:y1,x0:x1]==k)
    m=nd.binary_dilation(m,iterations=1)&~outside[y0:y1,x0:x1] | (lab2[y0:y1,x0:x1]==k)
    a=np.where(inner[y0:y1,x0:x1]&m,1.0,np.where(m,np.maximum(alpha[y0:y1,x0:x1],.0),0.0))
    a=np.where(m&~inner[y0:y1,x0:x1],np.maximum(a,(lab2[y0:y1,x0:x1]==k)*alpha[y0:y1,x0:x1]),a)
    # un-mix the grey background out of the soft edge (no pale halo): C = (P - (1-a)·bg) / a
    P=im[y0:y1,x0:x1]; aa=np.clip(a,1e-3,1)[...,None]
    C=np.clip((P-(1-aa)*bg)/aa,0,255); C=np.where(a[...,None]>=0.999,P,C)
    rgba=np.dstack([C,a*255]).astype(np.uint8)
    # tight crop to the opaque part
    ys,xs=np.where(rgba[:,:,3]>8); rgba=rgba[ys.min():ys.max()+1,xs.min():xs.max()+1]
    Image.fromarray(rgba).save(f'{out}/{prefix}-{i}.png'); print(f'{prefix}-{i}.png {rgba.shape[1]}x{rgba.shape[0]} at {x0},{y0}')
