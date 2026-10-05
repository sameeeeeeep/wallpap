"""Author explicit articulated diagonal blocking; imagegen repaints this guide."""
import json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageChops
import numpy as np
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'tools/cats-qa/diagonal-v3-src'; B=ROOT/'scenes/art/sprites/cats/orange/atlas'
M=json.loads((B/'manifest.json').read_text())
for view in ['near','far']:
 p=Image.open(OUT/f'{view}-body.png').convert('RGBA')
 mask=Image.new('L',p.size); d=ImageDraw.Draw(mask)
 poly=([(0,0),(170,0),(170,56),(135,67),(120,67),(104,63),(88,70),(75,66),(56,52),(40,64),(0,70)] if view=='near' else [(0,0),(160,0),(160,81),(123,90),(111,87),(100,103),(80,114),(58,95),(40,124),(0,148)])
 d.polygon(poly,fill=255);p.putalpha(ImageChops.multiply(p.getchannel('A'),mask))
 cfg=([('RH',(73,93),.5),('RF',(118,108),.75),('LH',(64,109),0),('LF',(112,123),.25)] if view=='near' else [('RF',(119,103),.75),('RH',(93,133),.5),('LF',(130,113),.25),('LH',(74,154),0)])
 sheet=Image.new('RGB',(1536,1024),'#e6e6e6'); record=[]
 for i in range(8):
  cv=Image.new('RGBA',(192,230));g=ImageDraw.Draw(cv);offset=(15,25); joints={}
  for name,base,phase in cfg:
   u=(i/8-phase)%1; swing=u>=.625; t=(u-.625)/.375 if swing else u/.625
   sx=(-1+2*t if swing else 1-2*t)*21.25;lift=24*math.sin(math.pi*t) if swing else 0
   # Solve the sagittal skeleton, then project longitudinal motion onto floor diagonal.
   height=54 if name[1]=='F' else 56
   if name[1]=='F':
    target=np.array([sx,height-lift]);l1,l2=26,36;r=np.linalg.norm(target);r=min(r,l1+l2-.1)
    a=math.atan2(target[1],target[0]);b=math.acos(max(-1,min(1,(l1*l1+r*r-l2*l2)/(2*l1*r))))
    elbow=np.array([math.cos(a+b),math.sin(a+b)])*l1
    pts=[(0,0),elbow,target]
   else:
    target=np.array([sx,height-lift]); knee=np.array([12+sx*.55,21-lift*.2]); hock=np.array([sx-9-(10 if swing else 0),height-lift-15]);pts=[(0,0),knee,hock,target]
   sign=1 if view=='near' else -1;far=name[0]=='R'; pts=[(base[0]+q[0]*.72+offset[0],base[1]-height+q[1]+q[0]*.72*.55*sign+offset[1]) for q in pts]
   joints[name]=pts
   g.line(pts,fill='#69452e',width=16 if not far else 13,joint='curve');g.line(pts,fill='#e1a064' if not far else '#ba8354',width=13 if not far else 10,joint='curve')
   for xx,yy in pts[1:-1]:g.ellipse((xx-6,yy-6,xx+6,yy+6),fill='#e1a064' if not far else '#ba8354')
   xx,yy=pts[-1];g.ellipse((xx-7,yy-4,xx+8,yy+5),fill='#f4e7d8',outline='#69452e',width=1)
  cv.alpha_composite(p,offset); cv=cv.resize((384,460),Image.Resampling.LANCZOS); sheet.paste(cv,(i%4*384,i//4*512+26),cv);record.append(joints)
 sheet.save(OUT/f'{view}-guide.png');(OUT/f'{view}-joints.json').write_text(json.dumps(record,indent=2)+'\n')
