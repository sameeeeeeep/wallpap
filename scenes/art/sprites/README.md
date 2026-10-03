# Character sprites (AI-generated in Google Vids, cut out on-device with macOS Vision)

All sprites face RIGHT (flip horizontally for left), transparent PNG, ~130–450 px.
Walking plays the drawn gait cycles in `cycle/` (below), chosen by distance travelled; walk1/walk2 remain the
standing reference poses. The shared runtime holds still if a complete walking cycle is missing.

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
falls back to a one-silhouette tuck-and-cut (never a crossfade). Frame size and foot anchor are not stored in the art: `LW.petSeqPrep`
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

## Shared companions (2026-10-04)

`scenes/pets.js` owns the roster and scene-independent movement/rendering. Scenes provide
stage geometry; never copy the pet engine into a scene. The common roster is orange,
black, grey, calico, siamese, golden and corgi. Pandas remain private to Touch Grass.

Golden and corgi now also have `cycle/walk-f-1..8`, `cycle/walk-b-1..8`,
`t/jump-f-1..5` and `t/jump-b-1..5`. Existing side jumps are retained. Generated masters,
reproducible cutting/planting, and landmark reports live in `art-src/pets-shared/`.
Run `python3 art-src/pets-shared/install.py` to regenerate all 52 new cuts and registries.
A front/back walk uses a .55 ground slope; a side-only panda stays on its lateral lane.
Pose changes use drawn transitions or one-silhouette tuck-and-cut, never a dissolve.

## Motion gaze correction (2026-10-04)

All seven shared companions now use regenerated side walk (8), run (6), side jump (5),
front/back walk (8 each), and front/back jump (5 each): 315 motion frames.
Heads follow travel; lateral faces show one profile eye, diagonal heads follow their
body axis, jumps watch landing, and rear heads never turn back. Existing stationary
sit/sleep/loaf and standing references are retained and may look toward the viewer.

Source sheets: `art-src/gaze-fix/<animal>-{side,depth}.webp` (lossless).
Exact prompts and generation provenance: `prompts.json`, `generations.json` there.
Run `python3 art-src/gaze-fix/install.py` to cut, register and install the replacement
frames and refresh the shared geometry manifests. This supersedes the old installers
for these motion rows. `plant-qa.json` reports selected stance-landmark residuals;
it is not an all-pixel optical-flow proof. Run `python3 tools/gaze-fix/capture.py`
for Santorini/Speakeasy day/night sequences. Inspect `shots/gaze-fix/<animal>.jpg`
(old over new for each frame) and the rendered sequences before accepting any recut.
