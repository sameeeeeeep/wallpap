#!/usr/bin/env python3
# Paw planting for the drawn gait cycles (docs/scene-polish.md, 2026-10-03 "paw planting").
#
# The Codex strips are not treadmill cycles: the grounded paws stay put relative to the body
# from frame to frame, so a sprite that travels drags them along the ground. At runtime the
# sprite now holds still in the world while a frame shows and steps forward one even step
# (stride / N) at each frame change (LW.petPlantOffset in scenes/pet-motion.js). For a paw to
# stay planted across a cut it must slide BACK by that step relative to the body, so this
# script bends the legs to do exactly that:
#   · grounded paws are detected per frame (columns whose lowest opaque pixel lies within a
#     thin band over the baseline, clustered), split hind / fore by the torso centre;
#   · each leg group (hind pair, fore pair) gets a stance sawtooth: within a stance its paws
#     move back one step per frame, and at the group's contact frame (the other leg of the
#     pair lands) it resets forward — walk: 4-frame stances, run: the frames the group is on
#     the ground (data), swinging forward through the flight frames;
#   · the leg region (below the belly line, ramping in from just above it) is sheared by that
#     offset, pivoting at the hip, blended smoothly across the torso centre between groups;
#   · the contact frame of each group is chosen to minimise the planted-paw slip measured on
#     the result (so it follows what the drawing actually shows).
# Inputs: cut/<slug>-<cycle>-<i>.png (untouched originals). Outputs: the installed frames in
# scenes/art/sprites/<kind>s/<name>/cycle/ and a QA report (slip before/after, px of height).
# usage: plant.py <slug> <cycle> [--dry]      e.g. plant.py cat-orange walk
import sys,os,json,itertools
import numpy as np
from PIL import Image
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/webp'))
from assets import asset_path, save_art
from scipy import ndimage as nd
D=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(D+'/../..')
slug,cyc=sys.argv[1:3]; dry='--dry' in sys.argv; prev=next((a[10:] for a in sys.argv if a.startswith('--preview=')),None); N=8 if cyc=='walk' else 6
kind,name=slug.split('-',1)
# strides (walking heights per cycle) — keep in step with LW.PET_STRIDE in scenes/pet-motion.js
src=open(ROOT+'/scenes/pet-motion.js').read()
import re
m=re.search(r"'%ss/%s':\{([^}]*)\}"%(kind,name),src.split('LW.PET_STRIDE=')[1])
st=dict((k,float(v)) for k,v in re.findall(r"(walk|run):([\d.]+)",m.group(1))) if m else {}
stride=st.get(cyc,{'walk':.85,'run':1.6}[cyc])
TOL=.035
def load(i):
    return np.array(Image.open(asset_path(f'{D}/cut/{slug}-{cyc}-{i}.png')).convert('RGBA')).astype(np.float32)
def measure(a):
    al=a[:,:,3]>127; ys=np.where(al.any(1))[0]; t,b=ys[0],ys[-1]; h=b-t+1
    y0,y1=int(round(t+(b-t)*.3)),int(round(t+(b-t)*.65)); cx=np.where(al[y0:y1+1])[1].mean()
    tol=max(2,int(round(h*TOL))); low=np.full(al.shape[1],-1)
    for y in range(b,b-tol-1,-1):
        row=al[y]; low[(low<0)&row]=y
    paws=[];s=e=-1
    for x in range(len(low)+1):
        v=low[x] if x<len(low) else -1
        if v>=0:
            if s<0 or x-e>2:
                if s>=0 and e-s+1>=3: paws.append((s+e)/2)
                s=x
            e=x
    if s>=0 and e-s+1>=3: paws.append((s+e)/2)
    # belly line: lowest row (from the bottom) whose longest opaque run spans ≥45 % of the torso
    band=al[y0:y1+1].any(0); tx=np.where(band)[0]; tw=tx[-1]-tx[0]+1
    belly=t+int(h*.55)
    for y in range(b,t,-1):
        r=al[y].astype(np.int8); d=np.diff(np.concatenate([[0],r,[0]])); st_,en=np.where(d==1)[0],np.where(d==-1)[0]
        if len(st_) and (en-st_).max()>=.45*tw: belly=y; break
    return dict(t=t,b=b,h=h,cx=cx,paws=paws,belly=belly,w=al.shape[1])
A=[load(i) for i in range(1,N+1)]; M=[measure(a) for a in A]
H=float(np.median([m['h'] for m in M])); S=stride*H; e=S/N
cs=np.array([m['cx'] for m in M],float)
for _ in range(2): cs=(np.roll(cs,1)+2*cs+np.roll(cs,-1))/4
def ground(i):   # grounded paws per group, relative to the smoothed torso centre
    m=M[i]; return [(p-cs[i], -1 if p<m['cx'] else 1) for p in m['paws']]
