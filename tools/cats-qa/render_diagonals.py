#!/usr/bin/env python3
"""Render the final five close-ups and an entirely fresh orange owner reel.
Every capture streams PNGs to ffmpeg, deleting each raw image immediately.
"""
import os,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt';temp=OUT/'diagonal-render'
for coat in ['orange','black','grey','calico','siamese']:
    subprocess.run(['df','-h','/'],check=True)
    if shutil.disk_usage('/').free<5*1024**3:raise SystemExit('Under 5 GiB; stopped')
    subprocess.run([sys.executable,str(ROOT/'tools/cats-qa/video.py'),coat,'12','diagonals'],env={**os.environ,'OUT':str(temp),'END':'20','START':'0','FPS':'30'},check=True)
    for ext in ['mp4','json']:shutil.copyfile(temp/f'diagonals-{coat}-h12.{ext}',OUT/f'diagonals-{coat}.{ext}')
    subprocess.run([sys.executable,str(ROOT/'tools/cats-qa/diagonal_review.py'),str(OUT/f'diagonals-{coat}.mp4')],check=True)
for script,hour,end in [('showcase',12,41),('night',22,4)]:
    subprocess.run(['df','-h','/'],check=True)
    subprocess.run([sys.executable,str(ROOT/'tools/cats-qa/video.py'),'orange',str(hour),script],env={**os.environ,'OUT':str(temp/'full'),'END':str(end),'START':'0','FPS':'30'},check=True)
subprocess.run([sys.executable,str(ROOT/'tools/cats-qa/finish.py'),'--coats','orange','--fresh','--input-dir',str(temp/'full')],check=True)
subprocess.run([sys.executable,str(ROOT/'tools/cats-qa/diagonal_contacts.py')],check=True)
