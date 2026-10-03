#!/bin/zsh
# Package an add-on scene for the online catalog (no app update needed).
#   tools/pack-scene.sh path/to/scene-folder     (folder holds index.html, scene.json, thumb.jpg, assets)
# → site/scenes-pack/<id>-<version>.zip + site/scenes-pack/<id>.jpg, and upserts the entry in site/catalog.json.
# Then push the site; every wallpap picks it up on next launch ("Get" in the Scenes panel).
set -e
cd "$(dirname "$0")/.."
SRC=${1:?usage: pack-scene.sh <scene-folder>}
python3 - "$SRC" <<'PY'
import json, os, shutil, subprocess, sys
src = sys.argv[1]
m = json.load(open(os.path.join(src, 'scene.json')))
sid, ver = m['id'], int(m.get('version', 1))
assert os.path.exists(os.path.join(src, 'index.html')), 'index.html missing'
out = 'site/scenes-pack'; os.makedirs(out, exist_ok=True)
zipname = f'{sid}-{ver}.zip'
stage = f'/tmp/wallpap-pack-{sid}'; shutil.rmtree(stage, ignore_errors=True)
shutil.copytree(src, stage, ignore=shutil.ignore_patterns('lw.js', 'pet-motion.js', 'astronomy.js', '.DS_Store', '.source'))  # lw.js etc. come from the app (kit.js/moon.js ship in the zip too, for older apps)
subprocess.run(['ditto', '-c', '-k', '--norsrc', '--noextattr', '--noqtn', stage, os.path.join(out, zipname)], check=True)
thumb = None
for t in ('thumb.jpg', 'thumb.png'):
    if os.path.exists(os.path.join(src, t)):
        thumb = f'scenes-pack/{sid}{os.path.splitext(t)[1]}'; shutil.copy(os.path.join(src, t), os.path.join('site', thumb))
cat_path = 'site/catalog.json'
cat = json.load(open(cat_path)) if os.path.exists(cat_path) else {'scenes': []}
cat['scenes'] = [s for s in cat['scenes'] if s['id'] != sid] + [{
    'id': sid, 'title': m.get('title', sid), 'category': m.get('category', 'More'), 'pro': m.get('pro', True),
    'version': ver, 'zip': f'scenes-pack/{zipname}', 'author': m.get('author', 'wallpap'),
    **({'authorURL': m['authorURL']} if m.get('authorURL') else {}), **({'blurb': m['blurb']} if m.get('blurb') else {}),
    **({'featured': True} if m.get('featured') else {}), **({'new': True} if m.get('new') else {}),
    **({'music': True} if m.get('music') else {}), **({'thumb': thumb} if thumb else {})}]
json.dump(cat, open(cat_path, 'w'), indent=2)
print(f'packed {sid} v{ver} → site/scenes-pack/{zipname}')
PY
