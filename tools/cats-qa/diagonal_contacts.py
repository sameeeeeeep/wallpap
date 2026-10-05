#!/usr/bin/env python3
"""Small encoded-frame contacts, eight poses per corrected view and coat."""
import json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt'
for coat in ['orange','black','grey','calico','siamese']:
 video=OUT/f'diagonals-{coat}.mp4';records=json.loads(video.with_suffix('.json').read_text())
 selected={};seen=set()
 for i,r in enumerate(records):
  if r['pass'] not in [0,3] or r['pose'] in seen:continue
  seen.add(r['pose']);selected[i]=(0 if r['pass']==0 else 1,int(r['pose'].split('-')[-1])-1)
 assert len(selected)==16
 page=Image.new('RGB',(1600,528),'#dce3e5');proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(video),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
 for i,r in enumerate(records):
  buf=proc.stdout.read(960*600*3);assert len(buf)==960*600*3
  if i not in selected:continue
  row,col=selected[i];im=Image.frombytes('RGB',(960,600),buf).crop((270,90,690,590)).resize((200,238),Image.Resampling.LANCZOS);page.paste(im,(col*200,row*264+26));ImageDraw.Draw(page).text((col*200+4,row*264+7),f"{coat} {r['pose']} f{i}",fill='black')
 assert proc.wait()==0
 page.save(OUT/f'diagonals-{coat}-contact.jpg',quality=92)
