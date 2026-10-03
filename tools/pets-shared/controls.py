#!/usr/bin/env python3
import subprocess,json,shutil,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
for scene in sys.argv[1:] or ['cats','cafe','records','ramen','rooftop','speakeasy','cabin','grass']:
 if shutil.disk_usage('/').free<3*1024**3:raise RuntimeError('Disk stop')
 js="""console.error=(...a)=>{const s=a.map(e=>String(e)+' '+(e?.stack||'')).join(' ');if(!__errs.includes(s))__errs.push(s)};
 window.__shotReady=()=>{
 let seed=7;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const P=__pets;LW.advance(.1);P.reset();let bad=[],stats={};const tick=n=>{for(let i=0;i<n*30;i++){LW.advance(1/30);const a=P.overlaps();if(a.length&&bad.length<10)bad.push(a)}};
 tick(10);for(const a of ['stretch','water','feed','toy'])LW.emit('action',a);tick(10);
 LW.set('pets',false);tick(100);stats.off=P.items.map(p=>({id:p.rosterId,away:p.away,state:p.state,x:p.x,y:p.y,surf:p.surf,mission:p.mission,goal:p.goal,path:p.path}));
 LW.set('pandas',1);LW.emit('action','water');LW.emit('calm',true);tick(2);stats.stillOff=P.items.every(p=>p.away);
 LW.emit('calm',false);LW.set('pets',true);LW.set('pandas',3);tick(50);stats.on=P.items.map(p=>({id:p.rosterId,away:p.away,state:p.state,x:p.x,y:p.y,surf:p.surf,mission:p.mission,goal:p.goal}));
 LW.setEnv({weather:'rain'});tick(12);stats.rain=P.items.map(p=>({id:p.rosterId,state:p.state,goal:p.goal}));
 window.__controlReport={stats,bad,errors:__errs};};window.__shotReport=()=>__controlReport;"""
 out=root/f'shots/pets-shared/{scene}/controls';r=subprocess.run([str(root/'tools/wkshot'),f'http://localhost:5210/{scene}.html?virtual=1&muted=1&hour=12',str(out)+'.png','1000','625','0',js],text=True,capture_output=True)
 out.with_suffix('.log').write_text(r.stdout+r.stderr);reports=[json.loads(s[8:]) for s in r.stdout.splitlines() if s.startswith('result: ')];print(scene,reports[-1] if reports else r.stdout+r.stderr,flush=True)
 p=Path(str(out)+'.png')
 if p.exists():
  im=Image.open(p);im.thumbnail((1000,625));im.convert('RGB').save(str(out)+'.jpg',quality=86);p.unlink()

 if not reports:raise AssertionError(f'{scene}: no control report')
 report=reports[-1];q=report.get('report',{})
 assert r.returncode==0 and not report.get('errors') and not q.get('errors') and not q.get('bad'), report
 assert q['stats']['stillOff'] and all(p['away'] for p in q['stats']['off']), report
 assert all(not p['away'] for p in q['stats']['on']), report
