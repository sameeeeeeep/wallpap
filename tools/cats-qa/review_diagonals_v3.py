#!/usr/bin/env python3
"""Decode the actual MP4; save all 30 exposures of each diagonal cycle and strips."""
import json,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt'
for coat in sys.argv[1:] or ['orange','black','grey','calico','siamese']:
 name='diagonals-v3-'+coat;report=json.loads((OUT/(name+'.json')).read_text());review=OUT/(name+'-frames');review.mkdir(exist_ok=True)
 proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(OUT/(name+'.mp4')),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE);frames={};count=0
 while True:
  data=proc.stdout.read(1260*600*3)
  if not data:break
  assert len(data)==1260*600*3
  if count<31 or 225<=count<256:frames[count]=Image.frombytes('RGB',(1260,600),data)
  count+=1
 proc.wait();assert proc.returncode==0 and count==len(report)
 for j,view in [(1,'near'),(2,'far')]:
  page=Image.new('RGB',(1440,1250),'#edf0ed');d=ImageDraw.Draw(page)
  for i in range(30):
   p=frames[i].crop((j*420,155,(j+1)*420,495)).resize((240,195),Image.Resampling.LANCZOS);x=i%6*240;y=i//6*250
   page.paste(p,(x,y+30));d.text((x+6,y+8),f'{coat} {view} t={i}/30 '+report[i]['poses'][j]['pose'],fill='black')
  page.save(review/(view+'-30fps.jpg'),quality=94)
  if count>=255:
   for i in range(30):
    index=225+i;p=frames[index].crop((j*420,155,(j+1)*420,495)).resize((240,195),Image.Resampling.LANCZOS);x=i%6*240;y=i//6*250
    page.paste(p,(x,y+30));d.rectangle((x,y,x+240,y+29),fill='#edf0ed');d.text((x+6,y+8),f'{coat} mirrored {view} video {index}',fill='black')
   page.save(review/(view+'-mirrored-30fps.jpg'),quality=94)
 strip=Image.new('RGB',(2240,590),'#e3e9e6');d=ImageDraw.Draw(strip)
 for row,j in enumerate([1,2]):
  for n in range(8):
   i=next(i for i in range(30) if report[i]['poses'][j]['pose'].endswith('-'+str(n+1)))
   p=frames[i].crop((j*420,150,(j+1)*420,535)).resize((280,257),Image.Resampling.LANCZOS);x=n*280;y=row*295;strip.paste(p,(x,y+25));d.text((x+6,y+7),report[i]['poses'][j]['pose']+f' | video {i}',fill='black')
 strip.save(OUT/(name+'-strip.jpg'),quality=95)
 quality={'encodedFrames':count,'fps':30,'durationSeconds':count/30,'decodedAllFrames':True,'cycleReviewedFrames':[0,29],'mirrorCycleReviewFrames':[225,254] if count>=255 else None,'views':['side','near','far'],'phaseComparison':'Equal one-second cycles; each panel travels at its own calibrated stride.','errors':[]}
 assert all(len(z['poses'])==3 and not z['errors'] for z in report)
 for j in range(3):assert len(set(z['poses'][j]['pose'] for z in report[:30]))==8
 (OUT/(name+'-quality.json')).write_text(json.dumps(quality,indent=2)+'\n')
 print(name,count,'decoded')
