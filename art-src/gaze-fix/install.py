#!/usr/bin/env python3
"""Reproducible gaze-sheet cut, two-axis paw registration and old/new review.

Masters are lossless WebP; installed runtime frames follow the PNG/WebP release registry.
Every stance chain is registered in the runtime's torso-pinned coordinates.
"""
import io, json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from scipy import ndimage as nd
from PIL import Image, ImageDraw
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/webp'))
from assets import asset_path, save_art

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
BEFORE = 'ab4c78704a4688fcf208662e89ecd24d2e47ea09'
ANIMALS = ['orange', 'black', 'grey', 'calico', 'siamese', 'golden', 'corgi']
ROWS = {'side': [('walk', 8), ('run', 6), ('jump', 5)],
        'depth': [('walk-f', 8), ('jump-f', 5), ('walk-b', 8), ('jump-b', 5)]}

def guard():
    if shutil.disk_usage('/').free < 3 * 1024**3:
        raise RuntimeError('STOP: less than 3 GB free on /')

def measure(a):
    al = a[:, :, 3] > 127
    ys = np.where(al.any(1))[0]
    t, b = ys[0], ys[-1]
    cx = np.where(al[round(t+(b-t)*.3):round(t+(b-t)*.65)+1])[1].mean()
    return float(t), float(b), float(cx)

