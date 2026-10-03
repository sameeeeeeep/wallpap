#!/usr/bin/env python3
import subprocess,concurrent.futures,json,sys
jobs=[(s,k) for s in ['cats','grass'] for k in ['night','storm','snow','melt','left']]
if len(sys.argv)>1:jobs=[tuple(a.split(':')) for a in sys.argv[1:]]
def run(job):
 s,k=job;view='night' if k=='night' else 'day';weather='storm' if k=='storm' else 'snow' if k in ['snow','melt'] else 'clear'
 url=f'http://localhost:5210/{s}.html?virtual=1&muted=1&seed=7&view={view}&weather={weather}'+('&side=left' if k=='left' else '')
 js="window.__shotReady=()=>{window.check={};"
 if k=='left':js+="__lw('layout',{side:'left',clear:[.28,1],avoid:[[.65,.62,.13,.18]]});"
 secs=80 if k in ['snow','melt'] else 35
 js+=f'for(let i=0;i<{secs*10};i++)LW.advance(.1);'
 if k=='melt':js+="check.before=window.__grass?__grass.Lt.snow:__cats.E.snowAcc;LW.setEnv({weather:'clear'});for(let i=0;i<400;i++)LW.advance(.1);"
 js+="check.snow=window.__grass?__grass.Lt.snow:__cats.E.snowAcc;check.states=(window.__grass?__grass.pandas:__cats.cats).map(a=>a.state);};window.__shotReport=()=>check;"
 r=subprocess.run(['./tools/wkshot',url,f'shots/p1-{s}-{k}.png','2400' if k=='left' else '1440','1000' if k=='left' else '900','0',js],capture_output=True,text=True);print(s,k,r.stdout,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as e:list(e.map(run,jobs))
