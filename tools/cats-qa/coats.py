#!/usr/bin/env python3
"""Deterministic painted coat variants. Preserve exact alpha, texture and geometry of approved frames.
Black/grey use palette substitution; calico/points use view-specific painted region masks.
"""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
from PIL import Image,ImageFilter
ROOT=Path(__file__).resolve().parents[2];base=ROOT/'scenes/art/sprites/cats/orange/atlas'

def recolor(im,coat,key,index):
 a=np.array(im).astype(float);rgb=a[:,:,:3];r,g,b=rgb.transpose(2,0,1);h,w=r.shape;y,x=np.mgrid[:h,:w];x=x/w;y=y/h
 lum=.3*r+.59*g+.11*b;orange=np.clip((r-b-12)/55,0,1);white=(1-orange)*np.clip((lum-120)/90,0,1)
 # Greens belong to the iris; pinks to nose/ears. Preserve highlights and dark linework.
 eye=(g>r*.91)&(g>b*1.22)&(lum<190)&(a[:,:,3]>60)
 pink=(r>g*1.20)&(b>g*.77)&(lum>85)&(lum<220)&(y<.7)
 view=key.split('-')[-1];front=view in ['toward'] or '-' not in key
 # Features stay defined in silhouette coordinates; mirrors are runtime mirrors of this same art.
 if view=='side':hx,hy,rx,ry=.83,.27,.18,.26;tail=(x<.23)&(y>.32)&(y<.83)
 elif view=='near':hx,hy,rx,ry=.72,.45,.31,.27;tail=(x<.3)&(y<.42)
 elif view=='far':hx,hy,rx,ry=.80,.23,.24,.25;tail=(x<.35)&(y>.35)
 elif view=='away':hx,hy,rx,ry=.5,.16,.48,.21;tail=(y>.44)&(x<.62)
 elif view=='toward':hx,hy,rx,ry=.5,.5,.5,.23;tail=y<.28
 else:hx,hy,rx,ry=.5,.24,.47,.26;tail=(x<.22)&(y>.54)
 # Closed curled poses expose the cream flank and dark tail as a low crescent.
 if key=='rest' and index>=5:hx,hy,rx,ry=.65,.56,.34,.31;tail=y>.80
 if key=='stretch':hx,hy,rx,ry=.5,.64,.44,.29
 head=np.clip(1-(((x-hx)/rx)**2+((y-hy)/ry)**2),0,1)
 if coat=='grey':
  value=lum*.73+19;out=np.stack([value*.98,value,value*1.045],2);out=out*(1-white[:,:,None])+rgb*white[:,:,None]
 elif coat=='black':
  value=16+(lum/255)**1.2*42;out=np.stack([value*.87,value*.90,value],2)
  out[pink]=rgb[pink]*.40
 elif coat=='calico':
  ivory=np.stack([lum*.35+160,lum*.35+155,lum*.35+142],2)
  # Large asymmetrical patches: an orange saddle, dark rump, a dark ear/eye patch.
  field=np.sin(x*9+y*4)+.48*np.cos(y*12-x*5)
  patch=np.clip((field-.38)*7,0,1);dark=np.clip((-field-.55)*7,0,1)
  # Keep chest and paws white. Orange face with one charcoal ear/temple.
  faceOrange=head*.75;darkFace=head*np.clip((x-hx)*18,0,1)
  patch=np.maximum(patch*(1-head),faceOrange);dark=np.maximum(dark*(1-head),darkFace)
  patch*=orange;dark*=orange
  charcoal=np.stack([lum*.22+12,lum*.22+13,lum*.22+15],2)
  out=ivory*(1-patch[:,:,None])+rgb*patch[:,:,None];out=out*(1-dark[:,:,None])+charcoal*dark[:,:,None]
 elif coat=='siamese':
  ivory=np.stack([lum*.24+183,lum*.25+171,lum*.25+148],2)
  # Dark points at ear tips, face mask, paws and tail; no orange tabby stripes.
  silhouette=a[:,:,3]>64;radius=max(5,min(w,h)*.075);core=ndimage.distance_transform_edt(silhouette)>radius
  labels,n=ndimage.label(core);sizes=np.bincount(labels.ravel());sizes[0]=0;core=np.isin(labels,np.flatnonzero(sizes>max(sizes)*.18))
  # Geodesic distance follows curved tails/legs and avoids rectangular color boundaries.
  reached=core.copy();distance=np.zeros((h,w));
  for step in range(1,100):
   grown=ndimage.binary_dilation(reached)&silhouette;ring=grown&~reached;distance[ring]=step;reached=grown
   if not ring.any():break
  extremities=np.clip((distance-radius*.95)/(radius*.85),0,1)
  points=np.maximum(np.clip((head-.13)*1.8,0,1),extremities)
  # Broad painted sock gradients also cover short foreshortened paws, which have
  # too little geodesic length to register as an extremity.
  points=np.maximum(points,np.clip((y-.77)*7,0,1))
  if view=='toward':points=np.maximum(points,np.clip((.30-y)*15,0,1))
  if view=='away':points=np.maximum(points,np.clip((.43-x)*12,0,1)*np.clip((y-.43)*10,0,1))
  if key=='rest' and index>=5:points=np.maximum(head,np.clip((y-.78)*7,0,1))
  points=np.array(Image.fromarray((points*255).astype('uint8')).filter(ImageFilter.GaussianBlur(2)))/255
  brown=np.stack([lum*.27+23,lum*.23+15,lum*.21+14],2)
  out=ivory*(1-points[:,:,None])+brown*points[:,:,None]
 else:return im
 # Preserve fine dark ink; retain painted shading, not a flat silhouette.
 ink=np.clip((65-lum)/40,0,1)[:,:,None];out=out*(1-ink)+rgb*.62*ink
 if coat!='black':out[pink]=rgb[pink]*[.87,.84,.86]
 ev=np.clip(lum/110,.45,1.4)
 iris=np.stack([ev*151,ev*106,ev*40],2) if coat in ['black','calico'] else np.stack([ev*65,ev*144,ev*185],2) if coat=='siamese' else rgb
 out[eye]=iris[eye]
 return Image.fromarray(np.dstack([np.clip(out,0,255),a[:,:,3]]).astype('uint8'))

def build():
 manifest=json.loads((base/'manifest.json').read_text())
 for coat in ['black','grey','calico','siamese']:
  out=base.parents[1]/coat/'atlas';out.mkdir(parents=True,exist_ok=True);data={}
  for key,c in manifest.items():
   src=Image.open(base/(key+'.webp')).convert('RGBA');sheet=Image.new('RGBA',src.size)
   for i,(x,y,w,h,ax,ay) in enumerate(c['frames']):
    piece=recolor(src.crop((x,y,x+w,y+h)),coat,key,i);sheet.alpha_composite(piece,(x,y))
   sheet.save(out/(key+'.webp'),quality=90,method=3);data[key]={**c,'src':c['src'].replace('/orange/','/'+coat+'/')}
  (out/'manifest.json').write_text(json.dumps(data,indent=2)+'\n')
if __name__=='__main__':build()
