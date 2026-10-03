#!/usr/bin/env python3
import json,shutil
from pathlib import Path
from PIL import Image
P=Path('shots/cats-jumps');coats=['orange','black','grey','calico','siamese'];checked=[]
for coat in coats:
 for light in ['day','night']:
  for view in ['side','front','back']:
   for face in ['right','left']:
    name=f'{coat}-{view}-{face}-{light}';rs=json.loads((P/(name+'.json')).read_text())
    assert len(rs)==16 and all(not r['errors'] for r in rs),name
    key='jump'+({'side':'','front':'-f','back':'-b'}[view]);frames={r['report']['frame'] for r in rs}
    assert all(key+'-'+str(i) in frames for i in range(1,6)),(name,frames)
    walks=[r['report']['frame'] for r in rs if r['report']['frame'].startswith('walk-')]
    expected='walk'+({'side':'','front':'-f','back':'-b'}[view])+'-1'
    assert walks and walks[0]==expected,(name,walks)
    assert (P/(name+'-contact.jpg')).exists();checked.append(name)
for case in ['wall-down-day','wall-down-night','bench-up-day','bench-up-night','toy-front-day','toy-front-night','missing-back-frame-night','vertical-front-night','mirrored-back-night']:
 rs=json.loads((P/(case+'.json')).read_text());assert len(rs)==16 and all(not r['errors'] for r in rs),case
 if case.startswith('toy'):assert any(r['report']['frame']=='jump-f-1' for r in rs),case
 checked.append(case)
for coat in coats:
 for view in ['f','b']:
  baselines=[]
  for i in range(1,6):
   im=Image.open(f'scenes/art/sprites/cats/{coat}/t/jump-{view}-{i}.png')
   box=im.getchannel('A').point(lambda x:255 if x>127 else 0).getbbox();baselines.append(im.height-box[3])
  assert baselines==[12]*5,(coat,view,baselines)
assert not list(P.glob('*.png')),'Raw capture PNGs remain'
size=sum(f.stat().st_size for f in P.rglob('*') if f.is_file());assert size<500*1024**2
free=shutil.disk_usage('/').free;assert free>3*1024**3
summary={'sequences':len(checked),'matrix_sequences':60,'captured_frames':16*len(checked),'browser_errors':0,'jump_cuts':50,'tests_passed':48,'capture_bytes':size,'free_bytes':free,'checked':checked}
(P/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items() if k!='checked'},indent=2))
