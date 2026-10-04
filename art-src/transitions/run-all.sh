#!/bin/zsh
# usage: run-all.sh <lane...>  each lane = "kind/name|refsheet|sitPose|sleepPose|transitions"
cd "${0:A:h}/../.."
for spec in "$@"; do
  IFS='|' read -r apath ref sit sleep trans <<< "$spec"
  kind=${apath%%/*}; name=${apath##*/}; slug="${kind%s}-$name"
  sp=scenes/art/sprites/$apath
  prompt="Read docs/sprite-transitions-brief.md and follow every hard rule. Character: the ${name} ${kind%s} (first attached image is its reference sheet — draw ONLY this character, matching its look exactly). Other attached images are its exact existing sprites walk1, ${sit}, ${sleep}. Adapt the brief's transitions to this animal: 'stand-sit' ends on the existing '${sit}' pose; 'sit-sleep' starts on '${sit}' and ends on the existing '${sleep}' pose; 'turn' and 'jump' as in the brief (for a panda, make 'jump' a clumsy small hop). Generate ONLY these strips: ${trans}. Save each as art-src/transitions/${slug}-<transition>.png. Do NOT modify anything under scenes/ or any code. When done, list the saved files."
  echo "=== $slug $(date +%T)"
  echo "$prompt" | codex exec -s workspace-write --skip-git-repo-check -i "art-src/$ref,$(python3 tools/webp/assets.py "$sp/walk1.png"),$(python3 tools/webp/assets.py "$sp/$sit.png"),$(python3 tools/webp/assets.py "$sp/$sleep.png")" - > "art-src/transitions/codex-$slug.log" 2>&1
  echo "--- $slug exit $? $(ls art-src/transitions/${slug}-*.png 2>/dev/null | wc -l) strips"
done
