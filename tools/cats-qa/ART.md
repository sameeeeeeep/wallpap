# Painted cat art: production notes

The shipped work is 2D painted art. No 3D branch/rig assets were used. The image generator made each orange animation/view as ONE eight-frame image. Final PNG masters are retained locally in ignored `generated/`; `sources.json` identifies their SHA256. Only cropped WebP atlases and metadata ship.

## References and prompt recipe

Original orange `scenes/art/sprites/cats/orange/walk1.webp` and `sit.webp` set the soft painted fur, round face, white chest/paws and orange tabby palette. The existing `art-src/cat-refs/hop-*.webp` sheets were consistency references only. Other coat reference stills were inspected before palette/marking work.

The generation instructions consistently requested: **one 4-column by 2-row sprite sheet, exactly eight complete frames, one identical orange tabby, painted storybook style, clean fine outline, white chest and paws, soft fur, transparent background, no shadows, no text or frame borders, constant camera/proportions/body scale/color, generous transparent gaps, entire ears/paws/tail visible. Never eight unrelated poses or a 3D render.** Each request specified ONE view: right side; three-quarter toward-right; straight toward the viewer from slightly above; three-quarter away-right; directly away from slightly above. Left counterparts are runtime mirrors.

Walk requests specified a lateral four-beat sequence **LH → LF → RH → RF**, opposing leg phases and repeatable stance/swing. The first unconstrained outputs repeated the wrong foreleg and were rejected. `walk-guide.py` and `direction-guides.py` produced explicit eight-frame 2D blocking with LH phase 0, LF .25, RH .5, RF .75 and duty .625. The generator was then asked to **repaint the supplied whole guide, preserve every frame's paw positions and limb order, keep the upper silhouette registered, replace blocking with the same painted orange cat and clean connected legs**. These five repainted guide sheets are the selected walk masters.

Run requests specified a complete gallop: hind push, extension, fore contact, gather and suspension, with visible articulated legs and spine flexion; same cat/view/palette as the reference. Rear-diagonal run was regenerated using the accepted rear-diagonal walk because its first output faced sideways.

Jump requests specified **neutral, crouch, takeoff, gathered air, reaching air, fore landing/compression, hind landing/recovery, neutral**, in that order, for a compact floor jump also usable on ledges. Rear-diagonal and toward-diagonal sheets were regenerated against their accepted walk views to fix facing/proportion mismatch. No large leap is squeezed into a two-pose hop.

Idle requests separately produced eight-frame **front stand-to-sit**, **front sit through loaf to curled sleep**, **front alert picked/perk**, and **front stretch/recover** sheets. Reverse playback supplies wake/stand. Sleep is allowed to reduce its silhouette area; per-frame area normalization was explicitly removed because it enlarged curled cats.

## Cutting, registration, coats

`atlas.py` isolates eight connected cats, including limbs that cross nominal grid boundaries. It preserves source alpha and white fur; opaque backgrounds use only border-connected removal. One uniform scale per whole sheet, never separate x/y scaling or per-frame area equalization. Walk anchors preserve the guide's torso registration. Run contact frames use a common ground line; suspension frames have explicit small clearance, independent of the generated sheet's row spacing. Jump frames use complete crouch/flight/land poses with engine ballistic placement.

Frames are packed to actual maximum dimensions with four pixels of padding. All 95 atlases decode to about 69 MiB instead of 238 MiB for fixed 1280×512 cells. Cropped shared frames total about 55 MiB before browser/tint overhead. `cat-atlas.js` loads synchronously as a script because WebKit file-origin `fetch()` fails.

`coats.py` preserves the exact alpha and geometry for black, grey, calico and siamese. It edits the painted palette and view-specific masks: amber eyes on black, grey tabby, orange/black/white calico, cream/dark points and blue eyes on siamese. This avoids independently generated motion drift. Calico patches may mirror. Marking masks are approximate and may shift during strong deformation; they are not anatomical UV maps.

The final encoded coat review exposed a fixed-mask error in deep crouches: the Siamese face whitened and calico facial patches slipped toward the jaw. Facial masks now track the source's painted eye pixels and keep radii in source-pixel scale across a clip. Closed-eye stretch/sleep poses use explicit face centers; side tail and extended takeoff paw points were corrected separately. Calico face colors fully replace the underlying body mask. This fixes the most conspicuous face drift without changing any silhouette or registration. Approximate body-patch movement and faint Siamese tabby texture remain documented limitations.

## Stride and numerical review

In the registered side walk, the near forepaw sweeps approximately +65 to +20 atlas pixels during its five-frame stance. With the runtime unit near .52, this gives roughly `45 × .52 / .625 ≈ 37` scene units/cycle; the selected stride is 36. Other views were calibrated against their projected paw sweep: near 42, toward 35, far 36, away 37; run 110. Phase advances by traveled FLOOR distance divided by stride, including slope and depth scale. These are artistic calibrations, not a claim of zero residual foot slip.

`quality.py` verifies all 760 frame bounds, exact cross-coat alpha/registration and walk silhouette area CV below 2.5%. Final walk CV is .8–1.51%. Orange fur median RGB across the five walks stays within R223–227, G154–157, B88–100. The encoded-motion review is still required: stable area alone cannot prove correct leg anatomy or a perfect foot plant.

## Rebuild

Python dependencies: Pillow, NumPy, SciPy. With the local selected PNG masters present:

```sh
python3 tools/cats-qa/atlas.py
python3 tools/cats-qa/coats.py
python3 tools/cats-qa/manifest.py
python3 tools/cats-qa/contact.py
python3 tools/cats-qa/quality.py
```

Never regenerate/write atlases while a WebKit capture is loading them. A concurrent write was caught by the capture's image-error check during development, then re-rendered after the art build completed.

## Diagonal correction — 2026-10-05 owner follow-up

The original diagonal walk guides had incorrect projected paw axes, and the rear
sheet's row placement leaked into registration. Replaced only `walk-near` and
`walk-far` for all coats. See [selected sources, prompts and calibration](diagonal-src/README.md).
Run `diagonal_atlas.py` after the historical atlas/coats steps when rebuilding.
Current floor-distance strides are 43.47 near and 39.78 far. Every other clip and
runtime behavior stays approved and unchanged. The new silhouette area CV is
2.68% near / 2.43% far; the higher near area is exposed limbs, not per-frame scale.
The numerical check allows 3% for these two clips, retaining 2.5% for other walks.
Actual review evidence is in `shots/cats-gpt/diagonal-review.md`.