def plant(cuts, key, stride, animal):
    n = len(cuts)
    ms = [measure(np.array(c)) for c in cuts]
    H = float(np.median([b-t+1 for t,b,c in ms]))
    height = max(c.height for c in cuts)
    frames = []
    for c in cuts:
        cv = Image.new('RGBA', (c.width, height))
        cv.paste(c, (0, height-c.height))
        frames.append(np.array(cv).astype(float))
    ms = [measure(a) for a in frames]
    cs = np.array([m[2] for m in ms])
    for _ in range(2):
        cs = (np.roll(cs,1)+2*cs+np.roll(cs,-1))/4
    paws = []
    for a, (_,_,cx) in zip(frames, ms):
        al = a[:,:,3] > 127
        yy,xx = np.mgrid[:a.shape[0],:a.shape[1]]
        pp = []
        for side in [-1,1]:
            split = cx
            if animal in ['golden','corgi']:
                split = cx + (.22*H if key.endswith('-b') else -.22*H)
            if animal == 'golden' and '-' not in key:
                split = cx
            mask = al & ((xx < split) if side < 0 else (xx >= split))
            bottom = yy[mask].max()
            foot = mask & (yy >= bottom-max(2,H*.015))
            pp.append([float(xx[foot].mean()), float(yy[foot].mean())])
        paws.append(pp)
    paws = np.array(paws)
    rel = paws.copy(); rel[:,:,0] -= cs[:,None]
    slope = .55 if key.endswith('-f') else -.55 if key.endswith('-b') else 0
    direction = np.array([1,slope])/np.hypot(1,slope)
    step = direction*stride*H/n
    offsets = np.zeros((n,2,2)); chains = []
    half = n//2
    for group,contact in [(0,half//2),(1,0)]:
        # Gallops have flight phases: register only the shortest plausible contact
        # pair per limb group, never force an airborne extended paw into a stance.
        starts = [contact,(contact+half)%n]
        span = half
        if animal in ['golden','corgi'] and key.startswith('walk'):
            starts = list(range(group, n, 2))
            span = 2
        if key.startswith('run'):
            starts = [min(range(n),key=lambda i:np.linalg.norm(rel[(i+1)%n,group]+step-rel[i,group]))]
            span = 2
        for start in starts:
            inds = [(start+j)%n for j in range(span)]
            world = np.array([rel[i,group]+j*step for j,i in enumerate(inds)])
            target = world.mean(0)
            for j,i in enumerate(inds): offsets[i,group] = target-world[j]
            chains.append((group,inds))
    if np.max(np.linalg.norm(offsets,axis=2)) > H*.55:
        raise ValueError((key,'excessive paw correction',offsets.tolist()))
    pad = int(np.ceil(H*.6)); out = []; residuals = []
    for i,a in enumerate(frames):
        ih,iw,_ = a.shape
        yy,xx = np.mgrid[-pad:ih+pad,-pad:iw+pad].astype(float)
        def displacement(x,y):
            wf = np.clip((x-(paws[i,0,0]+3))/max(1,paws[i,1,0]-paws[i,0,0]-6),0,1)
            wf = wf*wf*(3-2*wf)
            d = np.zeros(x.shape+(2,))
            for gi,w in [(0,1-wf),(1,wf)]:
                r = np.clip((y-(paws[i,gi,1]-.75*H))/(.75*H-6),0,1)
                r = r*r*(3-2*r)
                d += (w*r)[...,None]*offsets[i,gi]
            return d
        sx,sy = xx.copy(),yy.copy()
        for _ in range(50):
            d = displacement(sx,sy)
            sx += (xx-sx-d[:,:,0])*.3; sy += (yy-sy-d[:,:,1])*.3
        pm = a.copy(); pm[:,:,:3] *= pm[:,:,3:4]/255
        warped = np.stack([nd.map_coordinates(pm[:,:,c],[sy,sx],order=1,mode='constant',cval=0) for c in range(4)],-1)
        for gi in range(2):
            shift = offsets[i,gi]; dest = paws[i,gi]+shift
            radius = np.hypot(xx-dest[0],yy-dest[1])
            mix = np.clip((.09*H-radius)/(.045*H),0,1); mix = mix*mix*(3-2*mix)
            rigid = np.stack([nd.map_coordinates(pm[:,:,c],[yy-shift[1],xx-shift[0]],order=1,mode='constant',cval=0) for c in range(4)],-1)
            warped = warped*(1-mix[:,:,None])+rigid*mix[:,:,None]
        warped[:,:,:3] *= 255/np.maximum(warped[:,:,3:4],1e-6)
        clean = np.clip(warped,0,255).astype('uint8')
        labels,_ = nd.label(clean[:,:,3]>8); counts = np.bincount(labels.ravel()); counts[0]=0
        keep = nd.binary_dilation(labels==counts.argmax(),iterations=1)
        clean[:,:,3] = np.where(keep,clean[:,:,3],0)
        out.append(Image.fromarray(clean))
        residuals.append(np.array([displacement(np.array(p[0]),np.array(p[1])) for p in paws[i]]))
    corrected = rel+np.array(residuals); slips=[]
    for gi,inds in chains:
        pts = np.array([corrected[i,gi]+j*step for j,i in enumerate(inds)])
        slips.extend(np.linalg.norm(np.diff(pts,axis=0),axis=1).tolist())
    report = dict(height=H,stride=stride,direction=direction.tolist(),step=step.tolist(),
                  paw_landmarks=paws.tolist(),offsets=offsets.tolist(),stance_chains=chains,
                  max_contact_slip_px=max(slips),mean_contact_slip_px=float(np.mean(slips)))
    assert max(slips)<1e-6, report
    return out, dict(height=H,pad=pad,stride=stride,centers=[m[2] for m in ms]), report

def main():
    guard()
    js = ROOT/'scenes/pet-motion.js'; source = js.read_text()
    registry = {name:json.loads(re.search(r'LW\.'+name+r'=(\{.*\});',source)[1]) for name in ['PET_DIRECTION_LAYOUT','PET_JUMP_LAYOUT']}
    registry['PET_STRIDE'] = dict(zip(['cats/'+a for a in ANIMALS[:5]]+['dogs/'+a for a in ANIMALS[5:]],
                                    [dict(walk=w,run=r) for w,r in [( .82,1.6),(.78,1.7),(.84,1.6),(.9,1.6),(.87,1.6),(.81,1.6),(.81,1.5)]]))
    reports = {}
    jumps_only = '--jumps-only' in sys.argv
    only_cycle = next((a.split('=',1)[1] for a in sys.argv if a.startswith('--cycle=')),None)
    for animal in [a for a in sys.argv[1:] if not a.startswith('--')] or ANIMALS:
        guard(); species = 'dogs' if animal in ['golden','corgi'] else 'cats'; animal_id = species+'/'+animal
        folder = ROOT/'scenes/art/sprites'/animal_id
        cut_rows = {}
        with tempfile.TemporaryDirectory(prefix='gaze-cut-') as temp:
            temp = Path(temp)
            for sheet,rows in ROWS.items():
                im = Image.open(asset_path(BASE/f'{animal}-{sheet}.webp'))
                for row,(key,n) in enumerate(rows):
                    bounds = [0,.25,.49,.72,1] if sheet == 'depth' else [0,1/3,2/3,1]
                    strip = im.crop((0,round(bounds[row]*im.height),im.width,round(bounds[row+1]*im.height)))
                    save_art(strip,temp/'strip.png')
                    subprocess.run([sys.executable,str(ROOT/'art-src/cycles/cut.py'),str(temp/'strip.png'),str(temp),key,str(n)],check=True,stdout=subprocess.DEVNULL)
                    cut_rows[key] = [Image.open(asset_path(temp/f'{key}-{i}.png')).convert('RGBA') for i in range(1,n+1)]
        for key,cuts in cut_rows.items():
            if key.startswith('jump') or jumps_only: continue
            if only_cycle and key != only_cycle: continue
            stride = .5 if '-' in key else registry['PET_STRIDE'][animal_id][key]
            frames,geom,report = plant(cuts,key,stride,animal)
            registry['PET_DIRECTION_LAYOUT'][animal_id][key] = geom
            reports[animal+'-'+key] = report
            for i,im in enumerate(frames,1): save_art(im,folder/'cycle'/f'{key}-{i}.png')
            print(animal,key,'contact slip',report['max_contact_slip_px'],flush=True)
        for key,cuts in cut_rows.items():
            if not key.startswith('jump'): continue
            H = registry['PET_DIRECTION_LAYOUT'][animal_id][key.replace('jump','walk')]['height']
            _,bot,_ = measure(np.array(cuts[-1])); top,_,_ = measure(np.array(cuts[-1]))
            factor = H*.88/(bot-top+1)
            resized = [c.resize((round(c.width*factor),round(c.height*factor)),Image.Resampling.LANCZOS) for c in cuts]
            pad = 12; height = max(max(c.height for c in resized)+2*pad,round(H*1.6)+2*pad); centers=[]
            for i,c in enumerate(resized,1):
                _,bot,cx = measure(np.array(c)); cv = Image.new('RGBA',(c.width+2*pad,height))
                cv.paste(c,(pad,height-pad-1-int(bot))); save_art(cv,folder/'t'/f'{key}-{i}.png'); centers.append(cx+pad)
            registry['PET_JUMP_LAYOUT'][animal_id][key] = dict(height=H,pad=pad,centers=centers)
        review(animal,folder,cut_rows)
    for name in ['PET_DIRECTION_LAYOUT','PET_JUMP_LAYOUT']:
        source = re.sub(r'(LW\.'+name+r'=)\{.*\};',lambda m:m[1]+json.dumps(registry[name],separators=(',',':'))+';',source)
        for species,subdir in [('cats','cycles'),('dogs','pets-shared')]:
            filename = 'directions-layout.json' if name=='PET_DIRECTION_LAYOUT' else 'jumps-layout.json'
            (ROOT/'art-src'/subdir/filename).write_text(json.dumps({k:v for k,v in registry[name].items() if k.startswith(species+'/')},indent=2)+'\n')
    js.write_text(source)
    report_path=BASE/'plant-qa.json'
    old=json.loads(report_path.read_text()) if report_path.exists() else {};old.update(reports)
    report_path.write_text(json.dumps(old,indent=2)+'\n')

def review(animal,folder,rows):
    cv=Image.new('RGB',(1600,len(rows)*240),'#b6b8be');d=ImageDraw.Draw(cv)
    for row,(key,cuts) in enumerate(rows.items()):
        for i in range(1,len(cuts)+1):
            path=folder/('t' if key.startswith('jump') else 'cycle')/f'{key}-{i}.png'
            old=Image.open(asset_path(io.BytesIO(subprocess.check_output(['git','show',BEFORE+':'+str(path.relative_to(ROOT))],cwd=ROOT)))).convert('RGBA')
            for v,im in enumerate([old,Image.open(asset_path(path)).convert('RGBA')]):
                im=im.crop(im.getbbox());im.thumbnail((190,95),Image.Resampling.LANCZOS)
                x=(i-1)*200;y=row*240+v*120
                cv.paste(im,(x+(200-im.width)//2,y+117-im.height),im)
                d.text((x+4,y+3),f'{key}-{i} '+('OLD' if v==0 else 'NEW'),fill='#202028')
    (ROOT/'shots/gaze-fix').mkdir(exist_ok=True)
    save_art(cv,ROOT/'shots/gaze-fix'/f'{animal}.jpg',quality=88)

if __name__=='__main__': main()
