#!/bin/zsh
# Copies the shared scene runtime that add-ons need but the app doesn't provide into every add-on folder, so each
# zip is self-contained: scenes/kit.js, scenes/moon.js and scenes/art/shared/moon.png. Touches nothing else.
# (The app itself provides lw.js, pet-motion.js and astronomy.js to add-ons.)
#   addons/build.sh            then  tools/pack-scene.sh addons/<id>
set -e
cd "$(dirname "$0")"
for d in */; do
  [[ -f "$d/scene.json" ]] || continue
  rm -f "$d/kit.js" "$d/moon.js" "$d/art/shared/moon.png"          # (replaces dev symlinks with real copies)
  cp ../scenes/kit.js ../scenes/moon.js "$d/"
  mkdir -p "$d/art/shared" && cp ../scenes/art/shared/moon.png "$d/art/shared/moon.png"
  echo "kit.js, moon.js, art/shared/moon.png → addons/$d"
done
