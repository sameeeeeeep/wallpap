#!/usr/bin/env python3
"""Step native document scrolling in one WebKit session, then encode its snapshots."""
import os, subprocess, json, shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2]
os.chdir(root)
frames=root/'shots/hero/video-frames'
frames.mkdir(exist_ok=True)
subprocess.run(['swiftc','-O','-o','/tmp/wallpap-hero-record','tools/landing-hero/capture.swift','-framework','AppKit','-framework','WebKit'],check=True)
env={**os.environ, 'WKSHOT_FRAMES':','.join(str(i/12) for i in range(324)), 'WKSHOT_FRAME_JS':str(root/'tools/landing-hero/video-frame.js')}
with open('shots/hero/video-capture.log','w') as log:
 subprocess.run(['/tmp/wallpap-hero-record','http://127.0.0.1:5224/',str(frames/'scroll.png'),'1280','800','0'],env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
reports=[json.loads(l[8:]) for l in Path('shots/hero/video-capture.log').read_text().splitlines() if l.startswith('result: ')]
assert len(reports)==324
assert all(not r['errors'] and not r['report']['errors'] and r['report']['frames']<=1 for r in reports)
subprocess.run(['ffmpeg','-y','-framerate','12','-i',str(frames/'scroll-f%02d.png'),'-vf','scale=1280:800','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','shots/hero/hero-journey-end.mp4'],check=True,stdout=subprocess.DEVNULL,stderr=open('shots/hero/ffmpeg.log','w'))
# Retain contact-sheet frames, not hundreds of MB of intermediate PNGs.
from PIL import Image, ImageOps, ImageDraw
sheet=Image.new('RGB',(1280,5*225),'#f4f3ed')
for i,n in enumerate([0,26,45,66,87,108,129,150,171,192,213,234,255,276,312]):
 im=Image.open(frames/f'scroll-f{n:02}.png').convert('RGB');im.thumbnail((420,200));x=(i%3)*426;y=(i//3)*225;sheet.paste(im,(x,y));ImageDraw.Draw(sheet).text((x+8,y+202),f'{n/12:.1f}s',fill='#20382d')
sheet.save('shots/hero/video-contact.jpg',quality=90)
shutil.rmtree(frames)
