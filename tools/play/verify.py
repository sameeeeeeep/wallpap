#!/usr/bin/env python3
"""Off-screen WebKit QA. Local dev server 5217; JPEG sheets only; refuses low disk."""
import argparse,json,subprocess,shutil,sys,math,re
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'shots/play';OUT.mkdir(parents=True,exist_ok=True)
p=argparse.ArgumentParser();p.add_argument('--card');p.add_argument('--scene',choices=['cats','koi','train']);p.add_argument('--smoke',action='store_true');p.add_argument('--file',action='store_true');args=p.parse_args()
def disk():
 if shutil.disk_usage('/').free<3*1024**3:raise SystemExit('STOP: less than 3 GB free')
disk()
shot=ROOT/'.build/wkshot-play';source=ROOT/'tools/wkshot.swift'
if not shot.exists() or shot.stat().st_mtime<source.stat().st_mtime:
 shot.parent.mkdir(exist_ok=True)
 subprocess.run(['swiftc','-O','-o',str(shot),str(source),'-framework','AppKit','-framework','WebKit'],cwd=ROOT,check=True)
def setup(state,theme):
 card=args.card if state=='custom' else 'word-of-the-day' if state.startswith('word') else 'crossword-of-the-day' if state.startswith('crossword') else 'news' if 'news' in state else ''
 pro='pro' in state
 # Explicit fixture: no copied real headlines, no production allow-list changes.
 fixture={'id':'qa-news','outlet':'Fixture News','url':'https://example.test/rss','termsURL':'https://example.test/terms','termsChecked':'2026-10-04','linkHosts':['example.test']}
 items=[{'title':x,'source':'Fixture News','link':'https://example.test/'+str(i),'published':'2026-10-04T%02d:00:00Z'%(12-i)} for i,x in enumerate(['Test headline: a new footbridge opens by the river','Test headline: observatory shares its autumn programme','Test headline: library extends weekend opening hours','Test headline: wetland restoration reaches a new milestone','Test headline: neighbourhood gardens welcome volunteers'])]
 frame_script=r"""
const qaState=STATE,qaPro=PRO;let qaTicks=0;
addEventListener('message',async e=>{if(!e.data?.qaTick||e.source!==parent)return;
 const $=s=>document.querySelector(s);if(!$('#day')?.textContent&&!$('#list')&&qaState!=='custom')return;if(!document.documentElement.dataset.theme)return;
 if(++qaTicks===1&&$('#guess')&&qaState==='word-mid'){ $('#guess').value='CLOUD';$('#submit').click(); }
 if(++qaTicks<4)return;
 if(qaState==='news-ad')scrollTo(0,document.body.scrollHeight);const ad=$('#ad');const report={state:qaState,ad:!!ad?.textContent,body:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth+1,theme:document.documentElement.dataset.theme,cells:document.querySelectorAll('#grid [data-cell]').length};
 parent.postMessage({qaReport:report},'*');
});
""".replace('STATE',json.dumps(state)).replace('PRO',str(pro).lower())
 template = r"""
window.__shotPending=true;window.__qaErrors=[];window.__qa=null;window.__setupStage=0;window.__pollCount=0;
addEventListener('message',e=>{if(e.source===document.querySelector('#wallpap-play iframe')?.contentWindow&&e.data?.qaReport){__qa=e.data.qaReport;}});
__lw('play',{open:true,pro:PRO,theme:THEME});
window.__shotPoll=()=>{
 if(!window.PlayShell?.state.open)return;
 const panel=document.querySelector('.play-panel');panel.style.animation='none';PlayShell.layout();
 if(__setupStage===0){__setupStage=1;CUSTOM_ENTRY
  const day=PlayCore.today(),id=CARD,state=STATE;
  localStorage.removeItem('wallpap.play.hint');
  if(state==='home'){PlayShell.home();}
  if(id){const entry=PlayCatalog.find(x=>x.manifest.id===id);
   if(id==='word-of-the-day'){const data=JSON.parse(entry.html.split('const CARD_DATA=')[1].split(';</script>')[0]).words,answer=data.answers[PlayCore.dailyIndex(day,data.answers.length)];const guesses=state==='word-mid'?[]:state==='word-empty'?[]:['CLOUD',answer].filter((x,i,a)=>a.indexOf(x)===i);localStorage.setItem('wallpap.play.'+id,JSON.stringify({progress:{day,guesses},streak:{day,count:3}}));}
   if(id==='crossword-of-the-day'){const puzzles=JSON.parse(entry.html.split('const CARD_DATA=')[1].split(';</script>')[0])['2026'],p=puzzles[PlayCore.dailyIndex(day,puzzles.length)],complete=state!=='crossword-mid';localStorage.setItem('wallpap.play.'+id,JSON.stringify({progress:{day,entry:[...p.solution].map((c,i)=>c==='#'?'':complete||i<8?c:''),assisted:state==='crossword-assisted',done:complete},streak:{day,count:2}}));}
   if(id==='news'&&state!=='news-empty'){PlayFeeds=[FIXTURE];PlayFixtures={feeds:{'qa-news':{items:ITEMS,offline:state==='news-offline',updated:'2026-10-04T12:00:00Z'}}};entry.manifest.needs.network=['qa-news'];entry.html=entry.html.replace('"feeds":[]','"feeds":'+JSON.stringify(PlayFeeds));}
   entry.html=entry.html.replace('</body>','<script>'+FRAME_SCRIPT+'</scr'+'ipt></body>');PlayShell.openCard(id);
  }
 }
 if(++__pollCount>2){document.querySelector('#wallpap-play iframe')?.contentWindow.postMessage({qaTick:1},'*');}
 if((CARD===''&&__pollCount>3)||__qa){
  if(LW.advance)LW.advance(1);
  if(__qa?.overflow)__qaErrors.push('Card horizontal overflow');
  const needsAd=PRO?false:(STATE.includes('complete')||STATE==='crossword-assisted'||STATE.startsWith('news'));
  if(__qa&&__qa.ad!==needsAd)__qaErrors.push('Ad visibility mismatch');
  __shotPending=false;
 }
};
window.__shotReport=()=>({state:PlayShell.state,qa:__qa,errors:__qaErrors,clear:LW.layout.clear,pets:window.__pets?{rects:__pets.panelBoxes(),count:__pets.items.length}:null});
"""
 replacements={'CUSTOM_ENTRY':'','ENTRY_WORDS':json.dumps(json.loads((ROOT/'scenes/play/cards/word-of-the-day/data/words.json').read_text())),'ENTRY_CROSS':json.dumps(json.loads((ROOT/'scenes/play/cards/crossword-of-the-day/data/2026.json').read_text())),'FRAME_SCRIPT':json.dumps(frame_script),'FIXTURE':json.dumps(fixture),'ITEMS':json.dumps(items),'PRO':str(pro).lower(),'THEME':json.dumps(theme),'CARD':json.dumps(card),'STATE':json.dumps(state)}
 if state=='custom':
  folder=ROOT/'scenes/play/cards'/card;data={f.stem:json.loads(f.read_text()) for f in (folder/'data').glob('*.json')} if (folder/'data').exists() else {};html=(folder/'index.html').read_text().replace('<!--CARD_STYLE-->','<style>'+(ROOT/'scenes/play/card.css').read_text()+'</style>').replace('<!--CARD_SDK-->','<script>'+(ROOT/'scenes/play/core.js').read_text()+'\n'+(ROOT/'scenes/play/card-sdk.js').read_text()+'\nconst CARD_DATA='+json.dumps(data)+';</script>');entry={'manifest':json.loads((folder/'card.json').read_text()),'html':html};replacements['CUSTOM_ENTRY']='PlayCatalog.push('+json.dumps(entry)+');'
 return re.sub(r'\b(?:CUSTOM_ENTRY|ENTRY_WORDS|ENTRY_CROSS|FRAME_SCRIPT|FIXTURE|ITEMS|PRO|THEME|CARD|STATE)\b',lambda m:replacements[m[0]],template)

