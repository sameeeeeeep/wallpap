# Dog directional art — 2026-10-04

Generated with the built-in image generation tool, style-referenced to
`art-src/cycles/dog-golden-walk.png` and `dog-corgi-walk.png`.

Walk brief: two rows of eight evenly spaced, distinct four-beat walk frames. Top row:
3/4 front moving toward camera/right, ground heading 29 degrees; bottom row: 3/4 back
moving away/right. Keep the existing painted style, character markings, camera,
body/head size and feet baseline fixed. Transparent background; no contact shadows.
Golden retains red collar and gold tag; corgi retains orange/white patches and short legs.

Jump brief: two rows of five distinct drawn frames: crouch, spring, tucked apex,
reaching legs, landing crouch. Same 3/4 front/back views and character references as
walks. Fixed head/body size and camera, no foreshortening zoom. Flat neutral #e6e6e6
background, no floor, glow or shadows. The first golden jump generation was rejected
for brown halo/background contamination; `golden-jump.png` is the accepted replacement.

`install.py` cuts from immutable masters, registers feet and body scale, and installs
runtime assets. Golden walk frame 2 requires explicit lobe selection because its forepaw
crosses the torso split. Plant QA measures selected source paw landmarks; it is not a
substitute for watching the rendered runtime sequence.
