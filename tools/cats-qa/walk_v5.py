#!/usr/bin/env python3
"""Deterministic six-frame walk extraction/registration; never rewrites other clips."""
from pathlib import Path
import json, hashlib, math
from functools import lru_cache
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'art-src/walk-v5'; BASE=ROOT/'scenes/art/sprites/cats'
DATA=ROOT/'tools/cats-qa/walk-v5-data'; OUT=ROOT/'shots/cats-gpt'
COATS=['orange','black','grey','calico','siamese']; VIEWS=['side','near','far','toward','away']

@lru_cache(None)
def extract(view):
    coat="orange"
    im=Image.open(SRC/f'{coat}-{view}.png').convert('RGB').resize((2048,878),Image.Resampling.LANCZOS)
    rgb=np.asarray(im).copy(); neutral=rgb.max(2).astype(float)-rgb.min(2)<22
    bg=(rgb.min(2)>216)&neutral
    # Flood only border-connected paper. Enclosed white bibs/paws remain opaque.
    seed=np.zeros(bg.shape,bool);seed[[0,-1],:]=True;seed[:,[0,-1]]=True
    if view=='side':
        # The ground stroke closes paper gaps between feet. A neutral-paper
        # component meeting the ground and wider than a paw is also exterior.
        labs,_=ndi.label(bg);objects=ndi.find_objects(labs)
        for k,box in enumerate(objects,1):
            if box and box[1].stop-box[1].start>28 and box[0].start<495 and box[0].stop>=495:
                seed |= labs==k
    outside=ndi.binary_propagation(seed&bg,mask=bg)
    mask=~outside
    if view=='side':
        # Break the one-pixel line; reconstruct the silhouette, but not thin
        # attached strokes. The 2px opening is below final atlas resolution.
        mask=ndi.binary_opening(mask,structure=ndi.generate_binary_structure(2,1),iterations=2)
    labels,n=ndi.label(mask);sizes=np.bincount(labels.ravel());sizes[0]=0
    ids=sorted(np.argsort(sizes)[-6:],key=lambda k:ndi.center_of_mass(mask,labels,int(k))[1])
    assert min(sizes[ids])>6000,(coat,view,sizes[ids])
    boxes=ndi.find_objects(labels);pieces=[]
    for k in ids:
        yy,xx=boxes[k-1];box=(xx.start,yy.start,xx.stop,yy.stop)
        alpha=(labels[yy,xx]==k).astype('uint8')*255
        a=np.dstack((rgb[yy,xx],alpha))
        if view=='near' and len(pieces) in [2,4,5]:
            # Enclosed paper between crossing legs, never the white bib/socks.
            px,py={2:(137,205),4:(147,200),5:(85,225)}[len(pieces)]
            subbg=bg[yy,xx];seed=np.zeros(subbg.shape,bool);seed[py,px]=True
            a[:,:,3][ndi.binary_propagation(seed,mask=subbg)]=0
        pieces.append((Image.fromarray(a),box))
    return pieces

def cut(coat,view):
    entries=extract(view)
    raw=Image.open(SRC/f'{coat}-{view}.png').convert('RGB').resize((2048,878),Image.Resampling.LANCZOS)
    result=[]
    for p,box in entries:
        a=np.dstack((np.array(raw.crop(box)),np.array(p)[:,:,3]))
        # Recolours have subpixel differences at the paper boundary. Replace
        # the outer 2 source pixels with nearest interior fur/ink before
        # downsampling, removing white matte without darkening white paws.
        solid=a[:,:,3]>128;core=ndi.binary_erosion(solid,iterations=2)
        nearest=ndi.distance_transform_edt(~core,return_distances=False,return_indices=True)
        inside=a[:,:,:3][tuple(nearest)]
        rgb=a[:,:,:3].astype(float)
        # Preserve the artist's dark ink around white toes. Only lighter,
        # near-neutral paper contamination should inherit interior colour.
        edge=solid&~core&(rgb.mean(2)>inside.mean(2)+20)&(rgb.max(2)-rgb.min(2)<30)
        a[:,:,:3][edge]=inside[edge]
        result.append(Image.fromarray(a))
    return result

