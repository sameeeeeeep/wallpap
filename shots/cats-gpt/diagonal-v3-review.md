# Diagonal v3: whole-limb correction

The owner's second review identified the actual remaining problem: the legs
acted like stiff posts, with most motion confined to paws. The former guide
placed its intermediate joints halfway between a fixed root and each foot;
that did not describe elbow folding or a knee/hock chain.

This pass changes only ten `walk-near.webp` / `walk-far.webp` atlases and their
metadata. The other 85 atlas files, other clip metadata, `pets.js` and
`cat-motion.js` match baseline `b14b487c3c2acbaf7bf696acce02c8227fcc07ce`.
See `diagonals-v3-scope.json`.

## What changed

New eight-frame pose charts specify four articulated limbs in every drawing.
The front upper leg swings at the shoulder with elbow recovery; the hind upper
leg swings at the hip, the knee/hock fold for clearance, then extend in stance.
The chart uses the approved side walk's LH–LF–RH–RF contact order and phases.
Built-in imagegen repainted the charts as whole sprite sheets. A repeated-reach
attempt was rejected; a guided pair was shortened and regenerated to bring its
stride closer to the side reference.

One uniform .5 scale and head/upper-torso translation registration preserve size.
The orange palette is matched to the approved side; established coat transforms
retain the black/amber, grey tabby, calico and blue-eyed Siamese identities.
The coat review caught color changes on calico legs as bounding boxes varied,
and cream tips on tightly folded Siamese paws. The diagonal-only builder now
registers calico body patches in root coordinates and preserves orange/white
paint on exposed limbs. Siamese sock pixels are tracked at the pose-chart paw
locations to retain dark tips in recovery. The shared coat function and all
approved non-diagonal sheets are unchanged.

No runtime rig, interpolation, body warp or replacement of approved actions.
Prompts, pose charts and lossless selected sources are in
`../../tools/cats-qa/diagonal-v3-src/`.

## Files and how to watch

`diagonals-v3-<coat>.mp4`: **15 seconds, 30 fps, 1260×600**, three simultaneous
close-ups: approved side, toward diagonal, away diagonal. The second half mirrors
all three views, with a labelled cut at 7.5 seconds. The actual production loader,
cropped sprite canvases and `LW.cats.pose` run in isolated file-origin WebKit.

All three panels use a one-second cycle so their phases can be compared directly.
The floor grid travels at each view's measured stride: side 36, near 37.47,
far 34.03 scene units/cycle. This is a motion inspection harness, not a capture
of autonomous wandering. It exposes source-pose contacts without scene clutter.
The runtime still advances phase by actual travel distance using these strides.

`diagonals-v3-<coat>-strip.jpg` contains all eight distinct encoded near poses and
all eight far poses. The `-frames/` directories contain every 30 fps exposure of
one right-facing and one mirrored cycle for each diagonal, including holds.
JSON records retain each exposure's phase, pose, direction and traveled distance.

## Frame review and practical limits

Near cycle: frames 1–2 show front elbow recovery; 3–6 reach/plant and backward
stance; 6–8 show the near hind leg gathered with visible hock flexion. Far cycle:
1–6 extend the near hind leg rearward in stance, 7–8 fold/lift it into recovery.
Opposite limbs follow the half-cycle offset, with LH/LF/RH/RF plants at drawings
1/3/5/7. The outer thigh and foreleg silhouettes change, not just the sock tips.
Upper-body registration has no sheet-row jump; all coats share the same geometry.

This is improved articulation, **not a claim of perfect natural locomotion**:

- Eight drawings still step at close magnification. Continuous travel during a
  held drawing produces visible small contact slip; the no-sliding gate is not
  fully passed. No hidden correction was added to make the comparison look better.
- Measured visible near-side paw residual ranges are up to 2.60 scene pixels
  toward and 1.53 away. Partly hidden far-paw measurements reach 4.18 and 3.94
  pixels respectively and are less trustworthy where socks overlap.
- Front reach and hind folding are stronger, but head bob/shoulder roll remain
  restrained and the rear view still hides portions of the far limbs. Black is
  harder to read where its dark legs overlap.
- Calico/Siamese marking transforms remain approximate despite the diagonal
  correction; these are not independently hand-painted per-coat anatomy maps.

Silhouette area CV is 2.82% near / 3.77% far. The diagonal area sanity bound is
now 4%, with 2.5% retained for other walks. Exposed versus folded limbs change
silhouette area; this is not corrected by resizing the cat, and the numerical
bound is not an anatomical acceptance test.

## Verification

107 Node tests passed, with zero failures/skips. All 760 atlas frames retain valid
bounds; all coats have identical alpha and registration. The scope comparison
confirms approved actions remain unchanged. All 2,250 final encoded frames were decoded. Consecutive pages were visually
inspected for 600 diagonal exposures: frames 0–29 and 225–254, both near and far,
in each of five coats. This includes held frames and the mirrored loop wrap;
repeated cycles elsewhere in each video were not individually judged by eye.
Calico and Siamese final pages were reviewed again after their marking fixes.
Encoded-frame metadata is recorded in the matching `-quality.json` files.

Capture checks free space before each coat and after every frame, stops below
5 GiB, streams frames to ffmpeg and deletes each raw PNG immediately. No install,
app/settings operation, other worktree change, push, release or stash.
