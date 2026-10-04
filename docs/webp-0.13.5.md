# Bundled art reduction for 0.13.5 — 2026-10-04

Completed only in `livewall-release`, branch `release-0.13.5`. No push, DMG,
notarization, installation, running-app change, or other-worktree modification.

## Size

| Measurement | Before | After |
|---|---:|---:|
| `scenes/art`, file bytes | 178,806,084 (178.81 MB) | 67,288,849 (67.29 MB) |
| `du -sk scenes/art` | 177,080 KiB (172.93 MiB) | 68,152 KiB (66.55 MiB) |
| Plain local app build, file bytes | Not built before | 72,399,631 (72.40 MB) |
| `du -sk wallpap.app` | Not built before | 73,280 KiB (71.56 MiB) |

Art file bytes fell **62.4%**. Both file bytes and allocated disk space for art
are below 70,000,000 bytes. The app was built with `./build.sh`, and its bundled
art/HTML/JS were compared byte-for-byte with this worktree. Ad-hoc signature
verification passed. Existing host compiler warnings remain; host code and the
existing Info.plist version (0.12.1) were untouched. This prepares art for 0.13.5;
it does not constitute a release or a DMG-size measurement.

Selected PNG groups (decimal MB; table excludes existing JPEGs):

| Group | Before | After |
|---|---:|---:|
| sprites/cats | 36.85 | 13.52 |
| sprites/dogs | 17.18 | 6.27 |
| sprites/pandas | 8.94 | 3.60 |
| train | 45.16 | 12.82 |
| cafe | 18.76 | 6.60 |
| records | 11.34 | 6.22 |
| drive | 8.42 | 4.96 |
| rooftop | 7.27 | 1.78 |
| ramen | 6.29 | 1.27 |

## Encoding and registration

1,196 PNGs became WebP, including all 1,080 pet frames. Every conversion saves
at least 30%, has unchanged dimensions, and passes alpha-weighted RGB PSNR >=
40 dB. Lowest measured PSNR: **40.00593 dB**. Maximum alpha-channel difference:
**0/255**. Maximum composited RGB difference at translucent edges: **7.9686/255**;
the bounded near-lossless candidates stay below 4/255. No crop, rescale, offset,
pose geometry, collider, stride, baseline, or contact point changed.

Method-6 lossy q90–95 works for some plates and frames. Saturated sprite lines
and translucent paintings often fail the PSNR/edge gates under 4:2:0 compression,
so most files use near-lossless 4:4:4 RGB with original alpha restored, outlying
fringe colours restored, and invisible RGB zeroed, then lossless WebP packing.
The colour/alpha bounds are measured on the final decoded file, not an intermediate.

`tools/webp/report.json` contains dimensions, bytes, SHA-256 hashes, encoding and
quality measurements for every original PNG. `tools/webp/baseline.json` names the
source Git revision. `verify.py` reread those originals from Git and remeasured
all installed files. `native.py` compared every converted file against the PNG in
WebKit, before installation and again after installation: **1,196 identical alpha
planes and dimensions** each time. This preserves all alpha-derived bounds,
torso centroids, foot contact spans and registration after the existing defringe.

## Retained PNGs

All 18 retained PNGs are byte-identical to the baseline:

| Files | Why retained |
|---|---|
| Café `jukebox.png` | Pixel-driven lighting/masking |
| Café and Records `street-night.png`, `street-night-dry.png` | RGB sky classification in `skyCut` |
| Drive `roadside-painted.png` | Atlas cut/bounds measurements |
| Records `glass-mask.png` | Window alpha mask |
| Train `win-mask.png`, plus orient/swiss/shinkansen versions | Window masks and measured openings |
| Train people `fore-mask-{indian,orient,shinkansen,swiss}.png` | Foreground/occlusion masks |
| Shared `moon.png` | Shared phase/lighting pixel processing; copied by add-on tooling |
| Skies `canopy-near.png`, `canopy-far.png` | Grayscale luminance fields |

Existing JPEGs were unchanged, including Cabin room plates used for light sampling.

## References and runtime cleanup

Updated explicit URLs, dynamic scene loaders, shared pet loaders and extension
parsing, sprite documentation/format manifest, generation installers and their
reference-image arguments, and tests that previously read PNG-only header offsets.
The generator helper writes regenerated WebP losslessly. Source masters, scratch
cuts and historical Git paths intentionally retain their original PNG names.

Exhaustive `rg -F` checks used all 1,196 old full PNG paths across scenes, tools,
tests, art-src, add-ons and site: no stale literal references. Dynamic extension
patterns were checked separately and exercised by the scene/native matrix.
`kit.js` and add-on builders reference the retained PNG moon; site has no
converted bundled-art references. Add-on-local assets are separate.

Removed requests for absent legacy Rooftop/Speakeasy pet overrides and absent
Ramen dusk/Speakeasy day plates. They produced 64 failed image requests in the
baseline matrix; shared pets and existing fallbacks already rendered the scenes.
The extra lazy-loaded Café jukebox check exposed two baseline JavaScript errors:
removed the obsolete per-pet planner access and used the existing `music.playing`
state instead of a missing helper. Day/night jukebox and Café follow rechecks pass.

## Verification and visual review

- `node --test tests/*.cjs`: **96 tests, 96 pass, 0 fail** (95 existing + one new
  artifact-integrity/dimension/reference test).
- Native decode: **1,196/1,196** identical alpha and dimensions, both staged and
  installed; all quality/size/source-hash checks pass.
- Built-in matrix: **38 before + 38 after** WebKit captures at 1600×1000, day/night,
  all 16 built-ins and four Train skins. After: **0 JS/console errors, 0 image
  failures, 0 pending images**. All before/after sheets inspected, plus ten-pet
  dark/light edge comparisons and lowest-PSNR art crops: no visible degradation.
- `python3 tools/follow/smoke-release.py`: port **5217**, copied from the 5210
  smoke; **8 scenes / 48 mirrored-ultrawide frames**, no bad/overlap/error reports,
  every pick/release passed. Café rechecked after the compatibility fix.
- `python3 tools/play/verify.py --smoke`: **6 captures, 0 failures**; additionally
  checked image-error/pending-image fields. Light/dark panels inspected.
- Café lazy-loaded jukebox: **2 captures, 0 errors/image failures**, inspected.
- `./build.sh`: succeeds; `codesign --verify --strict wallpap.app`: succeeds.
  Python compilation, shell syntax and `git diff --check` pass. Generator helper
  verified to write genuine lossless WebP while leaving master paths unchanged.
- Disk remained above 3 GiB (12 GiB available at completion). Raw screenshot PNGs
  and temporary native-original copies were removed; only JPEG sheets remain.

Evidence: [contact-sheet index](../shots/webp/README.md),
[summary](../shots/webp/summary.json), [Node output](../shots/webp/tests-after.log),
[follow output](../shots/webp/follow.log), [Play output](../shots/webp/play.log),
[build output](../shots/webp/build.log). Reproduction: [tool guide](../tools/webp/README.md).

No art was generated or redesigned; no image prompts were used.
