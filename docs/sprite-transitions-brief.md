# Sprite transition sheets — brief for Codex image generation

Problem: pets only have static poses (walk1/walk2/sit/loaf/sleep/stretch), so pose changes are blended swaps
(`pet-motion.js` crossfade / "tuck and settle"). The fix is real in-between frames drawn by the generator, not code.

## Deliverable per animal
Four horizontal STRIP images, each = ONE transition, 5 frames left→right, saved to
`art-src/transitions/<animal>-<transition>.png` (e.g. `cat-orange-stand-sit.png`):

| transition | frame 1 → frame 5 | played reversed for |
|---|---|---|
| `stand-sit` | walking pose (side, facing right) → weight shifts back → hindquarters lowering → seated, head turning to viewer → exact existing `sit` pose (facing viewer) | sit→stand |
| `sit-sleep` | existing `sit` → front paws walk forward → lying down (loaf-like) → head lowering, tail wrapping → exact existing `sleep` curl | wake up |
| `turn` | walking facing right → three-quarter toward viewer → facing viewer → three-quarter away → walking facing LEFT | turn left→right (flip) |
| `jump` | crouch, weight back → spring, body extended upward-right → apex, legs tucked → descending, front paws reaching → landing crouch | — |

## Hard rules (these are what make it usable as a sprite sheet)
- Use the attached reference sheet as the character model: same cat, same markings, same line weight, same painterly flat style, same lighting. Not a new character.
- Exactly 5 frames per strip, evenly spaced in equal-width cells, no overlap between frames, generous empty margin between them.
- SAME SCALE in every frame: the body must be the same size as the reference's walking pose (no zooming in on the seated/curled frames).
- Shared ground line: every frame's feet/body rest on the same invisible horizontal baseline at ~80% of image height (except jump frames 2–4, which rise above it).
- Plain flat light-grey background (#e6e6e6), no shadows on the ground, no text, no labels, no numbers, no ground line, no props.
- Frame 1 and frame 5 must match the existing pose they connect to (attached sprites) as closely as possible so the cut is invisible.
- Smooth, small, evenly spaced pose changes between neighbouring frames — this is animation in-betweening, not a pose gallery.

## After generation (Claude/Codex)
1. `swift tools/cutout.swift art-src/transitions/<file>.png scenes/art/sprites/<kind>/<name>/ <transition>` → `<transition>-1..5.png`.
2. Normalize: crop each frame to a common canvas aligned on the baseline (feet anchor), so frame N plays without jitter.
3. Wire into `pet-motion.js`: a pose change plays the frame sequence (~70–90 ms/frame) at the foot anchor instead of the crossfade; reverse order for the opposite move.
