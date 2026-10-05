# Painted cat motion replacement — cats-gpt

## Walk v5 — 2026-10-05 (supersedes every earlier walk)

The owner approved runs, jumps, rests and transitions and rejected **all walks**.
The supplied `art-src/walk-v5/<coat>-<view>.png` sheets now replace only the
25 walk atlases: six drawings × five views × five coats. No art was generated.
The five 20-second close-ups and five full-scene reels, exact review coverage,
performance and limitations are in [the watch list](../shots/cats-gpt/README.md)
and [v5 review](../shots/cats-gpt/walk-v5-review.md).

The reproducible builder `tools/cats-qa/walk_v5.py` flood-cuts connected cats,
removes paper/ground strokes, preserves white fur, removes matte, registers the
torso against a shared paw baseline, matches view scale and per-channel fur
mean/std, and packs lossless WebP. Calico toward copies a single stable marking
field from source frame 3, aligned to each head/torso; legs stay white. Its dark
eye patch matches the side used by approved runs/rests. Near leg patches are
made consistently white. All coats share exact alpha/registration.

`cat-motion.js` now uses actual clip length for gait exposure and turns, retaining
six drawn holds without tweening. `manifest.py` freezes the approved global unit
at 0.52, preventing a new walk from resizing every approved action. Hash/metadata
checks preserve all 70 non-walk atlases and entries. Stride evidence, source
hashes and rebuild commands: `tools/cats-qa/walk-v5-data/`.

108 Node tests pass. **Residual foot sliding remains**, especially around uneven
source contact changes; rear stance order is ambiguous and uses the front-view
cadence. Selected fitted spans are not proof of all-foot locking. New walks also
retain source drawing/style differences at action/view transitions. Integration
and review are complete; strict no-sliding visual acceptance is still open.


## Diagonal v3 — 2026-10-05

Owner rejected the second diagonal pass: “not moving the full limb.” This pass
replaces only the ten near/far walk atlases with new whole-sheet painted poses,
using explicit shoulder/elbow and hip/knee/hock blocking at the approved side
walk's eight phases. One fixed scale, upper-body registration and existing coat
transforms preserve proportions and identities. Measured strides are 37.47 near /
34.03 far; no runtime code or approved non-diagonal art changed.

Five new 15-second 30 fps side-by-side WebKit comparisons and full-cycle strips:
[review files](../shots/cats-gpt/README.md). [Detailed v3 review](../shots/cats-gpt/diagonal-v3-review.md)
records actual improvement and remaining contact slip/occlusion; zero sliding is
not claimed. 107 tests pass. Sources and exact built-in imagegen prompts:
`tools/cats-qa/diagonal-v3-src/`. Earlier runs below are historical.

## Owner diagonal follow-up — 2026-10-05

Owner verdict: “Diagonal walk is glitchy, rest is okay.” The approved non-diagonal
work is preserved. The two diagonal walk views were regenerated as whole
eight-frame sheets, registered by the upper body, palette-matched and propagated
to all five coats. Painted stance measurements set strides to 43.47 near / 39.78
far. No runtime change was needed; the old guides had incorrect projected paw
axes, repeated reaches and a rear sheet-row anchor jump. The other 85 atlases and
their metadata are unchanged.

Five 20-second 30 fps diagonal reels, an updated full orange reel, exact frame
review ranges, numerical limits and remaining imperfections are documented in
[the diagonal review](../shots/cats-gpt/diagonal-review.md). Tests: 107 passed.
Sources/prompts: `tools/cats-qa/diagonal-src/`; rebuild/review commands are in that
review. The sections below describe the original run and retain its historical
measurements and limitations. Owner acceptance of the new diagonals is pending.

## Plan and acceptance

1. Baseline: preserve current worktree art references/QA inputs, record tests and isolated WebKit CPU/memory. Never operate the installed app.
2. Orange art: one sheet per animation/view, five views (side, near, toward, far, away), mirrored for eight floor directions. Eight-frame lateral walk, gallop, crouch/takeoff/flight/landing; front sit, curled sleep, loaf, perk and drawn transitions. Inspect registration, anatomy, scale, color and edges before extending coats.
3. Runtime: image/script loading compatible with file://; shared cropped WebP atlases and explicit anchors; floor-aware eight-direction routes, distance-driven gait, turns at contact, preserved public pet API and scene behaviors.
4. Coat variants: retain orange-white tabby, amber-eyed black, grey tabby, calico, blue-eyed cream/dark-point siamese.
5. Verify: isolated WebKit 30 fps MP4s, inspect extracted frames, iterate; scenes day/night/mirror/wide; behavioral tests, no moving stills; before/after measurements.
6. Deliver: five 30–45 second reviews plus contact sheets under shots/cats-gpt, honest remaining defects, reproducible scripts and logical local commits. No push/install/release.

