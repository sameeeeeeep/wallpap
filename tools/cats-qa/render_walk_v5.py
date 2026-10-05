#!/usr/bin/env python3
"""Render isolated production WebKit into named v5 close-up / full-scene reels."""
import os,sys,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/cats-gpt'
mode=sys.argv[1];assert mode in ['close','full']
for coat in sys.argv[2:] or ['orange','black','grey','calico','siamese']:
 if shutil.disk_usage('/').free<5*1024**3:raise SystemExit('Under 5 GiB free; stopping renders')
 temp=OUT/'walk-v5-render'/mode
 subprocess.run([sys.executable,str(ROOT/'tools/cats-qa/video.py'),coat,'12','walk_v5'],check=True,env={**os.environ,'OUT':str(temp),'END':'20','FPS':'30','QA_FULL':'1' if mode=='full' else '0','WKSHOT_SNAPSHOT_WIDTH':'480'})
 for ext in ['mp4','json']:
  shutil.move(temp/f'walk_v5-{coat}-h12.{ext}',OUT/f'walk-v5-{coat}{"-full" if mode=="full" else ""}.{ext}')
 print('Completed',coat,mode,flush=True)
