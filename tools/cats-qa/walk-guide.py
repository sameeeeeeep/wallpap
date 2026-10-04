#!/usr/bin/env python3
"""Hand-authored side walk blocking sheet: explicit four-beat footfalls for repaint reference."""
import math,sys
from PIL import Image,ImageDraw,ImageChops
from atlas import cut
p=cut('tools/cats-qa/generated/orange-walk-side.png')[0];p=p.resize((300,202))
# Retain the painted upper silhouette as a proportion guide; block in independent limbs below it.
a=p.copy();mask=Image.new('L',a.size);d=ImageDraw.Draw(mask)
d.polygon([(0,0),(300,0),(300,130),(226,151),(185,133),(133,132),(80,139),(0,139)],fill=255)
a.putalpha(ImageChops.multiply(a.getchannel('A'),mask))
sheet=Image.new('RGBA',(1536,1024));D=ImageDraw.Draw(sheet)
for i in range(8):
 cv=Image.new('RGBA',(384,512));g=ImageDraw.Draw(cv);phase=i/8
 for name,root,base,offset,far in [('RH',(92,119),(92,188),.5,True),('RF',(211,119),(211,188),.75,True),('LH',(100,119),(100,194),0,False),('LF',(221,118),(221,194),.25,False)]:
  u=(phase-offset)%1;duty=.625
  if u<duty: dx=28-56*u/duty;lift=0
  else:v=(u-duty)/(1-duty);dx=-28+56*v;lift=20*math.sin(math.pi*v)
  foot=(base[0]+dx,base[1]-lift);knee=((root[0]+foot[0])*.5+(-8 if 'F' in name else 9),root[1]+(foot[1]-root[1])*.55)
  pts=[(x+40,y+140) for x,y in [root,knee,foot]]
  g.line(pts,fill='#603d25',width=23,joint='curve');g.line(pts,fill='#c38b5b' if far else '#e7a666',width=19,joint='curve')
  fx,fy=pts[-1];g.ellipse((fx-10,fy-6,fx+12,fy+7),fill='#f3e8d8',outline='#603d25',width=2)
 cv.alpha_composite(a,(40,140));sheet.alpha_composite(cv,(i%4*384,i//4*512))
sheet.save('tools/cats-qa/generated/walk-side-guide.png')