G=[ground(i) for i in range(N)]
def offsets(ch,cf):
    """per frame (hind, fore) leg offsets, image px (+ = forward)"""
    U=np.zeros((N,2))
    for gi,c in enumerate((ch,cf)):
        if cyc=='walk':
            for i in range(N): U[i,gi]=e*(1.5-((i-c)%4))
        else:
            # run: stance = the frames this group touches the ground, from contact frame c on
            on=[any(s==(-1 if gi==0 else 1) for _,s in G[(c+j)%N]) for j in range(N)]
            L=1
            while L<N-1 and on[L]: L+=1
            for j in range(N):
                i=(c+j)%N
                if j<L: U[i,gi]=e*((L-1)/2-j)
                else:   # swing: forward from the last stance offset back to the first
                    u=(j-L+1)/(N-L+1); U[i,gi]=e*(-(L-1)/2+(L-1)*u)
    return U
def slip(U):
    """per cut, the smallest world-x shift of a paw grounded on both sides of it (px)"""
    out=[]
    for i in range(N):
        j=(i+1)%N; best=None
        for p,s in G[i]:
            for q,s2 in G[j]:
                if s!=s2: continue
                gi=0 if s<0 else 1
                d=abs((q+U[j,gi]+e)-(p+U[i,gi]))   # frame j is drawn one step further on
                best=d if best is None else min(best,d)
        out.append(best)
    return out
