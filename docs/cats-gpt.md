# Painted cat motion replacement — cats-gpt

## Plan and acceptance

1. Baseline: preserve current worktree art references/QA inputs, record tests and isolated WebKit CPU/memory. Never operate the installed app.
2. Orange art: one sheet per animation/view, five views (side, near, toward, far, away), mirrored for eight floor directions. Eight-frame lateral walk, gallop, crouch/takeoff/flight/landing; front sit, curled sleep, loaf, perk and drawn transitions. Inspect registration, anatomy, scale, color and edges before extending coats.
3. Runtime: image/script loading compatible with file://; shared cropped WebP atlases and explicit anchors; floor-aware eight-direction routes, distance-driven gait, turns at contact, preserved public pet API and scene behaviors.
4. Coat variants: retain orange-white tabby, amber-eyed black, grey tabby, calico, blue-eyed cream/dark-point siamese.
5. Verify: isolated WebKit 30 fps MP4s, inspect extracted frames, iterate; scenes day/night/mirror/wide; behavioral tests, no moving stills; before/after measurements.
6. Deliver: five 30–45 second reviews plus contact sheets under shots/cats-gpt, honest remaining defects, reproducible scripts and logical local commits. No push/install/release.

## Baseline

The requested scenes/pet-roster.js does not exist. The immutable common roster is in scenes/pets.js. Initial untracked directories art-src/cat-refs and tools/cats-qa predate this task and are retained. Existing cats use three views and six travel rays; vertical paths zigzag. Existing video.py advances 24 fps captures on rounded 30 Hz increments, and wkshot has a fixed 60-second timeout.
