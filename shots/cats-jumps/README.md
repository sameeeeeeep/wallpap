# Santorini Cats directional jumps — WebKit evidence

Open `review-<coat>-<day|night>-0.jpg` for crouch/push-off/flight/reach and
`review-<coat>-<day|night>-1.jpg` for reach/landing/walk. Each has six rows:
side right/left, front right/left, back right/left. All sixteen captured frames
appear across the pair. `*-contact.jpg` keeps more scene context.

- Matrix: five coats × three views × two facings × day/night = 60 sequences.
- Extra cases: real wall descent, bench approach/hop and toy pounce at day/night;
  one failed rear-jump image, pure-depth movement and mirrored scene at night.
- Every sequence uses the real `./tools/wkshot` with `WKSHOT_FRAMES` (16 frames).
  JSON and logs retain frame names, directions and browser errors.
- `art-contact.jpg`: walking reference followed by the five generated jump poses.
- `tests.log`: `node --test tests/*.cjs`.
- `summary.json`: audit results and storage measurements.

Reproduce with a static server serving `scenes/` on localhost:5210, then run
`python3 shots/cats-jumps/verify.py`, `python3 shots/cats-jumps/verify-extra.py`,
`python3 shots/cats-jumps/focus.py`, and `python3 shots/cats-jumps/audit.py`.
The matrix resumes existing contact sheets. Delete only a case's contact JPEG to
recapture it. The initial matrix used a 1600×1000 viewport. Remaining captures use 1200×750
(the same 1600×1000 logical scene) and serial execution to fit WebKit's 60-second
screenshot timeout under concurrent system load. Interrupted cases were retried. Raw PNG captures are deleted
after JPEG assembly. Capture scripts stop below 3 GiB free or above 480 MiB
of temporary evidence; the final audit requires less than 500 MiB and no raw PNGs.
