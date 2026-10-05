#!/usr/bin/env python3
"""Speakeasy frame time, main vs. working tree, in an isolated WKWebView (same method as
tools/pets-shared/benchmark.py: 1200x750, 7 batches x 90 virtual frames, one flush per batch, median).
Cases: idle (no music), sax (music.js's fake song, the sax guest only) and playing (both guests forced on = the busiest stage).
usage: python3 tools/speakeasy-band/bench.py [port=5241] [base=main]"""
import os, sys, subprocess, json, statistics
from pathlib import Path
root = Path(__file__).resolve().parents[2]; os.chdir(root)
port = sys.argv[1] if len(sys.argv) > 1 else '5241'; base = sys.argv[2] if len(sys.argv) > 2 else 'main'
res = {}
for version in ['before', 'after']:
    src = subprocess.check_output(['git', 'show', f'{base}:scenes/speakeasy.html'], text=True) if version == 'before' else (root / 'scenes/speakeasy.html').read_text()
    idx = src.rfind('})();'); src = src[:idx] + 'window.__benchFlush=()=>{ctx.getImageData(0,0,1,1)};' + src[idx:]
    tmp = root / 'scenes/__bench_speakeasy.html'; tmp.write_text(src)
    try:
        for case in ['idle', 'sax', 'playing']:
            force = {'sax': '{singer:false,sax:true}', 'playing': '{singer:true,sax:true}'}.get(case)
            start = f"if(window.__speak&&__speak.BAND)__speak.BAND.force={force};__lw('nowplaying',{{title:'Bench',artist:'Band',playing:true,app:'Music'}});" if force else ''
            js = start + """window.__shotReady=()=>{let seed=7;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
for(let i=0;i<150;i++)LW.advance(1/30);__benchFlush();window.__timings=[];
for(let r=0;r<7;r++){const a=Date.now();for(let i=0;i<90;i++)LW.advance(1/30);__benchFlush();__timings.push((Date.now()-a)/90)}};
window.__shotReport=()=>({timings:__timings,errors:__errs});"""
            r = subprocess.run(['./tools/wkshot', f'http://127.0.0.1:{port}/{tmp.name}?virtual=1&muted=1&hour=22', '/dev/null', '1200', '750', '0', js], text=True, capture_output=True)
            rep = [json.loads(x[8:]) for x in r.stdout.splitlines() if x.startswith('result: ')][-1]['report']
            res.setdefault(case, {})[version] = round(statistics.median(rep['timings']), 3)
            print(version, case, rep['timings'], 'median', res[case][version], 'errors', rep['errors'], flush=True)
    finally:
        tmp.unlink(missing_ok=True)
print(json.dumps(res))