# Stable upper-torso windows in the first extracted drawing. No tail-tip anchor.
ROI={'side':(65,75,220,140),'near':(65,90,235,180),'far':(165,65,290,185),'toward':(30,180,170,330),'away':(85,55,205,245)}
ROOT_X={'side':145,'near':155,'far':205,'toward':98,'away':145}
# One scale per VIEW: match ear-to-planted-paw height of approved run contact /
# stand-to-sit drawings, excluding the newly raised tail from height matching.
SCALE={'side':.91,'near':.49,'far':.49,'toward':.455,'away':.315}

def registration(pieces,view):
    x0,y0,x1,y1=ROI[view];ref=np.array(pieces[0]).astype(float)
    template=ref[y0:y1:3,x0:x1:3,:3];valid=ref[y0:y1:3,x0:x1:3,3]>240;result=[]
    for p in pieces:
        a=np.array(p).astype(float);best=(1e20,0,0)
        for dy in range(-28,29):
            for dx in range(-38,39):
                if min(x0+dx,y0+dy)<0 or y1+dy>a.shape[0] or x1+dx>a.shape[1]:continue
                z=a[y0+dy:y1+dy:3,x0+dx:x1+dx:3,:3]
                err=((z-template)[valid]**2).mean()
                if err<best[0]:best=(err,dx,dy)
        result.append(best[1:])
    return result

def stable_calico(pieces,orange,view,shifts):
    if view not in ['toward','near']:return pieces
    if view=='near':
        result=[]
        for p,o,(dx,dy) in zip(pieces,orange,shifts):
            a=np.array(p).astype(float);b=np.array(o).astype(float);lum=b[:,:,:3]@[.3,.59,.11]
            yy,xx=np.mgrid[:p.height,:p.width];weight=np.clip((yy-dy-180)/12,0,1)[:,:,None]
            white=np.stack([lum*.24+185,lum*.24+181,lum*.24+174],2)
            ink=np.clip((65-lum)/35,0,1)[:,:,None];white=white*(1-ink)+b[:,:,:3]*.62*ink
            a[:,:,:3]=a[:,:,:3]*(1-weight)+white*weight
            result.append(Image.fromarray(np.clip(a,0,255).astype('uint8')))
        return result
    # Third drawing agrees with the approved run/rest: dark patch on image right.
    master=np.array(pieces[2]).astype(float);m=master[:,:,:3];mdx,mdy=shifts[2]
    dark=(m.mean(2)<105).astype(float);red=((m[:,:,0]-m[:,:,2]>40)&(m[:,:,0]>120)).astype(float)
    # Inpaint only the TEMPLATE field outside its silhouette (nearest fur), so
    # changing outline widths do not create new bands of patches at their edge.
    inds=ndi.distance_transform_edt(master[:,:,3]<128,return_distances=False,return_indices=True)
    dark=ndi.gaussian_filter(dark[tuple(inds)],1);red=ndi.gaussian_filter(red[tuple(inds)],1)
    result=[]
    for i,(p,o,(dx,dy)) in enumerate(zip(pieces,orange,shifts)):
        a=np.array(p).astype(float);base=np.array(o).astype(float);rgb=base[:,:,:3];lum=rgb@[.3,.59,.11]
        yy,xx=np.mgrid[:p.height,:p.width];x=xx-dx;y=yy-dy
        D=ndi.map_coordinates(dark,[y+mdy,x+mdx],order=1,mode='nearest');R=ndi.map_coordinates(red,[y+mdy,x+mdx],order=1,mode='nearest')
        # Explicit torso/leg boundary. Keep legs and paws white in every phase.
        boundary={'side':142,'near':185,'far':365-.56*x,'toward':385,'away':330}[view]
        body=np.clip((boundary-y)/8,0,1)
        # Tail is already consistently marked in side/near/far/away masters;
        # front tail is orange, matching the approved front run tail.
        R*=body;D*=body
        if view=='toward':R[y<130]=1;D[y<130]=0
        white=np.stack([lum*.24+185,lum*.24+181,lum*.24+174],2)
        charcoal=np.stack([lum*.19+15,lum*.19+16,lum*.19+19],2)
        out=white*(1-R[:,:,None])+rgb*R[:,:,None];out=out*(1-D[:,:,None])+charcoal*D[:,:,None]
        # Keep current drawing's eyes, nose, pink ears and dark outline.
        eye=(rgb[:,:,1]>rgb[:,:,0]*.91)&(rgb[:,:,1]>rgb[:,:,2]*1.22)&(lum<190)
        pink=(rgb[:,:,0]>rgb[:,:,1]*1.20)&(rgb[:,:,2]>rgb[:,:,1]*.77)&(lum>85)&(lum<220)
        ink=np.clip((65-lum)/35,0,1)[:,:,None];out=out*(1-ink)+rgb*.62*ink
        out[eye|pink]=a[:,:,:3][eye|pink]
        a[:,:,:3]=out;result.append(Image.fromarray(np.clip(a,0,255).astype('uint8')))
    return result

