#!/bin/zsh
# Gait cycle strips via Codex image generation (see scenes/art/sprites/README.md "cycle/").
# usage: run-cycles.sh <lane...>  each lane = "kind/name|refsheet|who|cycles"   cycles = "walk run" | "walk"
#   FORCE=1 regenerates existing strips; NOTE="extra text" is appended to the prompt (retries).
cd "${0:A:h}/../.."
for spec in "$@"; do
  IFS='|' read -r apath ref who cycles <<< "$spec"
  kind=${apath%%/*}; name=${apath##*/}; slug="${kind%s}-$name"
  sp=scenes/art/sprites/$apath
  for cyc in ${=cycles}; do
    out=art-src/cycles/$slug-$cyc.png
    [[ -f $out && -z $FORCE ]] && { echo "skip $slug-$cyc"; continue; }
    if [[ $cyc == walk ]]; then
      n=8; what="a WALK cycle: exactly 8 frames showing ONE complete stride (both the left and the right step), in this order: 1 contact (right front paw reaching forward, touching down; matches the attached walk1 sprite), 2 down (weight drops onto it), 3 passing (legs crossing under the body), 4 up (pushing off), 5 contact with the OTHER front paw reaching forward (mirror of frame 1's legs, near-side and far-side swapped), 6 down, 7 passing, 8 up — so frame 8 flows straight back into frame 1. A calm, unhurried natural walk with diagonal leg pairs; the head and back stay level with only a slight bob."
    else
      n=6; what="a RUN cycle: exactly 6 frames showing ONE complete gallop/bounding stride for this animal (a lively trot-to-gallop: 1 front paws reaching far forward, hind legs pushing back; 2 front paws touching down; 3 legs gathered under the body; 4 hind legs reaching forward under the belly; 5 hind legs pushing off, body extending; 6 fully stretched, about to reach again) so frame 6 flows back into frame 1. Feet only lift a little — the body stays near the same height, no big leaps."
    fi
    prompt="Use your built-in image generation tool. Character: ${who} — the FIRST attached image is its reference sheet: draw ONLY this one character, exactly matching its look (same markings, colours, proportions, line weight, flat painterly cartoon style, lighting). The other attached images are its exact existing sprites walk1 and walk2 (side view, facing right) — use them for the walking scale and design.

Make ONE wide horizontal sprite-sheet strip image (as wide a landscape image as you can make) containing ${what}

Hard rules (this is a game sprite sheet, it is cut up automatically):
- Exactly ${n} frames, side view, facing RIGHT, left to right in ${n} equal-width cells, with generous empty space between neighbouring frames — no frame may touch or overlap another.
- IDENTICAL scale in every frame: the body is the same size in all frames, the same size relative to the cell as the walk1 sprite. No zooming, no perspective change.
- All feet on ONE shared invisible horizontal baseline at about 80% of the image height (paws in the air lift slightly above it).
- The body (torso and head) is centred in each cell at the SAME horizontal position in every frame, so the frames do not drift: it is an in-place (treadmill) cycle, only the legs, tail and a little head bob move.
- Neighbouring frames differ by small, evenly spaced leg positions — real animation in-betweening, NOT ${n} copies of the same pose and NOT a pose gallery.
- Plain flat light-grey background (#e6e6e6). No ground line, no shadows, no motion lines, no text, no labels, no numbers, no props.
${NOTE}
Save the final PNG at exactly: $PWD/$out . Do NOT modify anything under scenes/ or any code or other files. When done, print the saved path."
    echo "=== $slug-$cyc $(date +%T)"
    echo "$prompt" | codex exec -s workspace-write --skip-git-repo-check -i "art-src/$ref,$sp/walk1.png,$sp/walk2.png" - > "art-src/cycles/codex-$slug-$cyc.log" 2>&1
    echo "--- $slug-$cyc exit $? $( [[ -f $out ]] && echo ok || echo MISSING ) $(date +%T)"
  done
done
