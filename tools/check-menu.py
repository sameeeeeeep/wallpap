#!/usr/bin/env python3
"""Render all bundled control sets from the host's literal definitions using wkshot, never the running app."""
import concurrent.futures,json,re,subprocess,sys
from pathlib import Path
host=Path('host/main.swift').read_text();skins=Path('host/Skins.swift').read_text()
look={k:re.findall(r'\("([^"]+)", "([^"]+)"\)',v) for k,v in re.findall(r'^    "([^"]+)": \[(.*?)\]',skins,re.M)}
pets=re.findall(r'"([^"]+)"',re.search(r'let petScenes.*?= \[(.*?)\]',skins).group(1))
body=host[host.index('        switch sceneID {',host.index('func addSceneItems')):host.index('    @objc func pickSetting')]
ctl={}
for names,block in re.findall(r'case (.*?):\n(.*?)(?=        (?:case|default):? |        default:|\n        })',body,re.S):
 ids=re.findall(r'"([^"]+)"',names)
 controls=[]
 for title,key,opts,default in re.findall(r'choice\("([^"]+)", key: "([^"]+)", options: \[(.*?)\], defaultValue: (.*?)\)',block):
  options=[{'label':label,'v':[key,json.loads(value)],'on':value==default} for label,value in re.findall(r'\("([^"]+)", ("[^"]+"|true|false|\d+)\)',opts)]
  controls.append({'type':'choice','title':title,'options':options})
 controls += [{'type':'action','title':t,'v':v} for t,v in re.findall(r'action\("([^"]+)", "([^"]+)"\)',block)]
 for id in ids:
  if controls:ctl[id]=controls
ids=['koi','grass','cats','cafe','cabin','records','speakeasy','rooftop','ramen','train','drive','bowls','cymatics','kinetic','fluids','skies']
if len(sys.argv)>1:ids=sys.argv[1:]
Path('shots/menu').mkdir(exist_ok=True)
def run(job):
 id,theme=job;cc=list(ctl.get(id,[]))
 if id in pets:cc.insert(0,{'type':'choice','title':'Pets','options':[{'label':'On','v':['pets',True],'on':True},{'label':'Off','v':['pets',False]}]})
 if len(look.get(id,[]))>1:cc.insert(0,{'type':'choice','title':'Look','options':[{'label':name+(' · Pro' if i else ''),'v':['player' if id=='cafe' else 'skin',val],'on':i==0} for i,(val,name) in enumerate(look[id])]})
 if id=='bowls':cc.append({'type':'action','title':'Strike a Bowl','v':'strike'})
 if id in ['cafe','speakeasy','records','ramen','rooftop','cabin','cymatics','drive','kinetic','fluids','skies']:cc += [{'type':'action','title':'Play / Pause','v':'playpause'},{'type':'action','title':'Next Track','v':'next'}]
 js='render({...S,pro:false,scene:'+json.dumps(id)+',sceneCtl:'+json.dumps(cc)+'});'
 if id=='shared':js="Object.keys(SEC_DEFAULT).forEach(k=>secOpen[k]=true);render({...S,pro:false,music:true,calm:true,water:30,overApps:true,energy:'away',soundscape:'rain'});"
 js+="window.__shotReport=()=>({scene:S.scene,choices:S.sceneCtl.length,overflow:[...document.querySelectorAll('.ctl *, .acts *, .chips, .chips button, .row, .tabs, .foot')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&((r.right>340.5)||(r.left<-.5)||(e.scrollWidth>e.clientWidth+1))}).map(e=>({text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth}))})"
 r=subprocess.run(['./tools/wkshot','http://localhost:5210/menu.html?shotAppearance='+theme,'shots/menu/'+id+'-'+theme+'.png','340','2600' if id=='shared' else '900','0',js],capture_output=True,text=True)
 print(id,theme,r.stdout.strip(),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:list(ex.map(run,[(i,t) for i in ids for t in ['light','dark']]))
