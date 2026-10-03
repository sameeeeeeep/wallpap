# Character sprites (AI-generated in Google Vids, cut out on-device with macOS Vision)

All sprites face RIGHT (flip horizontally for left), transparent PNG, ~130–450 px.
Walking plays the drawn gait cycles in `cycle/` (below), chosen by distance travelled; walk1/walk2 remain the
standing pose and the fallback two-frame gait for a set without a cycle.

| Folder | Poses |
|---|---|
| cats/orange, cats/black | walk1, walk2, sit (facing viewer), loaf, sleep (curled), stretch |
| cats/grey, cats/calico, cats/siamese | walk1, walk2, sit (facing viewer), sleep (curled) |
| pandas/mei (adult) | walk1, walk2, sit-eat (bamboo), back-sleep |
| pandas/bao (adult) | walk1, walk2, sit-leaf, roll |
| pandas/cub | walk1, walk2, back-sleep, tumble |
| dogs/golden (puppy, red collar) | walk1, walk2, sit, lie, belly-up |
| dogs/corgi | walk1, walk2, sit, sleep, play-bow |

Sources (full sheets): livewall/art-src/*.jpg

## Drawn in-between frames (`<kind>/<name>/t/`)

Every set above also has `t/<seq>-1..5.png`: five drawn frames per transition (Codex image
generation from `art-src/transitions/<kind>-<name>-<seq>.png` strips, cut with
`swift tools/cutout.swift <strip> <out> <prefix> strip`, installed with `art-src/transitions/install.sh`).
Same facing (RIGHT), tightly cropped, transparent.

| seq | frame 1 → frame 5 | played |
|---|---|---|
| stand-sit | walk1 → the set's sit pose (sit / sit-eat / sit-leaf / tumble) | walk→sit, reversed for sit→walk |
| sit-sleep | sit pose → the set's sleep pose (sleep / lie / back-sleep / roll); frame 3 ≈ loaf | sit→sleep, reversed to wake; chained after stand-sit for walk↔sleep |
| turn | facing right → facing viewer → facing left | turning round while walking (mirrored copy when turning left) |
| jump | crouch → spring → apex → reach → landing crouch | hops between surfaces |

Which sets have them is listed once in `LW.PET_SEQ_HAS` (`scenes/pet-motion.js`); a missing sheet just
falls back to the crossfade. Frame size and foot anchor are not stored in the art: `LW.petSeqPrep`
interpolates them at load between the poses each sheet joins (the jump crouch is sized to the walking
body length).


## Gait cycles (`<kind>/<name>/cycle/`)

`walk-1..8.png`: one full walking stride (R contact, down, passing, up, L contact, down, passing, up), frame 1 ≈ walk1.
`run-1..6.png`: one gallop/trot stride (cats and dogs only). Facing RIGHT, tightly cropped, transparent.

| set | walk | run |
|---|---|---|
| cats/orange, black, grey, calico, siamese | 8 | 6 |
| dogs/golden, corgi | 8 | 6 |
| pandas/mei, bao, cub | 8 | — |

Made with Codex image generation (`art-src/cycles/run-cycles.sh`), cut with the chroma-key cutter
`art-src/cycles/cut.py` (not `cutout.swift`, which holes dark fur on these sheets) via `art-src/cycles/install.sh`.
Registry `LW.PET_CYCLE_HAS`, strides `LW.PET_STRIDE` (walking heights per cycle) in `scenes/pet-motion.js`.
Size and anchor are not stored in the art: `LW.petCyclePrep` sizes the loop to walk1's height and pins every frame
on walk1's torso point at load; `LW.petGait` / `LW.petGaitFrame` pick the frame from the distance walked.
