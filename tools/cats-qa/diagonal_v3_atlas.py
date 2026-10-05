#!/usr/bin/env python3
"""Package only v3 diagonal walks. All poses are painted sprites, no runtime rig."""
import json,math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from atlas import cut
from coats import recolor
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'tools/cats-qa/diagonal-v3-src';BASE=ROOT/'scenes/art/sprites/cats';COATS=['orange','black','grey','calico','siamese']
def register(im,view):
 a=np.array(im).astype(float);a[:,:,:3]*=a[:,:,3:]/255
 x0,y0,x1,y1=(210,88,342,205) if view=='near' else (190,90,300,218)
 template=a[y0:y1:2,x0:x1:2];mask=template[:,:,3]>240; offsets=[]
 for i in range(8):
  cell=a[i//4*512:(i//4+1)*512,i%4*384:(i%4+1)*384];best=(1e12,0,0)
  for dy in range(-7,8):
   for dx in range(-7,8):
    z=cell[y0+dy:y1+dy:2,x0+dx:x1+dx:2];error=((z-template)[mask]**2).mean()
    if error<best[0]:best=(error,dx,dy)
  offsets.append(best[1:])
 return offsets
def calico_piece(piece,frames,index,key,joints):
 # Keep body patches in root coordinates, independent of pose bounding boxes.
 left=min(-r[4] for r in frames);top=min(-r[5] for r in frames)
 right=max(r[2]-r[4] for r in frames);bottom=max(r[3]-r[5] for r in frames)
 r=frames[index];origin=(-r[4]-left,-r[5]-top)
 canvas=Image.new('RGBA',(right-left,bottom-top));canvas.alpha_composite(piece,origin)
 painted=recolor(canvas,'calico',key,index,canvas.size).crop((origin[0],origin[1],origin[0]+piece.width,origin[1]+piece.height))
 # Keep exposed legs in their original orange/white painted palette. A body
 # patch field must not recolor a limb as it swings through the field. Register
 # the soft belly boundary to the torso, not each frame's changing box.
 a=np.array(piece).astype(float);out=np.array(painted).astype(float)
 yy,xx=np.mgrid[:piece.height,:piece.width]
 ox,oy=(93,121) if key.endswith('near') else (87,146)
 xx=xx-r[4]+ox;yy=yy-r[5]+oy
 boundary=50+xx*.20 if key.endswith('near') else 151-xx*.55
 weight=np.clip((yy-boundary+3)/8,0,1)
 out[:,:,:3]=out[:,:,:3]*(1-weight[:,:,None])+a[:,:,:3]*weight[:,:,None]
 out[:,:,3]=a[:,:,3]
 return Image.fromarray(np.clip(out,0,255).astype('uint8'))

def siamese_piece(piece,frames,index,key,joints):
 painted=recolor(piece,'siamese',key,index,frames[0][2:4])
 a=np.array(piece).astype(float);out=np.array(painted).astype(float);rgb=a[:,:,:3];lum=rgb@[.3,.59,.11]
 r=frames[index];anchor=(108,159) if key.endswith('near') else (102,184)
 mask=Image.new('L',piece.size);d=ImageDraw.Draw(mask)
 for leg in ['LH','LF','RH','RF']:
  x,y=joints[index][leg][-1];x=x-anchor[0]+r[4];y=y+13-anchor[1]+r[5]
  d.ellipse((x-11,y-9,x+11,y+9),fill=255)
 # Source white socks identify actual visible paws, avoiding painting dark spots
 # onto the occluding orange thigh when a farther foot is hidden.
 white=np.clip((65-(rgb[:,:,0]-rgb[:,:,2]))/25,0,1)*np.clip((lum-135)/45,0,1)
 weight=np.array(mask.filter(ImageFilter.GaussianBlur(.7)))/255*white
 brown=np.stack([lum*.27+23,lum*.23+15,lum*.21+14],2)
 out[:,:,:3]=out[:,:,:3]*(1-weight[:,:,None])+brown*weight[:,:,None]
 return Image.fromarray(np.clip(out,0,255).astype('uint8'))

def build():
 manifests={c:json.loads((BASE/c/'atlas/manifest.json').read_text()) for c in COATS};evidence={}
 ref=np.array(Image.open(BASE/'orange/atlas/walk-side.webp').convert('RGBA')).astype(float)
 def fur(a):return (a[:,:,3]>240)&(a[:,:,0]-a[:,:,2]>55)&(a[:,:,0]>120)&(a[:,:,1]>65)
 median=np.median(ref[:,:,:3][fur(ref)],axis=0)
 for view in ['near','far']:
  key='walk-'+view;source=SRC/f'{view}-cut.webp';im=Image.open(source).convert('RGBA');entries=cut(source,True);offsets=register(im,view);scale=.5
  anchor=(216,318) if view=='near' else (204,368);pieces=[];frames=[]
  a=np.array(im).astype(float);delta=median-np.median(a[:,:,:3][fur(a)],axis=0)
  for i,((p,box),(dx,dy)) in enumerate(zip(entries,offsets)):
   p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS);a=np.array(p).astype(float)
   weight=np.clip((a[:,:,0]-a[:,:,2]-20)/60,0,1)*np.clip((a[:,:,:3].mean(2)-60)/80,0,1);a[:,:,:3]+=delta*weight[:,:,None];p=Image.fromarray(np.clip(a,0,255).astype('uint8'))
   ax=round((anchor[0]+dx-(box[0]-i%4*384))*scale);ay=round((anchor[1]+dy-(box[1]-i//4*512))*scale)
   pieces.append(p);frames.append([0,0,p.width,p.height,ax,ay])
  # Measure every visible guide-assigned painted white sock. Compare stance endpoints
  # after upper-body registration, retaining the actual painted residual as evidence.
  joints=json.loads((SRC/f'{view}-joints.json').read_text());a=np.array(im).astype(float);measurements={}
  for leg,phase in [('LH',0),('LF',.25),('RH',.5),('RF',.75)]:
   samples=[]
   for i in range(8):
    u=(i/8-phase)%1
    if u>=.625:continue
    cell=a[i//4*512:(i//4+1)*512,i%4*384:(i%4+1)*384];cx,cy=joints[i][leg][-1];cx*=2;cy=cy*2+26
    yy,xx=np.mgrid[:512,:384];sel=(cell[:,:,3]>200)&(cell[:,:,:3].mean(2)>170)&(cell[:,:,0]-cell[:,:,2]<55)&((xx-cx)**2+(yy-cy)**2<17**2)
    if sel.sum()<12:continue
    dx,dy=offsets[i];samples.append([u,float(xx[sel].mean()-dx),float(yy[sel].mean()-dy),i])
   samples.sort();measurements[leg]=samples
  axis=np.array([1,.55 if view=='near' else -.55]);unit=78/sorted(r[3] for r in manifests['orange']['walk-side']['frames'])[4]
  # Near-side paws are unoccluded; far-side feet are often covered and unsuitable fits.
  fits=[]
  for leg in ['LH','LF']:
   points=np.array(measurements[leg]);vel=np.polyfit(points[:,0],points[:,1:3],1)[0];fits.append(-float(vel@axis/(axis@axis)))
  sweep=float(np.mean(fits));stride=round(sweep*scale*unit*math.sqrt(2),2)
  residual={}
  for leg,samples in measurements.items():
   z=np.array(samples);r=z[:,1:3]+z[:,0,None]*sweep*axis;residual[leg]=(np.ptp(r,axis=0)*scale*unit).tolist()
  cw=max(p.width for p in pieces)+4;ch=max(p.height for p in pieces)+4
  for i,r in enumerate(frames):r[0]=i%4*cw;r[1]=i//4*ch
  areas=np.array([np.array(p)[:,:,3].sum()/255 for p in pieces]);cv=float(areas.std()/areas.mean())
  for coat in COATS:
   sheet=Image.new('RGBA',(cw*4,ch*2))
   for i,(p,r) in enumerate(zip(pieces,frames)):
    piece=p if coat=='orange' else calico_piece(p,frames,i,key,joints) if coat=='calico' else siamese_piece(p,frames,i,key,joints) if coat=='siamese' else recolor(p,coat,key,i,frames[0][2:4]);sheet.alpha_composite(piece,(r[0],r[1]))
   sheet.save(BASE/coat/'atlas'/f'{key}.webp',quality=90,method=3)
   manifests[coat][key]={'src':f'art/sprites/cats/{coat}/atlas/{key}.webp','frames':frames,'stride':stride,'areaVariation':round(cv,4)}
  evidence[view]={'scale':scale,'translationPixels':offsets,'stride':stride,'paletteDelta':delta.tolist(),'areaCV':cv,'paintedStanceSamples':measurements,'stanceResidualScenePixels':residual,'nearLegFittedSweeps':fits}
 for coat,m in manifests.items():(BASE/coat/'atlas/manifest.json').write_text(json.dumps(m,indent=2)+'\n')
 (SRC/'calibration.json').write_text(json.dumps(evidence,indent=2)+'\n');print(json.dumps(evidence,indent=2))
if __name__=='__main__':build()
