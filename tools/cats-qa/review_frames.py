#!/usr/bin/env python3
"""Decode every encoded frame; paginate all frames or distinct states with --poses.
Raw pixels stream through memory and are never written as PNGs.
"""
import sys,json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
video=Path(sys.argv[1]);reports=json.loads(video.with_suffix('.json').read_text());unique='--poses' in sys.argv;out=video.parent/(video.stem+('-poses' if unique else '-frames'));out.mkdir(exist_ok=True)
proc=subprocess.Popen(['ffmpeg','-v','error','-i',str(video),'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
page=None;count=0;W,H=960,600;seen=set();columns=6 if unique else 5;rows=5 if unique else 4;cw=250 if unique else 300;ch=round(cw*1.05)+25;perpage=columns*rows
for i,r in enumerate(reports):
 buf=proc.stdout.read(W*H*3)
 if len(buf)!=W*H*3:raise RuntimeError(f'Missing encoded frame {i}')
 key=(r['label'],r['pose'],r.get('dir'),r.get('lighting'),r.get('follow'))
 if unique and key in seen:continue
 seen.add(key)
 im=Image.frombytes('RGB',(W,H),buf)
 camera=r.get('camera',[460,700] if 'PARAPET' in r['label'] else [590,855]);x=480+(r['xy'][0]-camera[0])*2;y=490+(r['xy'][1]-camera[1])*2
 im=im.crop((round(x-200),round(y-300),round(x+200),round(y+120))).resize((cw,ch-25),Image.Resampling.LANCZOS)
 if count%perpage==0:page=Image.new('RGB',(columns*cw,rows*ch),'#eee')
 xx=count%columns*cw;yy=count%perpage//columns*ch;page.paste(im,(xx,yy+25));d=ImageDraw.Draw(page);d.text((xx+3,yy+4),f"{i:04} {r['time']:5.2f} {r['pose']}",fill='black')
 if count%perpage==perpage-1:page.save(out/f'{count//perpage:03}.jpg',quality=88)
 count+=1
if count%perpage:page.save(out/f'{count//perpage:03}.jpg',quality=88)
assert proc.wait()==0
print('decoded',len(reports),'frames; paginated',count,'frames to',out)
