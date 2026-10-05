#!/usr/bin/env python3
"""Build ONLY the two replacement diagonal walks, retaining every other approved clip.
Source sheets are whole-cycle imagegen repaints; registration is translation-only.
"""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from atlas import cut
from coats import recolor
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'scenes/art/sprites/cats'
COATS=['orange','black','grey','calico','siamese']

def shifts(im,view):
    a=np.array(im).astype(float);a[:,:,:3]*=a[:,:,3:]/255
    # Match only head and upper torso. Swing feet and tail cannot move the root.
    x0,y0,x1,y1=(225,115,330,255) if view=='near' else (190,80,292,224)
    template=a[y0:y1:3,x0:x1:3];mask=template[:,:,3]>200;result=[]
    for i in range(8):
        cell=a[i//4*512:(i//4+1)*512,i%4*384:(i%4+1)*384]
        best=(float('inf'),0,0)
        for dy in range(-45,46):
            for dx in range(-16,17):
                test=cell[y0+dy:y1+dy:3,x0+dx:x1+dx:3]
                error=float(((test-template)[mask]**2).mean())
                if error<best[0]:best=(error,dx,dy)
        result.append(best[1:])
    return result

def build():
    manifests={coat:json.loads((BASE/coat/'atlas/manifest.json').read_text()) for coat in COATS}
    evidence={}
    for view in ['near','far']:
        key='walk-'+view;source=ROOT/'tools/cats-qa/diagonal-src'/f'{key}.webp'
        im=Image.open(source).convert('RGBA');assert im.size==(1536,1024),source
        entries=cut(source,True);offsets=shifts(im,view)
        # Match approved diagonal painted area with ONE scale for the entire sheet.
        # Fixed targets make repeated rebuilds deterministic (never normalize each pose).
        areas=np.array([np.array(p)[:,:,3].sum()/255 for p,b in entries]);target=9000 if view=='near' else 9250
        scale=math.sqrt(target/np.median(areas));frames=[];pieces=[]
        anchor=(215,367) if view=='near' else (220,367)
        for i,((p,box),(dx,dy)) in enumerate(zip(entries,offsets)):
            p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
            ax=round((anchor[0]+dx-(box[0]-i%4*384))*scale)
            ay=round((anchor[1]+dy-(box[1]-i//4*512))*scale)
            pieces.append(p);frames.append([0,0,p.width,p.height,ax,ay])
        cw=max(p.width for p in pieces)+4;ch=max(p.height for p in pieces)+4
        for i,r in enumerate(frames):r[0]=i%4*cw;r[1]=i//4*ch
        # Whole-sheet palette match to the approved orange side frame; preserve white/ink.
        ref=Image.open(BASE/'orange/atlas/walk-side.webp').convert('RGBA')
        def fur(a):
            r,g,b=a[:,:,:3].transpose(2,0,1)
            return (a[:,:,3]>240)&(r-b>55)&(r>120)&(g>65)
        refa=np.array(ref).astype(float);median=np.median(refa[:,:,:3][fur(refa)],axis=0)
        allfur=np.concatenate([np.array(p)[:,:,:3][fur(np.array(p))] for p in pieces]);delta=median-np.median(allfur,axis=0)
        for i,p in enumerate(pieces):
            a=np.array(p).astype(float);weight=np.clip((a[:,:,0]-a[:,:,2]-20)/60,0,1)*np.clip((a[:,:,:3].mean(2)-60)/80,0,1)
            a[:,:,:3]+=delta*weight[:,:,None];pieces[i]=Image.fromarray(np.clip(a,0,255).astype('uint8'))
        # Fit the PAINTED stance, not just the requested guide: imagegen does not
        # preserve the guide perfectly. Near LF frames 3..8, far LH frames 1..6.
        # White-paw centroids are sampled near their known guide positions.
        source_array=np.array(im).astype(float);points=[]
        for i in (range(2,8) if view=='near' else range(6)):
            z=1-2*((i/8-(.25 if view=='near' else 0))%1)/.625
            cx=(278 if view=='near' else 160)+z*38
            cy=(375 if view=='near' else 382)+z*(20.9 if view=='near' else -20.9)
            dx,dy=offsets[i];cx+=dx;cy+=dy
            cell=source_array[i//4*512:(i//4+1)*512,i%4*384:(i%4+1)*384]
            yy,xx=np.mgrid[:512,:384]
            white=(cell[:,:,3]>200)&(cell[:,:,:3].mean(2)>170)&(cell[:,:,0]-cell[:,:,2]<60)&((xx-cx)**2+(yy-cy)**2<18**2)
            assert white.sum()>20,(view,i,'missing stance paw')
            points.append([float(xx[white].mean()-dx),float(yy[white].mean()-dy)])
        velocity=np.polyfit(np.arange(6)/8,np.array(points),1)[0]
        axis=np.array([1,.55 if view=='near' else -.55])
        sweep=-float(velocity@axis/(axis@axis))
        unit=78/sorted(r[3] for r in manifests['orange']['walk-side']['frames'])[4]
        stride=round(sweep*scale*unit*math.sqrt(2),2)
        for coat in COATS:
            sheet=Image.new('RGBA',(cw*4,ch*2))
            for i,(p,r) in enumerate(zip(pieces,frames)):
                piece=p if coat=='orange' else recolor(p,coat,key,i,frames[0][2:4])
                sheet.alpha_composite(piece,(r[0],r[1]))
            out=BASE/coat/'atlas';sheet.save(out/f'{key}.webp',quality=90,method=3)
            manifests[coat][key]={'src':f'art/sprites/cats/{coat}/atlas/{key}.webp','frames':frames,'stride':stride,'areaVariation':round(float(areas.std()/areas.mean()),4)}
        residual=np.array(points)+np.arange(6)[:,None]/8*sweep*axis
        evidence[view]={'scale':scale,'translationPixels':offsets,'stride':stride,'paletteDelta':delta.tolist(),'paintedStancePawCentroids':points,'stanceResidualScenePixels':(np.ptp(residual,axis=0)*scale*unit).tolist(),'guidePawSweepX':76,'stanceFraction':.625}
    for coat,m in manifests.items():(BASE/coat/'atlas/manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    (ROOT/'tools/cats-qa/diagonal-src/calibration.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print(json.dumps(evidence,indent=2))
if __name__=='__main__':build()
