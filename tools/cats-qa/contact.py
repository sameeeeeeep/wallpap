#!/usr/bin/env python3
"""Owner contact sheets: actual runtime anchors/scale, eight directions and every action."""
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt'
views=['side','near','toward','near','side','far','away','far'];names=['RIGHT','TOWARD-RIGHT','TOWARD','TOWARD-LEFT','LEFT','AWAY-LEFT','AWAY','AWAY-RIGHT']
for coat in ['orange','black','grey','calico','siamese']:
 p=ROOT/f'scenes/art/sprites/cats/{coat}/atlas/manifest.json'
 if not p.exists():continue
 data=json.loads(p.read_text());unit=78/sorted(r[3] for r in data['walk-side']['frames'])[4]
 sheet=Image.new('RGB',(1600,1010),'#d9e2e1');d=ImageDraw.Draw(sheet);d.text((20,10),coat.upper()+' - PAINTED MOTION / all eight floor directions',fill='#14212a')
 def draw(key,i,col,row,label,flip=False):
  c=data[key];x,y,w,h,ax,ay=c['frames'][i];im=Image.open(ROOT/'scenes'/c['src']).convert('RGBA').crop((x,y,x+w,y+h));scale=unit*1.2
  im=im.resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS)
  if flip:im=ImageOps.mirror(im);ax=w-ax
  xx=col*200;yy=row*235+35;d.rectangle((xx,yy,xx+199,yy+234),fill='#d9e2e1' if (col+row)%2==0 else '#24303b');color='#14212a' if (col+row)%2==0 else '#fff';d.text((xx+8,yy+8),label,fill=color)
  d.line((xx+12,yy+211,xx+188,yy+211),fill='#8d999d',width=1);sheet.paste(im,(round(xx+100-ax*scale),round(yy+210-ay*scale)),im)
 for row,(action,i) in enumerate([('walk',2),('run',2),('jump',4)]):
  for col,view in enumerate(views):draw(action+'-'+view,i,col,row,action.upper()+' '+names[col],2<col<6)
 for col,(key,i,label) in enumerate([('sit',7,'FRONT SIT'),('rest',7,'CURLED SLEEP'),('rest',4,'LOAF'),('perk',4,'CLICK PERK'),('stretch',3,'STRETCH'),('sit',3,'STAND to SIT'),('rest',2,'SIT to SLEEP'),('walk-toward',0,'FRONT STAND')]):draw(key,i,col,3,label)
 sheet.save(OUT/f'{coat}-contact.jpg',quality=92)
