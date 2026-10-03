#!/bin/zsh
# Generates raw art for the kit add-on scenes via Codex image generation. Outputs land next to this script.
cd "$(dirname "$0")"
D=$PWD
job() { # name, prompt
  local name=$1 prompt=$2
  [[ -f "$D/$name.png" ]] && { echo "skip $name"; return; }
  echo "$prompt

Use your built-in image generation tool to make exactly this one image. Save the final PNG at exactly this absolute path: $D/$name.png . The background MUST be fully transparent (alpha channel), with no drop shadow, no ground, no border, no text. Do nothing else: do not write any code or other files." | codex exec -s workspace-write --skip-git-repo-check - > "$D/log-$name.txt" 2>&1
  [[ -f "$D/$name.png" ]] && echo "ok $name" || echo "FAIL $name"
}
REAL="Photorealistic natural-history photograph quality, sharp macro detail, soft even daylight, true natural colours."
job bf-monarch "A single monarch butterfly (Danaus plexippus) seen from directly above (dorsal view), wings fully spread flat and perfectly bilaterally symmetric, body perfectly vertical and centred with the head at the top, the butterfly fills about 90% of a square 1024x1024 frame. $REAL" &
job bf-morpho "A single blue morpho butterfly (Morpho peleides) seen from directly above (dorsal view), iridescent electric-blue wings with black borders, wings fully spread flat and perfectly bilaterally symmetric, body perfectly vertical and centred with the head at the top, the butterfly fills about 90% of a square 1024x1024 frame. $REAL" &
job bf-swallowtail "A single eastern tiger swallowtail butterfly (Papilio glaucus) seen from directly above (dorsal view), yellow wings with black tiger stripes, small blue and orange spots and long hindwing tails, wings fully spread flat and perfectly bilaterally symmetric, body perfectly vertical and centred with the head at the top, the butterfly fills about 90% of a square 1024x1024 frame. $REAL" &
job bf-white "A single small white / cabbage white butterfly (Pieris rapae) seen from directly above (dorsal view), creamy white wings with charcoal forewing tips and one or two dark spots, wings fully spread flat and perfectly bilaterally symmetric, body perfectly vertical and centred with the head at the top, the butterfly fills about 90% of a square 1024x1024 frame. $REAL" &
wait
job flowers-a "Three separate garden flower heads photographed from directly above, arranged in one row with generous empty transparent space between them (they must not touch): a pink cosmos flower, a white oxeye daisy, an orange zinnia. Each head faces the camera, fully open, about 300px across, on a 1024x1024 canvas. $REAL" &
job flowers-b "Three separate garden flower heads photographed from directly above, arranged in one row with generous empty transparent space between them (they must not touch): a purple coneflower (echinacea), a yellow black-eyed susan (rudbeckia), a soft lilac scabiosa. Each head faces the camera, fully open, about 300px across, on a 1024x1024 canvas. $REAL" &
job gull "A single herring gull in flight seen from directly above (top view of its back), wings fully spread and perfectly symmetric, body vertical and centred with the head at the top, filling about 90% of a square 1024x1024 frame. $REAL" &
job crab "A single sand-coloured ghost crab seen from directly above (top view), legs spread naturally on both sides, perfectly centred, claws at the top, filling about 80% of a square 1024x1024 frame. $REAL" &
wait
job shells "Four separate small beach seashells photographed from directly above, arranged in a 2x2 grid with generous empty transparent space between them (they must not touch): a ribbed cockle shell, a pale scallop shell, a small spiral whelk, a smooth pink tellin. Each about 260px across on a 1024x1024 canvas. $REAL"
echo done