def score(U):
    sl=[x for x in slip(U) if x is not None]
    return np.mean(sorted(sl)[:max(1,len(sl)*3//4)]) if sl else 99
def refine(U0,iters=8):
    """ICP-style refinement: pair each grounded paw with its nearest same-side paw in the next
    frame (given the current offsets), keep pairs within half a step, and solve the offsets
    that plant them (least squares, a light pull towards the sawtooth so they stay bounded)."""
    U=U0.copy(); lam=.05
    for _ in range(iters):
        rows=[];rhs=[]
        for i in range(N):
            j=(i+1)%N
            for p,s in G[i]:
                gi=0 if s<0 else 1; c=[(abs((q+U[j,gi]+e)-(p+U[i,gi])),q) for q,s2 in G[j] if s2==s]
                if not c: continue
                r,q=min(c)
                if r>.5*e: continue
                row=np.zeros(2*N); row[2*j+gi]+=1; row[2*i+gi]-=1; rows.append(row); rhs.append(p-q-e)
        for k in range(2*N):
            row=np.zeros(2*N); row[k]=lam; rows.append(row); rhs.append(lam*U0.flat[k])
        U=np.linalg.lstsq(np.array(rows),np.array(rhs),rcond=None)[0].reshape(N,2)
    return U
# ---- bottom-band profiles (ground contacts) in torso coordinates, for scoring/solving ----
X0=int(max(m['w'] for m in M))+80
grid=np.arange(-X0,X0+1,dtype=float)
def band(i):
    m=M[i]; al=A[i][:,:,3]>127; tol=max(2,int(round(m['h']*TOL)))
    col=al[m['b']-tol:m['b']+1].any(0).astype(float); return np.arange(len(col))-cs[i],col
B=[band(i) for i in range(N)]
sig=lambda x,h:1/(1+np.exp(-x/(.07*h)))
def prof(i,U=None,side=0):
    """frame i's ground band on the torso grid; U = its (hind, fore) offsets; side −1/1 = one group"""
    xs,col=B[i]; m=M[i]; off=cs[i]-m['cx']   # grid → this frame's own torso (the warp pivot)
    u=0 if U is None else U[0]*(1-sig(xs+off,m['h']))+U[1]*sig(xs+off,m['h'])
    p=np.interp(grid,xs+u,col,left=0,right=0)
    if side: w=sig(grid+off,m['h']); p=p*(w if side>0 else 1-w)
    return p
def overlap(a,b):
    d=min(a.sum(),b.sum()); return np.minimum(a,b).sum()/d if d>0 else None
def world_score(U):
    """mean overlap of consecutive frames' ground bands placed in the world (best 3/4 of cuts)"""
    sc=[]
    for i in range(N):
        j=(i+1)%N; a=prof(i,U[i]); b=np.interp(grid,grid+e,prof(j,U[j]),left=0,right=0)   # j one step on
        o=overlap(a,b); sc.append(0 if o is None else o)
    return float(np.mean(sorted(sc,reverse=True)[:max(1,N*3//4)])),[round(float(x),2) for x in sc]
def chains():
    """per group: how far its planted paws slide between frames (band correlation); split the
    loop at the least-confident cuts (hand-offs) and integrate a sawtooth that plants the rest"""
    U=np.zeros((N,2))
    for gi,side in enumerate((-1,1)):
        d=np.zeros(N); conf=np.zeros(N)
        for i in range(N):
            j=(i+1)%N; a=prof(i,side=side); bj=prof(j,side=side); best=(-1,0)
            for sft in np.arange(-.3*e,1.6*e,1.0):
                o=overlap(a,np.interp(grid,grid+sft,bj,left=0,right=0))
                if o is not None and o>best[0]: best=(o,sft)
            conf[i],d[i]=best
        cand=[(c,) for c in range(N)] if cyc=='run' else [(c,c+N//2) for c in range(N//2)]
        res=sorted(k%N for k in min(cand,key=lambda r:sum(conf[k%N] for k in r)))
        for r0 in range(len(res)):
            k=(res[r0]+1)%N; end=res[(r0+1)%len(res)]; fr=[k]
            while k!=end: k=(k+1)%N; fr.append(k)
            v=[0.0]
            for k in fr[:-1]: v.append(v[-1]-(e-d[k]))   # cut k: U_next − U_k = d − e
            v=np.array(v); v-=v.mean()
            for k,val in zip(fr,v): U[k,gi]=val
    return U
lim=min(2.2*e,.26*H)   # never bend a leg further than ~a quarter of the height
cands=[('saw h%d f%d'%(ch+1,cf+1),offsets(ch,cf)) for ch,cf in itertools.product(range(N if cyc=='run' else 4),repeat=2)]
cands.append(('chains',chains()))
cands+= [(nm+'+icp',refine(U)) for nm,U in list(cands)]
scored=sorted(((world_score(np.clip(U,-lim,lim))[0],nm,np.clip(U,-lim,lim)) for nm,U in cands),key=lambda r:-r[0])
_,how,U=scored[0]
before_s=world_score(np.zeros((N,2))); after_s=world_score(U)
before=slip(np.zeros((N,2))); after=slip(U)
fmt=lambda v:[None if x is None else round(float(x)/H*100,1) for x in v]
print(f'{slug}-{cyc}: H={H:.0f}px step={e:.1f}px solution={how}  ground overlap {before_s[0]:.2f} -> {after_s[0]:.2f}  per cut {after_s[1]}')
print('  slip per cut before (% of height):',fmt(before))
print('  slip per cut after  (% of height):',fmt(after))
def warp(a,m,uh,uf):
    h,w,_=a.shape; pad=int(np.ceil(max(abs(uh),abs(uf))))+2
    out_w=w+2*pad
    yy,xx=np.mgrid[0:h,0:out_w].astype(np.float32); xx-=pad
    yh=m['belly']-.1*m['h']   # the shear starts inside the body, pivoting round the hip
    r=np.clip((yy-yh)/max(1,m['b']-yh),0,1); r=r*r*(3-2*r)*.35+r*.65   # soft start, ~linear
    wf=1/(1+np.exp(-(xx-m['cx'])/(.07*m['h'])))
    u=r*(uh*(1-wf)+uf*wf)
    pm=a.copy(); pm[:,:,:3]*=pm[:,:,3:4]/255   # premultiplied
    res=np.stack([nd.map_coordinates(pm[:,:,k],[yy,xx-u],order=1,mode='constant',cval=0) for k in range(4)],-1)
    al=res[:,:,3]; rgb=np.where(al[...,None]>0,res[:,:,:3]*255/np.maximum(al[...,None],1e-3),0)
    o=np.concatenate([rgb,al[...,None]],-1).clip(0,255).astype(np.uint8)
    xs=np.where((o[:,:,3]>0).any(0))[0]; return o[:,xs[0]:xs[-1]+1]
if prev:
    os.makedirs(prev,exist_ok=True)
    for i in range(N): save_art(Image.fromarray(warp(A[i],M[i],U[i,0],U[i,1])),f'{prev}/{slug}-{cyc}-{i+1}.png')
elif not dry:
    dst=f'{ROOT}/scenes/art/sprites/{kind}s/{name}/cycle'; os.makedirs(dst,exist_ok=True)
    for i in range(N):
        save_art(Image.fromarray(warp(A[i],M[i],U[i,0],U[i,1])),f'{dst}/{cyc}-{i+1}.png')
    rep=f'{D}/plant/{slug}-{cyc}.json'; os.makedirs(os.path.dirname(rep),exist_ok=True)
    json.dump(dict(H=H,stride=stride,step=e,solution=how,overlap_before=before_s,overlap_after=after_s,offsets=U.round(2).tolist(),
                   slip_before=fmt(before),slip_after=fmt(after),paws=[[round(p,1) for p,_ in g] for g in G]),open(rep,'w'))
    print('  installed',dst)
