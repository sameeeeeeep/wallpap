#!/bin/zsh
# Second batch: realistic foliage for the Butterfly Garden (base ground + cut-out clumps).
cd "$(dirname "$0")"
D=$PWD
job() { # name, prompt, transparent(1/0)
  local name=$1 prompt=$2 tr=$3
  [[ -f "$D/$name.png" ]] && { echo "skip $name"; return; }
  local bg="The background MUST be fully transparent (alpha channel), with no drop shadow, no ground, no border, no text."
  [[ $tr == 0 ]] && bg="Fill the entire square edge to edge (no border, no vignette, no text). It must tile seamlessly: the left edge must continue into the right edge and the top into the bottom."
  echo "$prompt

Use your built-in image generation tool to make exactly this one image. Save the final PNG at exactly this absolute path: $D/$name.png . $bg Do nothing else: do not write any code or other files." | codex exec -s workspace-write --skip-git-repo-check - > "$D/log-$name.txt" 2>&1
  [[ -f "$D/$name.png" ]] && echo "ok $name" || echo "FAIL $name"
}
REAL="Photorealistic natural-history photograph quality, sharp detail, soft even daylight from above, true natural colours, no flowers."
job ground "A seamless top-down photograph of a lush cottage-garden bed: dense low green foliage, a mix of small leaves, clover, soft grass blades and leafy ground cover with deep natural shadows between plants, looking straight down. Square 1024x1024. $REAL" 0 &
job leaf-hosta "A single clump of broad hosta-like green leaves photographed from directly above, leaves radiating from the centre, about 85% of a square 1024x1024 frame, centred. $REAL" 1 &
job leaf-fern "A single clump of feathery green fern fronds photographed from directly above, fronds radiating from the centre, about 85% of a square 1024x1024 frame, centred. $REAL" 1 &
job leaf-grass "A single clump of fine green meadow grass photographed from directly above, blades radiating outward from the centre with slightly sun-bleached tips, about 85% of a square 1024x1024 frame, centred. $REAL" 1 &
job leaf-mantle "A single clump of lady's mantle (Alchemilla mollis) leaves photographed from directly above: rounded scalloped soft green leaves radiating from the centre, about 85% of a square 1024x1024 frame, centred. $REAL" 1 &
wait
echo done