## Baseline

The requested scenes/pet-roster.js does not exist. The immutable common roster is in scenes/pets.js. Initial untracked directories art-src/cat-refs and tools/cats-qa predate this task and are retained. Existing cats use three views and six travel rays; vertical paths zigzag. Existing video.py advances 24 fps captures on rounded 30 Hz increments, and wkshot has a fixed 60-second timeout.

## Implemented — 2026-10-05

The five coats now use 95 compact WebP atlases, 760 painted frames. Each orange animation/view was generated as one eight-frame sheet; incorrect walk phases and wrong-facing jump/run sheets were rejected and regenerated. Hand-authored 2D paw blocking guided the replacement walks. The four other coats preserve the exact orange frame geometry and alpha through palette/marking edits. Production prompts, references, cuts, calibration and rebuild instructions are in `tools/cats-qa/ART.md`.

`cat-atlas.js` supplies synchronous metadata and `cat-motion.js` shares cropped frames by coat. There is no file-origin fetch, live mesh deformation, procedural cat squash or per-frame size normalization. The five drawn views mirror to eight floor octants. `pets.js` now routes cats directly in those eight directions, divides vertical displacement by the stage slope, scales speed with depth, and advances gait phase by traveled floor distance. Long trips/chases use the gallop. Turns finish at a contact and step through neutral view frames while stationary.

Directional jumps contain crouch, takeoff, gathered/reaching flight and landing/recovery. Floor jumps, pounces and declared ledge links use the same views; facing is locked during flight and scale is continuous across the supporting surfaces. Front stand/sit, loaf, curled sleep, wake, stretch and click perk have drawn transitions. The pickup action gets its own clock after the sit transition, so all eight perk frames play before following.

The public pet API and scene stage geometry remain intact: wandering, food/water, beds, shelter, follow/stalk/wiggle/pounce, pointer leave/return, Pets off/on, occluders, shadows, lighting, scene mirroring and depth sorting remain integrated. Stalking uses the slow walk cycle; wiggle alternates two drawn crouch frames. The older sequence/cycle code remains for dogs and pandas; atlas cats bypass it. The eight callers are Cats, Cafe, Cabin, Ramen, Records, Rooftop, Speakeasy and Grass (pandas in Grass are unchanged).

## Verification and corrections

- `node --test tests/*.cjs`: **106 passed**, no failures/skips. Coverage includes all eight routes, five jump views and mirrors, complete perk/stretch, shared frame caching, front rest/wake, pounce landing, feeding/shelter, Pets toggles, ledge links/depth and occlusion. Existing dog/panda and host/scene coverage was retained.
- Plain `./build.sh`: **passed**, producing only the local ignored `wallpap.app`. Existing duplicate `bowls` switch warnings remain. The app was never launched or installed.
- **24 isolated file:// WebKit integrations**: eight scenes × day/night/1920×800 mirrored night. Zero JS/image errors; all cats used the new atlases. Reports and visually inspected overview sheets are in `shots/cats-gpt/matrix/`.
- Five owner reels: **960×600, 30 fps, 45 seconds, 1,350 frames each**. Eight walks, eight runs, five floor-jump views, idle transitions, both ledge directions, real scene click/follow/stalk/wiggle/pounce and a night excerpt. Labels mark deliberate cuts; within each shot the engine runs continuously. The camera follows the cat for legibility.
- All 6,750 final encoded frames are decoded for verification. Orange motion was inspected in consecutive 20-frame pages, including corrected sequences. The other coats were inspected in encoded pose pages covering every distinct pose/direction/action/lighting combination (repeated holds/cycles collapsed), in addition to the sprite sheets and dark/light contacts. This is not a claim that every repeated video frame was individually judged by eye.
- Numerical art checks: all 760 frame bounds valid; exact cross-coat alpha and registration; walk silhouette area coefficient of variation **0.8–1.51%**. Orange walk fur medians: R223–227, G154–157, B88–100. These measurements supplement visual review; they cannot establish anatomical perfection.

