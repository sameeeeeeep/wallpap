#!/usr/bin/env python3
"""Assert retained interaction coverage, exact landings and clean capture reports."""
import json,math,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def reports(path):
 return [json.loads(s[8:]) for s in path.read_text().splitlines() if s.startswith('result: ')]
out={'pointer_runs':{},'angle_runs':{},'smoke_runs':{},'frames':0,'max_landing_error':0}
for scene in ['cats','speakeasy']:
 for light in ['day','night']:
  key=scene+'/'+light;rows=reports(ROOT/f'shots/follow/{key}.log');assert len(rows)==80,key
  assert all(not r['errors'] and not r['report']['errors'] and not r['report']['bad'] for r in rows),key
  q=rows[-1]['report'];c=q['coverage'];frames={f for v in c.values() for f in v['frames'] if f}
  for prefix in ['walk-','walk-f-','walk-b-','run-','run-f-','run-b-','stalk-','hunt-','pounce-','pounce-f-','pounce-b-','perk-','turn-f-','turn-b-']:
   assert any(f.startswith(prefix) for f in frames),(key,prefix)
  landings=[]
  for phase in ['4','5','6']:
   assert c[phase]['landings'],(key,phase,'no landing')
   for v in c[phase]['landings']:
    error=math.dist(v['target'],v['land']);assert error<2;(landings.append(error))
  assert 2 in c['7']['picks'] and 1 in c['8']['picks'] and 0 in c['9']['picks'],key
  assert 'wait' in c['9']['states'],key
  assert any(e['kind']=='pause' and e['picks']==0 for e in q['events']),key
  out['pointer_runs'][key]={'frames':len(rows),'landings':len(landings),'max_error':max(landings),'overlaps':0,'errors':0}
  out['max_landing_error']=max(out['max_landing_error'],*landings);out['frames']+=len(rows)
  rows=reports(ROOT/f'shots/follow-angles/{key}.log');assert len(rows)==30,key
  assert all(not r['errors'] and not r['report']['errors'] and not r['report']['bad'] for r in rows)
  out['angle_runs'][key]={'frames':len(rows),'errors':0};out['frames']+=len(rows)
for path in (ROOT/'shots/follow/smoke').glob('*.log'):
 rows=reports(path);assert len(rows)==6,path
 assert all(not r['errors'] and not r['report']['bad'] for r in rows)
 q=rows[-1]['report'];assert q['events'][0]['picked'] and not q['events'][-1]['picked']
 assert math.dist(q['start'],[q['pet']['x'],q['pet']['y']])>10,path
 out['smoke_runs'][path.stem]={'frames':6,'pick_release':True};out['frames']+=6
assert len(out['smoke_runs'])==8
assert not list((ROOT/'shots/follow').rglob('*.png')) and not list((ROOT/'shots/follow-angles').rglob('*.png'))
out['free_gib']=round(shutil.disk_usage('/').free/1024**3,2);assert out['free_gib']>=3
(ROOT/'shots/follow/acceptance.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
