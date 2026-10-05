# Diagonal walk v3 sources

Owner request: whole-limb motion, preserving the approved side cycle and all
other actions. Only near/far walk art and metadata ship differently.

`near-cut.webp` and `far-cut.webp` are lossless copies of the selected built-in
imagegen outputs, including their native alpha. The name means production source;
these final sources did **not** require background removal. Some preview tools
show their brown RGB in transparent pixels; proper alpha compositing is clean.
Exact prompts, original generated filenames and rejection prompt: `prompts.json`.

The deterministic guide uses the approved cycle's eight phases, contact offsets
LH=0, LF=.25, RH=.5, RF=.75, duty=.625. Each frame defines all four shoulder/elbow
or hip/knee/hock/paw chains in `near-joints.json` / `far-joints.json`.
Forelegs solve a two-bone sagittal skeleton; hind legs explicitly swing the thigh
and bend the knee/hock. Projection follows (1,+.55) toward and (1,-.55) away.
These are offline blocking charts, **not runtime procedural limbs**. Imagegen
repaints the whole chart as eight actual connected, painted sprite frames.

The first unguided sheet repeated the same foreleg reach and was rejected.
A first guided pair used a longer sweep (measured 40.50/39.30 floor units/cycle).
The selected shorter-step pair is 37.47/34.03, closer to the side reference's 36.
Paw measurements fit the painted result, not an assumption that the generator
obeyed the chart exactly. Hidden far paws are less reliable measurements.

`near-body.png` / `far-body.png` retain the previous diagonal's first frame only
as an offline proportion guide. The upper body is masked before new limbs are
blocked. `side-reference.png` is the approved side atlas composited on gray for
imagegen reference. None of these references are played by the runtime.

Rebuild (Python, Pillow, NumPy, SciPy already available):

```sh
python3 tools/cats-qa/diagonal_v3_guide.py  # optional: reproduce blocking
python3 tools/cats-qa/diagonal_v3_atlas.py
python3 tools/cats-qa/manifest.py
python3 tools/cats-qa/quality.py
python3 tools/cats-qa/render_diagonals_v3.py
python3 tools/cats-qa/review_diagonals_v3.py
node --test tests/*.cjs
```

No regeneration call is needed for a reproducible atlas rebuild. Registration
uses translation of the head/upper torso, then exactly .5 scale for every frame
of both views. No per-frame resizing. Palette and coat edits use the established
coat function; every coat has exactly the same alpha and frame geometry.
`calibration.json` records all registration offsets and contact residuals.


Coat review refinement: v3's diagonal-only builder registers calico body patches
on a fixed root canvas and keeps the original orange/white limb palette below a
soft torso boundary. This prevents the moving leg from changing color as its
bounding box or pose changes. Siamese paw tips use source white-sock pixels near
the chart's four paw positions, retaining dark tips even on short folded limbs.
These overrides do not change `coats.py` or any approved non-diagonal atlas.
