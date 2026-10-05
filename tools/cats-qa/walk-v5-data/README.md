# Walk v5: supplied art, deterministic integration

Inputs: `art-src/walk-v5/<coat>-<view>.png`, six ordered drawings in one row.
The owner's Magnific recolours derive from the orange Muybridge Plate 716 study;
no new image generation or prompt was used in this integration. Rejected source
variants and interrupted walk-v4 tools are ignored. Source hashes are recorded in
`shots/cats-gpt/walk-v5-verification.json`; owner source directories stay untracked.

Rebuild from this worktree (NumPy/SciPy/Pillow already present):

```sh
python3 tools/cats-qa/walk_v5.py
python3 tools/cats-qa/manifest.py
swiftc -O tools/wkshot.swift -o /tmp/cats-wkshot -framework AppKit -framework WebKit
python3 tools/cats-qa/render_walk_v5.py close
python3 tools/cats-qa/render_walk_v5.py full
python3 tools/cats-qa/walk_v5_verify.py
python3 tools/cats-qa/walk_v5_edges.py
python3 tools/cats-qa/walk_v5_markings.py
python3 tools/cats-qa/review_walk_v5.py orange
python3 tools/cats-qa/review_walk_v5.py calico
# Repeat review for black, grey, siamese, and each coat with --full.
node --test tests/*.cjs
python3 tools/cats-qa/perf.py walk-v5
```

`before-sha256.json` and `baseline-commit.txt` pin the original approved assets.
The builder only writes 25 walk atlases and their entries in the five manifests.
The manifest packer preserves the approved global unit `78/150 = 0.52`.

Extraction uses border-connected neutral-paper flood fill and the six largest
connected subjects. The side ground stroke needs extra exterior seeds between
feet, followed by a two-source-pixel opening. Three enclosed paper gaps between
crossing near-view legs have explicit exterior seeds. Every coat shares orange's
exact alpha; white chest/paws cannot disappear from a recolour. Only lighter neutral contamination within the outer two
source pixels is filled from the nearest interior colour to remove matte fringe
before Lanczos downsampling. Lossless WebP avoids edge/patch compression noise.

Upper-torso template matching establishes translations; the tail and swinging
feet do not set horizontal registration. One scale per view matches the approved
run/standing ear-to-paw size; the raised front tail is excluded from height
matching. A single median supporting-paw baseline plus torso translation keeps
the head stable while paws retain their drawn projected depth. No frame is
individually resized, no limb is rigged, no pose is interpolated.

Calico toward uses the **third drawing** as the marking template: its image-right
dark eye patch agrees with the approved run/rest identity. The same head/torso
field is translated into all six drawings, retaining current outlines/eyes/ears;
legs stay white and the raised tail stays orange. Calico near has white lower
legs in all phases, removing the generated intermittent dark foreleg patch.
Side/far/away patches and Siamese points were checked and retained; small painted
boundary/texture changes remain. Source/target per-channel fur mean/std are in
`calibration.json`. Transforms are shared across all frames of a coat/view and
separate dark/orange/light fur so a changed patch area cannot recolour the cat.

Stride fits use recorded source-pixel stance centers, registration, atlas scale,
0.52 scene units/pixel and the projected `.55` floor slope. Side/near/far/toward
strides are 28.82 / 51.42 / 39.99 / 48.27 scene units; rear shares toward's 48.27
cadence because its supporting-paw order is ambiguous. At speed 48 this is
0.600 / 1.071 / 0.833 / 1.006 seconds per cycle (6 discrete held drawings).
The calibration file is evidence of selected spans, **not proof that all four
feet are planted**. Near/toward fits have only two unambiguous samples. See the
review's remaining limitations before claiming zero sliding.
