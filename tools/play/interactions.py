#!/usr/bin/env python3
"""Real sandboxed-frame interactions; no network or native app activation."""
import json,subprocess,shutil
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/play';reports=[];tiles=[]
frame=r"""
let qaPhase=0,qaBusy=false;const qaTimes=[],qaScriptTimes=[],qaFailures=[];let qaSecurity=null;
addEventListener('message',e=>{if(e.source===parent&&e.data?.qaFault)parent.postMessage({wallpapCard:1,op:'failed'},'*');});
const check=(yes,label)=>{if(!yes)qaFailures.push(label);};
function timed(fn){void document.body.offsetHeight;const t=performance.now();fn();qaTimes.push(performance.now()-t);}
addEventListener('message',async e=>{if(e.source!==parent||!e.data?.qaTick||!document.querySelector('#day')?.textContent||qaBusy)return;qaBusy=true;
try{const $=s=>document.querySelector(s);if(qaPhase===0){
 for(const [el,prop] of [[$('#grid'),'onkeydown'],[$('#submit'),'onclick'],[$('#reveal'),'onclick']]){if(!el||!el[prop])continue;const original=el[prop];el[prop]=function(e){const start=performance.now();try{return original.call(this,e);}finally{qaScriptTimes.push(performance.now()-start);}};}

 let originBlocked=false,cookieBlocked=false;try{void parent.document.body}catch{originBlocked=true;}try{cookieBlocked=!document.cookie.includes('wallpap_qa_cookie');document.cookie='wallpap_qa_escape=1';cookieBlocked=cookieBlocked&&!document.cookie.includes('wallpap_qa_escape');}catch{cookieBlocked=true;}let feedBlocked=false,linkBlocked=false,eventBlocked=false;try{await card.feed('unapproved')}catch{feedBlocked=true;}try{await card.open('https://example.test/evil')}catch{linkBlocked=true;}try{await card.event('free_form')}catch{eventBlocked=true;}
 qaSecurity={originBlocked,cookieBlocked,feedBlocked,linkBlocked,eventBlocked};Object.entries(qaSecurity).forEach(([k,v])=>check(v,k));
 await card.save('qa_probe',{value:'local only'});check((await card.load('qa_probe')).value==='local only','SDK save/load round trip');
 if($('#guess')){
  $('#guess').value='AB';$('#submit').click();check($('#notice').textContent.includes('five'),'word length error');
  $('#guess').value='ZZZZZ';$('#submit').click();check($('#notice').textContent.includes('dictionary'),'unknown word error');
  const a=CARD_DATA.words.answers[PlayCore.dailyIndex(card.today(),CARD_DATA.words.answers.length)];$('#guess').value=['CLOUD','APPLE'].find(x=>x!==a);timed(()=>$('#submit').click());
 }else{
  const p=CARD_DATA['2026'][PlayCore.dailyIndex(card.today(),365)],first=p.entries[0].cells[0],inputs=[...document.querySelectorAll('#grid [data-cell]')],grid=$('#grid');grid.focus();const before=grid.getAttribute('aria-activedescendant');timed(()=>grid.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));check(grid.getAttribute('aria-activedescendant')!==before,'arrow navigation');
  timed(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true})));timed(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true})));$('#square').click();check($('#notice').textContent.includes('need another look'),'check square');$('#word').click();check($('#notice').textContent.includes('need another look'),'check word');$('#puzzle').click();check($('#notice').textContent.includes('need another look'),'check puzzle');timed(()=>$('#reveal').click());check($('#notice').textContent.includes('assisted'),'reveal marks assisted');
 }
 }else if(qaPhase===2){
 if($('#guess')){const a=CARD_DATA.words.answers[PlayCore.dailyIndex(card.today(),CARD_DATA.words.answers.length)];$('#guess').value=a;timed(()=>$('#submit').click());}
 else{const p=CARD_DATA['2026'][PlayCore.dailyIndex(card.today(),365)];for(let i=0;i<25;i++){const cell=document.querySelector('#square-'+i);if(cell){cell.click();timed(()=>$('#grid').dispatchEvent(new KeyboardEvent('keydown',{key:p.solution[i],bubbles:true,cancelable:true})));}}}
 }else if(qaPhase>=7){
 check($('#result').textContent.length>0,'completion rendered');check(!!$('#ad').textContent,'completion sponsored row');const progress=await card.load('progress');check(progress.day===card.today(),'progress persisted');if($('#grid'))check(progress.assisted===true,'assisted persisted');
 parent.postMessage({qaDone:{failures:qaFailures,security:qaSecurity,scriptingMs:qaScriptTimes,scriptingMaxMs:Math.max(...qaScriptTimes),interactionMs:qaTimes,meanMs:qaTimes.reduce((a,b)=>a+b,0)/qaTimes.length,maxMs:Math.max(...qaTimes),body:document.body.innerText}},'*');
 }
 qaPhase++;
}catch(e){qaFailures.push(e.message);parent.postMessage({qaDone:{failures:qaFailures}},'*');}finally{qaBusy=false;}
});
"""
for id in ['word-of-the-day','crossword-of-the-day']:
 if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: disk below 3 GB')
 js=r"""
document.cookie='wallpap_qa_cookie=parent-only';__shotPending=true;let configured=false,qaDone=null,faultPhase=0,retryTicks=0,savedBeforeFault=null;addEventListener('message',e=>{if(e.source===document.querySelector('iframe')?.contentWindow&&e.data?.qaDone)qaDone=e.data.qaDone;});__lw('play',{open:true,theme:'light',pro:false});
__shotPoll=()=>{if(!window.PlayShell?.state.open)return;document.querySelector('.play-panel').style.animation='none';PlayShell.layout();if(!configured){configured=true;const id=ID;localStorage.removeItem('wallpap.play.'+id);const entry=PlayCatalog.find(e=>e.manifest.id===id);entry.html=entry.html.replace('</body>','<script>'+FRAME+'</scr'+'ipt></body>');PlayShell.openCard(id);}document.querySelector('iframe')?.contentWindow.postMessage({qaTick:true},'*');if(qaDone){if(faultPhase===0){savedBeforeFault=localStorage.getItem('wallpap.play.'+ID);faultPhase=1;document.querySelector('iframe')?.contentWindow.postMessage({qaFault:true},'*');}else if(faultPhase===1&&document.querySelector('[data-retry]')){qaDone.faultHandled=true;const entry=PlayCatalog.find(e=>e.manifest.id===ID);entry.html=entry.html.replace('<script>'+FRAME+'</scr'+'ipt>','');document.querySelector('[data-retry]').click();faultPhase=2;}else if(faultPhase===2&&document.querySelector('iframe')&&document.querySelector('main')?.getAttribute('aria-busy')!== 'true'&&++retryTicks>3){qaDone.retryReady=true;qaDone.progressSurvivedFault=localStorage.getItem('wallpap.play.'+ID)===savedBeforeFault;if(!qaDone.progressSurvivedFault)qaDone.failures.push('Progress changed during fault retry');__shotPending=false;LW.advance(1);}}};__shotReport=()=>({...qaDone,cookieEscape:document.cookie.includes('wallpap_qa_escape')});
""".replace('ID',json.dumps(id)).replace('FRAME',json.dumps(frame))
 raw=OUT/(id+'-interaction.png')
 r=subprocess.run([str(ROOT/'.build/wkshot-play'),'http://localhost:5217/cats.html?virtual=1&muted=1&hour=12',str(raw),'1600','1000','2',js],cwd=ROOT,text=True,capture_output=True,timeout=60)
 record={'card':id,'exit':r.returncode,'output':r.stdout};reports.append(record)
 for line in r.stdout.splitlines():
  if line.startswith('result: '):record.update(json.loads(line[8:]))
 print(json.dumps(record),flush=True)
 if raw.exists():
  im=Image.open(raw).convert('RGB');im=im.crop((432,888,1872,1928)).resize((720,520));tiles.append(im);raw.unlink()
if tiles:
 im=Image.new('RGB',(720*len(tiles),548),'#edf1e8');d=ImageDraw.Draw(im)
 for i,t in enumerate(tiles):im.paste(t,(720*i,28));d.text((720*i+10,8),reports[i]['card']+' · interaction + security checks',fill='#233e34')
 im.save(OUT/'interactions.jpg',quality=85)
(OUT/'interactions.json').write_text(json.dumps(reports,indent=2)+'\n')
if any(r['exit'] or r.get('errors') or r.get('report',{}).get('failures') for r in reports):raise SystemExit(1)