def classes(a,coat):
    rgb=a[:,:,:3].astype(float);r,g,b=rgb.transpose(2,0,1);lum=rgb.mean(2);core=ndi.binary_erosion(a[:,:,3]>240,iterations=2)
    eye=(g>r*.91)&(g>b*1.22)&(lum<190);pink=(r>g*1.2)&(b>g*.77)&(lum>85)&(lum<220)
    good=core&~eye&~pink
    if coat=='orange':return [good&(r-b>45)&(r>100)]
    if coat=='grey':return [good&(lum>65)&(lum<190),good&(lum>=190)]
    if coat=='black':return [good&(lum>15)&(lum<110)]
    return [good&(lum<105),good&(r-b>40)&(r>120),good&(lum>=105)&~((r-b>40)&(r>120))]

def match(pieces,coat,view,manifest):
    refs=[]
    for key in ['run-'+view]+(['sit'] if view=='toward' else []):
        im=Image.open(BASE/coat/'atlas'/f'{key}.webp').convert('RGBA');c=manifest[key]
        # Grounded run contact drawings plus the standing rest entry.
        for j in ([0] if key=='sit' else [0,3,4,7]):
            x,y,w,h,*_=c['frames'][j];refs.append(np.array(im.crop((x,y,x+w,y+h))))
    arrays=[np.array(p).astype(float) for p in pieces];stats=[]
    for k in range(len(classes(arrays[0],coat))):
        src=np.concatenate([a[:,:,:3][classes(a,coat)[k]] for a in arrays]);dst=np.concatenate([a[:,:,:3][classes(a,coat)[k]] for a in refs])
        if len(src)<30 or len(dst)<30:stats.append(None);continue
        sm,ss=src.mean(0),src.std(0);dm,ds=dst.mean(0),dst.std(0)
        stats.append((sm,ss,dm,ds))
    result=[]
    for a in arrays:
        masks=classes(a,coat);rgb=a[:,:,:3].copy()
        for mask,stat in zip(masks,stats):
            if stat is None:continue
            sm,ss,dm,ds=stat;ratio=np.clip(ds/np.maximum(ss,1),.45,2)
            # Extend the fur-class transform to antialias boundaries smoothly.
            weight=ndi.gaussian_filter(mask.astype(float),1)[:,:,None]
            mapped=(rgb-sm)*ratio+dm;a[:,:,:3]=a[:,:,:3]*(1-weight)+mapped*weight
        result.append(Image.fromarray(np.clip(a,0,255).astype('uint8')))
    return result,[None if t is None else [v.tolist() for v in t] for t in stats]

