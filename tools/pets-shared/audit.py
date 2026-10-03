#!/usr/bin/env python3
"""Verify retained captures and write the acceptance index; never substitutes for looking."""
import json,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'shots/pets-shared'
scenes=['cats','cafe','records','ramen','rooftop','speakeasy','cabin','grass'];summary={}
def reports(p):
 a=[json.loads(s[8:]) for s in p.read_text().splitlines() if s.startswith('result: ')]
 assert a,p
 for q in a:
  assert not q.get('errors'),(p,q)
  q=q.get('report',{})
  assert not q.get('errors') and not q.get('bad') and not q.get('overlaps'),(p,q)
 return [q['report'] for q in a]
for scene in scenes:
 d=out/scene
 for label in ['day','night']:
  assert len(reports(d/(label+'.log')))==29
  assert (d/(label+'-contacts.jpg')).exists()
 assert len(reports(d/'wide-left-night.log'))==3
 c=reports(d/'controls.log')[-1]['stats']
 assert c['stillOff'] and all(p['away'] for p in c['off']),scene
 assert all(not p['away'] for p in c['on']),scene
 summary[scene]={'motionFrames':58,'wideFrames':3,'toggle':'passed','errors':0,'overlaps':0}
for label in ['day','night']:assert len(reports(out/'cats'/('calico-takeoff-'+label+'.log')))==9
assert not list(out.rglob('*.png')),'Raw PNGs remain'
size=sum(p.stat().st_size for p in out.rglob('*') if p.is_file());assert size<1024**3
assert shutil.disk_usage('/').free>=3*1024**3
perf=json.loads((out/'performance.json').read_text())
(out/'audit.json').write_text(json.dumps({'frames':506,'evidenceMiB':round(size/1024**2,2),'scenes':summary},indent=2)+'\n')
rows=[]
for scene in scenes:
 p=perf['results'][scene];a,b=p['before']['medianMs'],p['after']['medianMs'];rows.append(f'| {scene} | {a:.3f} | {b:.3f} | {(b/a-1)*100:+.1f}% |')
text='''# Shared pets — local acceptance, 2026-10-04

All eight pet scenes use one runtime and roster. Golden and corgi have new front/back
walks (8 frames/view) and jumps (5 frames/view); existing side jumps are retained.
Pandas remain private to Grass and travel laterally only.

506 captured sequence frames: 16 day/night runs × 29 frames, 2 exact-calico runs × 9,
and 8 ultrawide/left-widget runs × 3. Contact sheets were opened and visually inspected.
`node --test tests/*.cjs`: 60 passing (see tests.log).
Captured reports contain no JS errors or detected pet overlaps. Eight control runs
verify leaving, staying off through reminders/count changes, returning and rain.

Per scene, open `day-contacts.jpg` / `night-contacts.jpg` for close-ups and `day-0.jpg`
through `day-4.jpg` (also night) for full composition. These show lateral/toward/away
walking, three jump views, linked perch jumps, encounters and resting prop occlusion.
Panda depth requests deliberately remain lateral. Pets pass in wide lanes and wait in
narrow ones; the unit suite separately requires a same-lane crossing to finish.
`cats/calico-takeoff-{day,night}.jpg` shows 0.00s/0.20s at identical takeoff scale and
correct foreground bowl order after landing. `wide-left-night.jpg` covers each scene's
ultrawide placement/mirroring without duplicated animals.

Frame timing uses the pre-migration scene and pet-motion.js at `03719de`, fixed noon,
1200×750, 90 warm-up frames, then seven 90-frame batches with canvas/GL completion.
These are median elapsed milliseconds per simulated frame, not installed-app FPS.
Raw samples and method details: `performance.json`, `../../tools/pets-shared/README.md`.

| Scene | Before ms | After ms | Change |
|---|---:|---:|---:|
'''+ '\n'.join(rows)+f'''

Evidence footprint: {size/1024**2:.1f} MiB; raw capture PNGs removed. Disk stayed above
3 GiB free. `audit.json` records completeness. Reproduce with `tools/pets-shared/`.
No app build/install/relaunch, host Swift changes, push or release was performed.
'''
(out/'README.md').write_text(text)
print(text)