Review led to concrete fixes: removed per-frame area normalization that enlarged curled cats; regenerated wrong-facing art; re-registered gallop contact/flight frames independently of source sheet row spacing; fixed the virtual-clock rounding error; stopped the review camera clipping toward runs; rendered setup before frame zero; fixed skipped stretch/perk frames and premature pickup expiry; anchored calico/Siamese facial markings to painted eyes so crouch/landing no longer whitens or relocates the face mask. Capture scripts stream to ffmpeg and delete raw PNG frames immediately, with a 5 GiB free-space guard.

## Performance

| Isolated WebKit measurement | Before | After | Change |
| --- | ---: | ---: | ---: |
| Total CPU, screenshot host + spawned WebKit processes | 5.6% | 5.9% | +0.3 percentage points |
| Total physical footprint | 165 MiB | 216 MiB | +51 MiB |
| WebContent CPU / footprint | 2.0% / 106 MiB | 1.9% / 165 MiB | −0.1 points / +59 MiB |

Same 1280×800 day scene, seed 19, real-time clock, eight-second warmup and 20-second sample using `tools/measure/wpmeter`. Owner wallpaper processes were excluded. These are single off-screen samples, which WebKit may throttle, not installed-app foreground or energy guarantees. The after sample was taken after atlas packing and run registration; subsequent changes affect pickup timing and coat pixels, not idle loading geometry. Raw measurements: `baseline-performance.json` and `after-performance.json` in the deliverables directory.

Packing each sheet to its actual cell extent reduced total decoded atlas dimensions from approximately 238 MiB to **69 MiB**. Shared cropped frames total **55 MiB** before browser/tint overhead. Runtime WebP payload is about **5.5 MB**. The extra memory over the old smaller animation set is real.

## Remaining visual limitations

This is an implemented and tested review candidate, not a declaration of flawless animation or owner acceptance of G4-CAT.

1. Turns use discrete neutral views at contacts. Large turns and changes between independently drawn action sheets still show a stepped change in head/body proportions. There are no dedicated in-between turning sheets.
2. Eight-frame walks/gallops have a stylized cadence; some diagonal contacts shuffle, and the gallop has strong extension. Strides are measured/calibrated, but residual foot slip and ambiguous overlapping legs remain. The strict no-persistent-sliding visual gate is not claimed passed merely because tests pass.
3. Calico body patches use approximate silhouette masks and can shift with strong deformation; the final face-tracking correction reduces the most conspicuous facial drift. Siamese retains faint tabby texture and simplified point boundaries from the shared painted source.
4. Sleep/loaf use held final drawings. Stalk has no separately authored crouched travel sheet; the existing slow approach behavior is preserved. Groom invokes the new stretch rather than a licking animation.
5. Native installed-app display/Space behavior and foreground performance were intentionally not exercised. No wallpaper settings, running app, other worktree, release or remote branch was touched.

## Reproduce the review

Requires macOS WebKit, Swift, ffmpeg, Python with Pillow; art rebuilding additionally uses NumPy/SciPy.

```sh
swiftc -O tools/wkshot.swift -o /tmp/cats-wkshot
OUT=shots/cats-gpt/final-raw END=41 python3 tools/cats-qa/video.py orange 12 showcase
OUT=shots/cats-gpt/final-raw END=4 python3 tools/cats-qa/video.py orange 22 night
# Repeat the two commands for black, grey, calico and siamese.
python3 tools/cats-qa/finish.py
python3 tools/cats-qa/review_frames.py shots/cats-gpt/orange.mp4
python3 tools/cats-qa/review_frames.py shots/cats-gpt/black.mp4 --poses
python3 tools/cats-qa/contact.py
python3 tools/cats-qa/matrix.py
python3 tools/cats-qa/quality.py
node --test tests/*.cjs
./build.sh
```

`finish.py` optionally uses a corrected `follow-final` capture for seconds 33.2–41; remove those optional local inputs when doing a fresh full render. Large intermediate videos, contact pages and imagegen masters stay ignored locally. Only the five small final MP4s, five owner contact sheets, overview evidence, metrics and README are committed from `shots/cats-gpt`.
