#!/usr/bin/env python3
"""Cut a whole generated cycle, register it once, emit compact WebP + explicit frame rectangles.
Preserves source alpha/white fur. No per-frame runtime rescaling or canvas readback.
"""
from pathlib import Path
import json, argparse
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[2]
VIEWS=['side','near','toward','far','away']

def cut(path, positions=False):
    im=Image.open(path).convert('RGBA');a=np.array(im);alpha=a[:,:,3]
    if np.percentile(alpha,10)>250:
        rgb=a[:,:,:3].astype(float);bg=np.median(np.concatenate([rgb[0],rgb[-1],rgb[:,0],rgb[:,-1]]),axis=0)
        dist=np.max(abs(rgb-bg),axis=2); background=dist<24
        labels,n=ndimage.label(background);edge=np.unique(np.concatenate([labels[0],labels[-1],labels[:,0],labels[:,-1]]));edge=edge[edge>0]
        outside=np.isin(labels,edge);alpha=np.where(outside,0,255).astype('uint8');a[:,:,3]=alpha
    labels,n=ndimage.label(alpha>40);sizes=np.bincount(labels.ravel());sizes[0]=0
    keep=np.argsort(sizes)[-8:];objects=ndimage.find_objects(labels)
    if len(keep)<8 or sizes[keep[0]]<sizes[keep[-1]]*.18:raise ValueError(('Expected eight distinct cats',path,sizes[keep]))
    keep=sorted(keep,key=lambda k:objects[k-1][0].start)
    keep=sorted(keep[:4],key=lambda k:objects[k-1][1].start)+sorted(keep[4:],key=lambda k:objects[k-1][1].start)
    pieces=[]
    for k in keep:
        yy,xx=objects[k-1];box=(max(0,xx.start-2),max(0,yy.start-2),min(im.width,xx.stop+2),min(im.height,yy.stop+2))
        sub=a[box[1]:box[3],box[0]:box[2]].copy();mask=ndimage.binary_dilation(labels[box[1]:box[3],box[0]:box[2]]==k,iterations=2);sub[:,:,3]*=mask
        pieces.append((Image.fromarray(sub),box) if positions else Image.fromarray(sub))
    return pieces

def build(coat='orange'):
    src=ROOT/'tools/cats-qa/generated';out=ROOT/f'scenes/art/sprites/cats/{coat}/atlas';out.mkdir(parents=True,exist_ok=True)
    manifest={};review=[]
    for path in sorted(src.glob(f'{coat}-*.png')):
        key=path.stem[len(coat)+1:]
        if '-v' in key:continue
        entries=cut(path,True);pieces=[e[0] for e in entries];areas=np.array([np.array(p)[:,:,3].sum()/255 for p in pieces]);base=np.median(areas)
        # Uniform whole-drawing registration: normalize small generation drift, not separate axes.
        # Target painted area per view; front/rear have foreshortened torso silhouettes.
        target=11500 if key.endswith(('toward','away')) else 14500
        scale=(target/base)**.5
        source=Image.open(path);sw,sh=source.width/4,source.height/2
        # Generated walk guides lock head/torso position in each cell. Keep that registration,
        # allowing a swinging paw to move relative to the floor instead of lifting the whole cat.
        rootY=float(np.median([(box[3]-(i//4)*sh) for i,(_,box) in enumerate(entries)]))-1
        rootX=float(np.median([(box[0]-(i%4)*sw)+p.width*.55 for i,(p,box) in enumerate(entries)]))
        framed=[];rects=[];cw,ch=320,256
        for i,p in enumerate(pieces):
            correction=1; k=scale*correction
            # One sheet scale: changing silhouette area is pose, NOT body-size drift.
            view=key.split('-')[-1]
            k*=dict(side=1,near=.78,toward=.82,away=.78,far=.8).get(view,.82)
            p=p.resize((round(p.width*k),round(p.height*k)),Image.Resampling.LANCZOS)
            a=np.array(p);yy,xx=np.where(a[:,:,3]>80)
            # Torso registration excludes the tail and swing paws. Ground baseline is explicit.
            rows=(yy>p.height*.28)&(yy<p.height*.7)
            cx=float(np.median(xx[rows])) if rows.any() else p.width/2
            ax=round(cx);ay=p.height-1
            if key.startswith(('walk-','run-')):
                box=entries[i][1];ax=round((rootX-(box[0]-(i%4)*sw))*k);ay=round((rootY-(box[1]-(i//4)*sh))*k)
            if key.startswith('run-'):
                # Contact frames share the floor. Extended and gathered flight frames
                # have a small explicit clearance; source sheet row placement is not motion.
                ay=p.height-1+[0,5,16,0,0,14,7,0][i]
            framed.append(p);rects.append([i%4*cw,i//4*ch,p.width,p.height,ax,ay])
        # Pack to the actual largest frame, avoiding large decoded transparent margins.
        cw=max(p.width for p in framed)+4;ch=max(p.height for p in framed)+4
        for i,r in enumerate(rects):r[0]=i%4*cw;r[1]=i//4*ch
        atlas=Image.new('RGBA',(cw*4,ch*2))
        for p,r in zip(framed,rects):
            if p.width>cw or p.height>ch:raise ValueError((key,p.size))
            atlas.alpha_composite(p,(r[0],r[1]))
        atlas.save(out/f'{key}.webp',quality=90,method=3)
        manifest[key]={'src':f'art/sprites/cats/{coat}/atlas/{key}.webp','frames':rects,'stride':0,'areaVariation':round(float(areas.std()/areas.mean()),4)}
        row=Image.new('RGB',(8*200,190),'#cbd6d7');d=ImageDraw.Draw(row);d.text((4,3),key,fill='black')
        for i,p in enumerate(framed):
            p.thumbnail((190,155));row.paste(p,(i*200+(200-p.width)//2,185-p.height),p);d.text((i*200+5,20),str(i+1),fill='black')
        review.append(row)
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    if review:
        page=Image.new('RGB',(1600,len(review)*190),'white')
        for i,r in enumerate(review):page.paste(r,(0,i*190))
        page.save(ROOT/f'shots/cats-gpt/{coat}-working-contact.jpg',quality=90)
    return manifest
if __name__=='__main__':build()
