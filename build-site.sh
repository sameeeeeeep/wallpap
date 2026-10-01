#!/bin/zsh
# Syncs the latest live scenes into the static marketing site (livewall/site/),
# so the site always ships exactly what the app ships. Run before every deploy:
#   ./build-site.sh            then serve:  python3 -m http.server 5220 -d site
# Scenes that don't exist yet (e.g. grass.html / cafe.html while in progress)
# simply aren't copied — the site detects that and shows a "coming soon" card.
set -e
cd "$(dirname "$0")"
SRC=scenes
DST=site/scenes
rm -rf "$DST"
mkdir -p "$DST"
setopt null_glob
for f in $SRC/*.html $SRC/lw.js; do
  cp "$f" "$DST/"
  echo "  + ${f:t}"
done
# Manifest the page reads to know which scenes are live and which have stills
# (site/img/<id>.jpg + <id>-sm.jpg). Avoids probing for files that don't exist.
python3 - "$DST" site/img > "$DST/manifest.json" <<'PY'
import json, os, sys
dst, img = sys.argv[1], sys.argv[2]
scenes = sorted(f[:-5] for f in os.listdir(dst) if f.endswith('.html'))
stills = [s for s in scenes + ['grass', 'cafe'] if os.path.exists(os.path.join(img, s + '.jpg')) and os.path.exists(os.path.join(img, s + '-sm.jpg'))]
print(json.dumps({'scenes': scenes, 'stills': sorted(set(stills))}))
PY
echo "  manifest: $(cat $DST/manifest.json)"
# Static-host housekeeping (GitHub Pages)
[[ -f site/CNAME ]] || echo "wallpap.live" > site/CNAME
touch site/.nojekyll
echo "site ready → $PWD/site  ($(ls $DST | wc -l | tr -d ' ') scene files)"
