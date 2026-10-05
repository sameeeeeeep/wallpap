#!/usr/bin/env python3
"""Decode all encoded frames; save pose pages and uninterrupted 30fps cycles."""
from pathlib import Path
import sys,json,subprocess,math
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt'
coat=sys.argv[1];full='--full' in sys.argv
name=f'walk-v5-{coat}'+('-full' if full else '');video=OUT/(name+'.mp4');reports=json.loads(video.with_suffix('.json').read_text())
out=OUT/'walk-v5-review'/name;out.mkdir(parents=True,exist_ok=True)
proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(video),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
frames=[];unique=[];seen=set()
for i,r in enumerate(reports):
 buf=proc.stdout.read(960*600*3);assert len(buf)==960*600*3,(name,i)
 im=Image.frombytes('RGB',(960,600),buf)
 # Include the whole cat and nearby tile edges in a fixed crop, with no pose-dependent camera.
 if not full:im=im.crop((140,90,820,580))
 im.thumbnail((280,202) if not full else (420,263));frames.append(im)
 key=(r['label'],r['pose'],r['dir'])
 if key not in seen:unique.append(i);seen.add(key)
assert proc.stdout.read(1)==b'' and proc.wait()==0

def page(indices,prefix,cols=6,rows=4):
 cw,ch=(280,224) if not full else (420,288);per=cols*rows
 for start in range(0,len(indices),per):
  group=indices[start:start+per];canvas=Image.new('RGB',(cw*cols,ch*math.ceil(len(group)/cols)),'#edf0ed');d=ImageDraw.Draw(canvas)
  for j,i in enumerate(group):
   x=j%cols*cw;y=j//cols*ch;r=reports[i]
   canvas.paste(frames[i],(x,y+22));d.text((x+4,y+4),f'{i:03} {i/30:.2f}s {r["pose"]} {r["dir"]:+}',fill='black')
  canvas.save(out/f'{prefix}-{start//per:02}.jpg',quality=90)
if full:
 page([0,60,120,180,240,300,360,420,465,500,535,580],'overview',3,4)
else:
 page(unique,'poses')
 if coat in ['orange','calico']:
  for view,passid in [('side',0),('near',1),('toward',2),('far',5),('away',6)]:
   ids=[i for i,r in enumerate(reports) if r['pass']==passid and r['time']<14.4 and not r['turn']]
   start=ids[0];phase=reports[start]['phase'];end=next((i for i in ids[1:] if reports[i]['phase']<reports[i-1]['phase']),ids[-1])
   page(list(range(start,end+1)),'continuous-'+view,6,6)
(out/'index.json').write_text(json.dumps({'video':video.name,'decodedFrames':len(frames),'poseFrames':unique,'continuousViews':['side','near','toward','far','away'] if coat in ['orange','calico'] and not full else []},indent=2)+'\n')
print(name,'decoded',len(frames),'unique poses',len(unique),out)
