#!/usr/bin/env python3
# Fit the stride that keeps ground-contact paws planted, using the runtime layout
# (frames pinned on the smoothed torso centroid, one scale). For a stride S (in walking
# heights) frame i is shown from distance i*S/N; a paw in contact in frames i and i+1 should
# not move in world x. Score = median over frame pairs of the smallest |world shift| of each
# contact cluster (planted paws match themselves). Prints the best S and its residual.
# usage: fit.py <slug> <cycle>
import sys,os
import numpy as np
from PIL import Image
slug,cyc=sys.argv[1:3]; d=os.path.dirname(os.path.abspath(__file__)); n=8 if cyc=='walk' else 6
F=[]
for i in range(1,n+1):
    a=np.array(Image.open(f'{d}/cut/{slug}-{cyc}-{i}.png'))[:,:,3]>127
    ys=np.where(a.any(1))[0]; t,b=ys[0],ys[-1]; h=b-t+1
    y0,y1=int(t+(b-t)*.3),int(t+(b-t)*.65); cx=np.where(a[y0:y1+1])[1].mean()
    band=a[b-max(2,int(h*.04)):b+1].any(0)
    cl=[];s=None
    for x in range(len(band)+1):
        on=x<len(band) and band[x]
        if on and s is None:s=x
        if not on and s is not None:
            if x-s>=3:cl.append((s+x-1)/2)
            s=None
    F.append((h,cx,cl))
H=np.median([f[0] for f in F]); cs=np.array([f[1] for f in F])
for _ in range(2): cs=(np.roll(cs,1)+2*cs+np.roll(cs,-1))/4
rel=[[ (c-cs[i])/H for c in F[i][2]] for i in range(n)]   # paw x relative to torso, in heights
def score(S):
    r=[]
    for i in range(n):
        j=(i+1)%n; step=S/n
        for p in rel[i]:
            # world: frame i drawn at X, frame j at X+step → paw shift = (q+step) - p
            r.append(min(abs(q+step-p) for q in rel[j]) if rel[j] else 1)
    r=sorted(r); return np.mean(r[:max(1,len(r)//2)])   # the better half = planted paws
Ss=np.arange(.2,3.01,.02); sc=[score(S) for S in Ss]; k=int(np.argmin(sc))
print(f'{slug}-{cyc}: best stride {Ss[k]:.2f} heights, planted-paw slip {sc[k]*100:.1f}% of height per frame (S=0.85: {score(.85)*100:.1f}%, S=1.6: {score(1.6)*100:.1f}%)')
