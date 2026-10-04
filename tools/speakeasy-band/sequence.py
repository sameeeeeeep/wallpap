#!/usr/bin/env python3
"""Look at the Speakeasy band: WKWebView frame sequences (?virtual=1) driven by scenario.js, saved as
downscaled JPEG contact sheets in shots/speakeasy-robots/ (raw PNGs deleted; stops if / has < 3 GB free).
usage: python3 tools/speakeasy-band/sequence.py [port=5241] [cases=night,day] [W=1600 H=1000]"""
import os, sys, subprocess, json, shutil, glob
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[2]; os.chdir(root)
port = sys.argv[1] if len(sys.argv) > 1 else '5241'
cases = (sys.argv[2] if len(sys.argv) > 2 else 'night,day').split(',')
W, H = int(os.environ.get('W', 1600)), int(os.environ.get('H', 1000))
OUT = root / 'shots' / 'speakeasy-robots'; OUT.mkdir(parents=True, exist_ok=True)
HOURS = {'night': 22, 'day': 13, 'dusk': 18.4}
# (seconds after the scenario starts, caption)
FRAMES = [(1.0, 'idle, no music'), (2.25, 'play pressed: heads turn'), (3.1, 'count-in (sticks click)'), (3.35, 'count-in'),
          (5.5, 'intro: brushes, pads'), (5.62, 'intro +1/8 beat'), (9.0, 'build: snare 8ths, ride swell'), (9.12, 'build +1/8'),
          (11.95, 'into the drop'), (12.05, 'drop: crash'), (14.3, 'groove: ride + backbeat'), (14.42, 'groove +1/8'),
          (14.54, 'groove +2/8'), (17.0, 'breakdown: brushes'), (19.15, 'stop: final crash'), (20.0, 'outro: settle'),
          (23.5, 'idle again'), (25.7, 'song B: singer on the lift'), (28.5, 'quartet'), (31.0, 'quartet groove'),
          (33.6, 'stop: singer sinks'), (37.0, 'idle trio')]
CROP = (470, 330, 680, 400)    # css px: the stage
def font(sz):
    for f in ['/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()
for case in cases:
    if shutil.disk_usage('/').free < 3 * 1024 ** 3: raise SystemExit('disk below 3 GB — stopping')
    base = OUT / f'raw-{case}'
    env = dict(os.environ, WKSHOT_FRAMES=','.join(str(t) for t, _ in FRAMES))
    js = (root / 'tools/speakeasy-band/scenario.js').read_text()
    url = f'http://127.0.0.1:{port}/speakeasy.html?virtual=1&muted=1&hour={HOURS.get(case, 22)}&shotSeed=7'
    r = subprocess.run(['./tools/wkshot', url, str(base) + '.png', str(W), str(H), '0', js], text=True, capture_output=True, env=env, timeout=600)
    rep = [json.loads(x[8:]) for x in r.stdout.splitlines() if x.startswith('result: ')]
    rep = rep[-1] if rep else {}
    (OUT / f'{case}-log.json').write_text(json.dumps(rep, indent=1))
    print(case, 'errors:', rep.get('errors'), 'imageErrors:', rep.get('imageErrors'))
    files = sorted(glob.glob(str(base) + '-f*.png'))
    tiles, fulls = [], []
    for (t, cap), f in zip(FRAMES, files):
        im = Image.open(f).convert('RGB'); s = im.size[0] / W
        x, y, w, h = CROP
        c = im.crop((int(x * s), int(y * s), int((x + w) * s), int((y + h) * s))).resize((int(w * 1.15), int(h * 1.15)), Image.LANCZOS)
        d = ImageDraw.Draw(c); d.rectangle([0, 0, c.size[0], 30], fill=(0, 0, 0)); d.text((8, 5), f'{case} t={t:.2f}s  {cap}', fill=(255, 230, 160), font=font(20))
        tiles.append(c)
        if cap in ('idle, no music', 'groove: ride + backbeat', 'quartet', 'idle again'):
            fl = im.resize((W // 2 * 1, H // 2 * 1), Image.LANCZOS); ImageDraw.Draw(fl).text((10, 8), f'{case} {cap}', fill=(255, 230, 160), font=font(18)); fulls.append(fl)
        os.remove(f)
    cols = 4; tw, th = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw + (cols - 1) * 6, rows * th + (rows - 1) * 6), (12, 8, 8))
    for i, t in enumerate(tiles): sheet.paste(t, ((i % cols) * (tw + 6), (i // cols) * (th + 6)))
    sheet.save(OUT / f'{case}-sequence.jpg', quality=82)
    fw, fh = fulls[0].size
    fs = Image.new('RGB', (2 * fw + 6, ((len(fulls) + 1) // 2) * (fh + 6) - 6), (12, 8, 8))
    for i, t in enumerate(fulls): fs.paste(t, ((i % 2) * (fw + 6), (i // 2) * (fh + 6)))
    fs.save(OUT / f'{case}-full.jpg', quality=84)
    print('wrote', OUT / f'{case}-sequence.jpg', OUT / f'{case}-full.jpg')
for f in glob.glob(str(OUT / 'raw-*.png')): os.remove(f)