# Calibrated using planted-paw positions after torso registration; updated from
# the recorded stance samples in calibration.json, not a fixed playback timer.
# Source-pixel paw centers, annotated on the supplied drawings. Only monotonic
# visibly supporting spans are used, not airborne tips or the moving tail.
STANCE={
 'side':[[1,179.9,196.5],[2,168.4,195.2],[3,160.2,196.4],[4,167.8,195.9]],
 'near':[[2,222.5,276.4],[3,204.3,263.9]],
 'far':[[1,200.7,295.9],[2,158.5,316.5],[3,146.6,324.0],[4,139.7,323.3]],
 'toward':[[4,128.4,518.6],[5,130.7,486.9]],
}
def calibrate(view,shifts):
    if view=='away':
        # Rear sheet lacks an unambiguous monotonic supporting-paw span; share
        # the front/back cadence, rather than inventing a measured rear stride.
        return calibrate('toward',registration([p for p,b in extract('toward')],'toward'))[0], {'fallback':'toward cadence; rear planted-paw ordering ambiguous'}
    pts=np.array(STANCE[view]);phase=pts[:,0]/6
    registered=np.array([[x-shifts[int(i)][0],y-shifts[int(i)][1]] for i,x,y in pts])
    axis=np.array({'side':[1,0],'near':[2**-.5,.55*2**-.5],'far':[2**-.5,-.55*2**-.5],'toward':[0,.55]}[view])
    vel=np.polyfit(phase,registered,1)[0]*SCALE[view]*.52
    stride=round(float(-vel@axis/(axis@axis)),2)
    residual=registered*SCALE[view]*.52+phase[:,None]*stride*axis
    return stride,{'sourceStanceCenters':pts.tolist(),'registeredCenters':registered.tolist(),'residualScenePixels':np.ptp(residual,axis=0).tolist(),'cycleSecondsAt48':stride/48}


def build():
    OUT.mkdir(exist_ok=True);DATA.mkdir(exist_ok=True)
    manifests={c:json.loads((BASE/c/'atlas/manifest.json').read_text()) for c in COATS};evidence={}
    for view in VIEWS:
        orange=cut('orange',view);shifts=registration([p for p,b in extract(view)],view);scale=SCALE[view];stride,stance=calibrate(view,shifts)
        ground=float(np.median([p.height-1-dy for p,(dx,dy) in zip(orange,shifts)]))
        evidence[view]={'scale':scale,'registration':shifts,'groundSourceY':ground,'stride':stride,'stance':stance,'coats':{}}
        for coat in COATS:
            pieces=cut(coat,view)
            if coat=='calico':pieces=stable_calico(pieces,orange,view,shifts)
            pieces,stats=match(pieces,coat,view,manifests[coat]);frames=[];small=[]
            for p,(dx,dy) in zip(pieces,shifts):
                p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
                # Strip subpixel ringing specks from downsampling; keep soft edge.
                a=np.array(p);a[:,:,3][a[:,:,3]<12]=0;p=Image.fromarray(a)
                ax=round((ROOT_X[view]+dx)*scale);ay=round((ground+dy)*scale)
                small.append(p);frames.append([0,0,p.width,p.height,ax,ay])
            cw=max(p.width for p in small)+4;ch=max(p.height for p in small)+4
            sheet=Image.new('RGBA',(cw*3,ch*2))
            for i,(p,r) in enumerate(zip(small,frames)):
                r[:2]=[i%3*cw,i//3*ch];sheet.alpha_composite(p,(r[0],r[1]))
            key='walk-'+view;sheet.save(BASE/coat/'atlas'/f'{key}.webp',lossless=True,method=4)
            areas=np.array([np.array(p)[:,:,3].sum()/255 for p in small])
            manifests[coat][key]={'src':f'art/sprites/cats/{coat}/atlas/{key}.webp','frames':frames,'stride':stride,'areaVariation':round(float(areas.std()/areas.mean()),4)}
            evidence[view]['coats'][coat]={'furMeanStd':stats,'areas':areas.tolist()}
    for coat,m in manifests.items():(BASE/coat/'atlas/manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    (DATA/'calibration.json').write_text(json.dumps(evidence,indent=2)+'\n')
    contacts(manifests)

def contacts(manifests):
    for coat,m in manifests.items():
        sheet=Image.new('RGB',(1440,1100),'#718289');d=ImageDraw.Draw(sheet)
        for row,view in enumerate(VIEWS):
            c=m['walk-'+view];im=Image.open(BASE/coat/'atlas'/f'walk-{view}.webp')
            for i,(x,y,w,h,ax,ay) in enumerate(c['frames']):
                p=im.crop((x,y,x+w,y+h));p.thumbnail((232,185));sheet.paste(p,(i*240+(240-p.width)//2,row*220+215-p.height),p)
                d.text((i*240+4,row*220+3),f'{view} {i+1}',fill='white')
        sheet.save(OUT/f'walk-v5-{coat}-contact.jpg',quality=92)

if __name__=='__main__':build()