# Setup reads embedded JSON from catalog HTML; no production asset or allow-list is changed.
scenes=[args.scene] if args.scene else ['cats','koi','train'];states=['home','word-mid','word-complete','crossword-mid','crossword-complete','crossword-assisted','news','news-offline','news-ad','word-pro','crossword-pro','news-pro','news-empty']
if args.card:states=[s for s in states if (s.startswith('word') if args.card=='word-of-the-day' else s.startswith('crossword') if args.card=='crossword-of-the-day' else s.startswith('news'))];scenes=[args.scene or 'cats']
if args.card and args.card not in ['word-of-the-day','crossword-of-the-day','news']:states=['custom'];scenes=[args.scene or 'cats']
if args.smoke:states=['word-mid','crossword-mid','news'];scenes=[args.scene or 'cats']
reports=[];failures=[]
for scene in scenes:
 for theme in ['light','dark']:
  thumbs=[];details=[]
  for state in states:
   disk();name=f'{scene}-{theme}-{state}';raw=OUT/(name+'.png');temp=ROOT/'.build/play-qa-unused.js'
   # Use card data already in catalog HTML to avoid giant duplicated setup content.
   url=f'http://localhost:5217/{scene}.html?virtual=1&muted=1&hour={12 if theme=="light" else 22}&shotAppearance={theme}'
   if args.file:url=(ROOT/f'scenes/{scene}.html').as_uri()+f'?virtual=1&muted=1&hour=12&shotAppearance={theme}'
   try:
    pre=setup(state,theme)
    r=subprocess.run([str(ROOT/'.build/wkshot-play'),url,str(raw),'1600','1000','3',pre],cwd=ROOT,text=True,capture_output=True,timeout=65)
    (OUT/(name+'.log')).write_text(r.stdout+r.stderr)
    record={'name':name,'exit':r.returncode}
    for line in r.stdout.splitlines():
     if line.startswith('result: '):record.update(json.loads(line[8:]))
    reports.append(record)
    if r.returncode or record.get('errors') or record.get('report',{}).get('errors'):failures.append(record);print('FAIL',name,r.stdout[-800:],flush=True)
    else:print('PASS',name,flush=True)
    if raw.exists():
     im=Image.open(raw).convert('RGB');thumb=im.resize((800,500));tile=Image.new('RGB',(800,526),'#edf1e8');tile.paste(thumb,(0,26));ImageDraw.Draw(tile).text((12,8),name,fill='#233e34');thumbs.append(tile)
     rect=record.get('report',{}).get('state',{}).get('rect',[216,444,720,520]);x,y,w,h=rect;sx=im.width/1600;crop=im.crop((int(x*sx),int(y*sx),int((x+w)*sx),int((y+h)*sx))).resize((720,520));tile=Image.new('RGB',(720,546),'#edf1e8');tile.paste(crop,(0,26));ImageDraw.Draw(tile).text((12,8),name,fill='#233e34');details.append(tile);im.close();raw.unlink()
   finally:temp.unlink(missing_ok=True);raw.unlink(missing_ok=True)
  for suffix,tiles,width,height in [('scenes',thumbs,800,526),('panels',details,720,546)]:
   if not tiles:continue
   sheet=Image.new('RGB',(width*3,height*math.ceil(len(tiles)/3)),'#edf1e8')
   for n,tile in enumerate(tiles):sheet.paste(tile,((n%3)*width,(n//3)*height))
   tag=('-'+args.card if args.card else '-smoke' if args.smoke else '')+('-file' if args.file else '')
   sheet.save(OUT/f'{scene}-{theme}{tag}-{suffix}.jpg',quality=82,optimize=True)
(OUT/('verification'+('-'+args.scene if args.scene else '')+('-'+args.card if args.card else '-smoke' if args.smoke else '')+('-file' if args.file else '')+'.json')).write_text(json.dumps(reports,indent=2)+'\n')
print(f'{len(reports)} captures; {len(failures)} failures; JPEG sheets in {OUT}')
if failures:sys.exit(1)
