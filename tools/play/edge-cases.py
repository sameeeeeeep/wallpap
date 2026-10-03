#!/usr/bin/env python3
import json,subprocess,shutil
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/play';tiles=[];reports=[]
cases=[('left','cats',1600,1000,False),('ultrawide-left','cats',3440,1440,False),('small','koi',1024,768,False),('paused-reduced','train',1600,1000,True)]
for label,scene,w,h,paused in cases:
 if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: disk below 3 GB')
 js=r"""
__shotPending=true;let ticks=0,phase=0;const failures=[];__lw('focus',!PAUSED);__lw('play',{open:true,reduceMotion:true,theme:'light'});
__shotPoll=()=>{if(!window.PlayShell)return;
 if(phase===0&&PlayShell.state.open){const panel=document.querySelector('.play-panel');panel.style.animation='none';PlayShell.layout();const [x,y,w,h]=LW.playRect,[a,b]=LW.layout.clear;if(x<a*innerWidth-1||x+w>b*innerWidth+1)failures.push('Widget overlap');if(!LW.focused)failures.push('Play did not resume');LW.advance(.5);phase=1;}
 if(phase===1&&++ticks>3){
  // Native immediate close must also finish an already-started animated close safely.
  PlayShell.close();PlayShell.close(true);if(LW.playOpen)failures.push('Close did not clear state');if(PAUSED&&LW.focused)failures.push('Prior pause did not return');if(LW.playRect)failures.push('Occluder leaked');phase=2;__lw('play',{open:true,reduceMotion:true,theme:'light'});
 }
 if(phase===2&&PlayShell.state.open&&++ticks>8){document.querySelector('.play-panel').style.animation='none';PlayShell.layout();LW.advance(1);__shotPending=false;}
};__shotReport=()=>({failures,state:PlayShell.state,focused:LW.focused,clear:LW.layout.clear,reduce:document.querySelector('#wallpap-play')?.dataset.reduce,petBoxes:window.__pets?.panelBoxes()});
""".replace('PAUSED',str(paused).lower())
 raw=OUT/(label+'.png');url=f'http://localhost:5217/{scene}.html?virtual=1&muted=1&hour=12&side={"left" if "left" in label else "right"}'
 r=subprocess.run([str(ROOT/'.build/wkshot-play'),url,str(raw),str(w),str(h),'2',js],cwd=ROOT,text=True,capture_output=True,timeout=60);record={'name':label,'exit':r.returncode};reports.append(record)
 for line in r.stdout.splitlines():
  if line.startswith('result: '):record.update(json.loads(line[8:]))
 print(json.dumps(record),flush=True)
 if raw.exists():
  im=Image.open(raw).convert('RGB');im.thumbnail((1000,560));tile=Image.new('RGB',(1000,588),'#edf1e8');tile.paste(im,((1000-im.width)//2,28));ImageDraw.Draw(tile).text((10,8),label,fill='#233e34');tiles.append(tile);raw.unlink()
if tiles:
 sheet=Image.new('RGB',(2000,588*((len(tiles)+1)//2)),'#edf1e8')
 for i,t in enumerate(tiles):sheet.paste(t,((i%2)*1000,(i//2)*588))
 sheet.save(OUT/'edge-cases.jpg',quality=83)
(OUT/'edge-cases.json').write_text(json.dumps(reports,indent=2)+'\n')
if any(r['exit'] or r.get('errors') or r.get('report',{}).get('failures') for r in reports):raise SystemExit(1)
