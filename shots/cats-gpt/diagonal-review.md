# Diagonal follow-up — 2026-10-05

Owner verdict on the original reels: “Diagonal walk is glitchy, rest is okay.”
Everything outside the diagonal walks remains approved and unchanged.

## Root cause

This was primarily an art/registration problem, not direction switching or a
broken clock. The original toward sheet spent several drawings reaching with the
same foreleg, followed by a compressed recovery. The original blocking's paw axes
were (24,26) toward and (24,-19) away, steeper than the floor's (1,±.55) projection.
A scalar playback-speed adjustment could not cancel that two-axis mismatch.
The rear walk also moved the upper body between sheet rows: its frame anchors
changed from y=155 to y=168, carrying source placement into the rendered cycle.
The original encoded diagonal passes held a stable view; no mid-stride octant
switching was found there. Floor-distance/depth compensation was already correct.

## Correction and iteration

Generated one complete eight-frame sheet for each of the two diagonal views using
built-in imagegen, matching the approved orange side art. Rejected two near-view
attempts that repeated the extended foreleg. The selected outputs repaint explicit
four-beat paw blocking along (38,±20.9), with alternating stance/swing.

Registered each drawing by its head/upper torso using translation only, then one
uniform scale for the entire sheet. A 32-source-pixel row offset in the new near
sheet was caught and removed. No per-frame size normalization, mesh deformation,
or moving-still workaround is used. The near drawing is slightly more side-on than
the old near view, making the opposing limbs readable.

Matched orange fur to the approved side palette, then applied the existing coat
palettes/markings to the exact same alpha and geometry. Black retains amber eyes;
grey retains tabby/white socks; calico retains orange/black/white patches; Siamese
retains cream fur, dark points and blue eyes. Mirrors use the same corrected cells.

An initial capture used the guide's stride. A second measurement fitted actual
painted stance paw centroids to the floor axis, resulting in **43.47 near / 39.78
far scene units per cycle**. The five deliverables were re-rendered after this
calibration. At the measured drawn exposures, residual paw-centroid range is
about **1.21×1.68 scene pixels near / 0.61×1.72 far** at unit depth. This measures
one clearly visible stance paw per view, not every sole/contact or every held
video exposure; it is not a zero-slip claim.

## Frame-by-frame visual checks

The final orange close-up was decoded at its native 30 fps. Every consecutive
frame in these ranges was opened in contact pages, including held exposures and
the loop seam (indices are zero-based):

| Heading | Frames | Observations |
| --- | --- | --- |
| Toward-right | [0–15](diagonals-orange-review/pass-00-0.jpg), [16–28](diagonals-orange-review/pass-00-1.jpg) | Forepaw recovery, contact, rearward stance and crossing checked; head stays registered; no repeated reach/pop at the loop. |
| Away-left | [60–75](diagonals-orange-review/pass-01-0.jpg), [76–85](diagonals-orange-review/pass-01-1.jpg) | Hindpaw sweep and lift checked; no row-4→5 body lift; sole stays visible throughout the review crop. |
| Toward-left | [120–135](diagonals-orange-review/pass-02-0.jpg), [136–148](diagonals-orange-review/pass-02-1.jpg) | Mirrored complete cycle; correct travel-facing, consistent limb overlap and same ground sweep. |
| Away-right | [180–195](diagonals-orange-review/pass-03-0.jpg), [196–205](diagonals-orange-review/pass-03-1.jpg) | Mirrored rear cycle and wrap; stable head/torso position with distinct rear-leg recovery. |

The initial corrected captures for black, grey, calico and Siamese were inspected
through complete near/far cycles, including every held exposure. Final captures
were decoded again after the stride adjustment; the final eight-pose contacts
for both corrected views were also visually inspected for every coat. All coats have identical alpha,
registration and phase behavior; the stride change does not alter coat pixels.
Black's overlapping legs are less readable because of its dark fill. Calico's
facial patch and Siamese face points stay attached to the head in these cycles.

Diagonal runs were examined through complete near/far cycles, including
extension/contact/gather and the loop seam. They have the approved exaggerated
gallop but not the walk's sheet-row offset/repeated stance defect. All run art,
strides and runtime were left untouched. The final reels include all four runs.

Each close-up is **600 frames, 20 seconds, 30 fps, 960×600**: two 2-second passes
per diagonal over the same floor segment and back (labelled cuts), then four
1-second diagonal runs. The follow camera is based only on the world position,
not the sprite pose. Raw PNGs are deleted immediately after they are streamed to
ffmpeg; review extraction decodes into memory and retains JPEG pages only.

## Verification and scope

- `node --test tests/*.cjs`: **107 passed**, including new coverage for all coats,
  four diagonals, walk/run, three floor slopes and two depth scales. This tests
  stable headings and phase versus actual floor distance, not visual anatomy.
- All 760 atlas frames have valid bounds and exact cross-coat alpha/geometry.
  New walk area CV is 2.68% near / 2.43% far. The near sheet exceeds the old 2.5%
  area check because of exposed legs; the diagonal bound is now 3%, with the
  original 2.5% retained for other walks. Uniform scale prevents size pumping.
- Only **ten walk atlases** and their near/far metadata changed. The other **85
  approved atlases**, all their metadata, global scale, `pets.js` and
  `cat-motion.js` are unchanged against the starting commit.
- Full orange reel is freshly captured day and night, with no old follow splice.
  All 1,350 encoded frames were decoded; all 332 distinct pose/action/lighting
  records were visually reviewed across 12 contact pages. For the first 33.2
  seconds, 848 non-diagonal state records were compared with the original reel:
  pose, state, direction, view and frame match; one position differs by 0.01
  scene units from rounding. Review/coverage results are in `video-quality.json`
  and the updated README.
- Disk checks remained well above 5 GiB. No install, push, release, owner app,
  settings change, stash, or other worktree operation.

## Remaining imperfections

Eight drawings still have a visible stepped cadence at close zoom; held drawings
slide slightly between frame changes. Small painted-paw deviations remain, and
far-side limbs overlap in several poses. The new toward view's proportions differ
slightly from the old view at action changes. Existing calico mask approximation,
faint Siamese tabby texture, discrete turns and exaggerated gallop remain as
approved. This fix is delivered for review; owner acceptance is not assumed.

## Reproduce

```sh
python3 tools/cats-qa/diagonal_atlas.py
python3 tools/cats-qa/manifest.py
python3 tools/cats-qa/quality.py
python3 tools/cats-qa/render_diagonals.py
node --test tests/*.cjs
```

Capture requires the existing `/tmp/cats-wkshot` binary; rebuild it with
`swiftc -O tools/wkshot.swift -o /tmp/cats-wkshot` if absent. Sources, selected
prompts and calibration are in `tools/cats-qa/diagonal-src/`. Final per-frame
metadata and exact review indices are in `diagonals-<coat>.json` and
`diagonals-<coat>-quality.json`. `diagonal_review.py` reproduces the review pages.
