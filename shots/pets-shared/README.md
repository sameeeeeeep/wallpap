# Shared pets — local acceptance, 2026-10-04

All eight pet scenes use one runtime and roster. Golden and corgi have new front/back
walks (8 frames/view) and jumps (5 frames/view); existing side jumps are retained.
Pandas remain private to Grass and travel laterally only.

506 captured sequence frames: 16 day/night runs × 29 frames, 2 exact-calico runs × 9,
and 8 ultrawide/left-widget runs × 3. Contact sheets were opened and visually inspected.
`node --test tests/*.cjs`: 60 passing (see tests.log).
Captured reports contain no JS errors or detected pet overlaps. Eight control runs
verify leaving, staying off through reminders/count changes, returning and rain.

Per scene, open `day-contacts.jpg` / `night-contacts.jpg` for close-ups and `day-0.jpg`
through `day-4.jpg` (also night) for full composition. These show lateral/toward/away
walking, three jump views, linked perch jumps, encounters and resting prop occlusion.
Panda depth requests deliberately remain lateral. Pets pass in wide lanes and wait in
narrow ones; the unit suite separately requires a same-lane crossing to finish.
`cats/calico-takeoff-{day,night}.jpg` shows 0.00s/0.20s at identical takeoff scale and
correct foreground bowl order after landing. `wide-left-night.jpg` covers each scene's
ultrawide placement/mirroring without duplicated animals.

Frame timing uses the pre-migration scene and pet-motion.js at `03719de`, fixed noon,
1200×750, 90 warm-up frames, then seven 90-frame batches with canvas/GL completion.
These are median elapsed milliseconds per simulated frame, not installed-app FPS.
Raw samples and method details: `performance.json`, `../../tools/pets-shared/README.md`.

| Scene | Before ms | After ms | Change |
|---|---:|---:|---:|
| cats | 0.889 | 0.844 | -5.0% |
| cafe | 1.322 | 0.456 | -65.5% |
| records | 1.378 | 1.144 | -16.9% |
| ramen | 2.722 | 1.411 | -48.2% |
| rooftop | 2.733 | 2.089 | -23.6% |
| speakeasy | 4.844 | 4.100 | -15.4% |
| cabin | 2.311 | 2.256 | -2.4% |
| grass | 4.578 | 4.289 | -6.3% |

Evidence footprint: 30.2 MiB; raw capture PNGs removed. Disk stayed above
3 GiB free. `audit.json` records completeness. Reproduce with `tools/pets-shared/`.
No app build/install/relaunch, host Swift changes, push or release was performed.
