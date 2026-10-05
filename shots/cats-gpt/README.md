# Painted cats — diagonal fix review

Owner approved the original reels except the diagonal walks. Only those walks
were replaced; the other 85 atlases and runtime remain unchanged.

| Coat | New diagonal close-up | Encoded poses |
| --- | --- | --- |
| Orange | [diagonals-orange.mp4](diagonals-orange.mp4) | [contact](diagonals-orange-contact.jpg) |
| Black | [diagonals-black.mp4](diagonals-black.mp4) | [contact](diagonals-black-contact.jpg) |
| Grey | [diagonals-grey.mp4](diagonals-grey.mp4) | [contact](diagonals-grey-contact.jpg) |
| Calico | [diagonals-calico.mp4](diagonals-calico.mp4) | [contact](diagonals-calico-contact.jpg) |
| Siamese | [diagonals-siamese.mp4](diagonals-siamese.mp4) | [contact](diagonals-siamese-contact.jpg) |

Each is **20 seconds, 30 fps, 960×600**: toward-right, away-left, toward-left,
away-right (0–8s), the same four passes again (8–16s), then all four diagonal
runs (16–20s). Labelled cuts pair opposite passes over the same floor segment.
The cat is enlarged so the legs are easy to inspect.

[orange.mp4](orange.mp4) is also a fresh **45-second full regression reel**, with
the original day/night timeline below. The other four original full reels and
original contact sheets below are retained as historical approved references.

Root causes: incorrect diagonal paw trajectories, repeated foreleg reaches and
sheet-row registration wobble. Two new whole-cycle sheets were registered,
colour-matched and propagated to all five coats. Painted-paw measurements set
the new stride. **107 tests pass.** Complete consecutive 30 fps cycles were
visually inspected in every orange diagonal, with near/far coat-cycle checks.

See [frame-by-frame findings and remaining imperfections](diagonal-review.md),
[before/after drawings](diagonal-before-after.jpg), and the per-coat JSON frame
records/quality reports. Some eight-frame stepping, small contact slip and
occluded far legs remain; no claim of perfect foot locking or owner acceptance.

## Original full-reel timeline and references

Five **45-second, 30 fps, 960×600** videos captured from this worktree's actual
`file://` scenes in isolated macOS WebKit. The camera stays close to the cat.
Labels mark intentional cuts between demonstrations.

| Coat | Video | Direction/action contact sheet |
| --- | --- | --- |
| Orange tabby | [orange.mp4](orange.mp4) | [orange-contact.jpg](orange-contact.jpg) |
| Black, amber eyes | [black.mp4](black.mp4) | [black-contact.jpg](black-contact.jpg) |
| Grey tabby | [grey.mp4](grey.mp4) | [grey-contact.jpg](grey-contact.jpg) |
| Calico | [calico.mp4](calico.mp4) | [calico-contact.jpg](calico-contact.jpg) |
| Siamese, blue eyes | [siamese.mp4](siamese.mp4) | [siamese-contact.jpg](siamese-contact.jpg) |

Every video uses the same timeline:

| Time | Demonstration |
| --- | --- |
| 0:00–0:10 | Walk in eight floor directions |
| 0:10–0:17.6 | Run in eight floor directions |
| 0:17.6–0:23.6 | Five drawn jump views (other side mirrors) |
| 0:23.6–0:29.6 | Front sit, loaf, curled sleep, wake and stretch |
| 0:29.6–0:33.2 | Jump onto and down from the parapet |
| 0:33.2–0:41 | Actual click perk, follow, stalk, wiggle, pounce and recovery |
| 0:41–0:45 | Night walk, run, jump and front sit |

Each matching `<coat>.json` records every encoded frame's engine state, camera,
pose, facing and errors. `video-quality.json` verifies coverage and 1,350 frames
per video. Contact sheets show all eight directions for walk/run/jump plus idle
and transition poses against light and dark backgrounds.

## Original-run verification (historical)

- 106 Node tests; plain local `./build.sh`; 24 file-origin WebKit integrations
  across the eight pet scenes, day/night and mirrored ultrawide.
- All 760 atlas frames have valid bounds and identical cross-coat geometry/alpha.
  Walk silhouette area variation is 0.8–1.51%; see `art-quality.json`.
- All 6,750 encoded video frames were decoded. Orange was inspected in consecutive
  contact pages, including corrected sequences. The other coats were inspected
  in encoded pose pages covering distinct pose/direction/action/lighting states,
  with repeated cycles and held poses collapsed. Repeated frames were not all
  individually judged by eye. Raw PNGs were deleted after encoding.
- Isolated off-screen CPU **5.6% → 5.9%**, physical footprint **165 → 216 MiB**.
  Same 1280×800 day setup, eight-second warmup, 20-second sample; owner app excluded.
  Single samples, potentially throttled by WebKit, not foreground-app guarantees.
  See `baseline-performance.json` and `after-performance.json`.

## Original-run limitations (historical; diagonal update above)

The owner subsequently approved everything except the diagonal walks; see the correction above.
Large turns and changes between separately drawn action sheets can look stepped.
Some diagonal feet shuffle and the stylized gallop has strong extension; the
strict no-sliding visual gate is not claimed passed. Calico body patches can
shift during deformation; Siamese retains faint tabby texture. Facial mask drift
found during review was corrected and those reels re-rendered. Rest endpoints
are held drawings, stalking uses slow walk, and grooming uses stretch.

The installed wallpaper was not changed, launched, or measured. No push, release
or installation was performed. Full implementation notes, corrections and
reproduction commands: [docs/cats-gpt.md](../../docs/cats-gpt.md).

`matrix/` contains integration reports and three overview sheets. Large raw
captures, intermediate reels, frame-review pages and imagegen masters remain
ignored locally; only the final small videos, contacts, frame metadata and
verification summaries are committed.
