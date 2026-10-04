#!/usr/bin/env python3
"""Draw 2D paw blocking for the four perspective views. Guides only, not shipped art."""
import math
from PIL import Image,ImageDraw,ImageChops
from atlas import cut
config={
'near':dict(size=(300,363),poly=[(0,0),(300,0),(300,210),(260,235),(225,268),(168,250),(120,230),(75,204),(0,210)],legs=[('RH',(110,205),(114,252),.5),('RF',(193,226),(184,286),.75),('LH',(54,191),(53,264),0),('LF',(174,230),(203,324),.25)],vector=(24,26)),
'far':dict(size=(300,345),poly=[(0,0),(300,0),(300,173),(249,192),(211,214),(169,246),(131,275),(77,262),(0,275)],legs=[('RF',(216,179),(214,233),.75),('RH',(157,224),(163,279),.5),('LF',(247,166),(252,225),.25),('LH',(121,227),(118,317),0)],vector=(24,-19)),
'toward':dict(size=(177,456),poly=[(0,0),(177,0),(177,313),(138,323),(108,333),(75,333),(37,319),(0,315)],legs=[('RH',(43,264),(33,321),.5),('LH',(137,264),(147,321),0),('RF',(57,319),(52,407),.75),('LF',(125,319),(128,407),.25)],vector=(0,36)),
'away':dict(size=(203,410),poly=[(0,0),(203,0),(203,265),(153,280),(127,292),(98,288),(0,331)],legs=[('RF',(151,179),(156,244),.75),('LF',(67,179),(62,244),.25),('RH',(144,263),(149,357),.5),('LH',(80,262),(77,357),0)],vector=(0,-32))}
for view,c in config.items():
 p=cut('tools/cats-qa/generated/orange-walk-'+view+'.png')[0].resize(c['size']);a=p.copy();mask=Image.new('L',p.size);ImageDraw.Draw(mask).polygon(c['poly'],fill=255);a.putalpha(ImageChops.multiply(a.getchannel('A'),mask));sheet=Image.new('RGBA',(1536,1024))
 for i in range(8):
  cv=Image.new('RGBA',(384,512));d=ImageDraw.Draw(cv);ox=(384-p.width)//2;oy=(512-p.height)//2
  for name,root,base,offset in c['legs']:
   u=(i/8-offset)%1;duty=.625
   if u<duty:z=1-2*u/duty;lift=0
   else:v=(u-duty)/(1-duty);z=-1+2*v;lift=18*math.sin(math.pi*v)
   foot=(base[0]+z*c['vector'][0],base[1]+z*c['vector'][1]-lift);knee=((root[0]+foot[0])*.5+(4 if 'H' in name else -3),root[1]+(foot[1]-root[1])*.55)
   pts=[(x+ox,y+oy) for x,y in [root,knee,foot]];far=name[0]=='R';d.line(pts,fill='#68462e',width=27,joint='curve');d.line(pts,fill='#c18a58' if far else '#e6a767',width=23,joint='curve');x,y=pts[-1];d.ellipse((x-13,y-8,x+13,y+9),fill='#f2e5d4',outline='#68462e',width=2)
  cv.alpha_composite(a,(ox,oy));sheet.alpha_composite(cv,(i%4*384,i//4*512))
 sheet.save('tools/cats-qa/generated/walk-'+view+'-guide.png')
