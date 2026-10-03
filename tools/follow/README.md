# Pet FOLLOW verification

Use the existing source dev server on port 5210 and the isolated `tools/wkshot`
helper. These commands do not build or interact with the installed wallpaper app.

```
node --test tests/*.cjs
python3 tools/follow/capture.py
python3 tools/follow/capture-angles.py
python3 tools/follow/smoke.py
python3 tools/follow/audit.py
```

`capture.py [cats|speakeasy]` scripts real `__lw('move'/'down')` input for pick,
lateral/toward/away following, runs, stalk→wiggle→pounce, two picks, release,
leave/return and focus pause. It captures 80 frames per scene/light. Set
`SHOT_LIGHT=night` to repeat one lighting run. A failed/incomplete run is not accepted;
wkshot has a 60-second timeout, so rerun that run when machine contention delays it.

`capture-angles.py` isolates the new front/back runs and all three hunt/pounce
views (orange cat in Santorini, golden dog in Speakeasy), 30 frames per scene/light.
`smoke.py [scene...]` checks actual input coordinate conversion, pick/release and
travel in all eight scenes at 2000×850 with the left widget/mirrored layout.
Grass keeps its existing lateral-only panda art and follows on its current lane;
the new three-view hunt/bounce artwork belongs to the seven cats/dogs.

Each capture deletes its raw PNGs after producing JPEG grids. All scripts stop if
free disk space falls below 3 GiB. `audit.py` checks retained log coverage, complete
capture counts, no reported overlaps/errors, two-pick/release/pause transitions,
and three pounce landings within two scene pixels in each day/night run.

Art reproduction: `python3 art-src/follow/install.py`. Exact ImageGen prompts,
lossless masters, cycle registration and sequence geometry are in `art-src/follow/`.
