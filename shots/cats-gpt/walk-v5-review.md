# Walk v5 review — 2026-10-05

This integrates the owner's supplied six-drawing walk sheets for all five coats
and views. The approved runs, jumps, rests and transitions are preserved. No art
was generated; interrupted v4 files and unrelated owner files were left alone.

## What changed

- Border flood fill plus connected subjects preserves white chest/paws. The side
  ground stroke and three enclosed near-view paper gaps are explicitly removed.
  Recolours share orange's exact silhouette. A selective two-source-pixel interior colour
  extension removes lighter neutral paper matte while preserving dark paw outlines before resizing; lossless WebP keeps edges
  and markings out of lossy compression.
- Torso matching excludes tail/feet from registration. Each view has one fixed
  scale; the shared supporting-paw baseline follows torso translation rather
  than normalizing each frame's lowest bounding-box row. This removed the
  conspicuous vertical bounce in the first diagonal draft.
- Per-channel mean/std transforms match dark/orange/light fur to approved run
  contact drawings and the front standing rest entry. The transform is shared
  across a whole clip, preserving texture and avoiding per-frame colour pumping.
- Calico toward uses **source drawing 3** for the head/torso patch field in all
  six frames. Its dark eye patch agrees with the approved front run/rest.
  Legs/paws remain white; tail remains orange. Near-view lower legs are white
  throughout to remove the intermittent generated foreleg patch. Other calico
  views and Siamese points retain their supplied stable large-scale markings.
- Playback and turn completion now derive frame count from the clip. Six walk
  drawings are held, with no tweening or procedural limb movement. The global
  unit is fixed at **0.52** so no approved action is resized by a new walk.

The registered front-head dark-patch mask overlaps source frame 3 by only
**0.067–1.000** in the uncorrected sheet (the patch switches sides). In the final
atlas the overlap is **0.879–1.000**; its centroid stays at x131–133 instead of
jumping between x66 and x135. This supports removal of the gross flip, not a
claim of pixel-identical facial shading. Reproduce with
`python3 tools/cats-qa/walk_v5_markings.py`; data:
[walk-v5-calico-markings.json](walk-v5-calico-markings.json).

## Stride and its limits

| View | Scene units/cycle | Cycle at engine speed 48 | Drawings/second |
| --- | ---: | ---: | ---: |
| Side | 28.82 | 0.600 s | 9.99 |
| Near | 51.42 | 1.071 s | 5.60 |
| Far | 39.99 | 0.833 s | 7.20 |
| Toward | 48.27 | 1.006 s | 5.97 |
| Away | 48.27 | 1.006 s | 5.97 |

`tools/cats-qa/walk-v5-data/calibration.json` records manually identified painted
paw centers, torso shifts, scale, fit and residuals. Side's four sampled stance
exposures have a 3.34×2.41 scene-pixel residual range; far's four have
4.00×3.17. Near and toward have only two unambiguous samples, so their small fit
residuals do **not** establish a good whole-cycle contact trajectory. Rear stance
ordering is ambiguous; away explicitly shares toward's cadence instead of
claiming a measured rear stride.

**The strict no-sliding gate is not passed.** The supplied poses contain uneven
stance travel and repeated foreleg positions, particularly side/front/rear.
There is visible foot shuffle at some exposure changes and during held drawings
as the body translates. Full limbs change drawn shapes, but several foreleg
phases have a smaller sweep than the hind legs. Changing cadence cannot correct
inconsistent paw trajectories in the supplied art. No new poses, tweening or
limb deformation were introduced to conceal this.

## Encoded-frame review

Ten final MP4s contain 600 frames each: five close-ups and five full-scene clips.
All eight directions use the production scene/path/pose engine; left directions
use its actual mirror mapping. The final 5.6 seconds exercise rest → walk → run
→ walk → sit without a cut. Run-to-walk waits for a contact, making the last
walk brief before the sit. Frame reports include pose, phase, position, scale,
direction, engine state and errors.

The review tool decodes **every encoded frame**. `walk-v5-review/` holds indexed
pose pages and consecutive 30 fps cycle pages. Visual inspection covers distinct
poses/directions/transitions for every coat, uninterrupted cycles for orange and
calico, normal-zoom overview frames, and dark/light alpha composites. Repeated
holds and repeated cycles are not all individually judged by eye; decoding all
frames is a separate completeness check. Intermediate review pages stay ignored
locally; they can be regenerated from the committed videos and JSON.

The first draft was inspected, then corrected for near/far vertical registration,
calico eye-patch identity and matte edges. Final renders were regenerated after
those corrections. No detached ground line or sizeable alpha speck remained.
Small source-painted texture/outline changes remain at very large magnification.

## Remaining visual issues

1. Residual sliding and uneven support order described above. Zero sliding and
   anatomically perfect stride continuity are not claimed.
2. New sheets differ from the approved sheets in drawing style, eye emphasis,
   head/body proportions and some marking boundaries. Fur grading and fixed
   scale reduce the change but do not make action/view switches seamless.
   Six-frame view turns remain discrete. The front tail is higher than in rests.
3. Calico's gross front patch flips are removed. Smaller patch-edge/texture
   changes in other supplied views, and fine Siamese point/stripe detail, remain.
4. This is isolated off-screen WebKit QA. No installed-app foreground/Space
   behaviour or energy guarantee is inferred from these measurements.

## Verification and performance

The final `node --test tests/*.cjs` run passes **108/108**, zero failures, in
22.7 seconds. An intermediate concurrent run hit the existing native Swift
compile timeout (`spawnSync swiftc ETIMEDOUT`); the final run was made after
rendering stopped, without changing the test or its timeout.
Final results are recorded in `walk-v5-verification.json`, `walk-v5-tests.log`
and `walk-v5-performance.json`. The scope check compares against commit
`708bedd27536e96b79f0b1d802871d186539aef0`: 70 non-walk atlas byte hashes,
70 non-walk manifest/runtime entries and all five global units are unchanged.
All 150 new walk rectangles are valid, with exact cross-coat alpha and anchors.

Packed atlas decoded size changes **69.69 → 68.01 MiB**; cropped-frame backing
size **55.56 → 53.86 MiB**; encoded payload **5.33 → 6.67 MiB** (lossless walks).
These are image-storage estimates, not browser physical footprint.

Performance is sampled with the same `perf.py` method as the prior numbers:
1280×800 day, seed 19, real clock, 8-second warmup, 20-second sample; only the
isolated screenshot process and newly spawned WebKit processes are included.
Render jobs are stopped before measurement. Prior result: **5.9% CPU / 216 MiB**
total, with WebContent **1.9% / 165 MiB**. The installed wallpaper is excluded.

Final sample: **5.4% CPU / 208 MiB** total; WebContent **1.9% / 162 MiB**.
Compared with the previous sample this is −0.5 percentage points CPU and −8 MiB
total footprint. This single short sample shows no measured regression; it is
not a claim of a statistically established improvement. Root free space remained
above the 5 GiB stop threshold (33 GiB at completion).
