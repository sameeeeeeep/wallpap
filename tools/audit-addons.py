#!/usr/bin/env python3
"""Local WebKit evidence, no app build. Serve this worktree on :5214 first.
Downscale each sequence immediately and remove its raw PNGs. Stop below 3 GiB.
"""
import argparse, json, os, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('stage')
p.add_argument('ids', nargs='*')
p.add_argument('--cases', default='day,night,rain')
a = p.parse_args()
out = ROOT/'shots/audit-fix'/a.stage
out.mkdir(parents=True, exist_ok=True)
ids = a.ids or sorted(d.name for d in (ROOT/'addons').iterdir() if (d/'scene.json').exists())
cases = {'day': (12,'clear',1600,1000), 'night': (23,'clear',1600,1000),
         'rain': (15,'rain',1600,1000), 'wide': (23,'clear',3440,1440),
         'left': (23,'clear',1600,1000), 'start-rain': (15,'clear',1600,1000), 'stop-rain': (15,'rain',1600,1000)}
results = json.loads((out/'results.json').read_text()) if (out/'results.json').exists() else []
results = [r for r in results if r['id'] not in ids]
for sid in ids:
    tiles = []
    for case in a.cases.split(','):
        if shutil.disk_usage('/').free < 3*1024**3:
            raise SystemExit('STOP: less than 3 GiB free on /')
        hour, weather, w, h = cases[case]
        png = out/f'{sid}-{case}.png'
        query = f'virtual=1&muted=1&hour={hour}&weather={weather}' + ('&side=left' if case in ('wide','left') else '')
        js = "window.__shotReport=()=>({ready:!!window.KIT?.ready,light:KIT.L,moon:KIT.layer('sky')?.moon});"
        frames = '0,3,6'
        if case in ('start-rain','stop-rain'):
            target = 'rain' if case == 'start-rain' else 'clear'
            js += f"LW.advance(4);LW.setEnv({{weather:'{target}',intensity:1}});"
            frames = '0,6,30'
        run = subprocess.run([str(ROOT/'tools/wkshot'), f'http://127.0.0.1:5214/addons/{sid}/index.html?{query}',str(png),str(w),str(h),'0' if case in ('start-rain','stop-rain') else '4',js],
                             env={**os.environ,'WKSHOT_FRAMES':frames},capture_output=True,text=True,timeout=65)
        (out/f'{sid}-{case}.log').write_text(run.stdout+run.stderr)
        reports=[json.loads(s.removeprefix('result: ')) for s in run.stdout.splitlines() if s.startswith('result: ')]
        if run.returncode or len(reports)!=3 or any(r.get('errors') or not r.get('report',{}).get('ready') for r in reports) or 'js error:' in run.stdout:
            raise SystemExit(run.stdout+run.stderr)
        raws = sorted(out.glob(f'{sid}-{case}-f*.png'))
        if len(raws) != 3: raise SystemExit(f'Missing sequence frame: {sid}/{case}')
        for i, raw in enumerate(raws):
            with Image.open(raw) as src:
                im=src.convert('RGB'); mean=ImageStat.Stat(im).mean
                luma=sum(c*k for c,k in zip(mean,(.2126,.7152,.0722)))/255
                im.thumbnail((640,400))
                tile=Image.new('RGB',(640,426),'#141923');tile.paste(im,(0,26))
                ImageDraw.Draw(tile).text((10,7),f'{sid} / {case} / +{frames.split(',')[i]}s / luma {luma:.3f}',fill='white')
                tiles.append(tile)
                results.append({'id':sid,'case':case,'frame':i,'luma':luma,**reports[i]})
            raw.unlink()
        print(f'{a.stage}: {sid}/{case} OK',flush=True)
    sheet=Image.new('RGB',(1920,426*(len(tiles)//3)),'#141923')
    for i,tile in enumerate(tiles):sheet.paste(tile,(i%3*640,i//3*426))
    sheet.save(out/f'{sid}.jpg',quality=91)
    (out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
