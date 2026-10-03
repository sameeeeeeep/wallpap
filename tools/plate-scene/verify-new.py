#!/usr/bin/env python3
"""Render generic add-ons in WebKit; save shots + machine-readable assertions.
Usage: python3 tools/plate-scene/verify-new.py kyoto harbour iceland
Open the contact sheets and full shots for visual QA after this exits.
"""
import argparse
import json
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('ids', nargs='+')
parser.add_argument('--extended', action='store_true', help='also check golden hour, mirrored avoid layout, calm and snow')
args = parser.parse_args()
base = 'http://127.0.0.1:5210'
try: urllib.request.urlopen(base, timeout=2).close()
except (OSError, urllib.error.URLError):
    log = (ROOT / 'shots/new-devserver.log')
    log.parent.mkdir(exist_ok=True)
    with log.open('a') as out:
        subprocess.Popen(['python3', str(ROOT / 'devserver.py'), '5210'], cwd=ROOT, stdout=out, stderr=out, start_new_session=True)
    for _ in range(30):
        try: urllib.request.urlopen(base, timeout=1).close(); break
        except OSError: time.sleep(.1)
link = ROOT / 'scenes/_addons'
if not link.exists(): link.symlink_to('../addons', target_is_directory=True)
shots = ROOT / 'shots/one-command'; shots.mkdir(parents=True, exist_ok=True)
cases = [('day', 'hour=12', ''), ('night', 'hour=0', ''), ('rain', 'hour=12&weather=rain', '')]
if args.extended:
    cases += [('golden', 'hour=18.1', ''), ('left', 'hour=12&weather=rain&side=left', "__lw('layout',{side:'left',clear:[.28,1],avoid:[[.48,.4,.13,.18]]});"),
              ('calm', 'hour=12&calm=1', ''), ('snow', 'hour=12&weather=snow', ''), ('wide', 'hour=12&weather=rain&side=left', '')]
results = []
for sid in args.ids:
    folder = ROOT / 'addons' / sid
    if (folder / 'index.html').read_bytes() != (ROOT / 'addons/_template/index.html').read_bytes():
        raise SystemExit(f'{sid}: scene differs from generic template')
    previews = []
    for name, query, setup in cases:
        png = shots / f'{sid}-{name}.png'
        checks = """
        window.__shotReady=()=>{
          const p=window.plateScene;
          if(!p||!p.scene.ready)throw Error('scene did not become ready');
          if(Object.values(p.scene.assets).some(v=>!v))throw Error('missing runtime asset');
          if(!p.plate.masks.exposed)throw Error('missing exposed mask');
        };
        """ + setup
        started = time.monotonic()
        run = subprocess.run([str(ROOT/'tools/wkshot'), f'{base}/_addons/{sid}/index.html?virtual=1&muted=1&{query}', str(png), *(['2400', '1000'] if name=='wide' else ['1440', '900']), '4', checks], cwd=ROOT, text=True, capture_output=True, timeout=65)
        (shots / f'{sid}-{name}.log').write_text(run.stdout + run.stderr)
        line = next((s[len('result: '):] for s in run.stdout.splitlines() if s.startswith('result: ')), '{}')
        report = json.loads(line)
        if run.returncode or report.get('errors') or not report.get('report', {}).get('ready') or 'js error:' in run.stdout:
            raise SystemExit(f'{sid}/{name} failed: {run.stdout} {run.stderr}')
        item = {'id': sid, 'case': name, 'seconds': round(time.monotonic()-started, 2), 'shot': str(png.relative_to(ROOT)), **report}
        results.append(item)
        print(f'{sid}/{name}: {item["seconds"]:.2f}s, JS {report["report"]["jsMs"]:.2f}ms, errors=[]', flush=True)
        im = Image.open(png).convert('RGB'); im.thumbnail((576, 360))
        panel = Image.new('RGB', (576, 388), '#121820'); panel.paste(im, (0, 28))
        ImageDraw.Draw(panel).text((12, 8), sid + ' / ' + name, fill='white')
        previews.append(panel)
    sheet = Image.new('RGB', (576 * min(3,len(previews)), 388 * ((len(previews)+2)//3)), '#121820')
    for i, im in enumerate(previews): sheet.paste(im, ((i%3)*576, (i//3)*388))
    sheet.save(shots / f'{sid}-contact.jpg', quality=92)
result_path=shots/'results.json'
old=json.loads(result_path.read_text()) if result_path.exists() else []
old=[r for r in old if r['id'] not in args.ids]
result_path.write_text(json.dumps(old+results, indent=2)+'\n')
print('Open contact sheets in', shots)
