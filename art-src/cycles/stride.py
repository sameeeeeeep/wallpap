#!/usr/bin/env python3
# Estimate stride (ground covered per full cycle, in walking heights) for a cut cycle.
# Frames are pinned on their smoothed torso centroid (as LW.petCycleLayout does); for each
# consecutive pair the planted paws should slide BACK by stride/N. We cross-correlate the
# ground-contact band (bottom 5 % of the opaque height) of frame i shifted back by s against
# frame i+1 and take the best s > 2 px per pair; stride = median(s) * N / height.
# usage: stride.py <slug> <cycle>
import sys,os
from PIL import Image
import numpy as np
slug,cyc=sys.argv[1:3]; d=os.path.dirname(os.path.abspath(__file__)); n=8 if cyc=='walk' else 6
fr=[]
for i in range(1,n+1):
    a=np.array(Image.open(f'{d}/cut/{slug}-{cyc}-{i}.png'))[:,:,3]>127
    ys=np.where(a.any(1))[0]; t,b=ys[0],ys[-1]; h=b-t+1
    y0,y1=int(t+(b-t)*.3),int(t+(b-t)*.65); cx=np.where(a[y0:y1+1])[1].mean()
    band=a[b-max(2,int(h*.05)):b+1].any(0).astype(float)
    fr.append((h,cx,band))
H=float(np.median([f[0] for f in fr])); cs=np.array([f[1] for f in fr])
for _ in range(2): cs=(np.roll(cs,1)+2*cs+np.roll(cs,-1))/4
L=600; off=200
def prof(i):
    p=np.zeros(L); band=fr[i][2]; o=int(round(off-cs[i]))
    p[max(0,o):o+len(band)]=band[max(0,-o):L-o]; return p
best=[]
for i in range(n):
    A,B=prof(i),prof((i+1)%n); sc=[]
    for s in range(3,int(H*.6)): sc.append((np.dot(np.roll(A,-s),B),s))
    v,s=max(sc); best.append(s if v>2 else None)
ok=[s for s in best if s]; med=float(np.median(ok)) if ok else float('nan')
print(f'{slug}-{cyc}: H={H:.0f} per-pair backward shift={best} -> stride={med*n/H:.2f} walking heights')
# Second estimate: the stance sweep. Ground-contact clusters in torso coords; the front-leg
# contacts (ahead of the torso centre) range over the stance sweep; stride ≈ sweep / duty.
def clusters(band):
    out=[];s=None
    for x in range(len(band)+1):
        on=x<len(band) and band[x]>0
        if on and s is None:s=x
        if not on and s is not None:
            if x-s>=3:out.append((s+x-1)/2)
            s=None
    return out
pts=[(c-cs[i]) for i in range(n) for c in clusters(fr[i][2])]
fr_=[p for p in pts if p>0]; bk=[p for p in pts if p<=0]
duty=.6 if cyc=='walk' else .4
sw=[(max(v)-min(v)) for v in (fr_,bk) if len(v)>1]
print(f'   stance sweep front={sw[0] if sw else 0:.0f}px back={sw[1] if len(sw)>1 else 0:.0f}px -> stride≈{np.mean(sw)/duty/H:.2f} walking heights')
