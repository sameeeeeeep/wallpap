#!/usr/bin/env python3
"""Decode every 30 fps frame; retain every frame of one complete cycle per heading.
Review pages contain consecutive frames, including repeated exposures, never pose dedupes.
"""
import json,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
video=Path(sys.argv[1]);records=json.loads(video.with_suffix('.json').read_text());out=video.parent/(video.stem+'-review');out.mkdir(exist_ok=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=nb_frames,r_frame_rate,duration','-of','json',str(video)]))['streams'][0]
assert probe['r_frame_rate']=='30/1' and int(probe['nb_frames'])==600 and len(records)==600
selected={};checks=[]
for passno in range(12):
 rows=[(i,r) for i,r in enumerate(records) if r['pass']==passno];moving=[(i,r) for i,r in rows if r['state']=='move'];assert moving
 assert all(not r['errors'] and not r['turn'] for i,r in rows)
 assert len({(r['view'],r['dir']) for i,r in moving})==1
 poses={r['pose'] for i,r in moving};assert len(poses)==8,(passno,poses)
 assert max(abs((r['xy'][1]-moving[0][1]['xy'][1])) for i,r in moving)>10
 if passno<4:
  wraps=[i for (j,a),(i,b) in zip(moving,moving[1:]) if b['phase']<a['phase']]
  assert wraps,(passno,wraps)
  # Include a full period plus the repeated first exposure, even when the cat
  # arrives before a second wrap. This includes every 30 Hz held exposure.
  end=next(i for i,r in moving if i>wraps[0] and r['phase']>=moving[0][1]['phase'])
  indices=list(range(moving[0][0],end+1))
 elif passno>=8:
  # Full cycle from the initial phase through the first wrap (one-second shots).
  indices=[]
  for j,(i,r) in enumerate(moving):
   indices.append(i)
   if j and r['phase']<moving[j-1][1]['phase']:break
 else:indices=[]
 for i in indices:selected[i]=passno
 checks.append({'pass':passno,'label':rows[0][1]['label'],'frames':len(rows),'movingFrames':len(moving),'poses':sorted(poses),'reviewFrames':indices,'stableView':True,'noTurns':True})
proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(video),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
pages={};counts={};W,H=960,600;cw,ch=300,381
for i,r in enumerate(records):
 buf=proc.stdout.read(W*H*3);assert len(buf)==W*H*3
 if i not in selected:continue
 p=selected[i];n=counts.get(p,0);page=n//16;idx=n%16
 if idx==0:pages[p]=Image.new('RGB',(1200,ch*4),'#dce3e5')
 im=Image.frombytes('RGB',(W,H),buf).crop((270,90,690,590)).resize((300,357),Image.Resampling.LANCZOS)
 x=idx%4*cw;y=idx//4*ch;pages[p].paste(im,(x,y+24));ImageDraw.Draw(pages[p]).text((x+4,y+5),f"{i:03} {r['time']:.3f} {r['pose']} {r['phase']:.3f}",fill='black');counts[p]=n+1
 if idx==15 or i==checks[p]['reviewFrames'][-1]:pages[p].save(out/f'pass-{p:02}-{page}.jpg',quality=92)
assert proc.wait()==0
result={'video':video.name,'decodedFrames':600,'fps':30,'seconds':20,'passes':checks,'review':'Consecutive decoded full-rate frames; visual findings are recorded in diagonal-review.md.'}
video.with_name(video.stem+'-quality.json').write_text(json.dumps(result,indent=2)+'\n');print(out)
